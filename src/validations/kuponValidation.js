const { body, param, query } = require('express-validator');

const createKuponValidation = [
  body('nomor')
    .trim()
    .notEmpty()
    .withMessage('Nomor kupon wajib diisi'),
  body('nama')
    .optional()
    .trim(),
  body('tipe')
    .trim()
    .notEmpty()
    .withMessage('Tipe kupon wajib diisi')
    .isIn(['terdaftar', 'extra'])
    .withMessage('Tipe harus terdaftar atau extra'),
];

const updateKuponValidation = [
  param('id')
    .isUUID()
    .withMessage('ID kupon tidak valid'),
  body('nomor')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Nomor kupon tidak boleh kosong'),
  body('nama')
    .optional()
    .trim(),
  body('tipe')
    .optional()
    .trim()
    .isIn(['terdaftar', 'extra'])
    .withMessage('Tipe harus terdaftar atau extra'),
  body('status')
    .optional()
    .trim()
    .isIn(['belum', 'sudah'])
    .withMessage('Status harus belum atau sudah'),
];

const deleteKuponValidation = [
  param('id')
    .isUUID()
    .withMessage('ID kupon tidak valid'),
];

const getKuponValidation = [
  param('id')
    .isUUID()
    .withMessage('ID kupon tidak valid'),
];

const scanValidation = [
  body('kode')
    .trim()
    .notEmpty()
    .withMessage('Kode QR wajib diisi'),
];

const listKuponValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page harus berupa angka positif'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 5000 })
    .withMessage('Limit harus antara 1 dan 5000'),
  query('tipe')
    .optional()
    .isIn(['terdaftar', 'extra'])
    .withMessage('Filter tipe harus terdaftar atau extra'),
  query('status')
    .optional()
    .isIn(['belum', 'sudah'])
    .withMessage('Filter status harus belum atau sudah'),
  query('search')
    .optional()
    .trim(),
];

module.exports = {
  createKuponValidation,
  updateKuponValidation,
  deleteKuponValidation,
  getKuponValidation,
  scanValidation,
  listKuponValidation,
};
