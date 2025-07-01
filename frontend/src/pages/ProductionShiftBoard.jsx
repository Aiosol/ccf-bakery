import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Box, Card, CardContent, Typography, Grid, Paper, Chip, Avatar, Stack, 
  Button, LinearProgress, Alert, IconButton, Tooltip, Divider, Badge, 
  List, ListItem, ListItemText, ListItemSecondaryAction, CircularProgress, 
  TextField, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import {
  AccessTime as TimeIcon, Person as PersonIcon, CheckCircle as CheckCircleIcon,
  Warning as WarningIcon, PlayArrow as PlayIcon, Pause as PauseIcon,
  Print as PrintIcon, QrCode as QrCodeIcon, Refresh as RefreshIcon,
  Add as AddIcon, Remove as RemoveIcon
} from '@mui/icons-material';

// Mock service - replace with actual API
const shiftService = {
  getCurrentShift: async () => {
    return {
      success: true,
      shift: {
        id: 1,
        name: 'Morning Shift',
        type: 'morning',
        start_time: '06:00',
        end_time: '14:00',
        is_current: true
      },
      current_time: '10:30'
    };
  },
  
  getShiftSummary: async (shiftId) => {
    return {
      shift: {
        id: 1,
        name: 'Morning Shift',
        type: 'Morning Shift',
        time: '06:00 - 14:00'
      },
      date: format(new Date(), 'yyyy-MM-dd'),
      categories: [
        {
          code: 'A',
          name: 'A - Cake & Pastry',
          assigned_to: 'Rakib',
          items: [
            {
              id: 1,
              item: 'Chocolate Cake',
              code: 'FG001',
              ordered: 50,
              stock: 10,
              required: 40,
              production: 48,
              approved: true,
              has_order: true,
              status: 'in_progress',
              progress: 65
            },
            {
              id: 2,
              item: 'Vanilla Pastry',
              code: 'FG002',
              ordered: 80,
              stock: 5,
              required: 75,
              production: 80,
              approved: true,
              has_order: true,
              status: 'completed',
              progress: 100
            }
          ],
          stats: {
            total_items: 2,
            approved: 2,
            with_orders: 2,
            completed: 1,
            in_progress: 1
          }
        },
        {
          code: 'B',
          name: 'B - Savory, Frozen',
          assigned_to: 'Saiful',
          items: [
            {
              id: 3,
              item: 'Chicken Samosa',
              code: 'FG010',
              ordered: 200,
              stock: 0,
              required: 200,
              production: 200,
              approved: true,
              has_order: true,
              status: 'pending',
              progress: 0
            }
          ],
          stats: {
            total_items: 1,
            approved: 1,
            with_orders: 1,
            completed: 0,
            in_progress: 0
          }
        }
      ]
    };
  },
  
  updateItemProgress: async (itemId, progress) => {
    return { success: true, message: 'Progress updated' };
  }
};

// Category color mapping
const categoryColors = {
  'A': { bg: '#FFE4E1', text: '#D2691E', icon: '🍰' },
  'B': { bg: '#E6F3FF', text: '#4169E1', icon: '🥟' },
  'C': { bg: '#FFFACD', text: '#DAA520', icon: '🍞' },
  'D': { bg: '#E6FFE6', text: '#228B22', icon: '🍽️' }
};

