const { body } = require('express-validator');

const chatValidation = [
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Pesan tidak boleh kosong.')
    .isString()
    .withMessage('Pesan harus berupa teks.')
    .isLength({ max: 500 })
    .withMessage('Pesan terlalu panjang (maksimal 500 karakter).'),
];

module.exports = {
  chatValidation,
};
