const prisma = require('../config/database');
const config = require('../config');
const OpenAI = require('openai');

class AssistantService {
  constructor() {
    this.openai = null;
    if (config.openRouterApiKey) {
      this.openai = new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: config.openRouterApiKey,
        defaultHeaders: {
          'HTTP-Referer': config.frontendUrl || 'http://localhost:3000', // Optional, for OpenRouter rankings
          'X-Title': 'Sistem Kupon Qurban QR Code',
        }
      });
    }
  }

  /**
   * Detect the intent based on simple keywords
   * @param {string} message 
   * @returns {string} intent
   */
  detectIntent(message) {
    const msg = message.toLowerCase();
    
    if (msg.includes('statistik') || msg.includes('laporan') || msg.includes('summary') || msg.includes('ringkasan') || msg.includes('perkembangan')) {
      return 'statistik';
    }
    
    if (msg.includes('extra') || msg.includes('ekstra') || msg.includes('kpn-ex') || msg.includes('kpn ex')) {
      return 'kupon_extra';
    }

    if (msg.includes('terdaftar') || msg.includes('reguler') || msg.includes('biasa')) {
      return 'kupon_terdaftar';
    }
    
    if (msg.includes('belum') || msg.includes('sisa') || msg.includes('belum digunakan') || msg.includes('belum diambil')) {
      return 'kupon_belum';
    }
    
    if (msg.includes('sudah') || msg.includes('terpakai') || msg.includes('digunakan') || msg.includes('diambil') || msg.includes('scan') || msg.includes('discan')) {
      if (msg.includes('hari ini') || msg.includes('hari')) {
        return 'kupon_sudah_hari_ini';
      }
      return 'kupon_sudah';
    }
    
    if (msg.includes('total') || msg.includes('semua') || msg.includes('jumlah') || msg.includes('banyak')) {
      return 'total_kupon';
    }
    
    return 'general';
  }

  /**
   * Retrieve database summaries using Prisma
   */
  async getDatabaseSummary() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalCount,
      sudahCount,
      belumCount,
      extraCount,
      terdaftarCount,
      sudahHariIniCount,
      extraSudahCount,
      extraBelumCount,
      terdaftarSudahCount,
      terdaftarBelumCount,
      recentScanned
    ] = await Promise.all([
      prisma.kupon.count(),
      prisma.kupon.count({ where: { status: 'sudah' } }),
      prisma.kupon.count({ where: { status: 'belum' } }),
      prisma.kupon.count({ where: { tipe: 'extra' } }),
      prisma.kupon.count({ where: { tipe: 'terdaftar' } }),
      prisma.kupon.count({ 
        where: { 
          status: 'sudah', 
          used_at: { gte: todayStart } 
        } 
      }),
      prisma.kupon.count({ where: { tipe: 'extra', status: 'sudah' } }),
      prisma.kupon.count({ where: { tipe: 'extra', status: 'belum' } }),
      prisma.kupon.count({ where: { tipe: 'terdaftar', status: 'sudah' } }),
      prisma.kupon.count({ where: { tipe: 'terdaftar', status: 'belum' } }),
      prisma.kupon.findMany({
        where: { status: 'sudah' },
        orderBy: { used_at: 'desc' },
        take: 5,
        select: {
          nomor: true,
          nama: true,
          tipe: true,
          scanned_by: true,
          used_at: true
        }
      })
    ]);

    // Format recent scanned activities
    const recentActivities = recentScanned.map(k => {
      const time = k.used_at ? new Date(k.used_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '';
      return `- Kupon #${k.nomor} (${k.nama || 'Tanpa Nama'}, Tipe: ${k.tipe}) discan oleh ${k.scanned_by || 'Panitia'} jam ${time}`;
    }).join('\n');

    return {
      totalCount,
      sudahCount,
      belumCount,
      extraCount,
      terdaftarCount,
      sudahHariIniCount,
      extraSudahCount,
      extraBelumCount,
      terdaftarSudahCount,
      terdaftarBelumCount,
      recentActivities: recentActivities || 'Tidak ada aktivitas scan hari ini.',
      timestamp: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
    };
  }

  /**
   * Build AI prompt based on intent and database context
   */
  buildPrompt(userMessage, intent, dbSummary) {
    const {
      totalCount,
      sudahCount,
      belumCount,
      extraCount,
      terdaftarCount,
      sudahHariIniCount,
      extraSudahCount,
      extraBelumCount,
      terdaftarSudahCount,
      terdaftarBelumCount,
      recentActivities,
      timestamp
    } = dbSummary;

    let intentInfo = '';
    switch(intent) {
      case 'total_kupon':
        intentInfo = `Konteks pertanyaan berfokus pada jumlah total kupon. Informasi penting: Total Kupon = ${totalCount} unit.`;
        break;
      case 'kupon_belum':
        intentInfo = `Konteks pertanyaan berfokus pada kupon yang belum digunakan/diambil. Informasi penting: Sisa kupon belum digunakan = ${belumCount} unit (Kupon terdaftar belum digunakan: ${terdaftarBelumCount}, Kupon extra belum digunakan: ${extraBelumCount}).`;
        break;
      case 'kupon_sudah':
        intentInfo = `Konteks pertanyaan berfokus pada kupon yang sudah digunakan/diambil. Informasi penting: Total kupon sudah digunakan = ${sudahCount} unit (Kupon terdaftar sudah: ${terdaftarSudahCount}, Kupon extra sudah: ${extraSudahCount}).`;
        break;
      case 'kupon_sudah_hari_ini':
        intentInfo = `Konteks pertanyaan berfokus pada kupon yang sudah digunakan hari ini. Informasi penting: Kupon discan hari ini = ${sudahHariIniCount} unit.`;
        break;
      case 'kupon_extra':
        intentInfo = `Konteks pertanyaan berfokus pada kupon extra/tambahan. Informasi penting: Total kupon extra = ${extraCount} unit (Sudah digunakan: ${extraSudahCount}, Belum digunakan: ${extraBelumCount}).`;
        break;
      case 'kupon_terdaftar':
        intentInfo = `Konteks pertanyaan berfokus pada kupon terdaftar/reguler. Informasi penting: Total kupon terdaftar = ${terdaftarCount} unit (Sudah digunakan: ${terdaftarSudahCount}, Belum digunakan: ${terdaftarBelumCount}).`;
        break;
      case 'statistik':
        intentInfo = `Konteks pertanyaan meminta statistik lengkap/laporan dashboard. Sampaikan ringkasan lengkap dari seluruh data di bawah ini secara profesional.`;
        break;
      default:
        intentInfo = 'Jawab pertanyaan admin secara umum berdasarkan data statistik yang tersedia.';
    }

    return `
Anda adalah AI Chat Assistant khusus Admin untuk Sistem Manajemen Kupon Qurban berbasis QR Code.
Tugas Anda adalah membantu Panitia/Admin mengelola, memantau, dan menganalisis status pembagian kupon qurban.

DATA REAL-TIME SISTEM (Per ${timestamp}):
- Total Kupon Keseluruhan: ${totalCount}
  - Kupon Terdaftar (Reguler): ${terdaftarCount} (Sudah digunakan: ${terdaftarSudahCount}, Belum digunakan: ${terdaftarBelumCount})
  - Kupon Extra (Tambahan): ${extraCount} (Sudah digunakan: ${extraSudahCount}, Belum digunakan: ${extraBelumCount})
- Status Penggunaan Kupon:
  - Sudah Digunakan (Daging Diambil): ${sudahCount}
  - Belum Digunakan (Daging Belum Diambil): ${belumCount}
- Aktivitas Hari Ini:
  - Kupon discan/digunakan hari ini: ${sudahHariIniCount}
- Aktivitas Scan Terakhir (Riwayat):
${recentActivities}

INFORMASI DETEKSI INTENT BACKEND:
${intentInfo}

PERTANYAAN ADMIN:
"${userMessage}"

PANDUAN JAWABAN:
1. Jawablah menggunakan Bahasa Indonesia yang ramah, sopan, ringkas, dan profesional (selayaknya asisten admin yang handal).
2. Fokus langsung pada menjawab pertanyaan admin berdasarkan data real-time di atas. Jangan mengarang data atau berhalusinasi.
3. Jika ditanyakan kupon belum digunakan, sebutkan jumlahnya (${belumCount}) dan tawarkan rincian jika diperlukan.
4. Gunakan format yang menarik seperti poin-poin/list, bullet, atau cetak tebal (bold) untuk angka-angka penting agar mudah dibaca oleh admin secara cepat.
5. Anda dilarang menyebutkan bahwa Anda adalah model bahasa besar dari luar. Anda adalah "AI Assistant Sistem Kupon Qurban".
6. Jangan sebutkan kode teknis database/Prisma kepada admin.

Jawab pertanyaan admin dengan natural language sesuai panduan di atas.
`;
  }

  /**
   * Process chat request and return reply
   */
  async processChat(userMessage) {
    const intent = this.detectIntent(userMessage);
    const dbSummary = await this.getDatabaseSummary();
    const prompt = this.buildPrompt(userMessage, intent, dbSummary);

    // Fallback Mock Reply if OpenRouter API Key is not configured
    if (!config.openRouterApiKey || String(config.openRouterApiKey).trim() === '' || !this.openai) {
      console.warn('⚠️ OPENROUTER_API_KEY is not configured or client failed. Running in Fallback/Demo mode.');
      return this.generateMockReply(userMessage, intent, dbSummary);
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: config.openRouterModel,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 800,
      });

      if (response && response.choices && response.choices[0] && response.choices[0].message) {
        const content = response.choices[0].message.content;
        if (content) {
          return content.trim();
        }
        throw new Error('Respons OpenRouter mengembalikan konten kosong.');
      } else {
        throw new Error('Respons OpenRouter tidak valid.');
      }
    } catch (error) {
      console.error('❌ OpenRouter API Error:', error);
      // Fallback in case of actual API failure (e.g. rate limit, network down, model unavailable)
      return this.generateMockReply(userMessage, intent, dbSummary) + '\n\n*(Catatan: Respons ini dihasilkan melalui sistem fallback internal karena kendala koneksi API OpenRouter)*';
    }
  }

  /**
   * Generate highly realistic and detailed replies locally when API is unavailable or unconfigured
   */
  generateMockReply(message, intent, db) {
    const {
      totalCount,
      sudahCount,
      belumCount,
      extraCount,
      terdaftarCount,
      sudahHariIniCount,
      extraSudahCount,
      extraBelumCount,
      terdaftarSudahCount,
      terdaftarBelumCount,
      recentActivities
    } = db;

    const msg = message.toLowerCase();

    // 1. Total Kupon
    if (intent === 'total_kupon') {
      return `Halo Admin! Total kupon yang terdaftar di sistem saat ini adalah **${totalCount} kupon**.

Berikut rincian jenis kupon tersebut:
- **Kupon Terdaftar (Reguler):** ${terdaftarCount} kupon
- **Kupon Extra (Tambahan):** ${extraCount} kupon`;
    }

    // 2. Kupon Belum Digunakan
    if (intent === 'kupon_belum') {
      const percent = totalCount > 0 ? ((belumCount / totalCount) * 100).toFixed(1) : 0;
      return `Saat ini masih terdapat **${belumCount} kupon** yang **belum digunakan** (belum mengambil hewan qurban), sekitar **${percent}%** dari total kupon.

Rincian kupon yang belum digunakan:
- **Kupon Terdaftar (Reguler):** ${terdaftarBelumCount} kupon belum diambil
- **Kupon Extra (Tambahan):** ${extraBelumCount} kupon belum diambil

Panitia siap siaga di lokasi untuk melayani sisa pengambilan ini.`;
    }

    // 3. Kupon Sudah Digunakan
    if (intent === 'kupon_sudah') {
      const percent = totalCount > 0 ? ((sudahCount / totalCount) * 100).toFixed(1) : 0;
      return `Laporan Pengambilan: Sebanyak **${sudahCount} kupon** telah **berhasil discan / digunakan** (**${percent}%** dari total kupon).

Rincian kupon yang sudah digunakan (daging diambil):
- **Kupon Terdaftar (Reguler):** ${terdaftarSudahCount} kupon sudah diambil
- **Kupon Extra (Tambahan):** ${extraSudahCount} kupon sudah diambil`;
    }

    // 4. Kupon Sudah Digunakan Hari Ini
    if (intent === 'kupon_sudah_hari_ini') {
      return `Khusus untuk **hari ini**, terdapat sebanyak **${sudahHariIniCount} kupon** yang telah **berhasil discan** oleh panitia. 

Semua proses scan QR Code berjalan lancar. Apakah Anda ingin melihat riwayat 5 kupon scan terbaru?`;
    }

    // 5. Kupon Extra
    if (intent === 'kupon_extra') {
      return `Halo Admin, informasi untuk kategori **Kupon Extra (Tambahan)**:
- **Total Kupon Extra:** ${extraCount} kupon
- **Sudah Digunakan:** ${extraSudahCount} kupon
- **Belum Digunakan (Sisa):** ${extraBelumCount} kupon

Kupon Extra digunakan untuk mengantisipasi penambahan penerima qurban di luar daftar reguler.`;
    }

    // 6. Kupon Terdaftar
    if (intent === 'kupon_terdaftar') {
      return `Berikut adalah rincian data **Kupon Terdaftar (Reguler)**:
- **Total Kupon Terdaftar:** ${terdaftarCount} kupon
- **Sudah Digunakan (Telah Diambil):** ${terdaftarSudahCount} kupon
- **Belum Digunakan (Sisa):** ${terdaftarBelumCount} kupon`;
    }

    // 7. Statistik Lengkap / Laporan
    if (intent === 'statistik') {
      const progress = totalCount > 0 ? ((sudahCount / totalCount) * 100).toFixed(1) : 0;
      return `📊 **LAPORAN & STATISTIK REAL-TIME SISTEM KUPON QURBAN**

Berikut adalah rangkuman dashboard yang dapat saya laporkan saat ini:

1. **Ringkasan Pengambilan (Progress: ${progress}%)**
   - **Sudah Diambil (Sudah Scan):** **${sudahCount} kupon**
   - **Belum Diambil (Sisa Kupon):** **${belumCount} kupon**
   - **Total Kupon Terdaftar di Sistem:** **${totalCount} kupon**

2. **Rincian Berdasarkan Kategori Kupon**
   - **Kupon Terdaftar (Reguler):** ${terdaftarCount} unit (${terdaftarSudahCount} sudah diambil, ${terdaftarBelumCount} sisa)
   - **Kupon Extra (Tambahan):** ${extraCount} unit (${extraSudahCount} sudah diambil, ${extraBelumCount} sisa)

3. **Aktivitas Hari Ini**
   - Kupon berhasil discan hari ini: **${sudahHariIniCount} kupon**

4. **Aktivitas Terakhir:**
${recentActivities}

Sistem dalam keadaan stabil dan siap melayani sisa pengambilan qurban. Ada hal lain yang bisa saya bantu, Admin?`;
    }

    // 8. General / Fallback
    return `Halo Admin! Saya adalah **AI Chat Assistant** untuk sistem kupon qurban QR Code.

Saya dapat membantu Anda mencari data dan menyajikan laporan dengan cepat. Coba tanyakan hal seperti:
- *"Berapa sisa kupon yang belum diambil?"*
- *"Tampilkan statistik pengambilan daging qurban"*
- *"Berapa banyak kupon extra?"*
- *"Berapa kupon yang sudah digunakan hari ini?"*
- *"Ada berapa total kupon keseluruhan?"*

*(Catatan: Kunci API OpenRouter belum diatur di file .env. Saya menjawab menggunakan sistem analitik lokal terintegrasi).*`;
  }
}

module.exports = new AssistantService();
