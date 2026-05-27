const express = require('express');
const router = express.Router();
const kuponController = require('../controllers/kuponController');
const pdfController = require('../controllers/pdfController');
const excelController = require('../controllers/excelController');
const { validate } = require('../middleware/validate');
const {
  createKuponValidation,
  updateKuponValidation,
  deleteKuponValidation,
  getKuponValidation,
  scanValidation,
  listKuponValidation,
} = require('../validations/kuponValidation');

const { protect } = require('../middleware/auth');
const authController = require('../controllers/authController');

// Public Auth Routes
router.post('/login', authController.login);

// Apply protection middleware to all API routes
router.use(protect);

// Auth logout
router.post('/logout', authController.logout);

// User/Panitia Management (protected)
router.get('/users', authController.listUsers);
router.post('/users', authController.createUser);
router.delete('/users/:id', authController.deleteUser);

// Dashboard stats
router.get('/stats', kuponController.getStats);

// Kupon CRUD
router.post('/kupons', createKuponValidation, validate, kuponController.create);
router.get('/kupons', listKuponValidation, validate, kuponController.findAll);
router.post('/kupons/reset-status', kuponController.resetAllStatus);
router.post('/kupons/delete-all', kuponController.deleteAll);
router.get('/kupons/:id', getKuponValidation, validate, kuponController.findById);
router.put('/kupons/:id', updateKuponValidation, validate, kuponController.update);
router.delete('/kupons/:id', deleteKuponValidation, validate, kuponController.delete);

// QR Code
router.get('/kupons/:id/qr', getKuponValidation, validate, kuponController.getQR);

// Scanner
router.post('/scan', scanValidation, validate, kuponController.scan);

// PDF Generation
router.get('/generate-pdf', pdfController.generatePDF);

// Excel Export
router.get('/export-excel', excelController.exportExcel);

module.exports = router;
