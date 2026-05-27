const kuponService = require('../services/kuponService');
const { apiResponse, generateKode } = require('../utils/helpers');
const { generateQRDataURL } = require('../utils/qrcode');

class KuponController {
  /**
   * POST /api/kupons - Create a new kupon
   */
  async create(req, res, next) {
    try {
      const { nomor, nama, tipe } = req.body;

      // Auto-generate kode
      const nextNumber = await kuponService.getNextNumber(tipe);
      const kode = generateKode(tipe, nextNumber);

      const kupon = await kuponService.create({ nomor, nama, tipe, kode });
      return apiResponse(res, 201, 'Kupon berhasil dibuat', kupon);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/kupons - Get all kupons with pagination
   */
  async findAll(req, res, next) {
    try {
      const { page, limit, search, tipe, status } = req.query;
      const result = await kuponService.findAll({ page, limit, search, tipe, status });
      return apiResponse(res, 200, 'Data kupon berhasil diambil', result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/kupons/:id - Get kupon by ID
   */
  async findById(req, res, next) {
    try {
      const kupon = await kuponService.findById(req.params.id);
      return apiResponse(res, 200, 'Detail kupon berhasil diambil', kupon);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/kupons/:id - Update kupon
   */
  async update(req, res, next) {
    try {
      const kupon = await kuponService.update(req.params.id, req.body);
      return apiResponse(res, 200, 'Kupon berhasil diupdate', kupon);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/kupons/:id - Delete kupon
   */
  async delete(req, res, next) {
    try {
      await kuponService.delete(req.params.id);
      return apiResponse(res, 200, 'Kupon berhasil dihapus');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/scan - Scan QR code
   */
  async scan(req, res, next) {
    try {
      const { kode } = req.body;
      const result = await kuponService.scan(kode);
      const statusCode = result.valid ? 200 : 400;
      return apiResponse(res, statusCode, result.message, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/stats - Get dashboard statistics
   */
  async getStats(req, res, next) {
    try {
      const stats = await kuponService.getStats();
      return apiResponse(res, 200, 'Statistik berhasil diambil', stats);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/kupons/:id/qr - Get QR code for a kupon
   */
  async getQR(req, res, next) {
    try {
      const kupon = await kuponService.findById(req.params.id);
      const qrDataUrl = await generateQRDataURL(kupon.kode);
      return apiResponse(res, 200, 'QR Code berhasil diambil', { qrDataUrl, kode: kupon.kode });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new KuponController();
