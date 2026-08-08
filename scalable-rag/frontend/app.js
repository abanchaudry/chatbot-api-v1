// ─── State ──────────────────────────────────────────────────────────

const API = "/api";
let stagedFiles = [];
let currentPage = 1;
let pollingTimers = {};

// ─── DOM refs ───────────────────────────────────────────────────────

const $ = (sel) => document.querySelector(sel);
const dropZone = $("#drop-zone");
const fileInput = $("#file-input");
const fileList = $("#file-list");
const uploadBtn = $("#upload-btn");
const tbody = $("#documents-tbody");
const refreshBtn = $("#refresh-btn");
const docCount = $("#doc-count");
const pagination = $("#pagination");
const previewSection = $("#preview-section");
const previewTitle = $("#preview-title");
const previewMeta = $("#preview-meta");
const previewContent = $("#preview-content");
const editorContent = $("#editor-content");
const copyMarkdownBtn = $("#copy-markdown-btn");
const editContentBtn = $("#edit-content-btn");
const saveContentBtn = $("#save-content-btn");
const cancelEditBtn = $("#cancel-edit-btn");
const closePreview = $("#close-preview");
const healthDot = $("#health-indicator");
const healthLabel = $("#health-label");

let currentViewingDocId = null;
let currentMarkdown = "";

// ─── Init ───────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  checkHealth();
  loadDocuments();
  bindEvents();
  setUiMode(currentUiMode);
  // Auto-refresh every 8s to catch status updates
  setInterval(() => loadDocuments(currentPage, true), 8000);
});

// ─── Events ─────────────────────────────────────────────────────────

function bindEvents() {
  // Drop zone
  if (dropZone) {
    dropZone.addEventListener("click", () => fileInput.click());
    dropZone.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") fileInput.click();
    });

    dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropZone.classList.add("drag-over");
    });
    dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag-over"));
    dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropZone.classList.remove("drag-over");
      if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
    });
  }

  if (fileInput) {
    fileInput.addEventListener("change", () => {
      if (fileInput.files.length) addFiles(fileInput.files);
      fileInput.value = "";
    });
  }

  if (uploadBtn) uploadBtn.addEventListener("click", uploadAll);
  if (refreshBtn) refreshBtn.addEventListener("click", () => loadDocuments());
  if (closePreview) {
    closePreview.addEventListener("click", () => {
      previewSection.hidden = true;
    });
  }

  // Copy Markdown
  if (copyMarkdownBtn) {
    copyMarkdownBtn.addEventListener("click", () => {
      const textToCopy = editorContent.hidden ? previewContent.textContent : editorContent.value;
      navigator.clipboard.writeText(textToCopy);
      const orig = copyMarkdownBtn.textContent;
      copyMarkdownBtn.textContent = "Copied!";
      setTimeout(() => { copyMarkdownBtn.textContent = orig; }, 2000);
    });
  }

  // Edit Mode Toggle
  if (editContentBtn) {
    editContentBtn.addEventListener("click", () => {
      previewContent.hidden = true;
      editorContent.hidden = false;
      editorContent.value = currentMarkdown;
      editContentBtn.hidden = true;
      saveContentBtn.hidden = false;
      cancelEditBtn.hidden = false;
      editorContent.focus();
    });
  }

  // Cancel Edit
  if (cancelEditBtn) {
    cancelEditBtn.addEventListener("click", () => {
      editorContent.hidden = true;
      previewContent.hidden = false;
      editContentBtn.hidden = false;
      saveContentBtn.hidden = true;
      cancelEditBtn.hidden = true;
    });
  }

  // Save Content
  if (saveContentBtn) {
    saveContentBtn.addEventListener("click", async () => {
      if (!currentViewingDocId) return;

      const newContent = editorContent.value;
      saveContentBtn.disabled = true;
      saveContentBtn.textContent = "Saving...";

      try {
        const res = await fetch(`${API}/documents/${currentViewingDocId}/content`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ markdownContent: newContent }),
        });

        const data = await res.json();
        if (res.ok) {
          currentMarkdown = newContent;
          previewContent.textContent = newContent;
          previewContent.hidden = false;
          editorContent.hidden = true;

          editContentBtn.hidden = false;
          saveContentBtn.hidden = true;
          cancelEditBtn.hidden = true;

          showToast("Markdown content updated successfully!", "success");
        } else {
          showToast(`Save failed: ${data.error}`, "error");
        }
      } catch (err) {
        showToast(`Save error: ${err.message}`, "error");
      } finally {
        saveContentBtn.disabled = false;
        saveContentBtn.textContent = "Save Changes";
      }
    });
  }
}

// ─── Staged file management ─────────────────────────────────────────

function addFiles(fileListObj) {
  for (const f of fileListObj) {
    // Avoid duplicates
    if (!stagedFiles.some((s) => s.name === f.name && s.size === f.size)) {
      stagedFiles.push(f);
    }
  }
  renderStagedFiles();
}

function removeStaged(index) {
  stagedFiles.splice(index, 1);
  renderStagedFiles();
}

function renderStagedFiles() {
  if (stagedFiles.length === 0) {
    fileList.hidden = true;
    fileList.innerHTML = "";
    uploadBtn.disabled = true;
    return;
  }

  fileList.hidden = false;
  uploadBtn.disabled = false;
  fileList.innerHTML = stagedFiles
    .map(
      (f, i) => `
    <div class="file-item">
      <div class="file-item-left">
        <span class="file-item-name" title="${esc(f.name)}">${esc(f.name)}</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <span class="file-item-size">${formatBytes(f.size)}</span>
        <button class="file-remove" onclick="window.__removeStaged(${i})" title="Remove">&times;</button>
      </div>
    </div>`
    )
    .join("");
}

// Expose for inline onclick (simple approach for vanilla JS)
window.__removeStaged = removeStaged;

// ─── Upload ─────────────────────────────────────────────────────────

