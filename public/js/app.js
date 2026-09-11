/**
 * Main Application Controller - Quản lý Trạng thái 5 bước & Human-in-the-loop Editor
 */

// Application State
const state = {
  apiKey: localStorage.getItem('gemini_api_key') || localStorage.getItem('openrouter_api_key') || '',
  model: localStorage.getItem('openrouter_model') || 'gemini-flash-latest',
  ytApiKey: localStorage.getItem('yt_api_key') || '',
  wpUrl: localStorage.getItem('wp_site_url') || '',
  wpApiKey: localStorage.getItem('wp_api_key') || '',
  currentStep: 1,
  youtubeData: null,
  contentAnalysis: null,
  keywordsData: null,
  selectedKeyword: '',
  outlineData: null,
  articleData: null,
  seoReport: null,
  customInternalLinks: []
};

// DOM Elements
const el = {
  // Header
  apiStatusBadge: document.getElementById('api-status-badge'),
  btnHeaderQuickModel: document.getElementById('btn-header-quick-model'),
  headerModelName: document.getElementById('header-model-name'),
  // Step 1
  ytUrl: document.getElementById('yt-url'),
  openrouterKey: document.getElementById('openrouter-key'),
  openrouterModel: document.getElementById('openrouter-model'),
  modelDatalist: document.getElementById('model-datalist'),
  modelCountBadge: document.getElementById('model-count-badge'),
  modelQuickTags: document.getElementById('model-quick-tags'),
  btnToggleApi: document.getElementById('toggle-api-settings'),
  apiSettingsBody: document.getElementById('api-settings-body'),
  btnFetchData: document.getElementById('btn-fetch-data'),
  videoPreviewCard: document.getElementById('video-preview-card'),
  previewThumbImg: document.getElementById('preview-thumb-img'),
  previewTitle: document.getElementById('preview-title'),
  previewChannel: document.getElementById('preview-channel'),
  previewStats: document.getElementById('preview-stats'),
  transcriptStatus: document.getElementById('transcript-status'),
  transcriptText: document.getElementById('transcript-text'),
  btnProceedStep2: document.getElementById('btn-proceed-step2'),
  // Step 2
  analysisTopic: document.getElementById('analysis-topic'),
  analysisSummary: document.getElementById('analysis-summary'),
  analysisPainpoints: document.getElementById('analysis-painpoints'),
  analysisEntities: document.getElementById('analysis-entities'),
  analysisValues: document.getElementById('analysis-values'),
  keywordsContainer: document.getElementById('keywords-container'),
  customKeyword: document.getElementById('custom-keyword'),
  btnToggleCustom: document.getElementById('toggle-customizations'),
  customBody: document.getElementById('customizations-body'),
  internalLinksContainer: document.getElementById('internal-links-container'),
  btnAddLinkRow: document.getElementById('btn-add-link-row'),
  btnToggleQuickPaste: document.getElementById('btn-toggle-quick-paste'),
  quickPasteBox: document.getElementById('quick-paste-box'),
  quickPasteTextarea: document.getElementById('quick-paste-textarea'),
  btnApplyQuickPaste: document.getElementById('btn-apply-quick-paste'),
  btnClearAllLinks: document.getElementById('btn-clear-all-links'),
  btnCreateOutline: document.getElementById('btn-create-outline'),
  // Step 3
  briefKw: document.getElementById('brief-kw'),
  briefIntent: document.getElementById('brief-intent'),
  briefSeoTitle: document.getElementById('brief-seotitle'),
  briefSlug: document.getElementById('brief-slug'),
  briefMeta: document.getElementById('brief-meta'),
  outlineContainer: document.getElementById('outline-items-container'),
  btnAddOutlineHeadingTop: document.getElementById('btn-add-outline-heading-top'),
  btnAddOutlineHeadingBottom: document.getElementById('btn-add-outline-heading-bottom'),
  btnWriteArticle: document.getElementById('btn-write-article'),
  // Step 4: Editor (Human-in-the-loop)
  editH1: document.getElementById('edit-h1'),
  editMetaTitle: document.getElementById('edit-meta-title'),
  editSlug: document.getElementById('edit-slug'),
  editMetaDesc: document.getElementById('edit-meta-desc'),
  editorVisual: document.getElementById('editor-visual'),
  editorMarkdown: document.getElementById('editor-markdown'),
  visualEditorContainer: document.getElementById('visual-editor-container'),
  markdownEditorContainer: document.getElementById('markdown-editor-container'),
  btnViewVisual: document.getElementById('btn-view-visual'),
  btnViewMarkdown: document.getElementById('btn-view-markdown'),
  editorWordCount: document.getElementById('editor-word-count'),
  toolBold: document.getElementById('tool-bold'),
  toolItalic: document.getElementById('tool-italic'),
  toolH2: document.getElementById('tool-h2'),
  toolH3: document.getElementById('tool-h3'),
  toolUl: document.getElementById('tool-ul'),
  toolOl: document.getElementById('tool-ol'),
  toolAddLink: document.getElementById('tool-add-link'),
  toolAddImage: document.getElementById('tool-add-image'),
  toolAddTable: document.getElementById('tool-add-table'),
  toolAddVideo: document.getElementById('tool-add-video'),
  btnAutoOptimizeEditor: document.getElementById('btn-auto-optimize-editor'),
  btnAutoOptimizeEditorAction: document.getElementById('btn-auto-optimize-editor-action'),
  btnRunSeoGrade: document.getElementById('btn-run-seo-grade'),
  // Step 5: SEO Score & Publish
  btnAutoOptimizeReport: document.getElementById('btn-auto-optimize-report'),
  scoreVal: document.getElementById('score-number'),
  scoreGrade: document.getElementById('score-grade'),
  scoreBadge: document.getElementById('score-badge'),
  scoreKwStats: document.getElementById('score-kw-stats'),
  scoreAlertsArea: document.getElementById('score-alerts-area'),
  criteriaTableContainer: document.getElementById('criteria-table-container'),
  serpUrlDisplay: document.getElementById('serp-url-display'),
  serpTitleDisplay: document.getElementById('serp-title-display'),
  serpDescDisplay: document.getElementById('serp-desc-display'),
  articlePreviewBody: document.getElementById('article-preview-body'),
  htmlRawContent: document.getElementById('html-raw-content'),
  mdRawContent: document.getElementById('md-raw-content'),
  btnCopyContent: document.getElementById('btn-copy-content'),
  btnCopyHtml: document.getElementById('btn-copy-html'),
  btnDownloadDocx: document.getElementById('btn-download-docx'),
  btnDownloadMd: document.getElementById('btn-download-md'),
  btnRestart: document.getElementById('btn-restart'),
  // WordPress Publish Elements (2 fields: Link Web & API Key)
  wpUrl: document.getElementById('wp-url'),
  wpApiKey: document.getElementById('wp-api-key'),
  wpStatus: document.getElementById('wp-status'),
  btnPushWordpress: document.getElementById('btn-push-wordpress'),
  wpResultAlert: document.getElementById('wp-result-alert'),
  // Global Loading
  loadingOverlay: document.getElementById('loading-overlay'),
  loadingTitle: document.getElementById('loading-title'),
  loadingDesc: document.getElementById('loading-desc'),
  btnCancelLoadingSwitchModel: document.getElementById('btn-cancel-loading-switch-model'),
  // Error & Retry Modal
  modelErrorModal: document.getElementById('model-error-modal'),
  errorModalHeader: document.getElementById('error-modal-header'),
  errorModalTitle: document.getElementById('error-modal-title'),
  errorModalIcon: document.getElementById('error-modal-icon'),
  errorModalStepTag: document.getElementById('error-modal-step-tag'),
  errorModalMessage: document.getElementById('error-modal-message'),
  modalRetryModel: document.getElementById('modal-retry-model'),
  modalRetryQuickTags: document.getElementById('modal-retry-quick-tags'),
  btnCloseErrorModal: document.getElementById('btn-close-error-modal'),
  btnCancelErrorModal: document.getElementById('btn-cancel-error-modal'),
  btnConfirmRetryModel: document.getElementById('btn-confirm-retry-model')
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  initSavedSettings();
  initEventListeners();
  initInternalLinksManager();
  await checkServerStatus();
  await loadOpenRouterModels();
  restoreSessionProgress();
});

function detectProviderFrontend(key) {
  if (!key) return '';
  const trimmed = key.trim();
  if (trimmed.startsWith('sk-or-')) return 'OpenRouter';
  return 'Gemini';
}

// 1. Cài đặt API Keys & WP Settings ban đầu
function initSavedSettings() {
  if (state.apiKey) {
    el.openrouterKey.value = state.apiKey;
  } else {
    // Nếu chưa có API Key, mở sẵn panel cài đặt để người dùng nhập
    if (el.apiSettingsBody) {
      el.apiSettingsBody.classList.add('show');
    }
  }

  const keyProv = detectProviderFrontend(state.apiKey);
  const savedModel = localStorage.getItem('openrouter_model');
  if (!savedModel) {
    state.model = (keyProv === 'OpenRouter') ? 'openai/gpt-4o-mini' : 'gemini-flash-latest';
    localStorage.setItem('openrouter_model', state.model);
  } else if (keyProv === 'Gemini' && (savedModel.includes('/') || !savedModel.startsWith('gemini') || savedModel === 'gemini-2.5-flash')) {
    // Tự động chuyển sang gemini-flash-latest để tránh tình trạng Spikes in demand
    state.model = 'gemini-flash-latest';
    localStorage.setItem('openrouter_model', state.model);
  } else {
    state.model = savedModel;
  }

  if (state.model) {
    el.openrouterModel.value = state.model;
    highlightActiveModelTag(state.model);
  }
  if (state.wpUrl) el.wpUrl.value = state.wpUrl;
  if (state.wpUser) el.wpUser.value = state.wpUser;

  const handleKeyUpdate = () => {
    state.apiKey = el.openrouterKey.value.trim();
    localStorage.setItem('openrouter_api_key', state.apiKey);
    localStorage.setItem('gemini_api_key', state.apiKey);

    const prov = detectProviderFrontend(state.apiKey);
    if (prov === 'Gemini' && (state.model.includes('/') || !state.model.startsWith('gemini'))) {
      state.model = 'gemini-flash-latest';
      localStorage.setItem('openrouter_model', state.model);
      if (el.openrouterModel) el.openrouterModel.value = state.model;
      highlightActiveModelTag(state.model);
    } else if (prov === 'OpenRouter' && !state.model.includes('/')) {
      state.model = 'openai/gpt-4o-mini';
      localStorage.setItem('openrouter_model', state.model);
      if (el.openrouterModel) el.openrouterModel.value = state.model;
      highlightActiveModelTag(state.model);
    }

    updateApiStatusBadgeModel();
  };

  el.openrouterKey.addEventListener('input', handleKeyUpdate);
  el.openrouterKey.addEventListener('change', () => {
    handleKeyUpdate();
    checkServerStatus();
    loadOpenRouterModels();
  });

  const handleModelUpdate = () => {
    const val = el.openrouterModel.value.trim();
    if (val) {
      state.model = val;
      localStorage.setItem('openrouter_model', state.model);
      highlightActiveModelTag(state.model);
      updateApiStatusBadgeModel();
    }
  };

  el.openrouterModel.addEventListener('input', handleModelUpdate);
  el.openrouterModel.addEventListener('change', handleModelUpdate);

  // Quick Tags
  if (el.modelQuickTags) {
    el.modelQuickTags.addEventListener('click', (e) => {
      const tagBtn = e.target.closest('.btn-model-tag');
      if (tagBtn && tagBtn.dataset.model) {
        el.openrouterModel.value = tagBtn.dataset.model;
        handleModelUpdate();
      }
    });
  }

  if (el.wpUrl) {
    el.wpUrl.value = state.wpUrl;
    el.wpUrl.addEventListener('change', () => {
      state.wpUrl = el.wpUrl.value.trim();
      localStorage.setItem('wp_site_url', state.wpUrl);
    });
  }

  if (el.wpApiKey) {
    el.wpApiKey.value = state.wpApiKey;
    el.wpApiKey.addEventListener('change', () => {
      state.wpApiKey = el.wpApiKey.value.trim();
      localStorage.setItem('wp_api_key', state.wpApiKey);
    });
  }
}

