import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  Avatar,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Cake as BakeryIcon,
  LockOutlined as LockIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await login(username, password);
      
      // Redirect based on user role and permissions
      if (result.user.is_admin) {
        navigate('/');
      } else if (result.user.is_customer) {
        navigate('/orders');
      } else if (result.user.is_manager) {
        navigate('/');
      } else {
        navigate('/orders');
      }
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Container component="main" maxWidth="xs">
      <Box sx={{ marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        
        {/* Logo */}
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Avatar sx={{ m: 'auto', bgcolor: 'primary.main', width: 56, height: 56 }}>
            <BakeryIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Typography component="h1" variant="h4" sx={{ mt: 2, fontWeight: 'bold' }}>
            CLOUD LOUNGE
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Management System
          </Typography>
        </Box>
        
        {/* Login Form */}
        <Paper elevation={3} sx={{ p: 4, width: '100%', borderRadius: 2 }}>
          <Box sx={{ mb: 3, textAlign: 'center' }}>
            <Avatar sx={{ m: 'auto', bgcolor: 'secondary.main' }}>
              <LockIcon />
            </Avatar>
            <Typography component="h2" variant="h5" sx={{ mt: 1 }}>
              Sign In
            </Typography>
          </Box>
          
          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
          
          <Box component="form" onSubmit={handleLogin}>
            <TextField
              margin="normal"
              required
              fullWidth
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              autoFocus
            />
            <TextField
              margin="normal"
              required
              fullWidth
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2, py: 1.5 }}
              disabled={loading || !username || !password}
            >
              {loading ? <CircularProgress size={24} /> : 'Sign In'}
            </Button>
          </Box>
        </Paper>
        
        {/* Info */}
        <Box sx={{ mt: 4, p: 2, bgcolor: 'background.paper', borderRadius: 1, width: '100%' }}>
          <Typography variant="body2" align="center" color="text.secondary">
            Use your admin credentials to login
          </Typography>
        </Box>
      </Box>
    </Container>
  );
};

export default Login;