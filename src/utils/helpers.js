/**
 * Generates a unique coupon code
 * @param {string} tipe - "terdaftar" or "extra"
 * @param {number} number - sequential number
 * @returns {string} formatted code like KPN001 or EX001
 */
function generateKode(tipe, number) {
  const prefix = tipe === 'extra' ? 'EX' : 'KPN';
  const padded = String(number).padStart(3, '0');
  return `${prefix}${padded}`;
}

/**
 * Format date to Indonesian locale
 */
function formatDate(date) {
  if (!date) return '-';
  return new Date(date).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

/**
 * Standard API response format
 */
function apiResponse(res, statusCode, message, data = null) {
  const response = {
    success: statusCode >= 200 && statusCode < 300,
    message,
  };
  if (data !== null) {
    response.data = data;
  }
  return res.status(statusCode).json(response);
}

module.exports = { generateKode, formatDate, apiResponse };