async function uploadAll() {
  if (stagedFiles.length === 0) return;

  const mode = document.querySelector('input[name="engineMode"]:checked').value;
  uploadBtn.disabled = true;
  uploadBtn.textContent = mode === "ai-full" ? "Rendering 300 DPI Vision..." : "Uploading...";

  const results = [];

  for (const file of stagedFiles) {
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("engineMode", mode);

      // If 100% AI Vision mode and file is PDF, pre-render page screenshots at 300 DPI
      if (mode === "ai-full" && file.name.toLowerCase().endsWith(".pdf")) {
        uploadBtn.textContent = `Rendering 300 DPI pages for ${file.name}...`;
        const pageImages = await renderPdfPagesToImages(file);
        if (pageImages.length > 0) {
          fd.append("pageImages", JSON.stringify(pageImages));
        }
      }

      uploadBtn.textContent = "Uploading to Cloudflare R2 & D1...";
      const res = await fetch(`${API}/documents/upload`, { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok) {
        results.push({ name: file.name, ok: false, error: data.error });
      } else {
        results.push({ name: file.name, ok: true, data });
      }
    } catch (err) {
      results.push({ name: file.name, ok: false, error: err.message });
    }
  }

  // Set selected doc to the newly uploaded file to track it automatically
  const successful = results.filter((r) => r.ok && r.data?.documentId);
  if (successful.length > 0) {
    selectedDocId = successful[successful.length - 1].data.documentId;
  }

  // Clear staged
  stagedFiles = [];
  renderStagedFiles();
  uploadBtn.textContent = "Upload";

  // Reload documents
  await loadDocuments();

  // Show errors if any
  const errors = results.filter((r) => !r.ok);
  if (errors.length > 0) {
    alert("Some uploads failed:\n" + errors.map((e) => `${e.name}: ${e.error}`).join("\n"));
  }
}

// ─── 300 DPI Client Canvas PDF Renderer (Option 3) ─────────────────

async function renderPdfPagesToImages(file) {
  if (typeof pdfjsLib === "undefined") return [];
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pageImages = [];

    const maxPages = Math.min(pdf.numPages, 15);
    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 }); // 300 DPI viewport scale
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: context, viewport }).promise;
      pageImages.push({
        pageNum: i,
        dataUrl: canvas.toDataURL("image/png"),
      });
    }
    return pageImages;
  } catch (err) {
    console.warn("Client 300 DPI PDF rendering note:", err);
    return [];
  }
}

// ─── Load Documents ─────────────────────────────────────────────────

let allLoadedDocs = [];
let selectedDocId = null;
let pollTimer = null;

async function loadDocuments(page = 1, silent = false) {
  currentPage = page;
  if (!silent) {
    refreshBtn.disabled = true;
  }

  try {
    const res = await fetch(`${API}/documents?page=${page}&limit=50`);
    const data = await res.json();
    allLoadedDocs = data.documents || [];

    const docSearchQuery = document.getElementById("doc-search-input")?.value?.toLowerCase() || "";
    const filteredDocs = docSearchQuery
      ? allLoadedDocs.filter((d) => d.filename.toLowerCase().includes(docSearchQuery))
      : allLoadedDocs;

    renderDocuments(filteredDocs);
    renderSimpleDocuments(allLoadedDocs);
    renderPagination(data.pagination || {});
    docCount.textContent = `${data.pagination?.total ?? 0} total`;

    // Update live pipeline tracker card below upload section
    updateTrackerPanel(allLoadedDocs);

    // Auto-poll in real time if any document is processing/queued/pending
    const hasActive = allLoadedDocs.some(
      (d) => d.status === "processing" || d.status === "queued" || d.status === "pending"
    );

    clearTimeout(pollTimer);
    if (hasActive) {
      pollTimer = setTimeout(() => loadDocuments(currentPage, true), 1000);
    }
  } catch (err) {
    if (!silent) console.error("Failed to load documents:", err);
  } finally {
    refreshBtn.disabled = false;
  }
}

function updateTrackerPanel(docs) {
  const trackerTitle = document.getElementById("tracker-title");
  const trackerBadge = document.getElementById("tracker-badge");

  if (!docs || docs.length === 0) {
    if (trackerTitle) trackerTitle.textContent = "Live Pipeline Status";
    if (trackerBadge) trackerBadge.textContent = "Idle";
    renderIdlePipeline();
    return;
  }

  let targetDoc = docs.find((d) => d.id === selectedDocId);
  if (!targetDoc) {
    targetDoc = docs.find((d) => d.status === "processing" || d.status === "queued" || d.status === "pending");
  }
  if (!targetDoc) {
    targetDoc = docs[0];
  }

  if (trackerTitle) {
    trackerTitle.textContent = `Pipeline: ${targetDoc.filename}`;
  }
  if (trackerBadge) {
    trackerBadge.textContent = `${targetDoc.engine_mode.toUpperCase()} MODE — ${targetDoc.status.toUpperCase()}`;
  }

  renderPipelineChain(targetDoc);
}

function renderIdlePipeline() {
  const container = document.getElementById("pipeline-feedback-container");
  if (!container) return;
  container.innerHTML = `
    <div style="text-align:center;padding:12px;color:var(--text-tertiary);font-size:0.85rem">
      No documents in ingestion pipeline. Drop a file above to view live step progress.
    </div>`;
}

