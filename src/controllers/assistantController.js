const assistantService = require('../services/assistantService');
const { apiResponse } = require('../utils/helpers');

class AssistantController {
  /**
   * POST /api/assistant/chat
   * Process admin chat message and return AI-generated reply
   */
  async chat(req, res) {
    try {
      const { message } = req.body;

      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return apiResponse(res, 400, 'Pesan tidak boleh kosong.');
      }

      // Sanitize input: strip HTML tags and limit length
      const sanitizedMessage = message
        .replace(/<[^>]*>/g, '')
        .trim()
        .substring(0, 500);

      if (sanitizedMessage.length === 0) {
        return apiResponse(res, 400, 'Pesan tidak valid setelah sanitasi.');
      }

      const reply = await assistantService.processChat(sanitizedMessage);

      return apiResponse(res, 200, 'Berhasil mendapatkan jawaban AI.', { reply });
    } catch (error) {
      console.error('❌ Assistant Chat Error:', error);
      return apiResponse(res, 500, 'Terjadi kesalahan saat memproses pertanyaan. Silakan coba lagi.');
    }
  }
}

module.exports = new AssistantController();
