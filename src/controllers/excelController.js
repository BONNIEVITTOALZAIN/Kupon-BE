const ExcelJS = require('exceljs');
const kuponService = require('../services/kuponService');

class ExcelController {
  /**
   * GET /api/export-excel - Export kupons to Excel
   */
  async exportExcel(req, res, next) {
    try {
      const { tipe, status, startDate, endDate } = req.query;
      const kupons = await kuponService.findAllForExport({ tipe, status, startDate, endDate });

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Sistem Kupon Qurban';
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet('Data Kupon Qurban', {
        properties: { tabColor: { argb: '16a34a' } },
      });

      // Define columns
      worksheet.columns = [
        { header: 'No', key: 'no', width: 6 },
        { header: 'Nomor Kupon', key: 'nomor', width: 15 },
        { header: 'Kode QR', key: 'kode', width: 15 },
        { header: 'Nama Penerima', key: 'nama', width: 25 },
        { header: 'Tipe Kupon', key: 'tipe', width: 15 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Waktu Digunakan', key: 'used_at', width: 25 },
        { header: 'Tanggal Dibuat', key: 'created_at', width: 25 },
      ];

      // Style header row
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFF' }, size: 11 };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '16a34a' },
      };
      headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
      headerRow.height = 25;

      // Add data rows
      kupons.forEach((kupon, index) => {
        const row = worksheet.addRow({
          no: index + 1,
          nomor: kupon.nomor,
          kode: kupon.kode,
          nama: kupon.nama || '-',
          tipe: kupon.tipe.toUpperCase(),
          status: kupon.status === 'sudah' ? 'Sudah Diambil' : 'Belum Diambil',
          used_at: kupon.used_at
            ? new Date(kupon.used_at).toLocaleString('id-ID')
            : '-',
          created_at: new Date(kupon.created_at).toLocaleString('id-ID'),
        });

        // Alternate row colors
        if (index % 2 === 0) {
          row.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'F0FDF4' },
          };
        }

        // Center align certain columns
        row.getCell('no').alignment = { horizontal: 'center' };
        row.getCell('tipe').alignment = { horizontal: 'center' };
        row.getCell('status').alignment = { horizontal: 'center' };

        // Color status cells
        const statusCell = row.getCell('status');
        if (kupon.status === 'sudah') {
          statusCell.font = { color: { argb: '16a34a' }, bold: true };
        } else {
          statusCell.font = { color: { argb: 'DC2626' }, bold: true };
        }
      });

      // Add borders to all cells
      worksheet.eachRow((row) => {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'D1D5DB' } },
            left: { style: 'thin', color: { argb: 'D1D5DB' } },
            bottom: { style: 'thin', color: { argb: 'D1D5DB' } },
            right: { style: 'thin', color: { argb: 'D1D5DB' } },
          };
        });
      });

      // Auto-fit columns
      worksheet.columns.forEach((column) => {
        let maxLength = column.header.length;
        column.eachCell({ includeEmpty: true }, (cell) => {
          const cellLength = cell.value ? cell.value.toString().length : 0;
          if (cellLength > maxLength) {
            maxLength = cellLength;
          }
        });
        column.width = Math.min(maxLength + 4, 35);
      });

      // Set response headers
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader('Content-Disposition', 'attachment; filename=kupon-qurban.xlsx');

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ExcelController();