function renderDocuments(docs) {
  if (docs.length === 0) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="7">No documents match search query.</td></tr>';
    return;
  }

  tbody.innerHTML = docs
    .map(
      (d) => {
        const isChunked = Number(d.is_chunked || 0) === 1;
        const isIndexed = Number(d.is_indexed || 0) === 1;

        let statusText = d.status;
        let statusClass = d.status;
        if (isIndexed) {
          statusText = "indexed";
          statusClass = "done";
        } else if (isChunked) {
          statusText = "chunks ready";
          statusClass = "done";
        }

        return `
    <tr data-id="${d.id}" style="cursor:pointer" onclick="window.__viewDoc('${d.id}','${esc(d.filename)}')">
      <td class="filename-cell" title="${esc(d.filename)}">${esc(d.filename)}</td>
      <td><span class="type-badge">${d.file_type}</span></td>
      <td style="white-space:nowrap">${formatBytes(d.file_size)}</td>
      <td><span class="mode-badge">${d.engine_mode}</span></td>
      <td>
        <span class="status-badge status-${statusClass}">
          <span class="status-dot"></span>
          ${statusText}
        </span>
      </td>
      <td style="white-space:nowrap;color:var(--text-secondary);font-size:0.8rem">${formatDate(d.created_at)}</td>
      <td style="text-align:right" onclick="event.stopPropagation()">
        <div style="display:inline-flex;align-items:center;gap:6px;">
          ${(d.status === "done" || d.status === "indexed" || d.extracted_r2_key) ? `<button class="btn btn-ghost" style="padding:4px 10px;font-size:0.78rem" onclick="window.__viewDoc('${d.id}','${esc(d.filename)}')">View</button>` : ""}
          
          <div class="menu-dropdown-wrap">
            <button class="menu-trigger-btn" onclick="window.__toggleDocMenu(event, '${d.id}')">⋮</button>
            <div id="menu-${d.id}" class="dropdown-menu" hidden>
              <button class="dropdown-item" onclick="window.__viewDoc('${d.id}','${esc(d.filename)}'); window.__closeAllMenus();">👁️ View Content</button>
              
              ${!isChunked && !isIndexed ? `
                <button class="dropdown-item" onclick="window.__chunkDoc('${d.id}'); window.__closeAllMenus();">🌳 Generate Chunks</button>
              ` : ""}

              ${isChunked ? `
                <button class="dropdown-item" onclick="window.__viewChunks('${d.id}','${esc(d.filename)}'); window.__closeAllMenus();">🌳 View 3-Tier Chunks</button>
              ` : ""}

              ${isChunked && !isIndexed ? `
                <button class="dropdown-item" onclick="window.__indexDoc('${d.id}'); window.__closeAllMenus();">⚡ Index Document</button>
              ` : ""}

              ${isChunked ? `
                <button class="dropdown-item" onclick="window.__reindexDoc('${d.id}'); window.__closeAllMenus();">🔄 Re-Chunk Document</button>
              ` : ""}

              <button class="dropdown-item danger" onclick="window.__deleteDoc('${d.id}'); window.__closeAllMenus();">🗑️ Delete Document</button>
            </div>
          </div>
        </div>
      </td>
    </tr>`;
      }
    )
    .join("");

  renderClassifierAudits(allLoadedDocs);
}

function renderClassifierAudits(docs, searchQuery = "") {
  const auditsContainer = document.getElementById("classifier-audits-list");
  const gapBadge = document.getElementById("gap-count-badge");

  if (!auditsContainer) return;

  const query = (searchQuery || document.getElementById("audit-search-input")?.value || "").toLowerCase().trim();

  let filtered = docs || [];
  if (query) {
    filtered = filtered.filter(
      (d) =>
        d.filename.toLowerCase().includes(query) ||
        (d.classification_category || "").toLowerCase().includes(query) ||
        (d.classification_reasoning || "").toLowerCase().includes(query) ||
        (d.suggested_category || "").toLowerCase().includes(query)
    );
  }

  // Calculate flagged gaps (confidence < 0.70 or has suggested_category)
  const flaggedGaps = (docs || []).filter(
    (d) => (d.classification_confidence ?? 1) < 0.70 || Boolean(d.suggested_category)
  );

  if (gapBadge) {
    gapBadge.textContent = `${flaggedGaps.length} Flagged Gap(s)`;
  }

  if (filtered.length === 0) {
    auditsContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-secondary);">No classification audit records match your search query.</div>';
    return;
  }

  auditsContainer.innerHTML = filtered
    .map((d) => {
      const cat = d.classification_category || "Prose_Standard";
      const confRatio = d.classification_confidence ?? 0.85;
      const conf = Math.round(confRatio * 100);
      const reasoning = d.classification_reasoning || "Classified based on structural patterns.";

      const isGap = confRatio < 0.70 || Boolean(d.suggested_category);
      const cardClass = isGap ? "gap-flagged" : "ideal-fit";

      const borderStyle = isGap
        ? "border-left: 4px solid #f59e0b; background: #fffbeb; border-top: 1px solid #fde68a; border-right: 1px solid #fde68a; border-bottom: 1px solid #fde68a;"
        : "border: 1px solid #e2e8f0; background: #ffffff;";

      return `
      <div class="audit-card ${cardClass}" style="${borderStyle} border-radius: 8px; padding: 14px 18px; transition: all 0.15s ease;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong style="font-size: 0.95rem; color: #1e293b;">${esc(d.filename)}</strong>
            <span style="color: var(--text-secondary); font-size: 0.88rem; margin-left: 8px;">— Classified as <code style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; color: #0284c7; font-weight: 600;">${esc(cat)}</code></span>
          </div>

          ${
            isGap
              ? `<span style="background: #fef3c7; color: #b45309; padding: 3px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 700;">Gap Flagged (${conf}%)</span>`
              : `<span style="background: #d1fae5; color: #047857; padding: 3px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 700;">Ideal Fit (${conf}%)</span>`
          }
        </div>

        <p style="margin-top: 8px; font-size: 0.86rem; color: var(--text-secondary); line-height: 1.4;">
          ${esc(reasoning)}
        </p>

        ${
          isGap
            ? `
        <div style="margin-top: 10px; padding: 10px 14px; background: #ffffff; border: 1px solid #fde68a; border-radius: 6px; font-size: 0.84rem; color: #92400e;">
          <strong>AI Gap Proposal:</strong> Suggests new category <code>${esc(d.suggested_category || "other_custom")}</code>.
          <br>
          <span style="color: #b45309; display: inline-block; margin-top: 4px;"><strong>Rule Recommendation:</strong> ${esc(d.suggested_chunking_rule || "Custom chunking strategy recommended for non-standard layout.")}</span>
        </div>`
            : ""
        }
      </div>`;
    })
    .join("");
}

function renderPagination(p) {
  if (!p.totalPages || p.totalPages <= 1) {
    pagination.hidden = true;
    return;
  }

  pagination.hidden = false;
  pagination.innerHTML = `
    <button ${p.page <= 1 ? "disabled" : ""} onclick="window.__goPage(${p.page - 1})">&laquo; Prev</button>
    <span class="page-info">Page ${p.page} / ${p.totalPages}</span>
    <button ${p.page >= p.totalPages ? "disabled" : ""} onclick="window.__goPage(${p.page + 1})">Next &raquo;</button>
  `;
}

window.__goPage = (p) => loadDocuments(p);

// ─── Pipeline Feedback Chain Renderer ──────────────────────────────

