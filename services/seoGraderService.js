const bannedWordsData = require('../config/bannedWords.json');
const criteriaConfig = require('../config/seoCriteria.json');

/**
 * Tính toán mật độ từ khóa chính (Keyword Density)
 */
function calculateKeywordDensity(text, keyword) {
  if (!text || !keyword) return { count: 0, density: 0, totalWords: 0 };
  
  // Chuẩn hóa và đếm tổng số từ
  const cleanWords = text.toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const totalWords = cleanWords.length;
  if (totalWords === 0) return { count: 0, density: 0, totalWords: 0 };

  // Đếm số lần xuất hiện của từ khóa
  const normalizedText = text.toLowerCase();
  const normalizedKw = keyword.toLowerCase().trim();
  
  const regex = new RegExp(`(?<!\\p{L})${escapeRegex(normalizedKw)}(?!\\p{L})`, 'gui');
  const matches = normalizedText.match(regex);
  const count = matches ? matches.length : 0;

  const kwWordsCount = normalizedKw.split(/\s+/).length;
  const density = parseFloat(((count * kwWordsCount / totalWords) * 100).toFixed(2));

  return {
    count,
    density,
    totalWords,
    kwWordsCount
  };
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Quét danh sách từ cấm theo AGENTS.md
 */
function scanBannedWords(text) {
  if (!text) return { foundBanned: [], warnings: [] };
  const lower = text.toLowerCase();
  const foundBanned = [];
  const warnings = [];

  for (const banned of bannedWordsData.banned_words) {
    const regex = new RegExp(`(?<!\\p{L})${escapeRegex(banned.toLowerCase())}(?!\\p{L})`, 'gui');
    const matches = lower.match(regex);
    if (matches) {
      foundBanned.push({
        word: banned,
        count: matches.length
      });
    }
  }

  // Quét từ "thiên nhiên"
  const thienNhienRegex = /(?<!\p{L})thiên nhiên(?!\p{L})/gui;
  const thienNhienMatches = lower.match(thienNhienRegex);
  if (thienNhienMatches) {
    warnings.push({
      type: 'REPLACE_WORD',
      message: `Phát hiện ${thienNhienMatches.length} từ 'thiên nhiên'. Cần thay thế bằng 'tự nhiên' theo quy chuẩn.`
    });
  }

  // Quét từ "nên"
  const nenRegex = /(?<!\p{L})nên(?!\p{L})/gui;
  const nenMatches = lower.match(nenRegex);
  if (nenMatches && nenMatches.length > 5) {
    warnings.push({
      type: 'OVERUSE_WORD',
      message: `Phát hiện từ 'nên' xuất hiện ${nenMatches.length} lần. Hãy hạn chế sử dụng từ này quá nhiều trong bài viết.`
    });
  }

  return { foundBanned, warnings };
}

/**
 * Chấm điểm toàn diện 16 tiêu chí (100 điểm) theo SPEC_CHAM_BAI_VIET_BLOG_CHUAN_SEO.md
 */
function gradeSeoArticle(articleData, selectedKeyword) {
  const {
    h1Title = '',
    metaTitle = '',
    slug = '',
    metaDescription = '',
    contentMarkdown = '',
    cleanHtml = ''
  } = articleData;

  const fullText = (contentMarkdown || '') + ' ' + (cleanHtml || '');
  const kw = (selectedKeyword || '').trim().toLowerCase();

  const kwStats = calculateKeywordDensity(contentMarkdown, kw);
  const bannedScan = scanBannedWords(fullText);

  const scores = [];
  let totalScore = 0;
  const criticalErrors = [];
  const optimizations = [];

  // Lấy 2 đoạn đầu tiên (Sapo)
  const paragraphs = contentMarkdown
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0 && !p.startsWith('#'));
  const firstParagraph = paragraphs[0] || '';
  const sapoText = (paragraphs.slice(0, 2).join(' ')) || '';

  // 1. Search Intent (10đ)
  let s1 = 10;
  if (!h1Title.toLowerCase().includes(kw)) {
    s1 -= 3;
    optimizations.push('Tiêu đề H1 chưa chứa từ khóa chính rõ ràng.');
  }
  if (!sapoText.toLowerCase().includes(kw)) {
    s1 -= 4;
    criticalErrors.push('🔴 Mở bài chưa chứa từ khóa chính để khẳng định Search Intent.');
  }
  scores.push({ id: 1, name: 'Search Intent', score: Math.max(0, s1), max: 10 });

  // 2. Tiêu đề SEO (8đ)
  let s2 = 8;
  const targetTitle = metaTitle || h1Title;
  if (targetTitle.length > 65) {
    s2 -= 2;
    optimizations.push(`Tiêu đề SEO dài ${targetTitle.length} ký tự (vượt ngưỡng khuyến nghị 60 ký tự).`);
  }
  if (!targetTitle.toLowerCase().includes(kw)) {
    s2 -= 3;
    criticalErrors.push('🔴 Tiêu đề SEO thiếu từ khóa chính.');
  }
  if (targetTitle.includes(':')) {
    s2 -= 2;
    optimizations.push('Tiêu đề chứa dấu hai chấm ":" (quy chuẩn AGENTS.md cấm dấu hai chấm trong tiêu đề).');
  }
  scores.push({ id: 2, name: 'Tiêu đề SEO', score: Math.max(0, s2), max: 8 });

  // 3. URL bài viết (Slug) (5đ)
  let s3 = 5;
  if (!slug || slug.length === 0) {
    s3 = 0;
    criticalErrors.push('🔴 Thiếu URL slug.');
  } else {
    if (slug.length > 60) s3 -= 1;
    if (/[?&=%]/g.test(slug)) s3 -= 2;
  }
  scores.push({ id: 3, name: 'URL bài viết', score: Math.max(0, s3), max: 5 });

  // 4. Meta Description (7đ)
  let s4 = 7;
  if (!metaDescription) {
    s4 = 0;
    criticalErrors.push('🔴 Thiếu Meta Description.');
  } else {
    if (metaDescription.length > 165) s4 -= 2;
    if (!metaDescription.toLowerCase().includes(kw)) {
      s4 -= 3;
      criticalErrors.push('🔴 Meta Description thiếu từ khóa chính.');
    }
    const hasCta = /xem ngay|đọc ngay|tìm hiểu|khám phá|trải nghiệm|liên hệ|nhận tư vấn|chi tiết/i.test(metaDescription);
    if (!hasCta) {
      s4 -= 1;
      optimizations.push('Thẻ Meta nên bổ sung thêm lời kêu gọi hành động (CTA: xem ngay, khám phá ngay...).');
    }
  }
  scores.push({ id: 4, name: 'Thẻ mô tả Meta Description', score: Math.max(0, s4), max: 7 });

  // 5. Mở bài (Sapo) (7đ)
  let s5 = 7;
  const hasBoldKwInFirstPara = firstParagraph.includes(`**${kw}**`) || 
                               firstParagraph.toLowerCase().includes(`**${kw}`) ||
                               firstParagraph.toLowerCase().includes(`<strong>${kw}</strong>`);
  if (!hasBoldKwInFirstPara) {
    s5 -= 3;
    optimizations.push(`Từ khóa chính "${kw}" chưa được in đậm ngay ở đoạn mở đầu bài viết.`);
  }
  if (paragraphs.length < 2) {
    s5 -= 1;
  }
  if (/trong xã hội hiện đại|như chúng ta đã biết|nhu cầu tìm hiểu/i.test(sapoText)) {
    s5 -= 3;
    criticalErrors.push('🔴 Mở bài vi phạm quy tắc văn mẫu sáo rỗng.');
  }
  scores.push({ id: 5, name: 'Mở bài (Sapo)', score: Math.max(0, s5), max: 7 });

  // 6. Nội dung chính (12đ)
  let s6 = 12;
  if (kwStats.totalWords < 800) {
    s6 -= 5;
    criticalErrors.push(`🔴 Nội dung bài viết hơi mỏng (${kwStats.totalWords} từ). Tiêu chuẩn cần từ 1.000 từ trở lên.`);
  } else if (kwStats.totalWords < 1200) {
    s6 -= 2;
    optimizations.push(`Bài viết có độ dài ${kwStats.totalWords} từ. Có thể bổ sung thêm ví dụ thực tế để bài sâu sắc hơn.`);
  }
  scores.push({ id: 6, name: 'Nội dung chính', score: Math.max(0, s6), max: 12 });

  // 7. Semantic SEO & LSI (10đ)
  let s7 = 10;
  const hasFaq = /câu hỏi thường gặp|thắc mắc thường gặp|faqs|faq/i.test(fullText);
  if (!hasFaq) {
    s7 -= 3;
    optimizations.push('Nên có mục Câu hỏi thường gặp (FAQs) để phủ ngữ nghĩa thực thể Semantic SEO.');
  }
  scores.push({ id: 7, name: 'Semantic SEO & LSI', score: Math.max(0, s7), max: 10 });

  // 8. Ảnh bìa (5đ)
  let s8 = 5;
  const hasFeaturedImage = /\[ảnh bìa|ảnh đại diện|featured image/i.test(fullText);
  if (!hasFeaturedImage) {
    s8 = 3; // tạm trừ 2 điểm nếu chưa ghi rõ chỉ định ảnh bìa
    optimizations.push('Cần chỉ định rõ mô tả Ảnh bìa (Featured Image).');
  }
  scores.push({ id: 8, name: 'Ảnh bìa', score: Math.max(0, s8), max: 5 });

  // 9. Hình ảnh trong bài & Alt Text (4đ)
  let s9 = 4;
  const imageMatches = fullText.match(/\[ảnh\s*\d*:/gi);
  if (!imageMatches || imageMatches.length < 2) {
    s9 -= 2;
    optimizations.push('Nên bổ sung thêm ít nhất 2 khối mô tả ảnh [ảnh ...] dưới các mục hướng dẫn.');
  }
  scores.push({ id: 9, name: 'Hình ảnh trong bài & Alt Text', score: Math.max(0, s9), max: 4 });

  // 10. Liên kết nội bộ (Internal Links) (6đ)
  let s10 = 6;
  const linkMatches = fullText.match(/\[([^\]]+)\]\((http[^)]+)\)|<a\s+(?:[^>]*?\s+)?href="([^"]*)"/gi);
  const linkCount = linkMatches ? linkMatches.length : 0;
  if (linkCount === 0) {
    s10 = 0;
    criticalErrors.push('🔴 Bài viết hoàn toàn thiếu liên kết nội bộ (Internal Links).');
  } else if (linkCount < 2) {
    s10 = 3;
    optimizations.push(`Bài viết mới có ${linkCount} internal link. Khuyến nghị từ 3-4 internal link cho bài >1.000 từ.`);
  }
  scores.push({ id: 10, name: 'Liên kết nội bộ (Internal Links)', score: Math.max(0, s10), max: 6 });

  // 11. CTA (3đ)
  let s11 = 3;
  const hasCtaEnd = /liên hệ|tư vấn|đặt lịch|trải nghiệm|hotline|website|đăng ký/i.test(fullText.slice(-1000));
  if (!hasCtaEnd) {
    s11 -= 1;
    optimizations.push('Đoạn kết chưa có lời kêu gọi hành động (CTA) rõ ràng.');
  }
  scores.push({ id: 11, name: 'Lời kêu gọi hành động (CTA)', score: Math.max(0, s11), max: 3 });

  // 12. Tính dễ đọc (Readability) (5đ)
  let s12 = 5;
  const h2Count = (fullText.match(/<h2|##\s+/gi) || []).length;
  if (h2Count < 3) {
    s12 -= 2;
    optimizations.push('Bài viết ít đề mục H2, nên chia nhỏ thành 3-5 phần để người đọc dễ theo dõi.');
  }
  scores.push({ id: 12, name: 'Tính dễ đọc (Readability)', score: Math.max(0, s12), max: 5 });

  // 13. Tính chỉn chu (3đ)
  let s13 = 3;
  if (contentMarkdown.includes('###') && cleanHtml.includes('###')) {
    s13 -= 1;
    optimizations.push('Còn sót ký tự markdown thô trong mã HTML.');
  }
  scores.push({ id: 13, name: 'Tính chỉn chu', score: Math.max(0, s13), max: 3 });

  // 14. Tính độc đáo (4đ)
  let s14 = 4;
  scores.push({ id: 14, name: 'Tính độc đáo', score: Math.max(0, s14), max: 4 });

  // 15. Tối ưu câu trả lời AI – AEO (6đ)
  let s15 = 6;
  const hasTable = fullText.includes('| ---') || fullText.includes('<table');
  const hasVideo = fullText.includes('youtube.com/embed') || fullText.includes('video-container');
  if (!hasTable) {
    s15 -= 2;
    optimizations.push('Thiếu bảng so sánh/đối chiếu dữ liệu (rất cần thiết để AI trích xuất câu trả lời).');
  }
  if (!hasVideo) {
    s15 -= 2;
    optimizations.push('Chưa chèn mã nhúng Video YouTube vào bài viết.');
  }
  scores.push({ id: 15, name: 'Tối ưu câu trả lời AI (AEO)', score: Math.max(0, s15), max: 6 });

  // 16. Keyword Density (5đ)
  let s16 = 5;
  if (kwStats.density > 5.0) {
    s16 = 0;
    criticalErrors.push(`🔴 MẬT ĐỘ TỪ KHÓA QUÁ CAO (${kwStats.density}% > 5%) - Nguy cơ bị Google phạt nhồi nhét từ khóa!`);
  } else if (kwStats.density > 3.0) {
    s16 = 2;
    criticalErrors.push(`🔴 Mật độ từ khóa cao (${kwStats.density}% > 3%), cần giảm bớt để tự nhiên hơn.`);
  } else if (kwStats.density < 0.5) {
    s16 = 3;
    optimizations.push(`Mật độ từ khóa hơi thấp (${kwStats.density}%). Khuyến nghị từ 1.0% - 2.5%.`);
  }
  scores.push({ id: 16, name: 'Mật độ từ khóa (Keyword Density)', score: Math.max(0, s16), max: 5 });

  // Tính tổng điểm
  totalScore = scores.reduce((sum, item) => sum + item.score, 0);

  // Phạt điểm nếu phát hiện từ cấm
  if (bannedScan.foundBanned.length > 0) {
    const penalty = Math.min(20, bannedScan.foundBanned.length * 5);
    totalScore = Math.max(0, totalScore - penalty);
    criticalErrors.push(`🔴 PHÁT HIỆN ${bannedScan.foundBanned.length} TỪ CẤM VI PHẠM AGENTS.MD: ${bannedScan.foundBanned.map(b => `"${b.word}" (${b.count} lần)`).join(', ')}.`);
  }

  // Xếp loại
  let grade = 'Xuất sắc';
  let badge = '🟢';
  if (totalScore >= 90) {
    grade = 'Tốt';
    badge = '🟢';
  } else if (totalScore >= 80) {
    grade = 'Khá';
    badge = '🟡';
  } else {
    grade = 'Cần cải thiện';
    badge = '🟠';
  }

  return {
    totalScore,
    grade,
    badge,
    scores,
    keywordStats: kwStats,
    bannedWordsFound: bannedScan.foundBanned,
    warnings: bannedScan.warnings,
    criticalErrors,
    optimizations,
    hasVideoEmbed: fullText.includes('youtube.com/embed'),
    hasTable: fullText.includes('| ---') || fullText.includes('<table')
  };
}

module.exports = {
  calculateKeywordDensity,
  scanBannedWords,
  gradeSeoArticle
};