function highlightActiveModelTag(modelId) {
  document.querySelectorAll('.btn-model-tag').forEach(btn => {
    if (btn.dataset.model === modelId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

function updateApiStatusBadgeModel() {
  const shortName = (state.model || '').split('/')[1] || state.model || 'gemini-2.5-flash';
  const prov = detectProviderFrontend(state.apiKey) || 'AI';
  if (el.headerModelName) {
    el.headerModelName.textContent = `Model: ${shortName}`;
  }
  if (el.apiStatusBadge) {
    if (state.apiKey) {
      el.apiStatusBadge.className = 'badge badge-success';
      el.apiStatusBadge.textContent = `🟢 ${prov} (${shortName})`;
    } else {
      el.apiStatusBadge.className = 'badge badge-warning';
      el.apiStatusBadge.textContent = '🟡 Cần nhập Gemini / OpenRouter Key';
    }
  }
}

// Biến lưu ngữ cảnh tác vụ cần Retry khi đổi Model
let currentRetryContext = null;
let currentActiveStepAction = null;

/**
 * Hiển thị Modal Báo Lỗi & Cho Phép Đổi Model Thử Lại Ngay Tại Chỗ (Không mất dữ liệu)
 */
function showModelErrorModal({ error, retryAction, stepTitle }) {
  currentRetryContext = {
    action: retryAction,
    stepTitle: stepTitle || 'Bước hiện tại'
  };

  if (!el.modelErrorModal) {
    alert(`[Lỗi] ${error}`);
    return;
  }

  // Tiêu đề & Step tag
  if (el.errorModalTitle) el.errorModalTitle.textContent = 'Gặp Lỗi Khi Gọi AI Model';
  if (el.errorModalHeader) el.errorModalHeader.className = 'modal-header modal-header-danger';
  if (el.errorModalIcon) el.errorModalIcon.textContent = '⚠️';
  if (el.errorModalStepTag) el.errorModalStepTag.textContent = `📍 Đang ở: ${stepTitle || 'Bước hiện tại'}`;

  // Diễn giải lỗi thân thiện, chỉ rõ cách khắc phục
  let cleanMsg = error || 'Lỗi không xác định từ OpenRouter';
  if (cleanMsg.includes('402') || cleanMsg.toLowerCase().includes('credit') || cleanMsg.toLowerCase().includes('afford')) {
    cleanMsg = `<strong>Lỗi Hạn Mức / Hết Credit (402):</strong> Model hiện tại yêu cầu thêm credit hoặc tài khoản của bạn tạm thời hết số dư.<br><br><span style="color:#15803d;font-weight:600;">👉 Mẹo: Hãy bấm chọn <strong>⚡ Gemini Flash Mới Nhất</strong> hoặc <strong>✨ Auto Free (Miễn phí)</strong> bên dưới rồi nhấn Thử Lại Ngay!</span>`;
  } else if (/high demand|spikes in demand|overloaded|503/i.test(cleanMsg)) {
    cleanMsg = `<strong>Google Gemini Đang Quá Tải Tạm Thời (High Demand):</strong> Model hiện tại đang có lượng truy cập tăng đột biến từ Google.<br><br><span style="color:#15803d;font-weight:600;">👉 Mẹo: Hãy bấm chọn <strong>⚡ Gemini Flash Mới Nhất</strong> hoặc <strong>🚀 Gemini 3.5 Flash</strong> bên dưới rồi nhấn <strong>"Đổi Model & Thử Lại Ngay"</strong> để tiếp tục mượt mà!</span>`;
  } else if (cleanMsg.includes('429') || cleanMsg.toLowerCase().includes('rate limit')) {
    cleanMsg = `<strong>Lỗi Quá Tải / Giới Hạn Tần Suất (429):</strong> Model đang bị quá tải hoặc đạt giới hạn số lượt gọi mỗi phút. Hãy chọn model khác hoặc model Auto Free.`;
  } else if (cleanMsg.toLowerCase().includes('timeout') || cleanMsg.includes('504')) {
    cleanMsg = `<strong>Lỗi Hết Thời Gian Chờ (Timeout):</strong> Model phản hồi quá lâu. Bạn có thể chọn model có tốc độ phản hồi nhanh như <strong>Gemini Flash Mới Nhất</strong> hoặc <strong>Auto Free</strong>.`;
  }

  if (el.errorModalMessage) {
    el.errorModalMessage.innerHTML = cleanMsg;
  }

  // Điền model hiện tại vào ô input
  if (el.modalRetryModel) {
    el.modalRetryModel.value = state.model || 'google/gemini-2.5-flash';
  }
  highlightModalRetryTags(state.model);

  // Đổi nhãn nút sang Thử Lại Ngay
  if (el.btnConfirmRetryModel) {
    const textSpan = el.btnConfirmRetryModel.querySelector('.btn-text');
    if (textSpan) textSpan.textContent = '🔄 Đổi Model & Thử Lại Ngay';
  }

  el.modelErrorModal.classList.remove('hidden');
}

/**
 * Mở Modal Đổi Nhanh Model từ Header (Bất kỳ lúc nào người dùng muốn)
 */
function openQuickModelSwitcher() {
  currentRetryContext = {
    action: null,
    stepTitle: 'Chuyển đổi AI Model'
  };

  if (el.errorModalTitle) el.errorModalTitle.textContent = '⚡ Đổi Nhanh AI Model';
  if (el.errorModalHeader) el.errorModalHeader.className = 'modal-header modal-header-info';
  if (el.errorModalIcon) el.errorModalIcon.textContent = '🤖';
  if (el.errorModalStepTag) el.errorModalStepTag.textContent = `⚡ Model hiện tại: ${(state.model || '').split('/')[1] || state.model}`;

  if (el.errorModalMessage) {
    el.errorModalMessage.innerHTML = 'Bạn có thể linh hoạt chuyển đổi giữa hơn 400 model của OpenRouter (Gemini, Claude, GPT-4o, DeepSeek, Auto Free...) bất kỳ lúc nào mà <strong>không làm mất bất kỳ dữ liệu nào</strong> của các bước đang thực hiện!';
  }

  if (el.modalRetryModel) {
    el.modalRetryModel.value = state.model || 'google/gemini-2.5-flash';
  }
  highlightModalRetryTags(state.model);

  if (el.btnConfirmRetryModel) {
    const textSpan = el.btnConfirmRetryModel.querySelector('.btn-text');
    if (textSpan) textSpan.textContent = '✓ Áp Dụng Model Này';
  }

  el.modelErrorModal.classList.remove('hidden');
}

function closeModelErrorModal() {
  if (el.modelErrorModal) {
    el.modelErrorModal.classList.add('hidden');
  }
}

function highlightModalRetryTags(modelId) {
  if (!el.modalRetryQuickTags) return;
  el.modalRetryQuickTags.querySelectorAll('.btn-model-tag').forEach(btn => {
    if (btn.dataset.model === modelId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

async function handleConfirmRetryModel() {
  const selectedModel = el.modalRetryModel ? el.modalRetryModel.value.trim() : '';
  if (!selectedModel) {
    alert('Vui lòng chọn hoặc nhập một AI Model!');
    return;
  }

  // Cập nhật state và lưu trữ
  state.model = selectedModel;
  localStorage.setItem('openrouter_model', state.model);
  if (el.openrouterModel) {
    el.openrouterModel.value = state.model;
  }
  highlightActiveModelTag(state.model);
  updateApiStatusBadgeModel();

  // Đóng modal
  closeModelErrorModal();

  // Nếu có action cần thử lại (retryAction), thực hiện ngay!
  if (currentRetryContext && typeof currentRetryContext.action === 'function') {
    console.log(`[Retry Action] Đang thử lại ${currentRetryContext.stepTitle} với Model mới: ${state.model}...`);
    try {
      await currentRetryContext.action();
    } catch (retryErr) {
      console.error('[Retry Action Error]:', retryErr);
    }
  } else {
    // Thông báo đổi model thành công nếu người dùng đổi từ header
    const shortName = (state.model || '').split('/')[1] || state.model;
    alert(`Đã đổi AI Model sang: ${shortName}`);
  }
}

// 1.1 Tải toàn bộ danh sách 400+ model từ OpenRouter
async function loadOpenRouterModels() {
  try {
    const res = await API.getOpenRouterModels(state.apiKey);
    if (res.success && Array.isArray(res.models)) {
      if (el.modelDatalist) {
        el.modelDatalist.innerHTML = '';
        res.models.forEach(m => {
          const opt = document.createElement('option');
          opt.value = m.id;
          opt.label = `${m.name} (${m.id})`;
          opt.textContent = m.name;
          el.modelDatalist.appendChild(opt);
        });
      }
      if (el.modelCountBadge) {
        el.modelCountBadge.className = 'model-badge badge-success';
        el.modelCountBadge.textContent = `🟢 ${res.count || res.models.length} models sẵn sàng`;
      }
    }
  } catch (err) {
    if (el.modelCountBadge) {
      el.modelCountBadge.textContent = '⚡ Model gợi ý';
    }
  }
}

// 2. Kiểm tra trạng thái Server
async function checkServerStatus() {
  try {
    const res = await API.getConfigStatus(state.apiKey);
    if (res.success && res.llmStatus) {
      if (res.llmStatus.configuredModel && !localStorage.getItem('openrouter_model')) {
        state.model = res.llmStatus.configuredModel;
        el.openrouterModel.value = state.model;
        highlightActiveModelTag(state.model);
      }
      const shortName = (state.model || '').split('/')[1] || state.model || 'gemini-2.5-flash';
      const prov = (res.llmStatus.provider === 'openrouter') ? 'OpenRouter' : 'Gemini';
      if (state.apiKey) {
        el.apiStatusBadge.className = 'badge badge-success';
        el.apiStatusBadge.textContent = `🟢 ${prov} (${shortName})`;
      } else {
        el.apiStatusBadge.className = 'badge badge-warning';
        el.apiStatusBadge.textContent = '🟡 Cần nhập Gemini / OpenRouter Key';
      }
    }
  } catch (err) {
    el.apiStatusBadge.className = 'badge badge-danger';
    el.apiStatusBadge.textContent = '🔴 Mất kết nối Server';
  }
}

// 3. Quản lý Liên kết nội bộ tùy chỉnh (Người dùng tự nhập)
function initInternalLinksManager() {
  const saved = localStorage.getItem('custom_internal_links');
  if (saved) {
    try {
      state.customInternalLinks = JSON.parse(saved);
    } catch (e) {
      state.customInternalLinks = [];
    }
  } else {
    state.customInternalLinks = [];
  }
  renderInternalLinksList();

  if (el.btnAddLinkRow) {
    el.btnAddLinkRow.addEventListener('click', () => {
      addInternalLinkRow('', '');
    });
  }

  if (el.btnToggleQuickPaste) {
    el.btnToggleQuickPaste.addEventListener('click', () => {
      el.quickPasteBox.classList.toggle('hidden');
    });
  }

  if (el.btnApplyQuickPaste) {
    el.btnApplyQuickPaste.addEventListener('click', () => {
      const text = el.quickPasteTextarea.value.trim();
      if (!text) return;
      const lines = text.split('\n');
      lines.forEach(line => {
        const parts = line.split(/[|,\t]/).map(s => s.trim()).filter(Boolean);
        if (parts.length >= 2) {
          let anchor = parts[0];
          let url = parts[1];
          if (parts[0].startsWith('http') && !parts[1].startsWith('http')) {
            url = parts[0];
            anchor = parts[1];
          }
          state.customInternalLinks.push({ anchor, url });
        }
      });
      el.quickPasteTextarea.value = '';
      el.quickPasteBox.classList.add('hidden');
      saveAndRenderInternalLinks();
    });
  }

  if (el.btnClearAllLinks) {
    el.btnClearAllLinks.addEventListener('click', () => {
      if (confirm('Bạn có chắc muốn xóa toàn bộ liên kết nội bộ đã nhập?')) {
        state.customInternalLinks = [];
        saveAndRenderInternalLinks();
      }
    });
  }
}

function renderInternalLinksList() {
  if (!el.internalLinksContainer) return;
  el.internalLinksContainer.innerHTML = '';

  if (!state.customInternalLinks || state.customInternalLinks.length === 0) {
    el.internalLinksContainer.innerHTML = `
      <div class="empty-links-hint">
        Chưa có liên kết nội bộ nào. Nhấn <strong>➕ Thêm Dòng Link</strong> để nhập Anchor Text và URL trang web của bạn.
      </div>
    `;
    return;
  }

  state.customInternalLinks.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'link-row';
    row.innerHTML = `
      <input type="text" class="form-control link-anchor" placeholder="Anchor Text (Từ khóa hiển thị)" value="${escapeHtml(item.anchor || '')}" data-idx="${index}" />
      <input type="text" class="form-control link-url" placeholder="Đường dẫn URL đích (https://...)" value="${escapeHtml(item.url || '')}" data-idx="${index}" />
      <button type="button" class="btn-remove-row" title="Xóa dòng này" data-idx="${index}">✕</button>
    `;

    const anchorInput = row.querySelector('.link-anchor');
    const urlInput = row.querySelector('.link-url');
    const btnRemove = row.querySelector('.btn-remove-row');

    anchorInput.addEventListener('input', (e) => {
      state.customInternalLinks[index].anchor = e.target.value.trim();
      localStorage.setItem('custom_internal_links', JSON.stringify(state.customInternalLinks));
    });

    urlInput.addEventListener('input', (e) => {
      state.customInternalLinks[index].url = e.target.value.trim();
      localStorage.setItem('custom_internal_links', JSON.stringify(state.customInternalLinks));
    });

    btnRemove.addEventListener('click', () => {
      state.customInternalLinks.splice(index, 1);
      saveAndRenderInternalLinks();
    });

    el.internalLinksContainer.appendChild(row);
  });
}

function addInternalLinkRow(anchor = '', url = '') {
  state.customInternalLinks.push({ anchor, url });
  saveAndRenderInternalLinks();
  const rows = el.internalLinksContainer.querySelectorAll('.link-row');
  if (rows.length > 0) {
    const lastRow = rows[rows.length - 1];
    const input = lastRow.querySelector('.link-anchor');
    if (input) input.focus();
  }
}

function saveAndRenderInternalLinks() {
  localStorage.setItem('custom_internal_links', JSON.stringify(state.customInternalLinks));
  renderInternalLinksList();
}

function escapeHtml(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// 4. Quản lý Sự kiện (Event Listeners)
function initEventListeners() {
  // Toggle Settings
  el.btnToggleApi.addEventListener('click', () => {
    el.apiSettingsBody.classList.toggle('show');
  });
  el.btnToggleCustom.addEventListener('click', () => {
    el.customBody.classList.toggle('show');
  });

  // Stepper Back buttons
  document.querySelectorAll('.btn-prev').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = parseInt(btn.dataset.target, 10);
      goToStep(target);
    });
  });

  // Tab switching in Step 5
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
      btn.classList.add('active');
      const tabId = `tab-${btn.dataset.tab}`;
      document.getElementById(tabId)?.classList.remove('hidden');
    });
  });

  // BƯỚC 1: Thu thập Dữ liệu YouTube
  el.btnFetchData.addEventListener('click', handleFetchYouTubeData);

  // BƯỚC 1 -> 2: Chuyển sang Phân tích Nội dung
  el.btnProceedStep2.addEventListener('click', handleAnalyzeAndSuggestKeywords);

  // BƯỚC 2 -> 3: Tạo Dàn ý
  el.btnCreateOutline.addEventListener('click', handleCreateOutline);

  // BƯỚC 3: Thao tác Dàn ý (Thêm/Sửa/Xóa đề mục, Reorder, Video, Bảng, Link, SP/Dịch Vụ)
  if (el.btnAddOutlineHeadingTop) {
    el.btnAddOutlineHeadingTop.addEventListener('click', handleAddOutlineHeading);
  }
  if (el.btnAddOutlineHeadingBottom) {
    el.btnAddOutlineHeadingBottom.addEventListener('click', handleAddOutlineHeading);
  }
  if (el.outlineContainer) {
    el.outlineContainer.addEventListener('click', handleOutlineContainerClick);
    el.outlineContainer.addEventListener('change', handleOutlineContainerChange);
  }

  // BƯỚC 3 -> 4: Viết Bài (Chuyển sang Màn hình Biên Tập)
  el.btnWriteArticle.addEventListener('click', handleWriteArticle);

  // BƯỚC 4: View switching, bidirectional sync & Toolbar trong Editor
  if (el.btnViewVisual && el.btnViewMarkdown) {
    el.btnViewVisual.addEventListener('click', () => switchEditorView('visual'));
    el.btnViewMarkdown.addEventListener('click', () => switchEditorView('markdown'));
  }

  if (el.editorVisual) {
    el.editorVisual.addEventListener('input', () => syncVisualToMarkdown());
  }

  if (el.editorMarkdown) {
    el.editorMarkdown.addEventListener('input', () => syncMarkdownToVisual());
  }

  initEditorToolbar();

  // BƯỚC 4: 1-Click Tự động tối ưu đạt 95 - 100 điểm SEO
  if (el.btnAutoOptimizeEditor) {
    el.btnAutoOptimizeEditor.addEventListener('click', handleAutoOptimizeArticle);
  }
  if (el.btnAutoOptimizeEditorAction) {
    el.btnAutoOptimizeEditorAction.addEventListener('click', handleAutoOptimizeArticle);
  }

  // BƯỚC 4 -> 5: Chấm điểm SEO bài viết đã biên tập
  el.btnRunSeoGrade.addEventListener('click', handleRunSeoGrade);

  // BƯỚC 5: 1-Click Tự động tối ưu đạt 95 - 100 điểm trên báo cáo
  if (el.btnAutoOptimizeReport) {
    el.btnAutoOptimizeReport.addEventListener('click', handleAutoOptimizeArticle);
  }

  // BƯỚC 5: Đẩy lên WordPress
  el.btnPushWordpress.addEventListener('click', handlePushToWordPress);

  // BƯỚC 5 Actions: Export & Copy
  el.btnDownloadDocx.addEventListener('click', async () => {
    if (!state.articleData) return;
    try {
      showLoading('Đang xuất file Microsoft Word (.docx)...', 'Tạo tài liệu chuẩn định dạng và bảng biểu.');
      if (el.editorVisual && el.editorVisual.innerHTML) {
        syncVisualToMarkdown();
      }
      if (state.articleData.contentMarkdown) {
        state.articleData.contentMarkdown = state.articleData.contentMarkdown
          .replace(/<div\s+id=["']editor-visual["'][^>]*>/gi, '')
          .replace(/<div\s+class=["']visual-editor["'][^>]*>/gi, '')
          .replace(/<\/div>\s*$/gi, '')
          .trim();
      }
      await API.downloadDocx(state.articleData, state.selectedKeyword);
    } catch (err) {
      alert('Lỗi xuất file Word: ' + err.message);
    } finally {
      hideLoading();
    }
  });

  el.btnDownloadMd.addEventListener('click', () => {
    if (!state.articleData?.contentMarkdown) return;
    const blob = new Blob([state.articleData.contentMarkdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bai_Viet_${(state.selectedKeyword || 'seo').replace(/[^a-zA-Z0-9]/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  });

  el.btnCopyContent.addEventListener('click', () => {
    if (!state.articleData) return;
    navigator.clipboard.writeText(state.articleData.contentMarkdown).then(() => {
      alert('Đã sao chép nội dung Markdown vào Clipboard!');
    });
  });

  el.btnCopyHtml.addEventListener('click', () => {
    if (!state.articleData) return;
    navigator.clipboard.writeText(state.articleData.cleanHtml).then(() => {
      alert('Đã sao chép mã Clean HTML vào Clipboard!');
    });
  });

  el.btnRestart.addEventListener('click', () => {
    if (confirm('Bạn có chắc muốn tạo bài viết mới? Toàn bộ nội dung hiện tại sẽ được làm mới.')) {
      sessionStorage.removeItem('yt_seo_progress');
      goToStep(1);
    }
  });

  // Tùy chỉnh từ khóa
  el.customKeyword.addEventListener('input', (e) => {
    const val = e.target.value.trim();
    if (val) {
      state.selectedKeyword = val;
      document.querySelectorAll('.keyword-card').forEach(card => card.classList.remove('selected'));
    }
  });

  // Header Quick Model Button
  if (el.btnHeaderQuickModel) {
    el.btnHeaderQuickModel.addEventListener('click', openQuickModelSwitcher);
  }

  // Cancel Loading & Switch Model Button (Khi người dùng chờ lâu và muốn hủy ngay)
  if (el.btnCancelLoadingSwitchModel) {
    el.btnCancelLoadingSwitchModel.addEventListener('click', () => {
      API.abortActiveAiRequest();
      hideLoading();
      const ctx = currentActiveStepAction;
      showModelErrorModal({
        error: '<strong>Tác vụ đã được dừng:</strong> Bạn đã chủ động dừng quá trình chờ phản hồi của AI model.<br><br><span style="color:#15803d;font-weight:600;">👉 Mẹo: Hãy chọn <strong>⚡ DeepSeek V3 (Siêu tốc ~5s)</strong> bên dưới rồi nhấn <strong>"Đổi Model & Thử Lại Ngay"</strong>!</span>',
        retryAction: ctx ? ctx.action : null,
        stepTitle: ctx ? ctx.stepTitle : 'Đổi Model'
      });
    });
  }

  // Error & Retry Modal Buttons
  if (el.btnCloseErrorModal) {
    el.btnCloseErrorModal.addEventListener('click', closeModelErrorModal);
  }
  if (el.btnCancelErrorModal) {
    el.btnCancelErrorModal.addEventListener('click', closeModelErrorModal);
  }
  if (el.btnConfirmRetryModel) {
    el.btnConfirmRetryModel.addEventListener('click', handleConfirmRetryModel);
  }

  // Modal Quick Tags click
  if (el.modalRetryQuickTags) {
    el.modalRetryQuickTags.addEventListener('click', (e) => {
      const tagBtn = e.target.closest('.btn-model-tag');
      if (tagBtn && tagBtn.dataset.model) {
        if (el.modalRetryModel) {
          el.modalRetryModel.value = tagBtn.dataset.model;
          highlightModalRetryTags(tagBtn.dataset.model);
        }
      }
    });
  }
  if (el.modalRetryModel) {
    el.modalRetryModel.addEventListener('input', () => {
      highlightModalRetryTags(el.modalRetryModel.value.trim());
    });
  }
}

// BƯỚC 1: Xử lý Lấy Dữ liệu YouTube
async function handleFetchYouTubeData() {
  const url = el.ytUrl.value.trim();
  if (!url) {
    alert('Vui lòng nhập đường dẫn URL video YouTube!');
    return;
  }

  try {
    showLoading('Đang kết nối YouTube...', 'Trích xuất Metadata, Thông tin video và Tải phụ đề Transcript.');
    const data = await API.extractYouTube(url, state.ytApiKey);
    state.youtubeData = data;

    // Render Preview Card
    el.previewThumbImg.src = data.metadata.thumbnailUrl;
    el.previewTitle.textContent = data.metadata.title;
    el.previewChannel.textContent = data.metadata.channelTitle;
    el.previewStats.textContent = data.metadata.viewCount !== 'N/A' ? `${Number(data.metadata.viewCount).toLocaleString()} lượt xem` : 'YouTube Video';

    if (data.transcript.hasTranscript) {
      el.transcriptStatus.className = 'transcript-badge badge-success';
      el.transcriptStatus.textContent = `🟢 Đã tìm thấy phụ đề (${data.transcript.language})`;
      el.transcriptText.value = data.transcript.fullText;
    } else {
      el.transcriptStatus.className = 'transcript-badge badge-warning';
      el.transcriptStatus.textContent = '🟡 Không có phụ đề tự động (Bạn có thể dán tóm tắt bên dưới)';
      el.transcriptText.value = data.metadata.description || '';
    }

    el.videoPreviewCard.classList.remove('hidden');
    el.videoPreviewCard.scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    alert('Lỗi: ' + err.message);
  } finally {
    hideLoading();
  }
}

// BƯỚC 1 -> 2: LLM Phân tích Nội dung & Gợi ý Từ khóa
async function handleAnalyzeAndSuggestKeywords() {
  if (!state.youtubeData) return;

  state.apiKey = el.openrouterKey.value.trim();
  if (!state.apiKey) {
    alert('Vui lòng nhập Google Gemini API Key (Khuyên dùng) hoặc OpenRouter API Key trong mục "⚙️ Cài đặt AI API Key" bên trên để bắt đầu phân tích AI!');
    if (el.apiSettingsBody) el.apiSettingsBody.classList.add('show');
    if (el.openrouterKey) el.openrouterKey.focus();
    return;
  }

  if (el.transcriptText.value.trim()) {
    state.youtubeData.transcript.fullText = el.transcriptText.value.trim();
  }

  currentActiveStepAction = {
    action: handleAnalyzeAndSuggestKeywords,
    stepTitle: 'Bước 2: Phân Tích Nội Dung & Từ Khóa'
  };

  try {
    showLoading('LLM Agent 1 & 2 Đang Làm Việc...', 'Agent 1: Phân tích Topic, Subtopics, Entities và Context.\nAgent 2: Nghiên cứu Search Intent và Gợi ý Từ Khóa SEO.');

    const analysis = await API.analyzeContent(state.youtubeData.metadata, state.youtubeData.transcript, state.apiKey, state.model);
    state.contentAnalysis = analysis;

    const kwData = await API.suggestKeywords(analysis, state.youtubeData.metadata, state.apiKey, state.model);
    state.keywordsData = kwData;

    renderAnalysisData(analysis);
    renderKeywordsData(kwData);

    goToStep(2);
  } catch (err) {
    if (err.name === 'AbortError') return;
    console.error('[Step 1->2 Error]:', err);
    showModelErrorModal({
      error: err.message,
      retryAction: handleAnalyzeAndSuggestKeywords,
      stepTitle: 'Bước 2: Phân Tích Nội Dung & Từ Khóa'
    });
  } finally {
    hideLoading();
  }
}

function renderAnalysisData(analysis) {
  el.analysisTopic.textContent = analysis.mainTopic || 'Chủ đề tổng quan';
  el.analysisSummary.textContent = analysis.summary || '';

  el.analysisPainpoints.innerHTML = '';
  (analysis.context?.painPoints || []).forEach(p => {
    const li = document.createElement('li');
    li.textContent = p;
    el.analysisPainpoints.appendChild(li);
  });

  el.analysisEntities.innerHTML = '';
  const allEntities = [
    ...(analysis.entities?.concepts || []),
    ...(analysis.entities?.methods || []),
    ...(analysis.entities?.products_or_ingredients || [])
  ];
  allEntities.slice(0, 15).forEach(ent => {
    const tag = document.createElement('span');
    tag.className = 'tag-item';
    tag.textContent = ent;
    el.analysisEntities.appendChild(tag);
  });

  el.analysisValues.innerHTML = '';
  (analysis.uniqueValues || []).forEach(v => {
    const li = document.createElement('li');
    li.textContent = v;
    el.analysisValues.appendChild(li);
  });
}

function renderKeywordsData(kwData) {
  el.keywordsContainer.innerHTML = '';
  let defaultKw = '';

  (kwData.primaryKeywords || []).forEach((kwItem, index) => {
    const card = document.createElement('div');
    card.className = 'keyword-card';
    if (kwItem.recommended || index === 0) {
      card.classList.add('selected');
      defaultKw = kwItem.keyword;
    }

    card.innerHTML = `
      <div class="keyword-card-title">${kwItem.keyword} ${kwItem.recommended ? '<span class="badge badge-success">Khuyên dùng</span>' : ''}</div>
      <div class="keyword-card-intent">Intent: <strong>${kwItem.searchIntent}</strong> (${kwItem.funnelStage || 'TOFU'})</div>
      <div class="text-hint">${kwItem.intentDescription || ''}</div>
    `;

    card.addEventListener('click', () => {
      document.querySelectorAll('.keyword-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      state.selectedKeyword = kwItem.keyword;
      el.customKeyword.value = '';
    });

    el.keywordsContainer.appendChild(card);
  });

  state.selectedKeyword = defaultKw;
  el.customKeyword.value = '';
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function normalizeOutlineList(rawOutline) {
  if (!Array.isArray(rawOutline)) return [];
  const flat = [];
  rawOutline.forEach(item => {
    let level = (item.level || 'H2').toUpperCase();
    if (level === 'SAPO') level = 'Sapo';

    // Tiêu đề/nội dung
    const titleVal = item.title || item.heading || item.name || item.guideline || '';

    const normalizedItem = {
      level: level,
      title: titleVal,
      guideline: item.guideline || (level === 'Sapo' ? titleVal : ''),
      hasVideoEmbed: Boolean(item.hasVideoEmbed),
      hasComparisonTable: Boolean(item.hasComparisonTable),
      customLink: item.customLink ? { anchor: item.customLink.anchor || '', url: item.customLink.url || '' } : null,
      productCta: item.productCta ? { name: item.productCta.name || '', desc: item.productCta.desc || '', url: item.productCta.url || '' } : null,
      intent: item.intent || ''
    };
    flat.push(normalizedItem);

    // Nếu có sub-items lồng nhau (H3)
    if (Array.isArray(item.items) && item.items.length > 0) {
      item.items.forEach(sub => {
        let subLevel = (sub.level || 'H3').toUpperCase();
        flat.push({
          level: subLevel,
          title: sub.title || sub.heading || sub.name || '',
          guideline: '',
          hasVideoEmbed: Boolean(sub.hasVideoEmbed),
          hasComparisonTable: Boolean(sub.hasComparisonTable),
          customLink: sub.customLink ? { anchor: sub.customLink.anchor || '', url: sub.customLink.url || '' } : null,
          productCta: sub.productCta ? { name: sub.productCta.name || '', desc: sub.productCta.desc || '', url: sub.productCta.url || '' } : null,
          intent: sub.notes || ''
        });
      });
    }
  });
  return flat;
}

// BƯỚC 2 -> 3: Tạo Dàn ý Outline
async function handleCreateOutline() {
  state.apiKey = el.openrouterKey.value.trim();
  if (!state.apiKey) {
    alert('Vui lòng nhập Google Gemini API Key hoặc OpenRouter API Key trong mục Cài đặt để tạo Dàn ý bằng AI!');
    if (el.apiSettingsBody) el.apiSettingsBody.classList.add('show');
    if (el.openrouterKey) el.openrouterKey.focus();
    return;
  }

  const finalKeyword = el.customKeyword.value.trim() || state.selectedKeyword;
  if (!finalKeyword) {
    alert('Vui lòng chọn hoặc nhập một từ khóa SEO chính!');
    return;
  }
  state.selectedKeyword = finalKeyword;

  currentActiveStepAction = {
    action: handleCreateOutline,
    stepTitle: 'Bước 3: Lập Dàn Ý Outline'
  };

  const options = {};

  try {
    showLoading('LLM Agent 3 Đang Thiết Kế Dàn Ý...', 'Áp dụng bộ 218 công thức Tiêu đề CTR, quy tắc Sapo trực diện và cấu trúc Heading chuẩn AGENTS.md.');
    const outlineData = await API.generateOutline(
      state.selectedKeyword,
      state.contentAnalysis,
      state.keywordsData?.lsiKeywords || [],
      options,
      state.apiKey,
      state.model
    );
    state.outlineData = outlineData || {};
    let rawList = outlineData?.outline || outlineData?.sections || outlineData?.headings || outlineData?.items || [];
    if (!Array.isArray(rawList) || rawList.length === 0) {
      const fallbackTitle = outlineData?.contentBrief?.seoMeta?.seoTitle || outlineData?.seoTitle || `Mọi điều bạn cần biết về ${state.selectedKeyword}`;
      rawList = [
        { level: 'H1', title: fallbackTitle },
        { level: 'Sapo', guideline: `Đoạn 1: Thấu hiểu nỗi băn khoăn của mẹ khi tìm hiểu **${state.selectedKeyword}**.\nĐoạn 2: Giới thiệu giải pháp hữu ích và khoa học từ Home Care.` },
        { level: 'H2', title: `Vì sao mẹ nên tìm hiểu ${state.selectedKeyword} đúng cách`, intent: 'Giải thích nguyên nhân cốt lõi và lợi ích' },
        { level: 'H2', title: `Hướng dẫn chi tiết từng bước thực hiện ${state.selectedKeyword} tại nhà`, hasVideoEmbed: true, intent: 'Quy trình thực hiện chi tiết kèm video trực quan' },
        { level: 'H2', title: `Bảng tổng hợp so sánh và các sai lầm phổ biến cần tránh`, hasComparisonTable: true, intent: 'Bảng đối chiếu và lưu ý an toàn' },
        { level: 'H2', title: `Câu hỏi thường gặp về ${state.selectedKeyword}`, isFaq: true, items: [
          { level: 'H3', title: `Thực hiện ${state.selectedKeyword} bao lâu một lần là phù hợp?` },
          { level: 'H3', title: `Những lưu ý an toàn quan trọng nhất mẹ cần nhớ?` }
        ]},
        { level: 'H2', title: `Lời nhắn gửi yêu thương và đồng hành cùng mẹ từ Home Care`, isCta: true }
      ];
    }
    state.outlineData.outline = normalizeOutlineList(rawList);

    renderOutlineData(state.outlineData);
    goToStep(3);
  } catch (err) {
    if (err.name === 'AbortError') return;
    console.error('[Step 2->3 Error]:', err);
    showModelErrorModal({
      error: err.message,
      retryAction: handleCreateOutline,
      stepTitle: 'Bước 3: Lập Dàn Ý Outline'
    });
  } finally {
    hideLoading();
  }
}

function renderOutlineData(outlineData) {
  if (!outlineData) return;
  const brief = outlineData.contentBrief || {};
  const seoMeta = brief.seoMeta || {};
  const kw = state.selectedKeyword || '';

  el.briefKw.textContent = kw;
  el.briefIntent.textContent = brief.searchIntent || `Tìm kiếm giải pháp, hướng dẫn an toàn và dễ thực hiện về "${kw}"`;

  const seoTitle = seoMeta.seoTitle || brief.seoTitle || brief.metaTitle || outlineData.seoTitle || `Mọi điều bạn cần biết về ${kw}`;
  const slug = seoMeta.slug || brief.slug || kw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
  const metaDesc = seoMeta.metaDescription || brief.metaDescription || `Băn khoăn về ${kw}? Khám phá hướng dẫn chi tiết, an toàn tại nhà từ chuyên gia Home Care. Xem ngay mẹo hữu ích giúp mẹ an tâm!`;

  el.briefSeoTitle.textContent = seoTitle;
  el.briefSlug.textContent = slug;
  el.briefMeta.textContent = metaDesc;

  // Đồng bộ lại vào state.outlineData
  if (!state.outlineData) state.outlineData = {};
  if (!state.outlineData.contentBrief) state.outlineData.contentBrief = {};
  if (!state.outlineData.contentBrief.seoMeta) state.outlineData.contentBrief.seoMeta = {};
  state.outlineData.contentBrief.seoMeta.seoTitle = seoTitle;
  state.outlineData.contentBrief.seoMeta.slug = slug;
  state.outlineData.contentBrief.seoMeta.metaDescription = metaDesc;
  state.outlineData.contentBrief.searchIntent = el.briefIntent.textContent;

  const outline = outlineData.outline || [];
  el.outlineContainer.innerHTML = '';

  outline.forEach((item, index) => {
    const card = document.createElement('div');
    const levelLower = (item.level || 'h2').toLowerCase();
    card.className = `outline-item-card level-${levelLower}`;
    card.dataset.index = index;

    const isH1 = item.level === 'H1';
    const isSapo = item.level === 'Sapo';
    const isCore = isH1 || isSapo;

    // H1 (0) và Sapo (1) cố định ở đầu bài. Các mục từ index 2 trở đi có thể sắp xếp di chuyển
    const canMoveUp = index > 2;
    const canMoveDown = !isCore && index < outline.length - 1;

    // Trạng thái các tính năng
    const hasVideo = Boolean(item.hasVideoEmbed);
    const hasTable = Boolean(item.hasComparisonTable);
    const hasLink = Boolean(item.customLink && item.customLink.anchor && item.customLink.url);
    const hasProd = Boolean(item.productCta && item.productCta.name);

    // Cụm nút di chuyển thứ tự
    let reorderHtml = '';
    if (!isCore) {
      reorderHtml = `
        <div class="outline-reorder-group">
          <button type="button" class="outline-reorder-btn" data-action="move-up" data-idx="${index}" ${canMoveUp ? '' : 'disabled'} title="Di chuyển đề mục lên trên">▲</button>
          <button type="button" class="outline-reorder-btn" data-action="move-down" data-idx="${index}" ${canMoveDown ? '' : 'disabled'} title="Di chuyển đề mục xuống dưới">▼</button>
        </div>
      `;
    }

    // Chọn Cấp độ thẻ hoặc Badge cố định
    let levelHtml = '';
    if (isH1) {
      levelHtml = '<span class="outline-level-badge badge-primary">H1</span>';
    } else if (isSapo) {
      levelHtml = '<span class="outline-level-badge badge-warning">Sapo</span>';
    } else {
      levelHtml = `
        <select class="outline-level-select" data-action="change-level" data-idx="${index}" title="Đổi cấp độ thẻ (H2/H3/H4)">
          <option value="H2" ${item.level === 'H2' ? 'selected' : ''}>H2</option>
          <option value="H3" ${item.level === 'H3' ? 'selected' : ''}>H3</option>
          <option value="H4" ${item.level === 'H4' ? 'selected' : ''}>H4</option>
        </select>
      `;
    }

    // Placeholder tương ứng
    let placeholderText = `Nhập tiêu đề thẻ ${item.level}...`;
    if (isH1) placeholderText = 'Tiêu đề bài viết (H1 - Post Title)...';
    if (isSapo) placeholderText = 'Nội dung định hướng Sapo (Đoạn 1 nỗi đau + Đoạn 2 giải pháp)...';

    // Nút Xóa thẻ đề mục
    let deleteHtml = '';
    if (!isCore) {
      deleteHtml = `
        <button type="button" class="outline-delete-btn" data-action="delete-item" data-idx="${index}" title="Xóa thẻ đề mục này">🗑️</button>
      `;
    }

    // Thanh tính năng tiện ích (cho đề mục và Sapo)
    let featuresHtml = '';
    if (!isH1) {
      featuresHtml = `
        <div class="outline-card-features">
          <span class="features-label">Gắn tiện ích:</span>
          <button type="button" class="btn-feature-chip ${hasVideo ? 'active-video' : ''}" data-action="toggle-video" data-idx="${index}" title="Bật/Tắt nhúng video YouTube vào mục này">
            🎬 Video Embed ${hasVideo ? '✓' : ''}
          </button>
          <button type="button" class="btn-feature-chip ${hasTable ? 'active-table' : ''}" data-action="toggle-table" data-idx="${index}" title="Bật/Tắt chèn bảng so sánh đối chiếu vào mục này">
            📊 Bảng So Sánh ${hasTable ? '✓' : ''}
          </button>
          <button type="button" class="btn-feature-chip ${hasLink ? 'active-link' : ''}" data-action="toggle-drawer-link" data-idx="${index}" title="Cấu hình chèn liên kết nội bộ/tham khảo vào mục này">
            🔗 ${hasLink ? 'Link: ' + escapeHtml(item.customLink.anchor) : 'Chèn Link'} ${hasLink ? '✓' : ''}
          </button>
          <button type="button" class="btn-feature-chip ${hasProd ? 'active-prod' : ''}" data-action="toggle-drawer-prod" data-idx="${index}" title="Cấu hình giới thiệu sản phẩm dịch vụ kèm link">
            🛍️ ${hasProd ? 'SP: ' + escapeHtml(item.productCta.name) : 'Giới Thiệu SP/Dịch Vụ'} ${hasProd ? '✓' : ''}
          </button>
        </div>

        <!-- Inline Drawer: Chèn Link -->
        <div class="outline-drawer drawer-link hidden" id="drawer-link-${index}">
          <div class="drawer-header">
            <span>🔗 Cấu Hình Chèn Link Vào Đề Mục Này</span>
            <button type="button" data-action="close-drawer" data-target="drawer-link-${index}">✕</button>
          </div>
          <div class="drawer-grid drawer-grid-2">
            <div>
              <label>Anchor Text (Từ khóa chèn link):</label>
              <input type="text" class="input-link-anchor" placeholder="Ví dụ: dịch vụ chăm sóc mẹ bầu" value="${escapeHtml(item.customLink?.anchor || '')}" />
            </div>
            <div>
              <label>URL Đích:</label>
              <input type="url" class="input-link-url" placeholder="https://yourwebsite.com/dich-vu" value="${escapeHtml(item.customLink?.url || '')}" />
            </div>
          </div>
          <div class="drawer-actions">
            ${item.customLink ? `<button type="button" class="btn-danger-soft" data-action="remove-link" data-idx="${index}">Xóa Link</button>` : ''}
            <button type="button" class="btn btn-sm btn-primary" data-action="save-link" data-idx="${index}">Lưu & Áp Dụng Link</button>
          </div>
        </div>

        <!-- Inline Drawer: Giới Thiệu SP/Dịch Vụ -->
        <div class="outline-drawer drawer-product hidden" id="drawer-prod-${index}">
          <div class="drawer-header">
            <span>🛍️ Cấu Hình Giới Thiệu Sản Phẩm / Dịch Vụ Kèm Link</span>
            <button type="button" data-action="close-drawer" data-target="drawer-prod-${index}">✕</button>
          </div>
          <div class="drawer-grid drawer-grid-3">
            <div>
              <label>Tên Sản Phẩm / Dịch Vụ:</label>
              <input type="text" class="input-prod-name" placeholder="Ví dụ: Gói tắm bé sơ sinh Home Care" value="${escapeHtml(item.productCta?.name || '')}" />
            </div>
            <div>
              <label>Mô tả ngắn / Lời kêu gọi CTA:</label>
              <input type="text" class="input-prod-desc" placeholder="Ví dụ: Tắm massage chuẩn y khoa giúp bé ngủ ngoan" value="${escapeHtml(item.productCta?.desc || '')}" />
            </div>
            <div>
              <label>URL Link SP / Dịch Vụ:</label>
              <input type="url" class="input-prod-url" placeholder="https://homecare.com.vn/tam-be" value="${escapeHtml(item.productCta?.url || '')}" />
            </div>
          </div>
          <div class="drawer-actions">
            ${item.productCta ? `<button type="button" class="btn-danger-soft" data-action="remove-prod" data-idx="${index}">Xóa Giới Thiệu</button>` : ''}
            <button type="button" class="btn btn-sm btn-primary" data-action="save-prod" data-idx="${index}">Lưu & Áp Dụng Giới Thiệu</button>
          </div>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="outline-card-main">
        ${reorderHtml}
        ${levelHtml}
        <input type="text" class="outline-title-input" value="${escapeHtml(item.title || item.guideline || '')}" data-idx="${index}" placeholder="${placeholderText}" />
        ${deleteHtml}
      </div>
      ${featuresHtml}
    `;

    // Gắn sự kiện sửa text trực tiếp
    const titleInput = card.querySelector('.outline-title-input');
    if (titleInput) {
      titleInput.addEventListener('input', (e) => {
        item.title = e.target.value;
        if (isSapo) item.guideline = e.target.value;
      });
    }

    el.outlineContainer.appendChild(card);
  });
}

// Thêm thẻ tiêu đề mới vào dàn ý
function handleAddOutlineHeading() {
  if (!state.outlineData) return;
  if (!Array.isArray(state.outlineData.outline)) {
    state.outlineData.outline = [];
  }
  const newItem = {
    level: 'H2',
    title: '',
    guideline: '',
    hasVideoEmbed: false,
    hasComparisonTable: false,
    customLink: null,
    productCta: null
  };
  state.outlineData.outline.push(newItem);
  renderOutlineData(state.outlineData);
  // Tự động focus vào ô input mới tạo
  setTimeout(() => {
    const inputs = el.outlineContainer.querySelectorAll('.outline-title-input');
    if (inputs.length > 0) {
      const last = inputs[inputs.length - 1];
      last.focus();
      last.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, 50);
}

// Xử lý các nút bấm tương tác trên danh sách Dàn ý
function handleOutlineContainerClick(e) {
  const target = e.target;
  const outline = state.outlineData?.outline;
  if (!outline) return;

  // 1. Di chuyển lên trên
  const moveUpBtn = target.closest('[data-action="move-up"]');
  if (moveUpBtn) {
    const idx = parseInt(moveUpBtn.dataset.idx, 10);
    if (idx > 2) {
      const temp = outline[idx];
      outline[idx] = outline[idx - 1];
      outline[idx - 1] = temp;
      renderOutlineData(state.outlineData);
    }
    return;
  }

  // 2. Di chuyển xuống dưới
  const moveDownBtn = target.closest('[data-action="move-down"]');
  if (moveDownBtn) {
    const idx = parseInt(moveDownBtn.dataset.idx, 10);
    if (idx >= 2 && idx < outline.length - 1) {
      const temp = outline[idx];
      outline[idx] = outline[idx + 1];
      outline[idx + 1] = temp;
      renderOutlineData(state.outlineData);
    }
    return;
  }

  // 3. Xóa đề mục
  const deleteBtn = target.closest('[data-action="delete-item"]');
  if (deleteBtn) {
    const idx = parseInt(deleteBtn.dataset.idx, 10);
    const item = outline[idx];
    if (confirm(`Bạn có chắc muốn xóa đề mục "${item.title || item.level}" này không?`)) {
      outline.splice(idx, 1);
      renderOutlineData(state.outlineData);
    }
    return;
  }

  // 4. Bật/Tắt Video Embed
  const toggleVideoBtn = target.closest('[data-action="toggle-video"]');
  if (toggleVideoBtn) {
    const idx = parseInt(toggleVideoBtn.dataset.idx, 10);
    const item = outline[idx];
    if (item) {
      item.hasVideoEmbed = !item.hasVideoEmbed;
      renderOutlineData(state.outlineData);
    }
    return;
  }

  // 5. Bật/Tắt Bảng So Sánh
  const toggleTableBtn = target.closest('[data-action="toggle-table"]');
  if (toggleTableBtn) {
    const idx = parseInt(toggleTableBtn.dataset.idx, 10);
    const item = outline[idx];
    if (item) {
      item.hasComparisonTable = !item.hasComparisonTable;
      renderOutlineData(state.outlineData);
    }
    return;
  }

  // 6. Mở/Đóng Ngăn kéo Link
  const toggleLinkBtn = target.closest('[data-action="toggle-drawer-link"]');
  if (toggleLinkBtn) {
    const idx = parseInt(toggleLinkBtn.dataset.idx, 10);
    const drawer = document.getElementById(`drawer-link-${idx}`);
    if (drawer) {
      const isHidden = drawer.classList.contains('hidden');
      const card = toggleLinkBtn.closest('.outline-item-card');
      card.querySelectorAll('.outline-drawer').forEach(d => d.classList.add('hidden'));
      if (isHidden) {
        drawer.classList.remove('hidden');
        const input = drawer.querySelector('.input-link-anchor');
        if (input) input.focus();
      }
    }
    return;
  }

  // 7. Mở/Đóng Ngăn kéo Giới Thiệu SP/Dịch Vụ
  const toggleProdBtn = target.closest('[data-action="toggle-drawer-prod"]');
  if (toggleProdBtn) {
    const idx = parseInt(toggleProdBtn.dataset.idx, 10);
    const drawer = document.getElementById(`drawer-prod-${idx}`);
    if (drawer) {
      const isHidden = drawer.classList.contains('hidden');
      const card = toggleProdBtn.closest('.outline-item-card');
      card.querySelectorAll('.outline-drawer').forEach(d => d.classList.add('hidden'));
      if (isHidden) {
        drawer.classList.remove('hidden');
        const input = drawer.querySelector('.input-prod-name');
        if (input) input.focus();
      }
    }
    return;
  }

  // 8. Đóng Ngăn kéo
  const closeBtn = target.closest('[data-action="close-drawer"]');
  if (closeBtn) {
    const targetId = closeBtn.dataset.target;
    const drawer = document.getElementById(targetId);
    if (drawer) drawer.classList.add('hidden');
    return;
  }

  // 9. Lưu Link
  const saveLinkBtn = target.closest('[data-action="save-link"]');
  if (saveLinkBtn) {
    const idx = parseInt(saveLinkBtn.dataset.idx, 10);
    const drawer = document.getElementById(`drawer-link-${idx}`);
    if (drawer) {
      const anchor = drawer.querySelector('.input-link-anchor').value.trim();
      const url = drawer.querySelector('.input-link-url').value.trim();
      const item = outline[idx];
      if (item) {
        if (anchor && url) {
          item.customLink = { anchor, url };
        } else if (anchor && !url) {
          alert('Vui lòng nhập URL đích cho liên kết!');
          return;
        } else {
          item.customLink = null;
        }
        renderOutlineData(state.outlineData);
      }
    }
    return;
  }

  // 10. Xóa Link
  const removeLinkBtn = target.closest('[data-action="remove-link"]');
  if (removeLinkBtn) {
    const idx = parseInt(removeLinkBtn.dataset.idx, 10);
    const item = outline[idx];
    if (item) {
      item.customLink = null;
      renderOutlineData(state.outlineData);
    }
    return;
  }

  // 11. Lưu Giới Thiệu Sản Phẩm / Dịch Vụ
  const saveProdBtn = target.closest('[data-action="save-prod"]');
  if (saveProdBtn) {
    const idx = parseInt(saveProdBtn.dataset.idx, 10);
    const drawer = document.getElementById(`drawer-prod-${idx}`);
    if (drawer) {
      const name = drawer.querySelector('.input-prod-name').value.trim();
      const desc = drawer.querySelector('.input-prod-desc').value.trim();
      const url = drawer.querySelector('.input-prod-url').value.trim();
      const item = outline[idx];
      if (item) {
        if (name) {
          item.productCta = { name, desc, url };
        } else {
          item.productCta = null;
        }
        renderOutlineData(state.outlineData);
      }
    }
    return;
  }

  // 12. Xóa Giới Thiệu Sản Phẩm / Dịch Vụ
  const removeProdBtn = target.closest('[data-action="remove-prod"]');
  if (removeProdBtn) {
    const idx = parseInt(removeProdBtn.dataset.idx, 10);
    const item = outline[idx];
    if (item) {
      item.productCta = null;
      renderOutlineData(state.outlineData);
    }
    return;
  }
}

// Xử lý thay đổi cấp độ thẻ H2 / H3 / H4
function handleOutlineContainerChange(e) {
  const target = e.target;
  const outline = state.outlineData?.outline;
  if (!outline) return;

  if (target.matches('[data-action="change-level"]')) {
    const idx = parseInt(target.dataset.idx, 10);
    const item = outline[idx];
    if (item) {
      item.level = target.value;
      const card = target.closest('.outline-item-card');
      if (card) {
        card.className = `outline-item-card level-${item.level.toLowerCase()}`;
        const input = card.querySelector('.outline-title-input');
        if (input) input.placeholder = `Nhập tiêu đề thẻ ${item.level}...`;
      }
    }
  }
}

// BƯỚC 3 -> 4: Agent 4 Viết Bài -> Mở màn hình Biên Tập (Editor)
async function handleWriteArticle() {
  if (!state.outlineData || !state.selectedKeyword) return;

  state.apiKey = el.openrouterKey.value.trim();
  if (!state.apiKey) {
    alert('Vui lòng nhập Google Gemini API Key hoặc OpenRouter API Key trong mục Cài đặt để AI viết bài hoàn chỉnh!');
    if (el.apiSettingsBody) el.apiSettingsBody.classList.add('show');
    if (el.openrouterKey) el.openrouterKey.focus();
    return;
  }

  const internalLinks = (state.customInternalLinks || []).filter(l => l.anchor && l.anchor.trim() && l.url && l.url.trim());
  const options = {};

  currentActiveStepAction = {
    action: handleWriteArticle,
    stepTitle: 'Bước 4: Viết Bài Chuẩn SEO'
  };

  try {
    showLoading('LLM Agent 4 Đang Sáng Tạo Bài Viết...', 'Đang viết bài chuyên sâu chuẩn SEO + Semantic + AEO, chèn video YouTube, bảng đối chiếu và loại bỏ 100% từ cấm.');
    
    const articleData = await API.writeArticle(
      state.outlineData.outline,
      state.selectedKeyword,
      state.youtubeData,
      state.contentAnalysis,
      internalLinks,
      options,
      state.apiKey,
      state.model
    );
    state.articleData = articleData;

    // Đổ dữ liệu vào Màn hình Editor Bước 4
    el.editH1.value = articleData.h1Title;
    el.editMetaTitle.value = articleData.metaTitle || articleData.h1Title;
    el.editSlug.value = articleData.slug;
    el.editMetaDesc.value = articleData.metaDescription;
    el.editorMarkdown.value = articleData.contentMarkdown;

    // Render trực quan vào ContentEditable Editor
    if (el.editorVisual) {
      el.editorVisual.innerHTML = markdownToSimpleHtml(articleData.contentMarkdown);
      updateWordCount(el.editorVisual.innerText);
    }
    switchEditorView('visual');

    goToStep(4);
  } catch (err) {
    if (err.name === 'AbortError') return;
    console.error('[Step 3->4 Error]:', err);
    showModelErrorModal({
      error: err.message,
      retryAction: handleWriteArticle,
      stepTitle: 'Bước 4: Viết Bài Chuẩn SEO'
    });
  } finally {
    hideLoading();
  }
}

// Chuyển đổi qua lại giữa chế độ Trực Quan và Mã Markdown
function switchEditorView(mode) {
  if (mode === 'visual') {
    if (el.btnViewVisual) el.btnViewVisual.classList.add('active');
    if (el.btnViewMarkdown) el.btnViewMarkdown.classList.remove('active');
    if (el.visualEditorContainer) el.visualEditorContainer.classList.remove('hidden');
    if (el.markdownEditorContainer) el.markdownEditorContainer.classList.add('hidden');
    if (el.editorMarkdown && el.editorVisual) {
      el.editorVisual.innerHTML = markdownToSimpleHtml(el.editorMarkdown.value);
      updateWordCount(el.editorVisual.innerText);
    }
  } else {
    if (el.btnViewVisual) el.btnViewVisual.classList.remove('active');
    if (el.btnViewMarkdown) el.btnViewMarkdown.classList.add('active');
    if (el.visualEditorContainer) el.visualEditorContainer.classList.add('hidden');
    if (el.markdownEditorContainer) el.markdownEditorContainer.classList.remove('hidden');
    syncVisualToMarkdown();
  }
}

// Đồng bộ tự động từ Visual WYSIWYG sang Markdown
function syncVisualToMarkdown() {
  if (!el.editorVisual) return;
  const md = htmlToMarkdown(el.editorVisual);
  if (el.editorMarkdown) {
    el.editorMarkdown.value = md;
  }
  if (state.articleData) {
    state.articleData.contentMarkdown = md;
  }
  updateWordCount(el.editorVisual.innerText);
}

// Đồng bộ từ Markdown sang Visual WYSIWYG
function syncMarkdownToVisual() {
  if (!el.editorMarkdown) return;
  const md = el.editorMarkdown.value;
  if (state.articleData) {
    state.articleData.contentMarkdown = md;
  }
  if (el.editorVisual) {
    el.editorVisual.innerHTML = markdownToSimpleHtml(md);
  }
  updateWordCount(md);
}

function updateWordCount(text) {
  if (!el.editorWordCount) return;
  const words = (text || '').replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean).length;
  el.editorWordCount.textContent = `${words} từ`;
}

// BƯỚC 4: Toolbar cho Khung Soạn Thảo Trực Quan
function initEditorToolbar() {
  if (el.toolBold) {
    el.toolBold.addEventListener('click', () => {
      document.execCommand('bold', false, null);
      syncVisualToMarkdown();
    });
  }

  if (el.toolItalic) {
    el.toolItalic.addEventListener('click', () => {
      document.execCommand('italic', false, null);
      syncVisualToMarkdown();
    });
  }

  if (el.toolH2) {
    el.toolH2.addEventListener('click', () => {
      document.execCommand('formatBlock', false, '<h2>');
      syncVisualToMarkdown();
    });
  }

  if (el.toolH3) {
    el.toolH3.addEventListener('click', () => {
      document.execCommand('formatBlock', false, '<h3>');
      syncVisualToMarkdown();
    });
  }

  if (el.toolUl) {
    el.toolUl.addEventListener('click', () => {
      document.execCommand('insertUnorderedList', false, null);
      syncVisualToMarkdown();
    });
  }

  if (el.toolOl) {
    el.toolOl.addEventListener('click', () => {
      document.execCommand('insertOrderedList', false, null);
      syncVisualToMarkdown();
    });
  }

  if (el.toolAddLink) {
    el.toolAddLink.addEventListener('click', () => {
      const sel = window.getSelection();
      const selectedText = sel.toString().trim() || state.selectedKeyword || 'xem chi tiết';
      const url = prompt('Nhập đường dẫn URL liên kết:', 'https://yourwebsite.com/');
      if (url) {
        if (sel.toString().trim()) {
          document.execCommand('createLink', false, url);
        } else {
          document.execCommand('insertHTML', false, `<a href="${url}">${selectedText}</a>`);
        }
        syncVisualToMarkdown();
      }
    });
  }

  if (el.toolAddTable) {
    el.toolAddTable.addEventListener('click', () => {
      const tableHtml = `
        <table>
          <thead>
            <tr><th>Tiêu chí so sánh</th><th>Phương pháp giải pháp</th><th>Lưu ý quan trọng</th></tr>
          </thead>
          <tbody>
            <tr><td>Đặc điểm chính</td><td>Chi tiết nội dung giải pháp</td><td>Thông tin cần lưu ý</td></tr>
            <tr><td>Hiệu quả thực tế</td><td>Rõ ràng, an toàn</td><td>Thực hiện kiên trì</td></tr>
          </tbody>
        </table>
        <p><br></p>
      `;
      document.execCommand('insertHTML', false, tableHtml);
      syncVisualToMarkdown();
    });
  }

  if (el.toolAddImage) {
    el.toolAddImage.addEventListener('click', () => {
      const choice = confirm('Nhấn OK để chèn ảnh thực tế (URL), hoặc Cancel để chèn ghi chú vị trí [ảnh...]');
      if (choice) {
        const url = prompt('Nhập đường dẫn URL hình ảnh:', 'https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=800');
        if (url) {
          const alt = prompt('Nhập Alt Text mô tả ảnh:', state.selectedKeyword || 'Hình ảnh minh họa') || 'Ảnh minh họa';
          const imgHtml = `<p><img src="${url}" alt="${alt}" style="max-width:100%;border-radius:8px;margin:16px 0;" /><br><em>${alt}</em></p><p><br></p>`;
          document.execCommand('insertHTML', false, imgHtml);
          syncVisualToMarkdown();
        }
      } else {
        const note = prompt('Nhập mô tả vị trí ảnh cần chụp:', 'Mô tả ảnh chụp thực tế rõ nét minh họa cho phần này');
        if (note) {
          document.execCommand('insertHTML', false, `<p><strong>[ảnh: ${note}]</strong></p><p><br></p>`);
          syncVisualToMarkdown();
        }
      }
    });
  }

  if (el.toolAddVideo) {
    el.toolAddVideo.addEventListener('click', () => {
      if (!state.youtubeData?.videoId) {
        alert('Không có video YouTube từ Bước 1 để chèn!');
        return;
      }
      const vId = state.youtubeData.videoId;
      const videoHtml = `
        <div class="video-container" style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;margin:25px 0;border-radius:12px;box-shadow:0 4px 15px rgba(0,0,0,0.1);">
          <iframe src="https://www.youtube.com/embed/${vId}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" allowfullscreen></iframe>
        </div>
        <p><em>Video hướng dẫn thực tế chi tiết từ chuyên gia.</em></p>
        <p><br></p>
      `;
      document.execCommand('insertHTML', false, videoHtml);
      syncVisualToMarkdown();
    });
  }
}

// Chuyển đổi DOM Trực quan sang Markdown sạch sẽ và chính xác
// Chuyển đổi DOM Trực quan sang Markdown sạch sẽ và chính xác
function htmlToMarkdown(rootNode) {
  if (!rootNode) return '';

  let container = rootNode;
  if (typeof rootNode === 'string') {
    container = document.createElement('div');
    container.innerHTML = rootNode;
  }

  function processNode(node) {
    if (!node) return '';
    if (node.nodeType === Node.TEXT_NODE) {
      return node.nodeValue || '';
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }

    const tag = (node.tagName || '').toLowerCase();

    // 1. Khối Video iframe: không bao giờ truy vấn trên container cha
    if (tag === 'iframe') {
      const src = node.getAttribute('src') || '';
      return src ? `\n\n🎬 [Video YouTube: ${src}]\n\n` : '';
    }
    if (node.classList && node.classList.contains('video-container')) {
      const iframe = node.querySelector('iframe');
      const src = iframe ? iframe.getAttribute('src') : '';
      return src ? `\n\n🎬 [Video YouTube: ${src}]\n\n` : '';
    }

    // Hàm đệ quy duyệt các node con bên trong
    const childrenMarkdown = () => {
      let res = '';
      node.childNodes.forEach(child => {
        res += processNode(child);
      });
      return res;
    };

    switch (tag) {
      case 'h1':
        return `\n\n# ${childrenMarkdown().trim()}\n\n`;
      case 'h2':
        return `\n\n## ${childrenMarkdown().trim()}\n\n`;
      case 'h3':
        return `\n\n### ${childrenMarkdown().trim()}\n\n`;
      case 'h4':
        return `\n\n#### ${childrenMarkdown().trim()}\n\n`;
      case 'p': {
        const pVal = childrenMarkdown().trim();
        return pVal ? `\n\n${pVal}\n\n` : '';
      }
      case 'strong':
      case 'b': {
        const sVal = childrenMarkdown().trim();
        return sVal ? `**${sVal}**` : '';
      }
      case 'em':
      case 'i': {
        const iVal = childrenMarkdown().trim();
        return iVal ? `*${iVal}*` : '';
      }
      case 'code': {
        const cVal = childrenMarkdown().trim();
        return cVal ? `\`${cVal}\`` : '';
      }
      case 'a': {
        const href = node.getAttribute('href') || '';
        const aText = childrenMarkdown().trim() || href;
        return href ? `[${aText}](${href})` : aText;
      }
      case 'img': {
        const src = node.getAttribute('src') || '';
        const alt = node.getAttribute('alt') || 'ảnh minh họa';
        return `\n\n![${alt}](${src})\n\n`;
      }
      case 'br':
        return '\n';
      case 'hr':
        return '\n\n---\n\n';
      case 'ul': {
        let listStr = '\n';
        node.querySelectorAll(':scope > li').forEach(li => {
          listStr += `* ${processNode(li).trim()}\n`;
        });
        return listStr + '\n';
      }
      case 'ol': {
        let listStr = '\n';
        let idx = 1;
        node.querySelectorAll(':scope > li').forEach(li => {
          listStr += `${idx++}. ${processNode(li).trim()}\n`;
        });
        return listStr + '\n';
      }
      case 'li':
        return childrenMarkdown();
      case 'table': {
        let tableMd = '\n\n';
        const rows = Array.from(node.querySelectorAll('tr'));
        if (rows.length === 0) return '';
        
        // Header
        const headerCells = Array.from(rows[0].querySelectorAll('th, td'));
        if (headerCells.length > 0) {
          tableMd += '| ' + headerCells.map(c => processNode(c).trim().replace(/\|/g, '\\|') || ' ').join(' | ') + ' |\n';
          tableMd += '| ' + headerCells.map(() => '---').join(' | ') + ' |\n';
        }
        
        // Rows
        for (let i = 1; i < rows.length; i++) {
          const cells = Array.from(rows[i].querySelectorAll('td, th'));
          if (cells.length > 0) {
            tableMd += '| ' + cells.map(c => processNode(c).trim().replace(/\|/g, '\\|') || ' ').join(' | ') + ' |\n';
          }
        }
        return tableMd + '\n';
      }
      case 'thead':
      case 'tbody':
      case 'tr':
      case 'th':
      case 'td':
        return childrenMarkdown();
      case 'blockquote':
        return `\n\n> ${childrenMarkdown().trim()}\n\n`;
      case 'div':
        return '\n\n' + childrenMarkdown().trim() + '\n\n';
      case 'span':
      default:
        return childrenMarkdown();
    }
  }

  // Duyệt trực tiếp các con của container, không bao giờ lấy outerHTML của container
  let md = '';
  container.childNodes.forEach(child => {
    md += processNode(child);
  });

  // Tẩy sạch bất kỳ thẻ div editor nào còn sót lại
  md = md.replace(/<div\s+id=["']editor-visual["'][^>]*>/gi, '');
  md = md.replace(/<div\s+class=["']visual-editor["'][^>]*>/gi, '');
  md = md.replace(/<\/div>\s*$/gi, '');
  md = md.replace(/\n{3,}/g, '\n\n').trim();

  return md;
}

// 1-Click Tự Động Tối Ưu Nâng Điểm Lên 95 - 100 Điểm SEO Toàn Diện
async function handleAutoOptimizeArticle() {
  if (!state.articleData || !state.selectedKeyword) return;

  // Đồng bộ bài viết hiện tại từ Editor
  syncVisualToMarkdown();
  state.articleData.h1Title = el.editH1.value.trim();
  state.articleData.metaTitle = el.editMetaTitle.value.trim();
  state.articleData.slug = el.editSlug.value.trim();
  state.articleData.metaDescription = el.editMetaDesc.value.trim();
  state.articleData.contentMarkdown = el.editorMarkdown.value.trim();

  try {
    showLoading('Đang Tự Động Tối Ưu Lên 95 - 100 Điểm...', 'Hệ thống đang chuẩn hóa 16 tiêu chí, tối ưu độ dài >1.200 từ, cân bằng mật độ từ khóa, chèn ảnh minh họa, bảng đối chiếu và mục FAQs...');

    const internalLinks = (state.customInternalLinks || []).filter(l => l.anchor && l.anchor.trim() && l.url && l.url.trim());
    const res = await API.autoOptimize(
      state.articleData,
      state.selectedKeyword,
      state.youtubeData,
      internalLinks
    );

    if (res.success && res.articleData) {
      state.articleData = res.articleData;
      state.seoReport = res.seoReport;

      // Cập nhật lại các trường trong Editor Bước 4
      if (el.editH1) el.editH1.value = state.articleData.h1Title;
      if (el.editMetaTitle) el.editMetaTitle.value = state.articleData.metaTitle;
      if (el.editSlug) el.editSlug.value = state.articleData.slug;
      if (el.editMetaDesc) el.editMetaDesc.value = state.articleData.metaDescription;
      if (el.editorMarkdown) el.editorMarkdown.value = state.articleData.contentMarkdown;

      if (el.editorVisual) {
        el.editorVisual.innerHTML = markdownToSimpleHtml(state.articleData.contentMarkdown);
        updateWordCount(el.editorVisual.innerText);
      }

      // Cập nhật giao diện báo cáo Bước 5 nếu đang ở Bước 5
      if (state.currentStep === 5 && state.seoReport) {
        renderFinalArticleAndSeoReport(state.articleData, state.seoReport);
      }

      alert(`🎉 Chúc mừng! Bài viết đã được tự động nâng cấp đạt ${res.seoReport.totalScore} / 100 điểm (${res.seoReport.grade} ${res.seoReport.badge})!`);
    }
  } catch (err) {
    console.error('[Auto-Optimize Error]:', err);
    alert(`Lỗi khi tự động tối ưu: ${err.message}`);
  } finally {
    hideLoading();
  }
}

// BƯỚC 4 -> 5: Chạy Chấm Điểm SEO trên bài viết đã biên tập
async function handleRunSeoGrade() {
  // Đồng bộ bài viết từ Editor
  syncVisualToMarkdown();
  state.articleData.h1Title = el.editH1.value.trim();
  state.articleData.metaTitle = el.editMetaTitle.value.trim();
  state.articleData.slug = el.editSlug.value.trim();
  state.articleData.metaDescription = el.editMetaDesc.value.trim();
  state.articleData.contentMarkdown = el.editorMarkdown.value.trim();

  currentActiveStepAction = {
    action: handleRunSeoGrade,
    stepTitle: 'Bước 5: Chấm Điểm & Kiểm Định SEO'
  };

  try {
    showLoading('Đang Kiểm Định & Chấm Điểm SEO...', 'Rà soát 16 tiêu chí chuẩn 100 điểm theo SPEC_CHAM_BAI_VIET_BLOG_CHUAN_SEO.md và quét từ cấm AGENTS.md.');
    
    const gradeResult = await API.gradeSeo(state.articleData, state.selectedKeyword, state.apiKey, state.model);
    state.seoReport = gradeResult.seoReport;
    if (gradeResult.articleData) {
      state.articleData = gradeResult.articleData;
    }

    renderFinalArticleAndSeoReport(state.articleData, gradeResult.seoReport);
    goToStep(5);
  } catch (err) {
    if (err.name === 'AbortError') return;
    console.error('[Step 4->5 Error]:', err);
    showModelErrorModal({
      error: err.message,
      retryAction: handleRunSeoGrade,
      stepTitle: 'Bước 5: Chấm Điểm & Kiểm Định SEO'
    });
  } finally {
    hideLoading();
  }
}

// BƯỚC 5: Xử lý Đẩy lên WordPress qua REST API (Chỉ cần 2 trường: Link Web & API Key)
async function handlePushToWordPress() {
  const siteUrl = el.wpUrl.value.trim();
  const apiKey = el.wpApiKey.value.trim();
  const postStatus = el.wpStatus.value;

  if (!siteUrl || !apiKey) {
    alert('Vui lòng nhập đầy đủ: Link Website và API Key / Token của WordPress!');
    return;
  }

  try {
    showLoading('Đang Đẩy Lên Website WordPress...', 'Tự động làm sạch HTML, loại bỏ thẻ H1 trong thân bài, thiết lập rỗng excerpt và điền cấu hình Yoast SEO Meta...');
    
    const res = await API.publishWordPress({
      siteUrl,
      apiKey,
      postStatus,
      articleData: state.articleData,
      selectedKeyword: state.selectedKeyword
    });
    
    el.wpResultAlert.className = 'wp-result-alert success';
    el.wpResultAlert.innerHTML = `
      <strong>🎉 Đăng bài lên WordPress thành công! (ID: ${res.postId} - Trạng thái: ${res.status})</strong><br><br>
      <a href="${res.postUrl}" target="_blank">🔗 Xem bài viết trên web</a>
      <a href="${res.editUrl}" target="_blank">✏️ Chỉnh sửa trong WP-Admin</a>
    `;
    el.wpResultAlert.classList.remove('hidden');
    el.wpResultAlert.scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    el.wpResultAlert.className = 'wp-result-alert error';
    el.wpResultAlert.textContent = `❌ Thất bại: ${err.message}`;
    el.wpResultAlert.classList.remove('hidden');
  } finally {
    hideLoading();
  }
}

function renderFinalArticleAndSeoReport(article, report) {
  el.scoreVal.textContent = report.totalScore;
  el.scoreGrade.textContent = report.grade;
  el.scoreBadge.textContent = report.badge;
  el.scoreKwStats.textContent = `Mật độ từ khóa chính: ${report.keywordStats.density}% (${report.keywordStats.count} lần) | Tổng số từ: ${report.keywordStats.totalWords} từ`;

  const circle = document.querySelector('.score-circle');
  if (report.totalScore >= 90) circle.style.borderColor = 'var(--success)';
  else if (report.totalScore >= 80) circle.style.borderColor = 'var(--warning)';
  else circle.style.borderColor = 'var(--danger)';

  el.scoreAlertsArea.innerHTML = '';
  (report.criticalErrors || []).forEach(err => {
    const pill = document.createElement('div');
    pill.className = 'alert-pill critical';
    pill.textContent = err;
    el.scoreAlertsArea.appendChild(pill);
  });
  (report.optimizations || []).forEach(opt => {
    const pill = document.createElement('div');
    pill.className = 'alert-pill warning';
    pill.textContent = `🟠 ${opt}`;
    el.scoreAlertsArea.appendChild(pill);
  });

  let tableHtml = `
    <table class="criteria-table">
      <thead>
        <tr>
          <th>STT</th>
          <th>Tiêu chí đánh giá</th>
          <th>Điểm đạt được</th>
          <th>Điểm tối đa</th>
        </tr>
      </thead>
      <tbody>
  `;
  (report.scores || []).forEach(s => {
    tableHtml += `
      <tr>
        <td>${s.id}</td>
        <td><strong>${s.name}</strong></td>
        <td><span class="badge ${s.score === s.max ? 'badge-success' : 'badge-warning'}">${s.score}đ</span></td>
        <td>${s.max}đ</td>
      </tr>
    `;
  });
  tableHtml += `</tbody></table>`;
  el.criteriaTableContainer.innerHTML = tableHtml;

  const baseSite = (state.wpUrl ? state.wpUrl.replace(/\/+$/, '') : 'https://yourwebsite.com');
  el.serpUrlDisplay.textContent = `${baseSite}/${article.slug || 'bai-viet-seo'}`;
  el.serpTitleDisplay.textContent = article.metaTitle || article.h1Title;
  el.serpDescDisplay.textContent = article.metaDescription;

  el.articlePreviewBody.innerHTML = article.cleanHtml || markdownToSimpleHtml(article.contentMarkdown);
  el.htmlRawContent.value = article.cleanHtml;
  el.mdRawContent.value = article.contentMarkdown;
}

// Chuyển đổi Markdown sang HTML chuẩn, hỗ trợ bảng biểu và danh sách bullet list
function markdownToSimpleHtml(md) {
  if (!md) return '';
  if (typeof window.marked !== 'undefined' && window.marked.parse) {
    try {
      return window.marked.parse(md);
    } catch (e) {
      console.warn('Marked parse error:', e);
    }
  }
  return md
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\n\n+/gim, '</p><p>')
    .replace(/\n/gim, '<br>');
}

// Quản lý Lưu trữ Phiên làm việc (Session Persistence - Chống mất dữ liệu khi F5 hoặc gặp sự cố)
function saveSessionProgress() {
  try {
    const dataToSave = {
      currentStep: state.currentStep,
      selectedKeyword: state.selectedKeyword,
      youtubeData: state.youtubeData,
      contentAnalysis: state.contentAnalysis,
      keywordsData: state.keywordsData,
      outlineData: state.outlineData,
      articleData: state.articleData,
      seoReport: state.seoReport
    };
    sessionStorage.setItem('yt_seo_progress', JSON.stringify(dataToSave));
  } catch (e) {
    console.warn('Không thể lưu session progress:', e);
  }
}

function restoreSessionProgress() {
  try {
    const raw = sessionStorage.getItem('yt_seo_progress');
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data.youtubeData) state.youtubeData = data.youtubeData;
    if (data.contentAnalysis) state.contentAnalysis = data.contentAnalysis;
    if (data.keywordsData) state.keywordsData = data.keywordsData;
    if (data.selectedKeyword) state.selectedKeyword = data.selectedKeyword;
    if (data.outlineData) state.outlineData = data.outlineData;
    if (data.articleData) state.articleData = data.articleData;
    if (data.seoReport) state.seoReport = data.seoReport;

    if (state.youtubeData && el.previewThumbImg) {
      el.previewThumbImg.src = state.youtubeData.metadata?.thumbnailUrl || '';
      el.previewTitle.textContent = state.youtubeData.metadata?.title || '';
      el.previewChannel.textContent = state.youtubeData.metadata?.channelTitle || '';
      el.videoPreviewCard.classList.remove('hidden');
    }
    if (state.contentAnalysis) {
      renderAnalysisData(state.contentAnalysis);
    }
    if (state.keywordsData) {
      renderKeywordsData(state.keywordsData);
    }
    if (state.outlineData) {
      renderOutlineData(state.outlineData);
    }
    if (state.articleData) {
      if (el.editH1) el.editH1.value = state.articleData.h1Title || '';
      if (el.editMetaTitle) el.editMetaTitle.value = state.articleData.metaTitle || '';
      if (el.editSlug) el.editSlug.value = state.articleData.slug || '';
      if (el.editMetaDesc) el.editMetaDesc.value = state.articleData.metaDescription || '';
      if (el.editorMarkdown) el.editorMarkdown.value = state.articleData.contentMarkdown || '';
      if (el.editorVisual) {
        el.editorVisual.innerHTML = markdownToSimpleHtml(state.articleData.contentMarkdown || '');
        updateWordCount(el.editorVisual.innerText);
      }
    }
    if (state.seoReport && state.articleData) {
      renderFinalArticleAndSeoReport(state.articleData, state.seoReport);
    }

    if (data.currentStep && data.currentStep > 1) {
      goToStep(data.currentStep);
    }
  } catch (e) {
    console.warn('Lỗi khôi phục session:', e);
  }
}

// Navigation Helper
function goToStep(stepNumber) {
  state.currentStep = stepNumber;
  document.querySelectorAll('.step-content').forEach(s => s.classList.add('hidden'));
  document.getElementById(`step-${stepNumber}`)?.classList.remove('hidden');

  document.querySelectorAll('.step-item').forEach(item => {
    const s = parseInt(item.dataset.step, 10);
    item.classList.remove('active', 'completed');
    if (s === stepNumber) item.classList.add('active');
    else if (s < stepNumber) item.classList.add('completed');
  });

  saveSessionProgress();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

let loadingTimerInterval = null;
let loadingStartTime = 0;

function showLoading(title, desc) {
  el.loadingTitle.textContent = title;
  el.loadingDesc.textContent = desc;
  el.loadingOverlay.classList.remove('hidden');

  loadingStartTime = Date.now();
  if (loadingTimerInterval) clearInterval(loadingTimerInterval);

  const timerEl = document.getElementById('loading-elapsed-seconds');
  const liveStatusEl = document.getElementById('loading-live-status');
  const progressFill = document.getElementById('loading-progress-fill');

  if (timerEl) timerEl.textContent = '0s';
  if (progressFill) progressFill.style.width = '20%';
  if (liveStatusEl) liveStatusEl.textContent = '⚡ Đang gửi yêu cầu tới AI Model...';

  const milestones = [
    { sec: 1, text: '🚀 Đang gửi prompt và thiết lập ngữ cảnh SEO...', progress: '35%' },
    { sec: 2, text: '🧠 AI đang phân tích chuyên sâu theo giọng văn Home Care...', progress: '55%' },
    { sec: 3, text: '✍️ Đang sáng tạo nội dung & chèn cấu trúc chuẩn Semantic...', progress: '75%' },
    { sec: 5, text: '📊 Đang định dạng bảng đối chiếu và tích hợp YouTube...', progress: '88%' },
    { sec: 8, text: '🛡️ Đang rà soát 100% từ cấm và loại bỏ ký tự lạ...', progress: '95%' },
    { sec: 12, text: '⚡ Sắp hoàn thành, đang đóng gói dữ liệu bài viết...', progress: '98%' }
  ];

  loadingTimerInterval = setInterval(() => {
    const elapsedSec = Math.floor((Date.now() - loadingStartTime) / 1000);
    if (timerEl) timerEl.textContent = `${elapsedSec}s`;

    if (liveStatusEl && progressFill) {
      for (let i = milestones.length - 1; i >= 0; i--) {
        if (elapsedSec >= milestones[i].sec) {
          liveStatusEl.textContent = milestones[i].text;
          progressFill.style.width = milestones[i].progress;
          break;
        }
      }
    }
  }, 400);
}

function hideLoading() {
  if (loadingTimerInterval) {
    clearInterval(loadingTimerInterval);
    loadingTimerInterval = null;
  }
  const progressFill = document.getElementById('loading-progress-fill');
  if (progressFill) progressFill.style.width = '100%';
  el.loadingOverlay.classList.add('hidden');
}