function renderPipelineChain(doc) {
  const container = document.getElementById("pipeline-feedback-container");
  if (!container || !doc) return;

  const status = doc.status || "pending";
  const mode = (doc.engine_mode || "offline").toUpperCase();

  const s1 = { status: "completed", sub: formatBytes(doc.file_size || 0) };
  let s2 = { status: "pending", sub: "Cloudflare Queue" };
  let s3 = { status: "pending", sub: `${mode} Engine` };
  let s4 = { status: "pending", sub: "R2 Storage" };

  let c1 = "", c2 = "", c3 = "";

  if (status === "queued" || status === "pending") {
    s2 = { status: "active", sub: "Queued in CF" };
    c1 = "active";
  } else if (status === "processing") {
    s2 = { status: "completed", sub: "Dispatched" };
    s3 = { status: "active", sub: `Extracting (${mode})` };
    c1 = "completed";
    c2 = "active";
  } else if (status === "done") {
    s2 = { status: "completed", sub: "Dispatched" };
    s3 = { status: "completed", sub: `${mode} Extraction` };
    s4 = { status: "completed", sub: `${doc.page_count || 1} pages ready` };
    c1 = "completed";
    c2 = "completed";
    c3 = "completed";
  } else if (status === "failed") {
    s2 = { status: "completed", sub: "Dispatched" };
    s3 = { status: "failed", sub: "Error in extraction" };
    s4 = { status: "failed", sub: doc.error_message || "Failed" };
    c1 = "completed";
    c2 = "completed";
    c3 = "failed";
  }

  const getIcon = (step) => {
    if (step.status === "completed") return "✓";
    if (step.status === "active") return "⚡";
    if (step.status === "failed") return "✕";
    return "•";
  };

  container.innerHTML = `
    <div class="pipeline-chain">
      <div class="pipeline-step ${s1.status}">
        <div class="step-node">${getIcon(s1)}</div>
        <div class="step-info">
          <span class="step-title">1. Upload File</span>
          <span class="step-sub" title="${esc(s1.sub)}">${esc(s1.sub)}</span>
        </div>
      </div>

      <div class="pipeline-connector ${c1}"></div>

      <div class="pipeline-step ${s2.status}">
        <div class="step-node">${getIcon(s2)}</div>
        <div class="step-info">
          <span class="step-title">2. Queue Job</span>
          <span class="step-sub" title="${esc(s2.sub)}">${esc(s2.sub)}</span>
        </div>
      </div>

      <div class="pipeline-connector ${c2}"></div>

      <div class="pipeline-step ${s3.status}">
        <div class="step-node">${getIcon(s3)}</div>
        <div class="step-info">
          <span class="step-title">3. Text Extraction</span>
          <span class="step-sub" title="${esc(s3.sub)}">${esc(s3.sub)}</span>
        </div>
      </div>

      <div class="pipeline-connector ${c3}"></div>

      <div class="pipeline-step ${s4.status}">
        <div class="step-node">${getIcon(s4)}</div>
        <div class="step-info">
          <span class="step-title">4. Result Ready</span>
          <span class="step-sub" title="${esc(s4.sub)}">${esc(s4.sub)}</span>
        </div>
      </div>
    </div>
  `;
}

// ─── View / Delete ──────────────────────────────────────────────────

window.__viewDoc = async (id, filename) => {
  selectedDocId = id;
  currentViewingDocId = id;
  previewSection.hidden = false;
  previewTitle.textContent = `Extracted Content — ${filename}`;
  previewMeta.textContent = "Loading document details...";

  // Reset editor view state
  previewContent.textContent = "";
  previewContent.hidden = false;
  editorContent.hidden = true;
  editContentBtn.hidden = false;
  saveContentBtn.hidden = true;
  cancelEditBtn.hidden = true;

  try {
    const docRes = await fetch(`${API}/documents/${id}`);
    const docData = await docRes.json();
    if (docData?.document) {
      updateTrackerPanel([docData.document]);
    }

    const res = await fetch(`${API}/documents/${id}/content`);
    const data = await res.json();

    if (!res.ok) {
      previewMeta.textContent = data.error || "Failed to load content.";
      return;
    }

    currentMarkdown = data.markdown || "(empty)";
    previewMeta.textContent = `Document ID: ${id} | Storage: R2 | Database: D1`;
    previewContent.textContent = currentMarkdown;
    editorContent.value = currentMarkdown;
    previewSection.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (err) {
    previewMeta.textContent = `Error: ${err.message}`;
  }
};

// ─── Anchored Dropdown Menu Handlers ───────────────────────────────

window.__toggleDocMenu = (event, id) => {
  event.stopPropagation();
  const menu = document.getElementById(`menu-${id}`);
  if (!menu) return;
  const isShown = menu.classList.contains("show");
  window.__closeAllMenus();
  if (!isShown) {
    menu.classList.add("show");
  }
};

window.__closeAllMenus = () => {
  document.querySelectorAll(".dropdown-menu").forEach((m) => m.classList.remove("show"));
};

document.addEventListener("click", () => {
  window.__closeAllMenus();
});

// ─── Toast Pop-up Notification System ──────────────────────────────

function showToast(message, type = "success", duration = 3500) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast-card toast-${type}`;

  const iconMap = {
    success: "✓",
    error: "✕",
    info: "⚡",
  };

  const iconBg = {
    success: "background:#d1fae5;color:#047857;",
    error: "background:#fee2e2;color:#b91c1c;",
    info: "background:#dbeafe;color:#1d4ed8;",
  };

  toast.innerHTML = `
    <div style="width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:0.8rem;${iconBg[type] || iconBg.info}">
      ${iconMap[type] || "•"}
    </div>
    <div style="flex:1;line-height:1.4">${esc(message)}</div>
    <button style="background:transparent;border:none;color:#94a3b8;cursor:pointer;font-size:1rem;padding:0 2px" onclick="this.parentElement.remove()">✕</button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("toast-fade-out");
    setTimeout(() => toast.remove(), 250);
  }, duration);
}

// ─── Chunking Strategy Choice Modal Handler ────────────────────────

let pendingChunkDocId = null;
let pendingIsRechunk = false;

window.__openChunkModal = (id, isRechunk = false) => {
  pendingChunkDocId = id;
  pendingIsRechunk = isRechunk;
  const modal = document.getElementById("chunk-strategy-modal");
  if (modal) {
    modal.classList.add("show");
  }
};

window.__closeChunkModal = () => {
  pendingChunkDocId = null;
  pendingIsRechunk = false;
  const modal = document.getElementById("chunk-strategy-modal");
  if (modal) {
    modal.classList.remove("show");
  }
};

