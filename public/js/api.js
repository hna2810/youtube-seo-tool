/**
 * Client API Module - Giao tiếp với Backend Express Server (Hỗ trợ OpenRouter)
 */
const API = {
  _activeAiController: null,

  getAiSignal() {
    if (this._activeAiController) {
      try { this._activeAiController.abort(); } catch (e) {}
    }
    this._activeAiController = new AbortController();
    return this._activeAiController.signal;
  },

  abortActiveAiRequest() {
    if (this._activeAiController) {
      try { this._activeAiController.abort(); } catch (e) {}
      this._activeAiController = null;
    }
  },

  // 1. Kiểm tra cấu hình Server
  async getConfigStatus() {
    const res = await fetch('/api/config-status');
    return await res.json();
  },

  // 1.1 Lấy toàn bộ danh sách Model từ OpenRouter
  async getOpenRouterModels(apiKey = '') {
    const url = apiKey ? `/api/openrouter-models?apiKey=${encodeURIComponent(apiKey)}` : '/api/openrouter-models';
    const res = await fetch(url);
    return await res.json();
  },

  // 2. Lấy danh sách link nội bộ mặc định
  async getDefaultLinks() {
    const res = await fetch('/api/default-links');
    return await res.json();
  },

  // 3. Trích xuất dữ liệu YouTube
  async extractYouTube(url, youtubeApiKey = null) {
    const res = await fetch('/api/extract-youtube', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, youtubeApiKey })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Lỗi khi thu thập dữ liệu từ YouTube');
    }
    return data.data;
  },

  // 4. Phân tích Nội dung (LLM Agent 1)
  async analyzeContent(metadata, transcript, apiKey = null, model = null) {
    const res = await fetch('/api/analyze-content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metadata, transcript, apiKey, model }),
      signal: this.getAiSignal()
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Lỗi khi phân tích nội dung');
    }
    return data.analysis;
  },

  // 5. Gợi ý Từ khóa SEO & Intent (LLM Agent 2)
  async suggestKeywords(contentAnalysis, metadata, apiKey = null, model = null) {
    const res = await fetch('/api/suggest-keywords', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contentAnalysis, metadata, apiKey, model }),
      signal: this.getAiSignal()
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Lỗi khi gợi ý từ khóa SEO');
    }
    return data.keywordsData;
  },

  // 6. Tạo Content Brief & Dàn ý H1-H4 (LLM Agent 3)
  async generateOutline(selectedKeyword, contentAnalysis, lsiKeywords, options = {}, apiKey = null, model = null) {
    const res = await fetch('/api/generate-outline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selectedKeyword, contentAnalysis, lsiKeywords, options, apiKey, model }),
      signal: this.getAiSignal()
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Lỗi khi tạo dàn ý bài viết');
    }
    return data.outlineData;
  },

  // 7. Viết bài hoàn chỉnh SEO/Semantic/AEO (LLM Agent 4)
  async writeArticle(approvedOutline, selectedKeyword, youtubeData, contentAnalysis, internalLinks, options = {}, apiKey = null, model = null) {
    const res = await fetch('/api/write-article', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approvedOutline, selectedKeyword, youtubeData, contentAnalysis, internalLinks, options, apiKey, model }),
      signal: this.getAiSignal()
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Lỗi khi viết bài hoàn chỉnh');
    }
    return data.articleData;
  },

  // 8. Chấm điểm SEO 16 tiêu chí (LLM Agent 5 + Rule Engine)
  async gradeSeo(articleData, selectedKeyword, apiKey = null, model = null) {
    const res = await fetch('/api/grade-seo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articleData, selectedKeyword, apiKey, model }),
      signal: this.getAiSignal()
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Lỗi khi chấm điểm SEO');
    }
    return data;
  },

  // 9. Tải file Word .docx
  async downloadDocx(articleData, selectedKeyword) {
    const res = await fetch('/api/export-docx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articleData, selectedKeyword })
    });
    if (!res.ok) {
      throw new Error('Lỗi khi tải file Word');
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bai_Viet_SEO_${(selectedKeyword || 'article').replace(/[^a-zA-Z0-9]/g, '_')}.docx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },

  // 10. Đẩy bài viết lên WordPress qua REST API
  async publishWordPress(siteUrlOrObj, apiKeyOrUser, appPasswordOrStatus, postStatusOrArticle, articleDataOrKeyword, selectedKeyword) {
    let payload = {};
    if (typeof siteUrlOrObj === 'object' && siteUrlOrObj !== null) {
      payload = siteUrlOrObj;
    } else {
      // Positional args support
      payload = {
        siteUrl: siteUrlOrObj,
        apiKey: apiKeyOrUser,
        postStatus: appPasswordOrStatus,
        articleData: postStatusOrArticle,
        selectedKeyword: articleDataOrKeyword
      };
    }

    const res = await fetch('/api/publish-wordpress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Lỗi khi đẩy bài viết lên WordPress');
    }
    return data.data;
  }
};
