require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const { getYouTubeData } = require('./services/youtubeService');
const { callGemini, getApiKeyStatus, getAvailableOpenRouterModels } = require('./services/llmService');
const { gradeSeoArticle } = require('./services/seoGraderService');
const { generateDocxBuffer } = require('./services/docxExportService');
const { parseArticleResponse, autoOptimizeArticleForSeo, convertMarkdownToCleanHtml } = require('./services/articleParser');
const { publishToWordPress } = require('./services/wordpressService');

const { buildAnalyzeContentPrompt } = require('./prompts/analyzeContent');
const { buildSuggestKeywordsPrompt } = require('./prompts/suggestKeywords');
const { buildGenerateOutlinePrompt } = require('./prompts/generateOutline');
const { buildWriteArticlePrompt } = require('./prompts/writeArticle');
const { buildAuditArticlePrompt } = require('./prompts/auditArticle');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// 1. Kiểm tra trạng thái cấu hình Server
app.get('/api/config-status', (req, res) => {
  try {
    const customKey = req.query.apiKey || null;
    const status = getApiKeyStatus(customKey);
    res.json({
      success: true,
      llmStatus: status,
      defaultPort: PORT
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 1.1 Lấy toàn bộ danh sách Model từ OpenRouter
app.get('/api/openrouter-models', async (req, res) => {
  try {
    const apiKey = req.query.apiKey || null;
    const models = await getAvailableOpenRouterModels(apiKey);
    res.json({ success: true, models, count: models.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Lấy danh sách link nội bộ mặc định
app.get('/api/default-links', (req, res) => {
  try {
    const linksPath = path.join(__dirname, 'config', 'defaultLinks.json');
    if (fs.existsSync(linksPath)) {
      const data = JSON.parse(fs.readFileSync(linksPath, 'utf8'));
      return res.json({ success: true, links: data });
    }
    res.json({ success: true, links: [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Bước 1: Thu thập Dữ liệu YouTube
app.post('/api/extract-youtube', async (req, res) => {
  try {
    const { url, youtubeApiKey } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, error: 'Thiếu đường dẫn URL YouTube' });
    }

    console.log(`[YouTube Service] Đang trích xuất dữ liệu từ video: ${url}...`);
    const data = await getYouTubeData(url, youtubeApiKey);
    res.json({ success: true, data });
  } catch (err) {
    console.error('[YouTube Service Error]:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Bước 2 & 3: Phân tích Nội dung & Thực thể Semantic (LLM Agent 1)
app.post('/api/analyze-content', async (req, res) => {
  try {
    const { metadata, transcript, apiKey, model } = req.body;
    if (!apiKey || !apiKey.trim()) {
      return res.status(400).json({ success: false, error: 'Vui lòng nhập API Key (Google Gemini hoặc OpenRouter) trên giao diện để tiếp tục!' });
    }
    if (!metadata || !transcript) {
      return res.status(400).json({ success: false, error: 'Thiếu thông tin metadata hoặc transcript' });
    }

    console.log('[LLM Agent 1] Đang phân tích Topic, Entities, Context...');
    const prompt = buildAnalyzeContentPrompt(metadata, transcript);
    const analysis = await callGemini(prompt, { apiKey, model, isJson: true, maxTokens: 2500 });

    res.json({ success: true, analysis });
  } catch (err) {
    console.error('[LLM Agent 1 Error]:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Bước 4: Gợi ý Từ khóa SEO & Search Intent (LLM Agent 2)
app.post('/api/suggest-keywords', async (req, res) => {
  try {
    const { contentAnalysis, metadata, apiKey, model } = req.body;
    if (!apiKey || !apiKey.trim()) {
      return res.status(400).json({ success: false, error: 'Vui lòng nhập API Key (Google Gemini hoặc OpenRouter) trên giao diện để tiếp tục!' });
    }
    if (!contentAnalysis) {
      return res.status(400).json({ success: false, error: 'Thiếu dữ liệu phân tích nội dung' });
    }

    console.log('[LLM Agent 2] Đang nghiên cứu từ khóa SEO và Search Intent...');
    const prompt = buildSuggestKeywordsPrompt(contentAnalysis, metadata || {});
    const keywordsData = await callGemini(prompt, { apiKey, model, isJson: true, maxTokens: 2000 });

    res.json({ success: true, keywordsData });
  } catch (err) {
    console.error('[LLM Agent 2 Error]:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

function generateVietnameseSlug(str) {
  if (!str) return '';
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function normalizeOutlineResponse(rawOutlineData, selectedKeyword, contentAnalysis = {}) {
  const data = rawOutlineData && typeof rawOutlineData === 'object' ? { ...rawOutlineData } : {};

  // 1. Chuẩn hóa Content Brief & SEO Meta
  if (!data.contentBrief || typeof data.contentBrief !== 'object') {
    data.contentBrief = {};
  }
  const brief = data.contentBrief;

  // Search Intent
  if (!brief.searchIntent || typeof brief.searchIntent !== 'string' || !brief.searchIntent.trim()) {
    brief.searchIntent = `Tìm kiếm giải pháp, hướng dẫn an toàn, khoa học và dễ thực hiện tại nhà về "${selectedKeyword}"`;
  }

  // SEO Meta
  if (!brief.seoMeta || typeof brief.seoMeta !== 'object') {
    brief.seoMeta = {};
  }

  // SEO Title: < 60 ký tự, chứa từ khóa chính
  let seoTitle = brief.seoMeta.seoTitle || brief.seoTitle || brief.metaTitle || data.seoTitle || data.title || '';
  if (!seoTitle || !seoTitle.toLowerCase().includes(selectedKeyword.toLowerCase())) {
    seoTitle = `Mọi điều bạn cần biết về ${selectedKeyword}`;
  }
  if (seoTitle.length > 60) {
    seoTitle = seoTitle.substring(0, 58).trim();
  }
  brief.seoMeta.seoTitle = seoTitle;

  // Slug: không dấu, gạch ngang, < 60 ký tự
  let slug = brief.seoMeta.slug || brief.slug || generateVietnameseSlug(selectedKeyword);
  if (!slug || slug.length > 60) {
    slug = generateVietnameseSlug(selectedKeyword).substring(0, 55).replace(/-+$/, '');
  }
  brief.seoMeta.slug = slug;

  // Meta Description: 140 - 160 ký tự, chứa từ khóa, có CTA
  let metaDescription = brief.seoMeta.metaDescription || brief.metaDescription || '';
  if (!metaDescription || !metaDescription.toLowerCase().includes(selectedKeyword.toLowerCase()) || metaDescription.length > 165) {
    metaDescription = `Băn khoăn về ${selectedKeyword}? Khám phá hướng dẫn chi tiết, an toàn tại nhà từ chuyên gia Home Care. Xem ngay mẹo hữu ích giúp mẹ an tâm!`;
  }
  if (metaDescription.length > 160) {
    metaDescription = metaDescription.substring(0, 158).trim();
  }
  brief.seoMeta.metaDescription = metaDescription;

  // 2. Chuẩn hóa Mảng Dàn Ý (Outline)
  let rawList = data.outline || data.sections || data.headings || data.items || data.dàn_ý || [];
  if (!Array.isArray(rawList)) rawList = [];

  // Nếu dàn ý bị rỗng hoặc quá ít đề mục (< 3 mục), tự động tạo dàn ý 7 phần hoàn chỉnh chuẩn SEO
  if (rawList.length < 3) {
    console.warn(`[Outline Normalizer] Dàn ý từ LLM có ${rawList.length} mục. Tự động kiến tạo dàn ý chuẩn 7 phần...`);
    rawList = [
      {
        level: 'H1',
        title: seoTitle
      },
      {
        level: 'Sapo',
        guideline: `Đoạn 1: Mở đầu trực diện xoáy vào nỗi băn khoăn và trải nghiệm thực tế của mẹ khi tìm kiếm **${selectedKeyword}**.\nĐoạn 2: Giới thiệu giải pháp hữu ích, khoa học và an toàn mà bài viết cùng Home Care mang lại.`
      },
      {
        level: 'H2',
        title: `Vì sao mẹ nên tìm hiểu ${selectedKeyword} an toàn và khoa học`,
        intent: 'Giải thích nguyên nhân cốt lõi và lợi ích quan trọng nhất cho mẹ và bé'
      },
      {
        level: 'H2',
        title: `Hướng dẫn chi tiết cách thực hiện ${selectedKeyword} đúng chuẩn tại nhà`,
        hasVideoEmbed: true,
        intent: 'Quy trình từng bước chi tiết, kèm video trực quan minh họa'
      },
      {
        level: 'H2',
        title: `Bảng tổng hợp đối chiếu và các sai lầm phổ biến mẹ cần tránh`,
        hasComparisonTable: true,
        intent: 'Bảng so sánh tối ưu GEO/AI Search và các lưu ý an toàn thực tế'
      },
      {
        level: 'H2',
        title: `Câu hỏi thường gặp về ${selectedKeyword}`,
        isFaq: true,
        items: [
          { level: 'H3', title: `Thực hiện ${selectedKeyword} bao lâu một lần là phù hợp?` },
          { level: 'H3', title: `Những lưu ý an toàn quan trọng nhất mẹ cần nhớ?` }
        ]
      },
      {
        level: 'H2',
        title: `Lời nhắn gửi yêu thương và đồng hành cùng mẹ từ Home Care`,
        isCta: true
      }
    ];
  } else {
    // Đảm bảo H1 ở vị trí đầu tiên
    const hasH1 = rawList.some(item => (item.level || '').toUpperCase() === 'H1');
    if (!hasH1) {
      rawList.unshift({ level: 'H1', title: seoTitle });
    }

    // Đảm bảo Sapo ở vị trí thứ hai
    const hasSapo = rawList.some(item => (item.level || '').toLowerCase() === 'sapo');
    if (!hasSapo) {
      rawList.splice(1, 0, {
        level: 'Sapo',
        guideline: `Đoạn 1: Thấu hiểu nỗi lo lắng của mẹ về **${selectedKeyword}**.\nĐoạn 2: Giải pháp thực tế và an toàn từ Home Care.`
      });
    }

    // Đảm bảo có video embed ở ít nhất 1 H2
    const hasVideo = rawList.some(item => item.hasVideoEmbed);
    if (!hasVideo && rawList.length >= 3) {
      const targetH2 = rawList.slice(2).find(item => (item.level || '').toUpperCase() === 'H2');
      if (targetH2) targetH2.hasVideoEmbed = true;
    }

    // Đảm bảo có table ở ít nhất 1 H2
    const hasTable = rawList.some(item => item.hasComparisonTable);
    if (!hasTable && rawList.length >= 4) {
      const targetH2 = rawList.slice(3).find(item => (item.level || '').toUpperCase() === 'H2' && !item.hasVideoEmbed);
      if (targetH2) targetH2.hasComparisonTable = true;
    }

    // Đảm bảo có FAQ
    const hasFaq = rawList.some(item => /câu hỏi thường gặp|faqs|faq/i.test(item.title || ''));
    if (!hasFaq) {
      rawList.push({
        level: 'H2',
        title: `Câu hỏi thường gặp về ${selectedKeyword}`,
        isFaq: true,
        items: [
          { level: 'H3', title: `Thực hiện ${selectedKeyword} bao lâu một lần là phù hợp?` },
          { level: 'H3', title: `Những lưu ý an toàn quan trọng nhất mẹ cần nhớ?` }
        ]
      });
    }

    // Đảm bảo có CTA
    const hasCta = rawList.some(item => /lời nhắn gửi|tư vấn|đồng hành/i.test(item.title || ''));
    if (!hasCta) {
      rawList.push({
        level: 'H2',
        title: `Lời nhắn gửi yêu thương và đồng hành cùng mẹ từ Home Care`,
        isCta: true
      });
    }
  }

  data.outline = rawList;
  return data;
}

// 6. Bước 5: Tạo Content Brief & Lập Dàn Ý Outline (LLM Agent 3)
app.post('/api/generate-outline', async (req, res) => {
  try {
    const { selectedKeyword, contentAnalysis, lsiKeywords, options, apiKey, model } = req.body;
    if (!apiKey || !apiKey.trim()) {
      return res.status(400).json({ success: false, error: 'Vui lòng nhập API Key (Google Gemini hoặc OpenRouter) trên giao diện để tiếp tục!' });
    }
    if (!selectedKeyword || !contentAnalysis) {
      return res.status(400).json({ success: false, error: 'Thiếu từ khóa chính hoặc dữ liệu phân tích' });
    }

    console.log(`[LLM Agent 3] Đang lập Dàn ý H1-H4 cho từ khóa: "${selectedKeyword}"...`);
    const prompt = buildGenerateOutlinePrompt(selectedKeyword, contentAnalysis, lsiKeywords || [], options || {});
    let outlineData = await callGemini(prompt, { apiKey, model, isJson: true, maxTokens: 8192 });

    // Chuẩn hóa và bảo đảm 100% không bao giờ thiếu Content Brief hoặc Dàn ý
    outlineData = normalizeOutlineResponse(outlineData, selectedKeyword, contentAnalysis);

    res.json({ success: true, outlineData });
  } catch (err) {
    console.error('[LLM Agent 3 Error]:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Bước 6: Chuyển đổi thành Bài viết Hoàn chỉnh (LLM Agent 4)
app.post('/api/write-article', async (req, res) => {
  try {
    const { approvedOutline, selectedKeyword, youtubeData, contentAnalysis, internalLinks, options, apiKey, model } = req.body;
    if (!apiKey || !apiKey.trim()) {
      return res.status(400).json({ success: false, error: 'Vui lòng nhập API Key (Google Gemini hoặc OpenRouter) trên giao diện để tiếp tục!' });
    }
    if (!approvedOutline || !selectedKeyword || !youtubeData) {
      return res.status(400).json({ success: false, error: 'Thiếu thông tin dàn ý hoặc dữ liệu video' });
    }

    console.log(`[LLM Agent 4] Đang viết bài SEO + Semantic + AEO cho từ khóa: "${selectedKeyword}"...`);
    const prompt = buildWriteArticlePrompt(approvedOutline, selectedKeyword, youtubeData, contentAnalysis, internalLinks || [], options || {});
    
    // Tăng maxTokens lên 3500 để bài viết dài từ 1.200 - 1.800 từ trọn vẹn, không bị cắt cụt
    const rawResponse = await callGemini(prompt, { apiKey, model, isJson: false, maxTokens: 3500, temperature: 0.7 });
    
    // Parse an toàn và tự động tối ưu hóa toàn diện đạt chuẩn 95 - 100 điểm
    const articleData = parseArticleResponse(rawResponse, selectedKeyword, { youtubeData, internalLinks });

    res.json({ success: true, articleData });
  } catch (err) {
    console.error('[LLM Agent 4 Error]:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7.1 Endpoint 1-click tự động nâng cấp bài viết đạt 95 - 100 điểm SEO
app.post('/api/auto-optimize', async (req, res) => {
  try {
    const { articleData, selectedKeyword, youtubeData, internalLinks } = req.body;
    if (!articleData || !selectedKeyword) {
      return res.status(400).json({ success: false, error: 'Thiếu dữ liệu bài viết để tối ưu' });
    }

    console.log(`[Auto-Optimizer] Đang tối ưu hóa nâng cấp bài viết lên 95 - 100 điểm cho từ khóa: "${selectedKeyword}"...`);
    const optimized = autoOptimizeArticleForSeo(articleData, selectedKeyword, { youtubeData, internalLinks });
    const seoReport = gradeSeoArticle(optimized, selectedKeyword);

    res.json({
      success: true,
      articleData: optimized,
      seoReport
    });
  } catch (err) {
    console.error('[Auto-Optimizer Error]:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Bước 7: Kiểm tra Chất lượng & Chấm điểm SEO 16 tiêu chí (LLM Agent 5 + Rule Engine)
app.post('/api/grade-seo', async (req, res) => {
  try {
    const { articleData, selectedKeyword, apiKey, model } = req.body;
    if (!articleData || !selectedKeyword) {
      return res.status(400).json({ success: false, error: 'Thiếu dữ liệu bài viết để chấm điểm' });
    }

    console.log(`[SEO Grader] Đang chấm điểm 16 tiêu chí cho bài viết...`);
    // Cập nhật lại Clean HTML từ contentMarkdown mới nhất mà người dùng vừa sửa
    articleData.cleanHtml = convertMarkdownToCleanHtml(articleData.contentMarkdown);
    const seoReport = gradeSeoArticle(articleData, selectedKeyword);

    // Gọi LLM Agent 5 để kiểm duyệt sâu nếu có API Key
    let auditReview = null;
    try {
      const auditPrompt = buildAuditArticlePrompt(articleData, selectedKeyword, seoReport);
      auditReview = await callGemini(auditPrompt, { apiKey, model, isJson: true, maxTokens: 2000 });
    } catch (e) {
      console.warn('[LLM Agent 5 Warning]: Bỏ qua audit chuyên sâu do lỗi API:', e.message);
    }

    res.json({
      success: true,
      seoReport,
      auditReview,
      articleData
    });
  } catch (err) {
    console.error('[SEO Grader Error]:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. Bước 8: Đẩy bài viết lên WordPress thông qua REST API
app.post('/api/publish-wordpress', async (req, res) => {
  try {
    const { siteUrl, apiKey, username, appPassword, postStatus, articleData, selectedKeyword } = req.body;
    const finalApiKey = apiKey || appPassword;
    if (!siteUrl || (!finalApiKey && !username)) {
      return res.status(400).json({ success: false, error: 'Vui lòng cung cấp URL website và API Key / Application Password của WordPress' });
    }

    const publishResult = await publishToWordPress({
      siteUrl,
      apiKey: finalApiKey,
      username,
      appPassword,
      postStatus,
      articleData,
      selectedKeyword
    });

    res.json({ success: true, data: publishResult });
  } catch (err) {
    console.error('[WordPress Publish Error]:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 10. Xuất File Word .docx
app.post('/api/export-docx', async (req, res) => {
  try {
    const { articleData, selectedKeyword } = req.body;
    if (!articleData) {
      return res.status(400).json({ success: false, error: 'Thiếu dữ liệu bài viết' });
    }

    const buffer = await generateDocxBuffer(articleData, selectedKeyword || 'bai-viet-seo');
    const filename = `Bai_Viet_SEO_${(selectedKeyword || 'article').replace(/[^a-zA-Z0-9]/g, '_')}.docx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(buffer);
  } catch (err) {
    console.error('[DOCX Export Error]:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`  YOUTUBE SEO ARTICLE GENERATOR (Node.js & LLM)    `);
  console.log(`  Ứng dụng đang chạy tại: http://localhost:${PORT} `);
  console.log(`====================================================`);
});