const confirmChunkBtn = document.getElementById("confirm-chunk-btn");
if (confirmChunkBtn) {
  confirmChunkBtn.addEventListener("click", async () => {
    if (!pendingChunkDocId) return;

    const selectedStrategy = document.querySelector('input[name="chunkStrategyMode"]:checked')?.value || "adaptive";
    const docId = pendingChunkDocId;
    const isRechunk = pendingIsRechunk;

    window.__closeChunkModal();

    const strategyLabel = selectedStrategy === "ai" ? "100% AI Agentic LLM Chunker" : "Adaptive 3-Tier Rule Tree";
    showToast(`Generating chunks using ${strategyLabel}...`, "info", 6000);

    try {
      const endpoint = `${API}/documents/${docId}/${isRechunk ? "rechunk" : "chunk"}`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strategy: selectedStrategy }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(
          `Success! ${selectedStrategy === "ai" ? "AI Semantic" : "Adaptive 3-Tier"} Chunks generated. Total: ${data.chunkCounts?.total || 0} chunks (Large, Medium, Small).`,
          "success",
          4500
        );
        await loadDocuments(currentPage);
      } else {
        showToast(`Chunk generation failed: ${data.error}`, "error");
      }
    } catch (err) {
      showToast(`Chunking error: ${err.message}`, "error");
    }
  });
}

// ─── Document Stage Action Operations ──────────────────────────────

window.__chunkDoc = async (id) => {
  window.__openChunkModal(id, false);
};

window.__indexDoc = async (id) => {
  try {
    showToast("Embedding & indexing leaf chunks into Cloudflare Vectorize...", "info", 5000);
    const res = await fetch(`${API}/documents/${id}/index`, { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      showToast(`Document leaf chunks indexed successfully into Cloudflare Vectorize!`, "success");
      await loadDocuments(currentPage);
    } else {
      showToast(`Indexing failed: ${data.error}`, "error");
    }
  } catch (err) {
    showToast(`Indexing error: ${err.message}`, "error");
  }
};

window.__reindexDoc = async (id) => {
  window.__openChunkModal(id, true);
};

// ─── Menu Action Operations ─────────────────────────────────────────

// ─── 3-Tier Chunk Inspector & Live Chunk Editing ────────────────────

let currentTreeChunks = [];
let currentActiveTierFilter = "all";
let currentInspectorDocId = null;

window.__viewChunks = async (id, filename) => {
  currentInspectorDocId = id;
  const treeSection = document.getElementById("tree-inspector-section");
  const treeTitle = document.getElementById("tree-inspector-title");
  const searchInput = document.getElementById("chunk-search-input");

  if (searchInput) searchInput.value = "";

  if (treeSection) {
    treeSection.hidden = false;
    if (treeTitle) treeTitle.textContent = `3-Tier Adaptive Chunk Tree — ${filename}`;
    await loadTreeChunks(id);
    treeSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }
};

async function loadTreeChunks(id, searchQuery = "") {
  const container = document.getElementById("tree-chunks-container");
  if (!container) return;

  container.innerHTML = '<div style="padding:20px;color:var(--text-secondary)">Loading 3-tier chunk tree...</div>';

  try {
    const url = `${API}/documents/${id}/chunks${searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : ""}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok) {
      container.innerHTML = `<div style="padding:20px;color:#dc2626">Error: ${data.error || "Failed to load chunks"}</div>`;
      return;
    }

    currentTreeChunks = data.chunks?.all || [];

    // Update tier counts
    const countAll = document.getElementById("count-all");
    const countLarge = document.getElementById("count-large");
    const countMedium = document.getElementById("count-medium");
    const countSmall = document.getElementById("count-small");

    if (countAll) countAll.textContent = currentTreeChunks.length;
    if (countLarge) countLarge.textContent = data.counts?.large ?? 0;
    if (countMedium) countMedium.textContent = data.counts?.medium ?? 0;
    if (countSmall) countSmall.textContent = data.counts?.small ?? 0;

    renderTreeChunks(currentActiveTierFilter);
  } catch (err) {
    container.innerHTML = `<div style="padding:20px;color:#dc2626">Error loading chunks: ${err.message}</div>`;
  }
}

function renderTreeChunks(tierFilter = "all") {
  currentActiveTierFilter = tierFilter;
  const container = document.getElementById("tree-chunks-container");
  if (!container) return;

  let filtered = currentTreeChunks;
  if (tierFilter !== "all") {
    filtered = currentTreeChunks.filter((c) => c.tier === tierFilter);
  }

  if (filtered.length === 0) {
    container.innerHTML = '<div style="padding:20px;color:var(--text-secondary)">No chunks match the current filter or search query.</div>';
    return;
  }

  container.innerHTML = filtered
    .map((chunk) => {
      const tierLabel = chunk.tier === "large" ? "Tier 1: Large ~1k" : chunk.tier === "medium" ? "Tier 2: Medium ~400" : "Tier 3: Small ~150";
      const badgeClass = `badge-tier-${chunk.tier}`;

      return `
      <div class="chunk-card" data-chunk-id="${chunk.id}">
        <div class="chunk-header">
          <div style="display:flex;align-items:center;gap:8px">
            <span class="${badgeClass}">${tierLabel}</span>
            <span style="font-size:0.8rem;color:var(--text-secondary)">Index #${chunk.chunk_index}</span>
            <span style="font-size:0.8rem;font-weight:600;color:var(--text-secondary)">~${chunk.token_count || 0} tokens</span>
          </div>
          <button class="btn btn-ghost" style="padding:3px 8px;font-size:0.75rem" onclick="window.__toggleChunkEditor('${chunk.id}')">✏️ Edit Chunk</button>
        </div>

        <div id="chunk-view-${chunk.id}" class="chunk-content-preview">${esc(chunk.content)}</div>

        <div id="chunk-edit-${chunk.id}" hidden style="margin-top:10px;">
          <textarea id="chunk-input-${chunk.id}" style="width:100%;height:100px;padding:8px;border:1px solid var(--border);border-radius:6px;font-family:monospace;font-size:0.85rem">${esc(chunk.content)}</textarea>
          <div style="display:flex;gap:8px;margin-top:6px;justify-content:flex-end">
            <button class="btn btn-ghost" style="padding:4px 10px;font-size:0.78rem" onclick="window.__toggleChunkEditor('${chunk.id}')">Cancel</button>
            <button class="btn btn-primary" style="padding:4px 10px;font-size:0.78rem" onclick="window.__saveChunkEdit('${chunk.id}')">Save Chunk</button>
          </div>
        </div>
      </div>`;
    })
    .join("");
}

window.__toggleChunkEditor = (chunkId) => {
  const viewEl = document.getElementById(`chunk-view-${chunkId}`);
  const editEl = document.getElementById(`chunk-edit-${chunkId}`);
  if (viewEl && editEl) {
    const isEditing = !editEl.hidden;
    editEl.hidden = isEditing;
    viewEl.hidden = !isEditing;
  }
};

window.__saveChunkEdit = async (chunkId) => {
  const inputEl = document.getElementById(`chunk-input-${chunkId}`);
  if (!inputEl || !currentInspectorDocId) return;

  const newContent = inputEl.value;

  try {
    const res = await fetch(`${API}/documents/${currentInspectorDocId}/chunks/${chunkId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newContent }),
    });

    if (res.ok) {
      showToast("Chunk updated successfully!", "success");
      // Update local state
      const target = currentTreeChunks.find((c) => c.id === chunkId);
      if (target) target.content = newContent;
      renderTreeChunks(currentActiveTierFilter);
    } else {
      const data = await res.json();
      showToast(`Failed to save chunk: ${data.error}`, "error");
    }
  } catch (err) {
    showToast(`Save chunk error: ${err.message}`, "error");
  }
};

