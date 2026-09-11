const bannedWordsData = require('../config/bannedWords.json');
const brandVoice = require('../config/brandVoice.json');

/**
 * Prompt cho LLM Agent 3: Tạo Content Brief & Dàn ý H1-H4 tự động chuẩn hóa theo Giọng Văn Home Care
 */
function buildGenerateOutlinePrompt(selectedKeyword, contentAnalysis, lsiKeywords, options = {}) {
  const bannedListStr = bannedWordsData.banned_words.join(', ');

  return `
Bạn là Trưởng Ban Biên Tập Nội Dung & Kiến Trúc Sư Dàn Ý SEO Của Thương Hiệu "${brandVoice.brand_name}".
Nhiệm vụ của bạn là phân tích và tự động lập Bản Content Brief cùng Dàn ý Chi tiết (H1 - H4) cho bài viết SEO.

=== TỪ KHÓA CHÍNH BẮT BUỘC ===
"${selectedKeyword}"

=== CHỦ ĐỀ & THỰC THỂ TỪ VIDEO ===
- Chủ đề gốc video: ${contentAnalysis.mainTopic}
- Nỗi đau độc giả: ${JSON.stringify(contentAnalysis.context?.painPoints || [])}
- Các giá trị thực tế: ${JSON.stringify(contentAnalysis.uniqueValues || [])}
- Từ khóa LSI gợi ý: ${lsiKeywords.slice(0, 10).join(', ')}

=== THIẾT LẬP GIỌNG VĂN & ĐỐI TƯỢNG (HOME CARE PERSONA) ===
- Giọng văn chung: ${brandVoice.general_voice}
- Tone chính: ${brandVoice.core_tone}
- Mức độ chuyên môn: ${brandVoice.expertise_level}
- Đối tượng độc giả: ${brandVoice.target_audience}
- Cách xưng hô: ${brandVoice.addressing_terms.join(', ')}
- Cách gọi thương hiệu: ${brandVoice.brand_name} (xuất hiện tự nhiên, tinh tế, không gượng ép quảng cáo)
- Phong cách: ${brandVoice.style}
- Mức độ cảm xúc: ${brandVoice.emotional_level}
- Nguyên tắc viết:
  * ${brandVoice.writing_principles.join('\n  * ')}
  * BẮT BUỘC 100% TIẾNG VIỆT CHUẨN XÁC: Tuyệt đối không dùng bất kỳ ký tự tiếng Trung/chữ Hán nào.

=== QUY ĐỊNH BẮT BUỘC VỀ BỐ CỤC DÀN Ý ===
1. TIÊU ĐỀ H1:
   - Chứa từ khóa chính "${selectedKeyword}".
   - Độ dài: Dưới 60 ký tự.
   - Áp dụng các công thức kích thích click cao (High-CTR):
     * Cảnh báo: Những điều bạn phải biết về [TỪ KHÓA]
     * [N] cách nhanh chóng và dễ dàng để [TỪ KHÓA]
     * Sai lầm phổ biến nhiều người mắc phải khi [TỪ KHÓA]
     * Mọi điều bạn cần biết về [TỪ KHÓA]
     * Khám phá bí mật [TỪ KHÓA]
     * 7 bài học về [TỪ KHÓA] ít ai chia sẻ
   - KHÔNG dùng Title Case (chỉ viết hoa chữ cái đầu tiên của tiêu đề).
   - TUYỆT ĐỐI KHÔNG dùng dấu hai chấm ":" trong tiêu đề.
   - TUYỆT ĐỐI KHÔNG chứa bất kỳ từ cấm nào.

2. MỞ BÀI (SAPO) BLUEPRINT:
   - Dài tối đa 2 đoạn văn.
   - Đoạn 1: Dòng 1 chứa ngay **${selectedKeyword}** (in đậm), xoáy thẳng vào nỗi đau, băn khoăn bức thiết của mẹ.
   - Đoạn 2: Nêu giải pháp và giá trị thiết thực bài viết mang lại.
   - CẤM VĂN MẪU SÁO RỖNG ("Trong xã hội hiện đại...", "Như chúng ta đã biết...", "Nhu cầu tìm hiểu...").

3. CẤU TRÚC HEADING H2, H3, H4 (BẮT BUỘC 4 ĐẾN 6 ĐỀ MỤC H2):
   - BẮT BUỘC DÀN Ý PHẢI CÓ TỪ 4 ĐẾN 6 ĐỀ MỤC H2 CHUYÊN SÂU:
     * H2 thứ nhất: Thấu hiểu nỗi băn khoăn, nguyên nhân hoặc lợi ích cốt lõi cho mẹ.
     * H2 thứ hai: Hướng dẫn chi tiết từng bước thực hành an toàn (kèm chỉ định chèn Video YouTube).
     * H2 thứ ba: Bảng so sánh đối chiếu / Các sai lầm phổ biến cần tránh.
     * H2 thứ tư: "Câu hỏi thường gặp về ${selectedKeyword}" (Mục FAQs giải đáp thắc mắc).
     * H2 thứ năm: "Lời nhắn gửi yêu thương và tư vấn từ Home Care" (Mục CTA).
   - Đâm thẳng vào ý định tìm kiếm (Search Intent).
   - Chỉ viết hoa chữ cái đầu tiên, không chứa dấu hai chấm ":".
   - Chỉ định rõ vị trí chèn Video YouTube (nhúng dạng responsive iframe kèm chú thích).
   - Bắt buộc có vị trí chỉ định chèn Bảng so sánh / tổng hợp dữ liệu (tối ưu AI Search & GEO).
   - Gợi ý vị trí các khối mô tả ảnh [ảnh 1: ...], [ảnh 2: ...].
   - Kết bài và lời kêu gọi hành động (CTA) nhẹ nhàng, tinh tế đồng hành cùng mẹ từ Home Care.

4. BỘ LỌC TỪ CẤM TUYỆT ĐỐI:
   TUYỆT ĐỐI KHÔNG xuất hiện các từ sau trong tiêu đề hay dàn ý:
   ${bannedListStr}
   Không dùng từ "thiên nhiên" (thay bằng "tự nhiên"). Hạn chế tối đa từ "nên".

=== QUY ĐỊNH BẮT BUỘC VỀ ĐỊNH DẠNG JSON (TRÁNH LỖI CÚ PHÁP) ===
- Trả về đúng 1 đối tượng JSON duy nhất hợp lệ, không có markdown code blocks hay văn bản giải thích thừa.
- TUYỆT ĐỐI KHÔNG dùng dấu ngoặc kép đôi " bên trong giá trị chuỗi (hãy dùng dấu nháy đơn ' hoặc không dùng ngoặc, ví dụ: 'thần thánh' thay vì "thần thánh") để tránh gây lỗi Unterminated string.
- Không để ký tự xuống dòng thô (raw newline) bên trong chuỗi JSON.

=== CẤU TRÚC JSON MẪU ===
{
  "contentBrief": {
    "targetAudience": "${brandVoice.target_audience}",
    "searchIntent": "Loại search intent và mục tiêu đáp ứng",
    "coreMessage": "Thông điệp cốt lõi bài viết muốn truyền tải",
    "uniqueAngle": "Điểm độc đáo khai thác từ trải nghiệm thực tế trong video",
    "seoMeta": {
      "seoTitle": "Tiêu đề SEO < 60 ký tự chứa từ khóa chính",
      "slug": "url-slug-chua-tu-khoa-chinh-khong-dau",
      "metaDescription": "Mô tả meta < 160 ký tự chứa từ khóa chính và CTA ấm áp"
    }
  },
  "outline": [
    {
      "level": "H1",
      "title": "Tiêu đề bài viết chuẩn CTR không dấu hai chấm"
    },
    {
      "level": "Sapo",
      "guideline": "Hướng dẫn viết đoạn 1 nỗi đau (chứa từ khóa in đậm) + đoạn 2 giải pháp"
    },
    {
      "level": "H2",
      "title": "Tên đề mục H2 thứ nhất (chỉ viết hoa chữ đầu)",
      "intent": "Mục đích giải quyết câu hỏi gì của mẹ",
      "items": [
        {
          "level": "H3",
          "title": "Tên tiểu mục H3",
          "notes": "Ý chính cần triển khai"
        }
      ]
    },
    {
      "level": "H2",
      "title": "Tên đề mục H2 có chèn video YouTube hoặc bảng so sánh",
      "hasVideoEmbed": true,
      "hasComparisonTable": true,
      "items": []
    },
    {
      "level": "H2",
      "title": "Câu hỏi thường gặp về [từ khóa chính]",
      "isFaq": true,
      "items": [
        { "level": "H3", "title": "Câu hỏi thường gặp 1?" },
        { "level": "H3", "title": "Câu hỏi thường gặp 2?" }
      ]
    },
    {
      "level": "H2",
      "title": "Lời nhắn gửi yêu thương từ Home Care",
      "isCta": true
    }
  ]
}
`;
}

module.exports = {
  buildGenerateOutlinePrompt
};