function ProductionItemCard({ item, onUpdateProgress }) {
  const [progress, setProgress] = useState(item.progress || 0);
  const [updating, setUpdating] = useState(false);
  
  const handleProgressChange = async (delta) => {
    const newProgress = Math.max(0, Math.min(100, progress + delta));
    setProgress(newProgress);
    setUpdating(true);
    
    try {
      await onUpdateProgress(item.id, newProgress);
    } finally {
      setUpdating(false);
    }
  };
  
  const getStatusColor = () => {
    if (item.status === 'completed') return 'success';
    if (item.status === 'in_progress') return 'warning';
    return 'default';
  };
  
  return (
    <Card sx={{ mb: 2, position: 'relative' }}>
      {updating && (
        <LinearProgress 
          sx={{ position: 'absolute', top: 0, left: 0, right: 0 }} 
        />
      )}
      <CardContent>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <Typography variant="h6" gutterBottom>
              {item.item}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {item.code}
            </Typography>
          </Grid>
          
          <Grid item xs={6} md={2}>
            <Typography variant="caption" color="text.secondary">
              Required / Production
            </Typography>
            <Typography variant="body1" fontWeight="medium">
              {item.required} / {item.production}
            </Typography>
          </Grid>
          
          <Grid item xs={6} md={2}>
            <Chip
              label={item.status.replace('_', ' ')}
              color={getStatusColor()}
              size="small"
            />
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton
                size="small"
                onClick={() => handleProgressChange(-10)}
                disabled={progress === 0 || updating}
              >
                <RemoveIcon />
              </IconButton>
              
              <Box sx={{ flex: 1, position: 'relative' }}>
                <LinearProgress
                  variant="determinate"
                  value={progress}
                  sx={{ height: 24, borderRadius: 12 }}
                  color={progress === 100 ? 'success' : 'primary'}
                />
                <Typography
                  variant="body2"
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    fontWeight: 'medium'
                  }}
                >
                  {progress}%
                </Typography>
              </Box>
              
              <IconButton
                size="small"
                onClick={() => handleProgressChange(10)}
                disabled={progress === 100 || updating}
              >
                <AddIcon />
              </IconButton>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}

  export default function ProductionShiftBoard() {
  const [currentShift, setCurrentShift] = useState(null);
  const [shiftSummary, setShiftSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [notification, setNotification] = useState(null);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  
  useEffect(() => {
    loadShiftData();
    // Refresh every 5 minutes
    const interval = setInterval(loadShiftData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);
  
  const loadShiftData = async () => {
    try {
      setLoading(true);
      const shiftResult = await shiftService.getCurrentShift();
      
      if (shiftResult.success && shiftResult.shift) {
        setCurrentShift(shiftResult.shift);
        const summaryResult = await shiftService.getShiftSummary(shiftResult.shift.id);
        setShiftSummary(summaryResult);
      } else {
        setNotification({ type: 'warning', message: 'No active shift at this time' });
      }
    } catch (error) {
      setNotification({ type: 'error', message: 'Failed to load shift data' });
    } finally {
      setLoading(false);
    }
  };
  
  const handleUpdateProgress = async (itemId, progress) => {
    try {
      await shiftService.updateItemProgress(itemId, progress);
      // Reload data to reflect changes
      await loadShiftData();
    } catch (error) {
      setNotification({ type: 'error', message: 'Failed to update progress' });
    }
  };
  
  const calculateOverallProgress = () => {
    if (!shiftSummary) return 0;
    
    let totalItems = 0;
    let totalProgress = 0;
    
    shiftSummary.categories.forEach(category => {
      category.items.forEach(item => {
        totalItems++;
        totalProgress += item.progress || 0;
      });
    });
    
    return totalItems > 0 ? Math.round(totalProgress / totalItems) : 0;
  };
  
  const handlePrintTicket = (category) => {
    setSelectedCategory(category);
    setPrintDialogOpen(true);
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
            Production Shift Board
          </Typography>
          {currentShift && (
            <Typography variant="subtitle1" color="text.secondary">
              {currentShift.name} • {currentShift.start_time} - {currentShift.end_time}
            </Typography>
          )}
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadShiftData}
        >
          Refresh
        </Button>
      </Box>
      
      {/* Notifications */}
      {notification && (
        <Alert 
          severity={notification.type} 
          onClose={() => setNotification(null)}
          sx={{ mb: 2 }}
        >
          {notification.message}
        </Alert>
      )}
      
      {/* Overall Progress */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Overall Shift Progress
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <LinearProgress
                variant="determinate"
                value={calculateOverallProgress()}
                sx={{ height: 32, borderRadius: 16 }}
                color={calculateOverallProgress() === 100 ? 'success' : 'primary'}
              />
            </Box>
            <Typography variant="h5" fontWeight="bold">
              {calculateOverallProgress()}%
            </Typography>
          </Box>
        </CardContent>
      </Card>
      
      {/* Category Sections */}
      {shiftSummary && shiftSummary.categories.map((category) => (
        <Paper key={category.code} sx={{ mb: 3, overflow: 'hidden' }}>
          <Box
            sx={{
              bgcolor: categoryColors[category.code]?.bg || '#f5f5f5',
              p: 2,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="h3">
                {categoryColors[category.code]?.icon}
              </Typography>
              <Box>
                <Typography variant="h5" sx={{ color: categoryColors[category.code]?.text }}>
                  {category.name}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                  <PersonIcon fontSize="small" />
                  <Typography variant="body2">
                    {category.assigned_to}
                  </Typography>
                  <Chip
                    label={`${category.stats.completed}/${category.stats.total_items} completed`}
                    size="small"
                    color={category.stats.completed === category.stats.total_items ? 'success' : 'default'}
                  />
                </Box>
              </Box>
            </Box>
            
            <Stack direction="row" spacing={1}>
              <Tooltip title="Print Production Ticket">
                <IconButton onClick={() => handlePrintTicket(category)}>
                  <PrintIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Generate QR Code">
                <IconButton>
                  <QrCodeIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>
          
          <Box sx={{ p: 2 }}>
            {category.items.map((item) => (
              <ProductionItemCard
                key={item.id}
                item={item}
                onUpdateProgress={handleUpdateProgress}
              />
            ))}
          </Box>
        </Paper>
      ))}
      
      {/* Print Dialog */}
      <Dialog open={printDialogOpen} onClose={() => setPrintDialogOpen(false)}>
        <DialogTitle>Print Production Ticket</DialogTitle>
        <DialogContent>
          <Typography>
            Print production ticket for {selectedCategory?.name}?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPrintDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={() => {
              window.print();
              setPrintDialogOpen(false);
            }}
          >
            Print
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );

  };