// Bind Tier Selector Buttons
document.querySelectorAll(".tier-btn").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    document.querySelectorAll(".tier-btn").forEach((b) => b.classList.remove("active"));
    e.currentTarget.classList.add("active");
    const tier = e.currentTarget.getAttribute("data-tier");
    renderTreeChunks(tier || "all");
  });
});

// Bind Keyword Search Input
let chunkSearchTimeout = null;
const searchInput = document.getElementById("chunk-search-input");
if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    clearTimeout(chunkSearchTimeout);
    chunkSearchTimeout = setTimeout(() => {
      if (currentInspectorDocId) {
        loadTreeChunks(currentInspectorDocId, e.target.value);
      }
    }, 250);
  });
}

const clearSearchBtn = document.getElementById("clear-chunk-search-btn");
if (clearSearchBtn) {
  clearSearchBtn.addEventListener("click", () => {
    if (searchInput) searchInput.value = "";
    if (currentInspectorDocId) loadTreeChunks(currentInspectorDocId, "");
  });
}

// Bind Document Search Input
const docSearchInput = document.getElementById("doc-search-input");
if (docSearchInput) {
  docSearchInput.addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase().trim();
    const filteredDocs = q
      ? allLoadedDocs.filter((d) => d.filename.toLowerCase().includes(q))
      : allLoadedDocs;
    renderDocuments(filteredDocs);
  });
}

// Bind Classifier Audit Search Input
const auditSearchInput = document.getElementById("audit-search-input");
if (auditSearchInput) {
  auditSearchInput.addEventListener("input", (e) => {
    renderClassifierAudits(allLoadedDocs, e.target.value);
  });
}
if (clearSearchBtn) {
  clearSearchBtn.addEventListener("click", () => {
    if (searchInput) searchInput.value = "";
    if (currentInspectorDocId) loadTreeChunks(currentInspectorDocId, "");
  });
}

const closeTreeBtn = document.getElementById("close-tree-btn");
if (closeTreeBtn) {
  closeTreeBtn.addEventListener("click", () => {
    const treeSection = document.getElementById("tree-inspector-section");
    if (treeSection) treeSection.hidden = true;
  });
}

window.__deleteDoc = async (id) => {
  if (!confirm("Delete this document and its extracted content?")) return;

  try {
    await fetch(`${API}/documents/${id}`, { method: "DELETE" });
    showToast("Document deleted successfully!", "info");
    await loadDocuments(currentPage);

    // Close preview if viewing this doc
    if (previewTitle.textContent.includes(id)) {
      previewSection.hidden = true;
    }
  } catch (err) {
    showToast(`Delete failed: ${err.message}`, "error");
  }
};

// ─── Health Check ───────────────────────────────────────────────────

async function checkHealth() {
  try {
    const res = await fetch(`${API}/health`);
    if (res.ok) {
      healthDot.className = "health-dot ok";
      healthLabel.textContent = "Connected";
    } else {
      throw new Error();
    }
  } catch {
    healthDot.className = "health-dot err";
    healthLabel.textContent = "Offline";
  }
}

// ─── Helpers ────────────────────────────────────────────────────────

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0) + " " + units[i];
}

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso + "Z");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
    " " +
    d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function esc(str) {
  const el = document.createElement("span");
  el.textContent = str;
  return el.innerHTML;
}

// ─── Mode Switcher (Technical vs Simplified Admin Mode) ───────────

let currentUiMode = localStorage.getItem("rag_ui_mode") || "technical";

function setUiMode(mode) {
  currentUiMode = mode;
  localStorage.setItem("rag_ui_mode", mode);

  const techView = document.getElementById("technical-view");
  const simpleView = document.getElementById("simplified-view");
  const modeBtn = document.getElementById("mode-switch-btn");
  const modeTag = document.getElementById("current-mode-tag");

  if (mode === "simplified") {
    if (techView) techView.hidden = true;
    if (simpleView) simpleView.hidden = false;
    if (modeTag) modeTag.textContent = "Simplified Admin Mode";
    if (modeBtn) modeBtn.textContent = "⚡ Switch to Technical Developer Mode";
    renderSimpleDocuments(allLoadedDocs);
  } else {
    if (techView) techView.hidden = false;
    if (simpleView) simpleView.hidden = true;
    if (modeTag) modeTag.textContent = "Technical Mode";
    if (modeBtn) modeBtn.textContent = "⚙️ Switch to Simplified Admin Mode";
    renderDocuments(allLoadedDocs);
  }
}

const modeBtn = document.getElementById("mode-switch-btn");
if (modeBtn) {
  modeBtn.addEventListener("click", () => {
    setUiMode(currentUiMode === "technical" ? "simplified" : "technical");
  });
}

// ─── Simplified Mode File Selection & Wizard Processing ─────────

let simpleSelectedFileObj = null;

