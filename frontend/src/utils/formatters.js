/**
 * Format a number as currency
 * @param {number} value - The value to format
 * @param {string} locale - The locale to use (default: 'en-US')
 * @param {string} currency - The currency code (default: 'BDT')
 * @returns {string} - Formatted currency string
 */
export const formatCurrency = (value, locale = 'en-US', currency = 'BDT') => {
  // If no value provided, return 'N/A'
  if (value === null || value === undefined) {
    return 'N/A';
  }
  
  // If currency is null, use default (BDT)
  const currencyCode = currency || 'BDT';
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode
  }).format(value);
};

/**
 * Format a date
 * @param {string|Date} date - The date to format
 * @param {object} options - Intl.DateTimeFormat options
 * @param {string} locale - The locale to use (default: 'en-US')
 * @returns {string} - Formatted date string
 */
export const formatDate = (date, options = {}, locale = 'en-US') => {
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  };
  
  const dateObj = date instanceof Date ? date : new Date(date);
  
  return new Intl.DateTimeFormat(locale, { ...defaultOptions, ...options }).format(dateObj);
};

/**
 * Format a number with specified precision
 * @param {number} value - The value to format
 * @param {number} precision - Number of decimal places (default: 2)
 * @returns {string} - Formatted number string
 */
export const formatNumber = (value, precision = 2) => {
  return Number(value).toFixed(precision);
};

/**
 * Format a quantity with unit
 * @param {number} value - The quantity value
 * @param {string} unit - The unit of measurement
 * @returns {string} - Formatted quantity string
 */
export const formatQuantity = (value, unit) => {
  return `${formatNumber(value, unit === 'kg' || unit === 'l' ? 2 : 0)} ${unit}`;
};

/**
 * Format a duration in minutes to hours and minutes
 * @param {number} minutes - Duration in minutes
 * @returns {string} - Formatted duration string
 */
export const formatDuration = (minutes) => {
  if (!minutes || minutes <= 0) return '0 min';
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (hours > 0 && remainingMinutes > 0) {
    return `${hours} hr ${remainingMinutes} min`;
  } else if (hours > 0) {
    return `${hours} hr`;
  } else {
    return `${remainingMinutes} min`;
  }
};