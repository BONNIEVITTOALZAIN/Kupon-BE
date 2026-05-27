const puppeteer = require('puppeteer');
const kuponService = require('../services/kuponService');
const { apiResponse } = require('../utils/helpers');

class PDFController {
  /**
   * GET /api/generate-pdf - Generate PDF of all kupons
   */
  async generatePDF(req, res, next) {
    try {
      const { tipe, status } = req.query;
      const kupons = await kuponService.findAllForPDF({ tipe, status });

      if (kupons.length === 0) {
        return apiResponse(res, 404, 'Tidak ada kupon untuk digenerate');
      }

      // Build HTML template
      const html = buildPDFTemplate(kupons);

      // Launch puppeteer and generate PDF
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '10mm',
          right: '10mm',
          bottom: '10mm',
          left: '10mm',
        },
      });

      await browser.close();

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=kupon-qurban.pdf');
      res.send(pdfBuffer);
    } catch (error) {
      next(error);
    }
  }
}

/**
 * Build HTML template for PDF generation
 */
function buildPDFTemplate(kupons) {
  const kuponCards = kupons
    .map(
      (kupon) => `
    <div class="kupon-card">
      <div class="kupon-header">
        <div class="logo">🕌</div>
        <div class="title">
          <h2>KUPON QURBAN</h2>
          <p class="subtitle">1447 H / 2026 M</p>
        </div>
      </div>
      <div class="kupon-body">
        <div class="info">
          <div class="info-row">
            <span class="label">No. Kupon</span>
            <span class="value">${kupon.nomor}</span>
          </div>
          <div class="info-row">
            <span class="label">Kode</span>
            <span class="value code">${kupon.kode}</span>
          </div>
          ${
            kupon.tipe === 'extra'
              ? `<div class="extra-badge">EXTRA</div>`
              : `<div class="info-row">
                  <span class="label">Penerima</span>
                  <span class="value nama">${kupon.nama}</span>
                </div>`
          }
          <div class="info-row">
            <span class="label">Tipe</span>
            <span class="value tipe-badge ${kupon.tipe}">${kupon.tipe.toUpperCase()}</span>
          </div>
        </div>
        <div class="qr-section">
          <img src="${kupon.qrDataUrl}" alt="QR Code" class="qr-code" />
          <p class="qr-label">${kupon.kode}</p>
        </div>
      </div>
      <div class="kupon-footer">
        <p>⚠ Scan hanya 1x — Kupon tidak dapat digunakan kembali</p>
      </div>
    </div>
  `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: #fff;
          color: #1a1a2e;
        }
        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          padding: 0;
        }
        .kupon-card {
          border: 2px solid #1a1a2e;
          border-radius: 12px;
          padding: 16px;
          page-break-inside: avoid;
          background: #fff;
          position: relative;
          overflow: hidden;
        }
        .kupon-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, #16a34a, #059669, #0d9488);
        }
        .kupon-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px dashed #ccc;
        }
        .logo { font-size: 28px; }
        .title h2 {
          font-size: 16px;
          font-weight: 800;
          letter-spacing: 2px;
          color: #16a34a;
        }
        .subtitle {
          font-size: 10px;
          color: #666;
        }
        .kupon-body {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }
        .info { flex: 1; }
        .info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
          font-size: 11px;
        }
        .label {
          color: #666;
          font-weight: 500;
        }
        .value {
          font-weight: 700;
          color: #1a1a2e;
        }
        .value.code {
          font-family: monospace;
          font-size: 13px;
          color: #16a34a;
        }
        .value.nama {
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .extra-badge {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: #fff;
          padding: 4px 12px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 800;
          text-align: center;
          letter-spacing: 3px;
          margin: 6px 0;
        }
        .tipe-badge {
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .tipe-badge.terdaftar {
          background: #dcfce7;
          color: #16a34a;
        }
        .tipe-badge.extra {
          background: #fef3c7;
          color: #d97706;
        }
        .qr-section {
          text-align: center;
          flex-shrink: 0;
        }
        .qr-code {
          width: 90px;
          height: 90px;
        }
        .qr-label {
          font-size: 9px;
          font-family: monospace;
          color: #666;
          margin-top: 2px;
        }
        .kupon-footer {
          margin-top: 10px;
          padding-top: 6px;
          border-top: 1px dashed #ccc;
          text-align: center;
        }
        .kupon-footer p {
          font-size: 8px;
          color: #999;
        }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .kupon-card { break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="grid">
        ${kuponCards}
      </div>
    </body>
    </html>
  `;
}

module.exports = new PDFController();