const simpleDropZone = document.getElementById("simple-drop-zone");
const simpleFileInput = document.getElementById("simple-file-input");
const simpleSelectedFileLabel = document.getElementById("simple-selected-file");
const simpleStartBtn = document.getElementById("simple-start-btn");

if (simpleDropZone && simpleFileInput) {
  simpleDropZone.addEventListener("click", () => simpleFileInput.click());

  simpleDropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    simpleDropZone.style.borderColor = "#0284c7";
    simpleDropZone.style.background = "#f0f9ff";
  });

  simpleDropZone.addEventListener("dragleave", () => {
    simpleDropZone.style.borderColor = "var(--border)";
    simpleDropZone.style.background = "transparent";
  });

  simpleDropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    simpleDropZone.style.borderColor = "var(--border)";
    simpleDropZone.style.background = "transparent";
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleSimpleFileSelect(e.dataTransfer.files[0]);
    }
  });

  simpleFileInput.addEventListener("change", (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleSimpleFileSelect(e.target.files[0]);
    }
  });
}

function handleSimpleFileSelect(file) {
  simpleSelectedFileObj = file;
  if (simpleSelectedFileLabel) {
    simpleSelectedFileLabel.textContent = `Selected: ${file.name} (${formatBytes(file.size)})`;
  }
  if (simpleStartBtn) {
    simpleStartBtn.disabled = false;
  }
}

