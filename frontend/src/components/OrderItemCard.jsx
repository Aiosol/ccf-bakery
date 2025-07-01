import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box
} from '@mui/material';
import { formatCurrency } from '../utils/formatters';

// This component displays an order item card with sales price instead of average cost
const OrderItemCard = ({ item, onAddItem }) => {
  // No need for stock status related state
  
  return (
    <Card 
      sx={{ 
        cursor: 'pointer',
        transition: 'all 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 3
        },
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
      onClick={() => onAddItem(item)}
    >
      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Item name */}
        <Typography variant="h6" noWrap title={item.name}>
          {item.name}
        </Typography>
        
        {/* Item code */}
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {item.code}
        </Typography>
        
        {/* Price section - only show if sales_price exists */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 'auto' }}>
          {item.sales_price > 0 && (
            <Typography variant="h6" color="primary">
              {/* use formatCurrency or direct formatting */}
              BDT {item.sales_price.toFixed(2)}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default OrderItemCard;