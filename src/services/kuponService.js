const prisma = require('../config/database');
const { generateQRDataURL } = require('../utils/qrcode');

class KuponService {
  /**
   * Create a new kupon
   */
  async create(data) {
    const { nomor, nama, tipe, kode } = data;

    const kupon = await prisma.kupon.create({
      data: {
        kode,
        nomor,
        nama: tipe === 'extra' ? 'EXTRA' : (nama || ''),
        tipe,
        status: 'belum',
      },
    });

    return kupon;
  }

  /**
   * Get all kupons with pagination, search, and filters
   */
  async findAll({ page = 1, limit = 10, search, tipe, status }) {
    const skip = (page - 1) * limit;

    const where = {};

    if (search) {
      where.OR = [
        { nomor: { contains: search, mode: 'insensitive' } },
        { nama: { contains: search, mode: 'insensitive' } },
        { kode: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (tipe) {
      where.tipe = tipe;
    }

    if (status) {
      where.status = status;
    }

    const [kupons, total] = await Promise.all([
      prisma.kupon.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { created_at: 'desc' },
      }),
      prisma.kupon.count({ where }),
    ]);

    return {
      kupons,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get kupon by ID
   */
  async findById(id) {
    const kupon = await prisma.kupon.findUnique({ where: { id } });
    if (!kupon) {
      const error = new Error('Kupon tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }
    return kupon;
  }

  /**
   * Update kupon
   */
  async update(id, data) {
    await this.findById(id); // Check if exists

    const updateData = {};
    if (data.nomor !== undefined) updateData.nomor = data.nomor;
    if (data.nama !== undefined) updateData.nama = data.nama;
    if (data.tipe !== undefined) updateData.tipe = data.tipe;
    if (data.status !== undefined) {
      updateData.status = data.status;
      if (data.status === 'sudah') {
        updateData.used_at = new Date();
      } else {
        updateData.used_at = null;
      }
    }

    const kupon = await prisma.kupon.update({
      where: { id },
      data: updateData,
    });

    return kupon;
  }

  /**
   * Delete kupon
   */
  async delete(id) {
    await this.findById(id); // Check if exists
    await prisma.kupon.delete({ where: { id } });
    return true;
  }

  /**
   * Scan QR - validate and update status
   */
  async scan(kode) {
    const kupon = await prisma.kupon.findUnique({ where: { kode } });

    if (!kupon) {
      return {
        valid: false,
        message: 'Kupon tidak ditemukan',
        kupon: null,
      };
    }

    if (kupon.status === 'sudah') {
      return {
        valid: false,
        message: `Kupon sudah digunakan pada ${kupon.used_at ? new Date(kupon.used_at).toLocaleString('id-ID') : '-'}`,
        kupon,
      };
    }

    // Mark as used
    const updatedKupon = await prisma.kupon.update({
      where: { kode },
      data: {
        status: 'sudah',
        used_at: new Date(),
      },
    });

    return {
      valid: true,
      message: 'Kupon valid! Daging dapat diambil.',
      kupon: updatedKupon,
    };
  }

  /**
   * Get dashboard statistics
   */
  async getStats() {
    const [total, sudah, belum, extra, terdaftar, recentActivity] = await Promise.all([
      prisma.kupon.count(),
      prisma.kupon.count({ where: { status: 'sudah' } }),
      prisma.kupon.count({ where: { status: 'belum' } }),
      prisma.kupon.count({ where: { tipe: 'extra' } }),
      prisma.kupon.count({ where: { tipe: 'terdaftar' } }),
      prisma.kupon.findMany({
        where: { status: 'sudah' },
        orderBy: { used_at: 'desc' },
        take: 10,
      }),
    ]);

    return {
      total,
      sudah,
      belum,
      extra,
      terdaftar,
      recentActivity,
    };
  }

  /**
   * Get all kupons for PDF generation (no pagination)
   */
  async findAllForPDF(filters = {}) {
    const where = {};
    if (filters.tipe) where.tipe = filters.tipe;
    if (filters.status) where.status = filters.status;

    const kupons = await prisma.kupon.findMany({
      where,
      orderBy: { nomor: 'asc' },
    });

    // Generate QR codes for each kupon
    const kuponsWithQR = await Promise.all(
      kupons.map(async (kupon) => ({
        ...kupon,
        qrDataUrl: await generateQRDataURL(kupon.kode),
      }))
    );

    return kuponsWithQR;
  }

  /**
   * Get all kupons for Excel export
   */
  async findAllForExport(filters = {}) {
    const where = {};
    if (filters.tipe) where.tipe = filters.tipe;
    if (filters.status) where.status = filters.status;
    if (filters.startDate && filters.endDate) {
      where.created_at = {
        gte: new Date(filters.startDate),
        lte: new Date(filters.endDate),
      };
    }

    return prisma.kupon.findMany({
      where,
      orderBy: { created_at: 'asc' },
    });
  }

  /**
   * Get the next available number for auto-generating codes
   */
  async getNextNumber(tipe) {
    const prefix = tipe === 'extra' ? 'EX' : 'KPN';
    const lastKupon = await prisma.kupon.findFirst({
      where: { kode: { startsWith: prefix } },
      orderBy: { kode: 'desc' },
    });

    if (!lastKupon) return 1;

    const lastNumber = parseInt(lastKupon.kode.replace(prefix, ''), 10);
    return lastNumber + 1;
  }
}

module.exports = new KuponService();