if (simpleStartBtn) {
  simpleStartBtn.addEventListener("click", async () => {
    if (!simpleSelectedFileObj) return;

    simpleStartBtn.disabled = true;
    const file = simpleSelectedFileObj;
    const engineMode = document.querySelector('input[name="simpleEngineMode"]:checked')?.value || "offline";
    const chunkMode = document.querySelector('input[name="simpleChunkMode"]:checked')?.value || "adaptive";

    const progressSection = document.getElementById("simple-progress-section");
    const progressTitle = document.getElementById("simple-progress-title");
    const progressBadge = document.getElementById("simple-progress-badge");

    if (progressSection) progressSection.hidden = false;
    if (progressTitle) progressTitle.textContent = `Processing Status: ${file.name}`;
    if (progressBadge) progressBadge.textContent = "Processing";

    renderSimpleStepper(1, "Uploading file to storage...");

    try {
      // Step 1: Upload
      const formData = new FormData();
      formData.append("file", file);
      formData.append("engineMode", engineMode);

      const uploadRes = await fetch(`${API}/documents/upload`, {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.documentId) {
        throw new Error(uploadData.error || "Upload failed");
      }

      const docId = uploadData.documentId;
      selectedDocId = docId;

      // Step 2: Poll extraction
      renderSimpleStepper(2, `Extracting content via ${engineMode.toUpperCase()} Engine...`);
      let isDone = false;
      let attempts = 0;
      while (!isDone && attempts < 60) {
        await new Promise((r) => setTimeout(r, 1500));
        attempts++;
        const checkRes = await fetch(`${API}/documents/${docId}`);
        const checkData = await checkRes.json();
        const status = checkData.document?.status;

        if (status === "done") {
          isDone = true;
        } else if (status === "failed") {
          throw new Error(checkData.document?.error_message || "Extraction failed");
        }
      }

      // Step 3: Chunking
      const chunkLabel = chunkMode === "ai" ? "100% AI LLM Chunker" : "Adaptive Rule Tree";
      renderSimpleStepper(3, `Partitioning 3-tier chunks via ${chunkLabel}...`);

      const chunkRes = await fetch(`${API}/documents/${docId}/chunk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strategy: chunkMode }),
      });
      const chunkData = await chunkRes.json();
      if (!chunkRes.ok) throw new Error(chunkData.error || "Chunking failed");

      // Step 4: Indexing
      renderSimpleStepper(4, "Embedding & indexing leaf chunks into Cloudflare Vectorize...");

      const indexRes = await fetch(`${API}/documents/${docId}/index`, {
        method: "POST",
      });
      const indexData = await indexRes.json();
      if (!indexRes.ok) throw new Error(indexData.error || "Indexing failed");

      // Complete!
      renderSimpleStepper(5, "Complete!");
      if (progressBadge) progressBadge.textContent = "Success";
      showToast(`Document ${file.name} successfully extracted, chunked, and indexed!`, "success", 5000);

      // Reset
      simpleSelectedFileObj = null;
      if (simpleSelectedFileLabel) simpleSelectedFileLabel.textContent = "No file selected (PDF, DOCX, PPTX, XLSX, Images)";
      if (simpleFileInput) simpleFileInput.value = "";

      await loadDocuments(currentPage, true);
    } catch (err) {
      showToast(`Processing error: ${err.message}`, "error", 6000);
      if (progressBadge) progressBadge.textContent = "Error";
    } finally {
      simpleStartBtn.disabled = false;
    }
  });
}

function renderSimpleStepper(currentStep, message) {
  const container = document.getElementById("simple-stepper-container");
  if (!container) return;

  const steps = [
    { num: 1, title: "1. Upload File", sub: "Cloudflare R2 Storage" },
    { num: 2, title: "2. Data Extraction", sub: "Engine Ingestion" },
    { num: 3, title: "3. 3-Tier Chunking", sub: "Adaptive/AI Tree" },
    { num: 4, title: "4. Vector Indexing", sub: "Cloudflare Vectorize" },
  ];

  let c1 = currentStep > 1 ? "completed" : currentStep === 1 ? "active" : "";
  let c2 = currentStep > 2 ? "completed" : currentStep === 2 ? "active" : "";
  let c3 = currentStep > 3 ? "completed" : currentStep === 3 ? "active" : "";

  const getStepStatus = (num) => {
    if (currentStep > num) return "completed";
    if (currentStep === num) return "active";
    return "pending";
  };

  const getIcon = (status) => {
    if (status === "completed") return "✓";
    if (status === "active") return "⚡";
    return "•";
  };

  container.innerHTML = `
    <div class="pipeline-container" style="margin:0; background:#ffffff;">
      <div class="pipeline-chain">
        ${steps
          .map((s, idx) => {
            const st = getStepStatus(s.num);
            const connClass = idx === 0 ? c1 : idx === 1 ? c2 : idx === 2 ? c3 : "";
            const connector = idx < steps.length - 1 ? `<div class="pipeline-connector ${connClass}"></div>` : "";

            return `
            <div class="pipeline-step ${st}">
              <div class="step-node">${getIcon(st)}</div>
              <div class="step-info">
                <span class="step-title">${s.title}</span>
                <span class="step-sub" title="${esc(s.sub)}">${esc(s.sub)}</span>
              </div>
            </div>
            ${connector}`;
          })
          .join("")}
      </div>
    </div>`;
}

function renderSimpleDocuments(docs) {
  const simpleTbody = document.getElementById("simple-docs-tbody");
  const simpleDocCount = document.getElementById("simple-doc-count");

  if (simpleDocCount) simpleDocCount.textContent = `${docs?.length || 0} Documents`;
  if (!simpleTbody) return;

  if (!docs || docs.length === 0) {
    simpleTbody.innerHTML = '<tr class="empty-row"><td colspan="5">No documents ingested yet. Upload one above.</td></tr>';
    return;
  }

  simpleTbody.innerHTML = docs
    .map((d) => {
      const isChunked = Number(d.is_chunked || 0) === 1;
      const isIndexed = Number(d.is_indexed || 0) === 1;

      let statusText = d.status;
      let statusClass = d.status;
      if (isIndexed) {
        statusText = "indexed";
        statusClass = "done";
      } else if (isChunked) {
        statusText = "chunks ready";
        statusClass = "done";
      }

      return `
      <tr>
        <td class="filename-cell"><strong>${esc(d.filename)}</strong></td>
        <td><span class="mode-badge">${d.engine_mode}</span></td>
        <td>
          <span class="status-badge status-${statusClass}">
            <span class="status-dot"></span>
            ${statusText}
          </span>
        </td>
        <td style="color:var(--text-secondary);font-size:0.8rem">${formatDate(d.created_at)}</td>
        <td style="text-align:right">
          ${
            isChunked
              ? `<button class="btn btn-ghost" style="padding:4px 12px;font-size:0.8rem;color:#0284c7" onclick="window.__viewSimpleChunks('${d.id}','${esc(d.filename)}')">👁️ View Final Chunks</button>`
              : '<span style="color:var(--text-tertiary);font-size:0.8rem">Processing...</span>'
          }
        </td>
      </tr>`;
    })
    .join("");
}

let currentSimpleChunks = [];
let currentSimpleFilterTier = "all";

window.__viewSimpleChunks = async (id, filename) => {
  const modal = document.getElementById("simple-chunks-modal");
  const title = document.getElementById("simple-chunks-title");
  const body = document.getElementById("simple-chunks-body");

  if (title) title.textContent = `3-Tier Chunk Tree — ${filename} (Read-Only)`;
  if (body) body.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-secondary)">Loading chunks...</div>';
  if (modal) modal.classList.add("show");

  try {
    const res = await fetch(`${API}/documents/${id}/chunks`);
    const data = await res.json();

    const all = data.chunks?.all || [];
    const large = data.chunks?.large || [];
    const medium = data.chunks?.medium || [];
    const small = data.chunks?.small || [];

    currentSimpleChunks = all;
    currentSimpleFilterTier = "all";

    const countAll = document.getElementById("simple-count-all");
    const countLarge = document.getElementById("simple-count-large");
    const countMedium = document.getElementById("simple-count-medium");
    const countSmall = document.getElementById("simple-count-small");

    if (countAll) countAll.textContent = all.length;
    if (countLarge) countLarge.textContent = large.length;
    if (countMedium) countMedium.textContent = medium.length;
    if (countSmall) countSmall.textContent = small.length;

    // Reset tier buttons active state
    document.querySelectorAll("#simple-tier-selector-group .tier-btn").forEach((b) => {
      b.classList.toggle("active", b.dataset.tier === "all");
    });

    renderSimpleChunksList();
  } catch (err) {
    if (body) body.innerHTML = `<div style="padding:20px;color:#dc2626">Error loading chunks: ${err.message}</div>`;
  }
};

function renderSimpleChunksList() {
  const body = document.getElementById("simple-chunks-body");
  const searchInput = document.getElementById("simple-chunk-search-input");
  if (!body) return;

  const q = searchInput?.value?.toLowerCase().trim() || "";

  let filtered = currentSimpleChunks;
  if (currentSimpleFilterTier !== "all") {
    filtered = filtered.filter((c) => c.tier === currentSimpleFilterTier);
  }
  if (q) {
    filtered = filtered.filter((c) => c.content.toLowerCase().includes(q));
  }

  if (filtered.length === 0) {
    body.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-secondary);">No matching chunks found.</div>';
    return;
  }

  body.innerHTML = filtered
    .map((c) => {
      const parentLink = c.parent_chunk_id ? `<span class="chunk-parent-link">↑ Parent: ${c.parent_chunk_id.slice(0, 8)}</span>` : "";
      return `
      <div class="chunk-card tier-${c.tier}">
        <div class="chunk-card-header">
          <span>TIER ${c.tier.toUpperCase()} #${c.chunk_index}</span>
          <span>~${c.token_count || 0} TOKENS</span>
        </div>
        ${parentLink}
        <div class="chunk-content" style="white-space:pre-wrap;line-height:1.45;margin-top:6px;color:#1e293b">${esc(c.content)}</div>
      </div>`;
    })
    .join("");
}

// Bind Tier Buttons for Simple Chunks Modal
document.addEventListener("click", (e) => {
  if (e.target.closest("#simple-tier-selector-group .tier-btn")) {
    const btn = e.target.closest(".tier-btn");
    document.querySelectorAll("#simple-tier-selector-group .tier-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentSimpleFilterTier = btn.dataset.tier || "all";
    renderSimpleChunksList();
  }
});

const simpleChunkSearchInput = document.getElementById("simple-chunk-search-input");
if (simpleChunkSearchInput) {
  simpleChunkSearchInput.addEventListener("input", () => renderSimpleChunksList());
}

const simpleClearChunkSearchBtn = document.getElementById("simple-clear-chunk-search-btn");
if (simpleClearChunkSearchBtn) {
  simpleClearChunkSearchBtn.addEventListener("click", () => {
    if (simpleChunkSearchInput) simpleChunkSearchInput.value = "";
    renderSimpleChunksList();
  });
}

window.__closeSimpleChunksModal = () => {
  const modal = document.getElementById("simple-chunks-modal");
  if (modal) modal.classList.remove("show");
};
