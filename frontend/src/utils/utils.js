// utils.js - Create this file in src/utils/utils.js

/**
 * Safe string handling - returns empty string for null/undefined
 * @param {string|null|undefined} str - The input string
 * @returns {string} The input string or empty string
 */
export const safeString = (str) => str || '';

/**
 * Safely gets the first character of a string
 * @param {string|null|undefined} str - The input string
 * @returns {string} The first character or empty string
 */
export const safeFirstChar = (str) => safeString(str).charAt(0);

/**
 * Safely capitalizes the first letter of a string
 * @param {string|null|undefined} str - The input string
 * @returns {string} Capitalized string or empty string
 */
export const safeCapitalize = (str) => {
  const s = safeString(str);
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
};

/**
 * Formats a number as currency, handling null values
 * @param {number|null|undefined} value - The value to format
 * @param {string} locale - The locale for formatting
 * @param {string} currency - The currency code
 * @returns {string} Formatted currency string or 'N/A'
 */
export const formatCurrency = (value, locale = 'en-US', currency = 'BDT') => {
  if (value == null) return 'N/A';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2
  }).format(value);
};

/**
 * Safely access a nested property with fallbacks
 * @param {Object} obj - The object to access properties from
 * @param {string} path - The property path (e.g., 'a.b.c')
 * @param {*} defaultValue - Default value if property doesn't exist
 * @returns {*} The property value or default value
 */
export const safeGet = (obj, path, defaultValue = '') => {
  if (!obj) return defaultValue;
  
  const keys = path.split('.');
  let result = obj;
  
  for (const key of keys) {
    if (result === null || result === undefined) {
      return defaultValue;
    }
    result = result[key];
  }
  
  return result !== null && result !== undefined ? result : defaultValue;
};

/**
 * Safely parse a JSON string
 * @param {string} jsonString - JSON string to parse
 * @param {*} defaultValue - Default value if parsing fails
 * @returns {*} Parsed object or default value
 */
export const safeParseJSON = (jsonString, defaultValue = {}) => {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return defaultValue;
  }
};

/**
 * Calculate total cost from ingredients
 * @param {Array} ingredients - Array of ingredient objects
 * @returns {number} Total cost
 */
export const calculateTotalCost = (ingredients = []) => {
  if (!Array.isArray(ingredients)) return 0;
  
  return ingredients.reduce((sum, ingredient) => {
    const quantity = parseFloat(ingredient.quantity) || 0;
    const unitCost = parseFloat(ingredient.unit_cost) || 0;
    return sum + (quantity * unitCost);
  }, 0);
};

/**
 * Calculate unit cost based on total cost and yield
 * @param {number} totalCost - Total recipe cost
 * @param {number} yieldQuantity - Recipe yield quantity
 * @returns {number} Unit cost
 */
export const calculateUnitCost = (totalCost, yieldQuantity) => {
  if (!yieldQuantity || yieldQuantity <= 0) return 0;
  return totalCost / yieldQuantity;
};

export default {
  safeString,
  safeFirstChar,
  safeCapitalize,
  formatCurrency,
  safeGet,
  safeParseJSON,
  calculateTotalCost,
  calculateUnitCost
};