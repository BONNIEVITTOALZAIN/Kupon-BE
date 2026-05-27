const QRCode = require('qrcode');

/**
 * Generate QR Code as Data URL (base64)
 */
async function generateQRDataURL(text) {
  try {
    const dataUrl = await QRCode.toDataURL(text, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'H',
    });
    return dataUrl;
  } catch (error) {
    throw new Error(`Failed to generate QR Code: ${error.message}`);
  }
}

/**
 * Generate QR Code as Buffer (PNG)
 */
async function generateQRBuffer(text) {
  try {
    const buffer = await QRCode.toBuffer(text, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'H',
    });
    return buffer;
  } catch (error) {
    throw new Error(`Failed to generate QR Buffer: ${error.message}`);
  }
}

module.exports = { generateQRDataURL, generateQRBuffer };
