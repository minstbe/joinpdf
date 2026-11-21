const splitFileInput = document.getElementById("splitFile")
const pageSpecInput = document.getElementById("pageSpec")
const splitNameInput = document.getElementById("splitName")
const splitBtn = document.getElementById("splitBtn")
const splitStatus = document.getElementById("splitStatus")
const mergeFilesInput = document.getElementById("mergeFiles")
const mergeNameInput = document.getElementById("mergeName")
const fileListEl = document.getElementById("fileList")
const clearListBtn = document.getElementById("clearListBtn")
const mergeBtn = document.getElementById("mergeBtn")
const mergeStatus = document.getElementById("mergeStatus")
const themeToggle = document.getElementById("themeToggle")
const helpBtn = document.getElementById("helpBtn")
const helpModal = document.getElementById("helpModal")
const helpClose = document.getElementById("helpClose")
const feedbackBtn = document.getElementById("feedbackBtn")
const feedbackModal = document.getElementById("feedbackModal")
const feedbackClose = document.getElementById("feedbackClose")
const feedbackInput = document.getElementById("feedbackInput")
const feedbackSubmit = document.getElementById("feedbackSubmit")
const feedbackRefresh = document.getElementById("feedbackRefresh")
const messagesList = document.getElementById("messagesList")
const feedbackStatus = document.getElementById("feedbackStatus")
const splitCard = document.getElementById("splitCard")
const mergeCard = document.getElementById("mergeCard")
const splitExpandHint = document.getElementById("splitExpandHint")
const mergeExpandHint = document.getElementById("mergeExpandHint")
const splitPreview = document.getElementById("splitPreview")
const clearSplit = document.getElementById("clearSplit")
const clearMerge = document.getElementById("clearMerge")
const thumbnailGrid = document.getElementById("thumbnailGrid")
const selectedArea = document.getElementById("selectedArea")
const selectedStrip = document.getElementById("selectedStrip")
const previewArea = document.getElementById("previewArea")
const previewCanvas = document.getElementById("previewCanvas")
const previewDrawLayer = document.getElementById("previewDrawLayer")
const previewLabel = document.getElementById("previewLabel")
const closePreview = document.getElementById("closePreview")
const prevPreview = document.getElementById("prevPreview")
const nextPreview = document.getElementById("nextPreview")
const fullscreenPreview = document.getElementById("fullscreenPreview")
const fullscreenOverlay = document.getElementById("fullscreenOverlay")
const fsCanvas = document.getElementById("fsCanvas")
const fsDrawLayer = document.getElementById("fsDrawLayer")
const fsLabel = document.getElementById("fsLabel")
const fsPrev = document.getElementById("fsPrev")
const fsNext = document.getElementById("fsNext")
const fsAnnoColor = document.getElementById("fsAnnoColor")
const fsClearPage = document.getElementById("fsClearPage")
const fsClose = document.getElementById("fsClose")
const annoToolbar = document.getElementById("annoToolbar")
const annoColor = document.getElementById("annoColor")
const clearPageAnno = document.getElementById("clearPageAnno")
const clearAllAnno = document.getElementById("clearAllAnno")
const annoWidth = document.getElementById("annoWidth")
const fsAnnoWidth = document.getElementById("fsAnnoWidth")
let splitFileRef = null
let mergeItems = []
let draggingIndex = null
let splitPages = []
let selectedIndices = []
let selDragIdx = null
let annotations = {}
let currentTool = "pointer"
let currentStroke = null
let activePreviewPage = null
let textClickTime = 0
const API_BASE = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
  ? (location.port === "5600" ? "" : "http://localhost:5600")
  : ""
const MAX_FILE_SIZE = 100 * 1024 * 1024
pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js"

function track(event, params) {
  try {
    if (typeof gtag === "function") gtag("event", event, params || {})
  } catch (e) {}
}
function parsePages(spec, total) {
  if (!spec || typeof spec !== "string") return null
  const cleaned = spec.replace(/\s+/g, "")
  if (cleaned.toLowerCase() === "all") return Array.from({ length: total }, (_, i) => i)
  const parts = cleaned.split(",").filter(Boolean)
  const out = []
  for (const p of parts) {
    if (p.includes("-")) {
      const [s, e] = p.split("-")
      const start = parseInt(s, 10)
      const end = parseInt(e, 10)
      if (Number.isNaN(start) || Number.isNaN(end)) return null
      if (start < 1 || end < 1) return null
      if (start <= end) {
        for (let i = start; i <= end; i++) out.push(i - 1)
      } else {
        for (let i = start; i >= end; i--) out.push(i - 1)
      }
    } else {
      const v = parseInt(p, 10)
      if (Number.isNaN(v) || v < 1) return null
      out.push(v - 1)
    }
  }
  for (const i of out) {
    if (i < 0 || i >= total) return null
  }
  return out
}
function setBusy(el, busy, textIdle, textBusy) {
  if (busy) {
    el.setAttribute("disabled", "true")
    el.textContent = textBusy
  } else {
    el.removeAttribute("disabled")
    el.textContent = textIdle
  }
}
function setStatus(el, text, type) {
  el.textContent = text || ""
  setStatusClass(el, type || "")
}
function genId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID()
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const a = new Uint8Array(16)
    crypto.getRandomValues(a)
    a[6] = (a[6] & 15) | 64
    a[8] = (a[8] & 63) | 128
    const h = Array.from(a, b => b.toString(16).padStart(2, "0")).join("")
    return h.slice(0, 8) + "-" + h.slice(8, 12) + "-" + h.slice(12, 16) + "-" + h.slice(16, 20) + "-" + h.slice(20)
  }
  return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10)
}
function formatSize(bytes) {
  if (!bytes || bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
}
function setStatusClass(el, type) {
  el.classList.remove("success", "error")
  if (type) el.classList.add(type)
}
function ensurePdfName(name) {
  const trimmed = (name || "").trim()
  if (!trimmed) return null
  return /\.pdf$/i.test(trimmed) ? trimmed : trimmed + ".pdf"
}
function downloadBytes(bytes, name) {
  const blob = new Blob([bytes], { type: "application/pdf" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}
function openHelp() {
  helpModal.classList.remove("hidden")
}
function closeHelp() {
  helpModal.classList.add("hidden")
}
helpBtn.addEventListener("click", openHelp)
helpClose.addEventListener("click", closeHelp)
window.addEventListener("keydown", e => {
  if (e.key === "Escape") closeHelp()
})
helpModal.addEventListener("click", e => {
  if (e.target === helpModal) closeHelp()
})
function openFeedback() {
  feedbackModal.classList.remove("hidden")
}
function closeFeedback() {
  feedbackModal.classList.add("hidden")
}
feedbackBtn && feedbackBtn.addEventListener("click", openFeedback)
feedbackClose && feedbackClose.addEventListener("click", closeFeedback)
window.addEventListener("keydown", e => {
  if (e.key === "Escape") closeFeedback()
})
feedbackModal && feedbackModal.addEventListener("click", e => {
  if (e.target === feedbackModal) closeFeedback()
})
async function renderThumbnails(file) {
  thumbnailGrid.innerHTML = "<div style='text-align:center;padding:20px;color:var(--muted)'>Loading page thumbnails\u2026</div>"
  splitPreview.classList.remove("hidden")
  selectedArea.classList.add("hidden")
  selectedIndices = []
  splitPages = []
  try {
    const buffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
    const total = pdf.numPages
    splitPages = Array.from({ length: total }, (_, i) => i)
    annotations = {}
    annoToolbar.classList.remove("hidden")
    thumbnailGrid.innerHTML = ""
    const scale = 0.4
    for (let i = 1; i <= total; i++) {
      const page = await pdf.getPage(i)
      const vp = page.getViewport({ scale })
      const canvas = document.createElement("canvas")
      canvas.width = vp.width
      canvas.height = vp.height
      canvas.className = "thumb-canvas"
      await page.render({ canvasContext: canvas.getContext("2d"), viewport: vp }).promise
      const item = document.createElement("div")
      item.className = "thumb-item"
      item.dataset.page = String(i - 1)
      item.addEventListener("click", (e) => {
        if (e.target.closest(".remove-sel")) return
        togglePage(i - 1, e.shiftKey)
      })
      const label = document.createElement("div")
      label.className = "thumb-label"
      label.textContent = String(i)
      item.appendChild(canvas)
      item.appendChild(label)
      thumbnailGrid.appendChild(item)
    }
    updatePageSpec()
  } catch (e) {
    thumbnailGrid.innerHTML = "<div style='text-align:center;padding:20px;color:var(--muted)'>Failed to load preview. You can still type page numbers below.</div>"
    splitPreview.classList.remove("hidden")
  }
}

function drawAnnotations(canvas, strokes) {
  const ctx = canvas.getContext("2d")
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  renderStrokes(ctx, strokes, canvas.width, canvas.height, 1)
}

function renderStrokes(ctx, strokes, w, h, scale) {
  for (const s of strokes) {
    if (s.type === "text") {
      ctx.fillStyle = s.color
      ctx.font = (s.fontSize * scale) + "px sans-serif"
      ctx.fillText(s.text, s.x * w, s.y * h)
    } else {
      ctx.strokeStyle = s.color
      ctx.globalAlpha = s.type === "highlighter" ? 0.45 : 1
      ctx.lineWidth = s.width * scale
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      if (s.points.length >= 2) {
        ctx.beginPath()
        ctx.moveTo(s.points[0].x * w, s.points[0].y * h)
        for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i].x * w, s.points[i].y * h)
        ctx.stroke()
      }
    }
  }
  ctx.globalAlpha = 1
}

function syncThumbnailAnnotation(pageIdx) {
  const item = thumbnailGrid.querySelector(`.thumb-item[data-page="${pageIdx}"]`)
  if (item) {
    const thumbCanvas = item.querySelector("canvas.thumb-canvas, canvas")
    if (thumbCanvas) {
      let dl = item.querySelector(".anno-overlay")
      if (!dl) {
        dl = document.createElement("canvas")
        dl.className = "anno-overlay"
        dl.width = thumbCanvas.width
        dl.height = thumbCanvas.height
        dl.style.cssText = "position:absolute;top:0;left:0;width:" + thumbCanvas.width + "px;height:" + thumbCanvas.height + "px;pointer-events:none;"
        item.style.position = "relative"
        const label = item.querySelector(".thumb-label")
        if (label) { item.insertBefore(dl, label) } else { item.appendChild(dl) }
      }
      drawAnnotations(dl, annotations[pageIdx] || [])
    }
  }
  const selThumb = selectedStrip.querySelector(`.selected-thumb[data-page-idx="${pageIdx}"]`)
  if (selThumb) {
    const overlay = selThumb.querySelector(".sel-anno-overlay")
    if (overlay) drawAnnotations(overlay, annotations[pageIdx] || [])
  }
}

let fsPdfDoc = null
async function openFullscreen(pageIdx, pos) {
  fsPrev.style.opacity = "0.3"
  fsNext.style.opacity = "0.3"
  if (pos === undefined) pos = selectedIndices.indexOf(pageIdx)
  if (pos < 0) pos = 0
  fullscreenOverlay.classList.remove("hidden")
  document.body.style.overflow = "hidden"
  fsLabel.textContent = "Page " + (pageIdx + 1)
  activePreviewPage = pageIdx
  previewPosInSelection = pos
  try {
    if (!fsPdfDoc) {
      const buffer = await splitFileRef.arrayBuffer()
      fsPdfDoc = await pdfjsLib.getDocument({ data: buffer }).promise
    }
    const page = await fsPdfDoc.getPage(pageIdx + 1)
    const maxW = window.innerWidth - 80
    const maxH = window.innerHeight - 80
    const vpOrig = page.getViewport({ scale: 1 })
    const scale = Math.min(maxW / vpOrig.width, maxH / vpOrig.height, 2.5)
    const vp = page.getViewport({ scale })
    fsCanvas.width = vp.width
    fsCanvas.height = vp.height
    fsDrawLayer.width = vp.width
    fsDrawLayer.height = vp.height
    await page.render({ canvasContext: fsCanvas.getContext("2d"), viewport: vp }).promise
    redrawFS(pageIdx)
    updateFSNav()
  } catch (e) {}
}
function updateFSNav() {
  const total = selectedIndices.length
  fsPrev.style.opacity = previewPosInSelection > 0 ? "1" : "0.3"
  fsNext.style.opacity = previewPosInSelection < total - 1 ? "1" : "0.3"
  if (total > 1) {
    fsLabel.textContent = "Page " + (activePreviewPage + 1) + " (" + (previewPosInSelection + 1) + " of " + total + ")"
  }
}
function redrawFS(pageIdx) {
  const ctx = fsDrawLayer.getContext("2d")
  ctx.clearRect(0, 0, fsDrawLayer.width, fsDrawLayer.height)
  const strokes = annotations[pageIdx] || []
  renderStrokes(ctx, strokes, fsDrawLayer.width, fsDrawLayer.height, 3)
}
function closeFullscreen() {
  fullscreenOverlay.classList.add("hidden")
  document.body.style.overflow = ""
  fsPdfDoc = null
}

fullscreenPreview.addEventListener("click", () => {
  if (activePreviewPage !== null) openFullscreen(activePreviewPage, previewPosInSelection)
})
fsClose.addEventListener("click", closeFullscreen)
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !fullscreenOverlay.classList.contains("hidden")) {
    closeFullscreen()
  }
})
fsPrev.addEventListener("click", () => {
  if (previewPosInSelection > 0) openFullscreen(selectedIndices[previewPosInSelection - 1], previewPosInSelection - 1)
})
fsNext.addEventListener("click", () => {
  if (previewPosInSelection < selectedIndices.length - 1) openFullscreen(selectedIndices[previewPosInSelection + 1], previewPosInSelection + 1)
})

function findTextNear(pageIdx, x, y) {
  const strokes = annotations[pageIdx]
  if (!strokes) return -1
  for (let i = strokes.length - 1; i >= 0; i--) {
    const s = strokes[i]
    if (s.type !== "text") continue
    const tw = s.text.length * s.fontSize * 0.004
    const th = s.fontSize * 0.005
    if (x >= s.x - 0.01 && x <= s.x + tw + 0.01 && y >= s.y - th - 0.005 && y <= s.y + 0.005) return i
  }
  return -1
}

{ let draggingText = false, dragTargetIdx = -1, dragTargetPage = -1
  function onTextDragPointerDown(target, pageIdx, e) {
    if (currentTool !== "pointer" || activePreviewPage === null) return
    const r = target.getBoundingClientRect()
    const p = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }
    const idx = findTextNear(pageIdx, p.x, p.y)
    if (idx < 0) return
    const now = Date.now()
    if (now - textClickTime < 400 && dragTargetIdx === idx) {
      const text = prompt("Edit text:", annotations[pageIdx][idx].text)
      if (text && text.trim()) {
        const item = annotations[pageIdx][idx]
        item.text = text.trim()
        const isFS = !fullscreenOverlay.classList.contains("hidden")
        item.color = isFS ? fsAnnoColor.value : annoColor.value
        item.fontSize = (parseInt(isFS ? fsAnnoWidth.value : annoWidth.value) || 2) * 5
        if (target === previewDrawLayer) { redrawPreview(pageIdx) } else { redrawFS(pageIdx) }
        syncThumbnailAnnotation(pageIdx)
      }
      textClickTime = 0
      return
    }
    textClickTime = now
    draggingText = true; dragTargetIdx = idx; dragTargetPage = pageIdx
    target.setPointerCapture(e.pointerId)
    e.preventDefault()
  }
  document.addEventListener("pointermove", (e) => {
    if (!draggingText) return
    const target = dragTargetPage === activePreviewPage ? (fullscreenOverlay.classList.contains("hidden") ? previewDrawLayer : fsDrawLayer) : null
    if (!target) return
    const r = target.getBoundingClientRect()
    const p = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }
    const strokes = annotations[dragTargetPage]
    if (strokes && strokes[dragTargetIdx] && strokes[dragTargetIdx].type === "text") {
      strokes[dragTargetIdx].x = p.x
      strokes[dragTargetIdx].y = p.y
      if (target === previewDrawLayer) { redrawPreview(dragTargetPage) } else { redrawFS(dragTargetPage) }
    }
  })
  document.addEventListener("pointerup", () => {
    if (!draggingText) return
    draggingText = false
    syncThumbnailAnnotation(dragTargetPage)
    try { previewDrawLayer.releasePointerCapture(1) } catch (_) {}
    try { fsDrawLayer.releasePointerCapture(1) } catch (_) {}
  })

  previewDrawLayer.addEventListener("pointerdown", (e) => {
    onTextDragPointerDown(previewDrawLayer, activePreviewPage, e)
  }, true)
  fsDrawLayer.addEventListener("pointerdown", (e) => {
    onTextDragPointerDown(fsDrawLayer, activePreviewPage, e)
  }, true)
}

{ let drawing = false
  fsDrawLayer.addEventListener("pointerdown", (e) => {
    if (document.activeElement === annoColor || document.activeElement === fsAnnoColor) return
    if (currentTool === "pointer") return
    e.preventDefault(); e.stopPropagation()
    drawing = true
    fsDrawLayer.setPointerCapture(e.pointerId)
    if (!annotations[activePreviewPage]) annotations[activePreviewPage] = []
    const r = fsDrawLayer.getBoundingClientRect()
    const p = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }
    if (currentTool === "eraser") {
      doErase(activePreviewPage, p, (i) => { redrawFS(i); syncThumbnailAnnotation(i) })
    } else if (currentTool === "text") {
      const text = prompt("Enter text:")
      if (text && text.trim()) {
        annotations[activePreviewPage].push({ type: "text", text: text.trim(), x: p.x, y: p.y, fontSize: parseInt(fsAnnoWidth.value) * 5 || 16, color: fsAnnoColor.value })
        redrawFS(activePreviewPage)
        syncThumbnailAnnotation(activePreviewPage)
      }
    } else {
      currentStroke = { type: currentTool, color: currentTool === "highlighter" ? "#ffeb3b" : fsAnnoColor.value, points: [p], width: parseInt(fsAnnoWidth.value) || 2 }
      annotations[activePreviewPage].push(currentStroke)
    }
  })
  document.addEventListener("pointermove", (e) => {
    if (!drawing || currentTool === "pointer" || currentTool === "eraser" || !currentStroke) return
    const r = fsDrawLayer.getBoundingClientRect()
    const p = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }
    currentStroke.points.push(p)
    redrawFS(activePreviewPage)
  })
  document.addEventListener("pointerup", () => {
    if (!drawing) return
    drawing = false
    try { fsDrawLayer.releasePointerCapture(1) } catch (_) {}
    if (currentStroke && currentStroke.points.length <= 1) {
      annotations[activePreviewPage].pop()
      redrawFS(activePreviewPage)
    }
    syncThumbnailAnnotation(activePreviewPage)
    currentStroke = null
  })
  document.addEventListener("pointercancel", () => {
    if (!drawing) return
    drawing = false
    try { fsDrawLayer.releasePointerCapture(1) } catch (_) {}
    if (currentStroke && currentStroke.points.length <= 1) {
      annotations[activePreviewPage].pop()
      redrawFS(activePreviewPage)
    }
    currentStroke = null
  })
}

document.querySelectorAll("[data-fstool]").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("[data-fstool]").forEach(b => b.classList.remove("active"))
    btn.classList.add("active")
    currentTool = btn.dataset.fstool
    document.querySelectorAll(".tool-btn[data-tool]").forEach(b => {
      b.classList.toggle("active", b.dataset.tool === currentTool)
    })
  })
})
fsAnnoColor.addEventListener("input", () => { annoColor.value = fsAnnoColor.value })
annoColor.addEventListener("input", () => { fsAnnoColor.value = annoColor.value })
annoWidth.addEventListener("input", () => { fsAnnoWidth.value = annoWidth.value })
fsAnnoWidth.addEventListener("input", () => { annoWidth.value = fsAnnoWidth.value })
fsClearPage.addEventListener("click", () => {
  if (activePreviewPage !== null) {
    delete annotations[activePreviewPage]
    redrawFS(activePreviewPage)
    syncThumbnailAnnotation(activePreviewPage)
  }
})

async function flattenAnnotations(pdfPage, pageIdx, pdfDoc) {
  const strokes = annotations[pageIdx]
  if (!strokes || strokes.length === 0) return
  const w = pdfPage.getWidth()
  const h = pdfPage.getHeight()
  for (const s of strokes) {
    if (s.type === "text") {
      const R = 4
      const fontPx = s.fontSize * 2.5 * R
      const cv = document.createElement("canvas")
      let ctx = cv.getContext("2d")
      ctx.font = fontPx + "px sans-serif"
      const tw = Math.ceil(ctx.measureText(s.text).width)
      const pad = Math.ceil(fontPx * 0.15)
      cv.width = tw + pad * 2
      cv.height = Math.ceil(fontPx * 1.4)
      const baseY = Math.ceil(fontPx * 1.05)
      ctx = cv.getContext("2d")
      ctx.font = fontPx + "px sans-serif"
      ctx.fillStyle = s.color
      ctx.textBaseline = "alphabetic"
      ctx.fillText(s.text, pad, baseY)
      try {
        const img = await pdfDoc.embedPng(cv.toDataURL("image/png"))
        pdfPage.drawImage(img, {
          x: s.x * w - pad / R,
          y: (1 - s.y) * h - (cv.height - baseY) / R,
          width: cv.width / R,
          height: cv.height / R,
        })
      } catch (e) { console.error("text export failed:", e) }
    } else {
      if (s.points.length < 2) continue
      const color = hexToRgb(s.color)
      const alpha = s.type === "highlighter" ? 0.45 : 1
      const lw = s.width * 2.5
      for (let i = 1; i < s.points.length; i++) {
        pdfPage.drawLine({
          start: { x: s.points[i - 1].x * w, y: (1 - s.points[i - 1].y) * h },
          end: { x: s.points[i].x * w, y: (1 - s.points[i].y) * h },
          thickness: lw,
          color: color,
          opacity: alpha,
        })
      }
    }
  }
}

async function addPageBaked(out, page) {
  const rot = ((page.getRotation().angle % 360) + 360) % 360
  if (rot === 0) { out.addPage(page); return page }
  const { width: W, height: H } = page.getSize()
  const emb = await out.embedPage(page)
  let np
  if (rot === 90) {
    np = out.addPage([H, W])
    np.drawPage(emb, { x: 0, y: W, rotate: PDFLib.degrees(-90) })
  } else if (rot === 180) {
    np = out.addPage([W, H])
    np.drawPage(emb, { x: W, y: H, rotate: PDFLib.degrees(180) })
  } else {
    np = out.addPage([H, W])
    np.drawPage(emb, { x: H, y: 0, rotate: PDFLib.degrees(90) })
  }
  return np
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  return PDFLib.rgb(r, g, b)
}

function togglePage(idx, shift) {
  const total = splitPages.length
  if (shift && selectedIndices.length > 0) {
    const last = selectedIndices[selectedIndices.length - 1]
    const [s, e] = last < idx ? [last, idx] : [idx, last]
    for (let i = s; i <= e; i++) {
      if (!selectedIndices.includes(i)) selectedIndices.push(i)
    }
  } else {
    const pos = selectedIndices.indexOf(idx)
    if (pos >= 0) selectedIndices.splice(pos, 1)
    else selectedIndices.push(idx)
  }
  selectedIndices.sort((a, b) => a - b)
  updateSelectionUI()
  updatePageSpec()
}

function updateSelectionUI() {
  for (const el of thumbnailGrid.querySelectorAll(".thumb-item")) {
    const p = parseInt(el.dataset.page, 10)
    el.classList.toggle("selected", selectedIndices.includes(p))
  }
  if (selectedIndices.length > 0) {
    selectedArea.classList.remove("hidden")
    renderSelectedStrip()
  } else {
    selectedArea.classList.add("hidden")
  }
}

function renderSelectedStrip() {
  selectedStrip.innerHTML = ""
  for (let i = 0; i < selectedIndices.length; i++) {
    const pageIdx = selectedIndices[i]
    const originalCanvas = thumbnailGrid.querySelector(`.thumb-item[data-page="${pageIdx}"] canvas`)
    const thumb = document.createElement("div")
    thumb.className = "selected-thumb"
    thumb.draggable = true
    thumb.dataset.selIdx = String(i)
    thumb.dataset.pageIdx = String(pageIdx)
    thumb.style.cursor = "pointer"
    thumb.title = "Click to annotate page " + (pageIdx + 1)
    if (originalCanvas) {
      const clone = document.createElement("canvas")
      clone.className = "sel-canvas"
      clone.width = 80
      clone.height = (80 / originalCanvas.width) * originalCanvas.height
      const ctx = clone.getContext("2d")
      ctx.drawImage(originalCanvas, 0, 0, clone.width, clone.height)
      thumb.appendChild(clone)
      const overlay = document.createElement("canvas")
      overlay.className = "sel-anno-overlay"
      overlay.width = clone.width
      overlay.height = clone.height
      overlay.style.cssText = "position:absolute;top:0;left:0;width:" + clone.width + "px;height:" + clone.height + "px;pointer-events:none;"
      thumb.style.position = "relative"
      thumb.appendChild(overlay)
    }
    const label = document.createElement("div")
    label.className = "thumb-label"
    label.textContent = "p." + (pageIdx + 1)
    thumb.appendChild(label)
    const rm = document.createElement("button")
    rm.className = "remove-sel"
    rm.textContent = "×"
    rm.addEventListener("click", (e) => {
      e.stopPropagation()
      selectedIndices.splice(i, 1)
      updateSelectionUI()
      updatePageSpec()
    })
    thumb.appendChild(rm)
    thumb.addEventListener("dragstart", (e) => {
      selDragIdx = parseInt(thumb.dataset.selIdx, 10)
      thumb.classList.add("dragging")
      e.dataTransfer.effectAllowed = "move"
    })
    thumb.addEventListener("dragend", () => {
      thumb.classList.remove("dragging")
      selDragIdx = null
    })
    thumb.addEventListener("dragover", (e) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = "move"
    })
    thumb.addEventListener("drop", (e) => {
      e.preventDefault()
      const targetIdx = parseInt(thumb.dataset.selIdx, 10)
      if (selDragIdx !== null && selDragIdx !== targetIdx) {
        const [moved] = selectedIndices.splice(selDragIdx, 1)
        selectedIndices.splice(targetIdx, 0, moved)
        renderSelectedStrip()
        updatePageSpec()
      }
    })
    thumb.addEventListener("mousedown", () => {})
    thumb.addEventListener("click", (e) => {
      if (e.target.closest(".remove-sel")) return
      openPreview(pageIdx, i)
    })
    thumb.addEventListener("dblclick", (e) => {
      e.preventDefault()
      openFullscreen(pageIdx, i)
    })
    selectedStrip.appendChild(thumb)
  }
}

function updatePageSpec() {
  if (selectedIndices.length === 0) {
    pageSpecInput.value = ""
    return
  }
  if (selectedIndices.length === splitPages.length && selectedIndices.every((v, i) => v === i)) {
    pageSpecInput.value = "all"
    return
  }
  const ranges = []
  let start = selectedIndices[0], end = selectedIndices[0]
  for (let i = 1; i < selectedIndices.length; i++) {
    if (selectedIndices[i] === end + 1) { end = selectedIndices[i] }
    else {
      ranges.push(start === end ? String(start + 1) : (start + 1) + "-" + (end + 1))
      start = selectedIndices[i]; end = selectedIndices[i]
    }
  }
  ranges.push(start === end ? String(start + 1) : (start + 1) + "-" + (end + 1))
  pageSpecInput.value = ranges.join(",")
}

pageSpecInput.addEventListener("input", () => {
  const spec = pageSpecInput.value
  if (!spec) {
    selectedIndices = []
    updateSelectionUI()
    return
  }
  const total = splitPages.length || 1
  const indices = parsePages(spec, total)
  if (indices) {
    selectedIndices = indices
    updateSelectionUI()
  }
})

function expandCard(card) {
  splitCard.classList.remove("collapsed")
  mergeCard.classList.remove("collapsed")
  const container = document.querySelector(".container")
  container.classList.remove("split-active", "merge-active")
  if (card === "split") {
    mergeCard.classList.add("collapsed")
    container.classList.add("split-active")
  } else if (card === "merge") {
    splitCard.classList.add("collapsed")
    container.classList.add("merge-active")
  }
}
function resetCards() {
  splitCard.classList.remove("collapsed")
  mergeCard.classList.remove("collapsed")
  const container = document.querySelector(".container")
  container.classList.remove("split-active", "merge-active")
}
splitCard.addEventListener("click", (e) => {
  if (e.target.tagName === "A") return
  if (splitCard.classList.contains("collapsed")) expandCard("split")
})
mergeCard.addEventListener("click", (e) => {
  if (e.target.tagName === "A") return
  if (mergeCard.classList.contains("collapsed")) expandCard("merge")
})
clearSplit.addEventListener("click", (e) => {
  e.preventDefault()
  splitFileInput.value = ""
  splitFileRef = null
  splitPreview.classList.add("hidden")
  annoToolbar.classList.add("hidden")
  selectedIndices = []
  splitPages = []
  annotations = {}
  previewPdfDoc = null
  activePreviewPage = null
  previewArea.classList.add("hidden")
  clearSplit.classList.add("hidden")
  setStatus(splitStatus, "")
  if (mergeItems.length === 0) resetCards()
})
clearMerge.addEventListener("click", (e) => {
  e.preventDefault()
  mergeFilesInput.value = ""
  mergeItems = []
  renderList()
  clearMerge.classList.add("hidden")
  setStatus(mergeStatus, "")
  if (!splitFileRef) resetCards()
})

document.querySelectorAll(".tool-btn[data-tool]").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tool-btn[data-tool]").forEach(b => b.classList.remove("active"))
    btn.classList.add("active")
    currentTool = btn.dataset.tool
  })
})
clearPageAnno.addEventListener("click", () => {
  if (activePreviewPage !== null) {
    delete annotations[activePreviewPage]
    redrawPreview(activePreviewPage)
    syncThumbnailAnnotation(activePreviewPage)
  }
})
clearAllAnno.addEventListener("click", () => {
  annotations = {}
  if (activePreviewPage !== null) redrawPreview(activePreviewPage)
  for (const el of thumbnailGrid.querySelectorAll(".thumb-item")) {
    syncThumbnailAnnotation(parseInt(el.dataset.page, 10))
  }
})

let previewPdfDoc = null
let previewPosInSelection = 0
async function openPreview(pageIdx, pos) {
  activePreviewPage = pageIdx
  previewPosInSelection = (pos !== undefined) ? pos : selectedIndices.indexOf(pageIdx)
  if (previewPosInSelection < 0) previewPosInSelection = 0
  previewArea.classList.remove("hidden")
  updatePreviewNav()
  if (!splitFileRef) return
  try {
    if (!previewPdfDoc) {
      const buffer = await splitFileRef.arrayBuffer()
      previewPdfDoc = await pdfjsLib.getDocument({ data: buffer }).promise
    }
    const page = await previewPdfDoc.getPage(pageIdx + 1)
    const scale = 1.2
    const vp = page.getViewport({ scale })
    previewCanvas.width = vp.width
    previewCanvas.height = vp.height
    previewDrawLayer.width = vp.width
    previewDrawLayer.height = vp.height
    await page.render({ canvasContext: previewCanvas.getContext("2d"), viewport: vp }).promise
    redrawPreview(pageIdx)
  } catch (e) {}
}
function updatePreviewNav() {
  const total = selectedIndices.length
  const cur = previewPosInSelection + 1
  previewLabel.textContent = "Page " + (activePreviewPage + 1) + (total > 1 ? " (" + cur + " of " + total + " selected)" : "")
  prevPreview.style.opacity = previewPosInSelection > 0 ? "1" : "0.3"
  nextPreview.style.opacity = previewPosInSelection < total - 1 ? "1" : "0.3"
}
prevPreview.addEventListener("click", () => {
  if (previewPosInSelection > 0) {
    const pageIdx = selectedIndices[previewPosInSelection - 1]
    openPreview(pageIdx, previewPosInSelection - 1)
  }
})
nextPreview.addEventListener("click", () => {
  if (previewPosInSelection < selectedIndices.length - 1) {
    const pageIdx = selectedIndices[previewPosInSelection + 1]
    openPreview(pageIdx, previewPosInSelection + 1)
  }
})
function redrawPreview(pageIdx) {
  const ctx = previewDrawLayer.getContext("2d")
  ctx.clearRect(0, 0, previewDrawLayer.width, previewDrawLayer.height)
  const strokes = annotations[pageIdx] || []
  renderStrokes(ctx, strokes, previewDrawLayer.width, previewDrawLayer.height, 3)
}
closePreview.addEventListener("click", () => {
  previewArea.classList.add("hidden")
  previewPdfDoc = null
  activePreviewPage = null
})

function doErase(pageIdx, p, redrawFn) {
  const strokes = annotations[pageIdx]
  if (!strokes) return
  for (let i = strokes.length - 1; i >= 0; i--) {
    const s = strokes[i]
    if (s.type === "text") {
      const tw = s.text.length * s.fontSize * 0.004
      const th = s.fontSize * 0.005
      if (p.x >= s.x - 0.01 && p.x <= s.x + tw + 0.01 && p.y >= s.y - th - 0.005 && p.y <= s.y + 0.005) {
        strokes.splice(i, 1)
        redrawFn(pageIdx)
        return
      }
    } else {
      for (const pt of s.points) {
        if (Math.hypot(pt.x - p.x, pt.y - p.y) < 0.03) {
          strokes.splice(i, 1)
          redrawFn(pageIdx)
          return
        }
      }
    }
  }
}

{ 
  let drawing = false
  previewDrawLayer.addEventListener("pointerdown", (e) => {
    if (document.activeElement === annoColor || document.activeElement === fsAnnoColor) return
    if (activePreviewPage === null || currentTool === "pointer") return
    e.preventDefault(); e.stopPropagation()
    drawing = true
    previewDrawLayer.setPointerCapture(e.pointerId)
    if (!annotations[activePreviewPage]) annotations[activePreviewPage] = []
    const r = previewDrawLayer.getBoundingClientRect()
    const p = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }
    if (currentTool === "eraser") {
      doErase(activePreviewPage, p, (i) => { redrawPreview(i); syncThumbnailAnnotation(i) })
    } else if (currentTool === "text") {
      const text = prompt("Enter text:")
      if (text && text.trim()) {
        annotations[activePreviewPage].push({ type: "text", text: text.trim(), x: p.x, y: p.y, fontSize: parseInt(annoWidth.value) * 5 || 16, color: annoColor.value })
        redrawPreview(activePreviewPage)
        syncThumbnailAnnotation(activePreviewPage)
      }
    } else {
      currentStroke = { type: currentTool, color: currentTool === "highlighter" ? "#ffeb3b" : annoColor.value, points: [p], width: parseInt(annoWidth.value) || 2 }
      annotations[activePreviewPage].push(currentStroke)
    }
  })
  document.addEventListener("pointermove", (e) => {
    if (!drawing || currentTool === "pointer" || currentTool === "eraser" || !currentStroke) return
    const r = previewDrawLayer.getBoundingClientRect()
    const p = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }
    currentStroke.points.push(p)
    redrawPreview(activePreviewPage)
  })
  document.addEventListener("pointerup", () => {
    if (!drawing) return
    drawing = false
    try { previewDrawLayer.releasePointerCapture(1) } catch (_) {}
    if (currentStroke && currentStroke.points.length <= 1) {
      annotations[activePreviewPage].pop()
      redrawPreview(activePreviewPage)
    }
    syncThumbnailAnnotation(activePreviewPage)
    currentStroke = null
  })
  document.addEventListener("pointercancel", () => {
    if (!drawing) return
    drawing = false
    try { previewDrawLayer.releasePointerCapture(1) } catch (_) {}
    if (currentStroke && currentStroke.points.length <= 1) {
      annotations[activePreviewPage].pop()
      redrawPreview(activePreviewPage)
    }
    currentStroke = null
  })
}

function handleDragOver(el, e) {
  e.preventDefault()
  e.stopPropagation()
  e.dataTransfer.dropEffect = "copy"
  el.classList.add("drag-over")
}
function handleDragLeave(el, e) {
  e.preventDefault()
  e.stopPropagation()
  el.classList.remove("drag-over")
}
function handleDropSplit(e) {
  e.preventDefault()
  e.stopPropagation()
  splitCard.classList.remove("drag-over")
  const files = e.dataTransfer.files
  if (files.length === 0) return
  const dt = new DataTransfer()
  dt.items.add(files[0])
  splitFileInput.files = dt.files
  splitFileInput.dispatchEvent(new Event("change"))
}
function handleDropMerge(e) {
  e.preventDefault()
  e.stopPropagation()
  mergeCard.classList.remove("drag-over")
  const files = Array.from(e.dataTransfer.files || []).filter(f => f.type === "application/pdf" || f.name.endsWith(".pdf"))
  if (files.length === 0) return
  const dt = new DataTransfer()
  files.forEach(f => dt.items.add(f))
  mergeFilesInput.files = dt.files
  mergeFilesInput.dispatchEvent(new Event("change"))
}

splitCard.addEventListener("dragover", (e) => handleDragOver(splitCard, e))
splitCard.addEventListener("dragenter", (e) => handleDragOver(splitCard, e))
splitCard.addEventListener("dragleave", (e) => handleDragLeave(splitCard, e))
splitCard.addEventListener("drop", (e) => handleDropSplit(e))

mergeCard.addEventListener("dragover", (e) => handleDragOver(mergeCard, e))
mergeCard.addEventListener("dragenter", (e) => handleDragOver(mergeCard, e))
mergeCard.addEventListener("dragleave", (e) => handleDragLeave(mergeCard, e))
mergeCard.addEventListener("drop", (e) => handleDropMerge(e))
splitFileInput.addEventListener("change", async (e) => {
  splitFileRef = e.target.files && e.target.files[0] ? e.target.files[0] : null
  setStatus(splitStatus, "")
  if (splitFileRef) {
    clearSplit.classList.remove("hidden")
    expandCard("split")
    await renderThumbnails(splitFileRef)
  } else {
    splitPreview.classList.add("hidden")
    if (mergeItems.length === 0) resetCards()
  }
})
splitBtn.addEventListener("click", async () => {
  if (!splitFileRef) {
    setStatus(splitStatus, "Please select a PDF.", "error")
    track("split_missing_file")
    return
  }
  if (splitFileRef.size > MAX_FILE_SIZE) {
    setStatus(splitStatus, "File is too large (max 100 MB). Please use a smaller file.", "error")
    track("split_file_too_large")
    return
  }
  setBusy(splitBtn, true, "Extract Pages", "Processing...")
  setStatus(splitStatus, "")
  const showSpinner = splitFileRef.size > 10 * 1024 * 1024
  if (showSpinner) {
    const sp = document.createElement("span")
    sp.className = "spinner"
    splitBtn.prepend(sp)
  }
  try {
    track("split_start")
    const buffer = await splitFileRef.arrayBuffer()
    const src = await PDFLib.PDFDocument.load(buffer)
    const total = src.getPageCount()
    let indices = selectedIndices.length > 0 ? selectedIndices : parsePages(pageSpecInput.value || "", total)
    if (indices && indices.length > 0 && indices.some(i => i >= total)) indices = null
    if (!indices || indices.length === 0) {
      setStatus(splitStatus, "Invalid page specification.", "error")
      setBusy(splitBtn, false, "Extract Pages", "Processing...")
      track("split_invalid_pages")
      return
    }
    const out = await PDFLib.PDFDocument.create()
    const pages = await out.copyPages(src, indices)
    for (let i = 0; i < pages.length; i++) {
      let p = pages[i]
      const hasAnno = annotations[indices[i]] && annotations[indices[i]].length > 0
      if (hasAnno) {
        p = await addPageBaked(out, p)
      } else {
        out.addPage(p)
      }
      await flattenAnnotations(p, indices[i], out)
    }
    const bytes = await out.save()
    const base = splitFileRef.name.replace(/\.pdf$/i, "")
    const custom = ensurePdfName(splitNameInput.value)
    const finalName = custom || base + "_split.pdf"
    downloadBytes(bytes, finalName)
    setStatus(splitStatus, "Done. " + indices.length + " pages extracted.", "success")
    track("split_success", { pages: indices.length })
  } catch (err) {
    console.error("split error:", err)
    if (String(err.message || "").includes("encrypted")) {
      setStatus(splitStatus, "This PDF is password-protected. Remove the password first with Protect PDF.", "error")
    } else {
      setStatus(splitStatus, "Failed to process file.", "error")
    }
    track("split_error")
  } finally {
    setBusy(splitBtn, false, "Extract Pages", "Processing...")
    const sp = splitBtn.querySelector(".spinner")
    if (sp) sp.remove()
  }
})
mergeFilesInput.addEventListener("change", e => {
  const files = Array.from(e.target.files || [])
  for (const f of files) {
    mergeItems.push({ id: genId(), file: f, name: f.name })
  }
  if (mergeItems.length > 0) expandCard("merge")
  if (mergeItems.length > 0) clearMerge.classList.remove("hidden")
  renderList()
  setStatus(mergeStatus, "")
  track("merge_files_selected", { count: files.length })
})
clearListBtn.addEventListener("click", () => {
  mergeItems = []
  renderList()
  clearMerge.classList.add("hidden")
  setStatus(mergeStatus, "")
  if (!splitFileRef) resetCards()
  track("merge_list_cleared")
})
function renderList() {
  fileListEl.innerHTML = ""
  for (let i = 0; i < mergeItems.length; i++) {
    const item = mergeItems[i]
    const li = document.createElement("li")
    li.className = "file-item"
    li.draggable = true
    li.dataset.index = String(i)
    const handle = document.createElement("div")
    handle.className = "handle"
    const thumbCanvas = document.createElement("canvas")
    thumbCanvas.className = "file-thumb"
    thumbCanvas.width = 40
    thumbCanvas.height = 52
    const name = document.createElement("div")
    name.className = "filename"
    name.textContent = item.name
    const meta = document.createElement("div")
    meta.className = "file-meta"
    meta.textContent = formatSize(item.file.size)
    const up = document.createElement("button")
    up.className = "move"
    up.textContent = "\u25B2"
    up.addEventListener("click", () => {
      const idx = parseInt(li.dataset.index, 10)
      if (idx > 0) {
        const a = mergeItems[idx]
        mergeItems.splice(idx, 1)
        mergeItems.splice(idx - 1, 0, a)
        renderList()
      }
    })
    const down = document.createElement("button")
    down.className = "move"
    down.textContent = "\u25BC"
    down.addEventListener("click", () => {
      const idx = parseInt(li.dataset.index, 10)
      if (idx < mergeItems.length - 1) {
        const a = mergeItems[idx]
        mergeItems.splice(idx, 1)
        mergeItems.splice(idx + 1, 0, a)
        renderList()
      }
    })
    const remove = document.createElement("button")
    remove.className = "remove"
    remove.textContent = "Remove"
    remove.addEventListener("click", () => {
      const idx = parseInt(li.dataset.index, 10)
      mergeItems.splice(idx, 1)
      renderList()
    })
    li.appendChild(handle)
    li.appendChild(thumbCanvas)
    li.appendChild(name)
    li.appendChild(meta)
    li.appendChild(up)
    li.appendChild(down)
    li.appendChild(remove)
    li.addEventListener("dragstart", (e) => {
      draggingIndex = parseInt(li.dataset.index, 10)
      li.classList.add("dragging")
      e.dataTransfer.effectAllowed = "move"
    })
    li.addEventListener("dragend", () => {
      draggingIndex = null
      li.classList.remove("dragging")
    })
    li.addEventListener("dragover", (e) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = "move"
    })
    li.addEventListener("drop", (e) => {
      e.preventDefault()
      const targetIndex = parseInt(li.dataset.index, 10)
      if (draggingIndex !== null && draggingIndex !== targetIndex) {
        const [moved] = mergeItems.splice(draggingIndex, 1)
        mergeItems.splice(targetIndex, 0, moved)
        renderList()
      }
    })
    fileListEl.appendChild(li)
  }
  loadMergeThumbs()
  if (mergeItems.length === 0) {
    clearMerge.classList.add("hidden")
    if (!splitFileRef) resetCards()
  }
}

async function loadMergeThumbs() {
  const canvases = fileListEl.querySelectorAll(".file-thumb")
  const metas = fileListEl.querySelectorAll(".file-meta")
  for (let i = 0; i < mergeItems.length; i++) {
    if (i >= canvases.length) break
    const canvas = canvases[i]
    const item = mergeItems[i]
    if (canvas.dataset.loaded === "1") continue
    canvas.dataset.loaded = "1"
    try {
      if (!item._buf) item._buf = await item.file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: item._buf.slice(0) }).promise
      item._pages = pdf.numPages
      const page = await pdf.getPage(1)
      const vp = page.getViewport({ scale: 0.15 })
      canvas.width = vp.width
      canvas.height = vp.height
      await page.render({ canvasContext: canvas.getContext("2d"), viewport: vp }).promise
      if (i < metas.length) {
        metas[i].textContent = formatSize(item.file.size) + " · " + item._pages + " pages"
      }
    } catch (e) {}
  }
}
mergeBtn.addEventListener("click", async () => {
  if (mergeItems.length === 0) {
    setStatus(mergeStatus, "Please add PDF files.", "error")
    track("merge_missing_files")
    return
  }
  const totalSize = mergeItems.reduce((s, it) => s + it.file.size, 0)
  if (totalSize > MAX_FILE_SIZE) {
    setStatus(mergeStatus, "Total file size exceeds 100 MB. Please reduce the number or size of files.", "error")
    track("merge_file_too_large")
    return
  }
  setBusy(mergeBtn, true, "Merge Files", "Processing...")
  setStatus(mergeStatus, "")
  if (totalSize > 10 * 1024 * 1024) {
    const sp = document.createElement("span")
    sp.className = "spinner"
    mergeBtn.prepend(sp)
  }
  try {
    track("merge_start", { count: mergeItems.length })
    const out = await PDFLib.PDFDocument.create()
    for (const item of mergeItems) {
      const buffer = item._buf || await item.file.arrayBuffer()
      const src = await PDFLib.PDFDocument.load(buffer)
      const count = src.getPageCount()
      const indices = Array.from({ length: count }, (_, i) => i)
      const pages = await out.copyPages(src, indices)
      for (const p of pages) out.addPage(p)
    }
    const bytes = await out.save()
    const custom = ensurePdfName(mergeNameInput.value)
    downloadBytes(bytes, custom || "merged.pdf")
    setStatus(mergeStatus, "Done. " + mergeItems.length + " files merged.", "success")
    track("merge_success", { count: mergeItems.length })
  } catch (err) {
    if (String(err.message || "").includes("encrypted")) {
      setStatus(mergeStatus, "A file is password-protected. Remove its password first with Protect PDF.", "error")
    } else {
      setStatus(mergeStatus, "Failed to process files.", "error")
    }
    track("merge_error")
  } finally {
    setBusy(mergeBtn, false, "Merge Files", "Processing...")
    const sp = mergeBtn.querySelector(".spinner")
    if (sp) sp.remove()
  }
})
async function fetchMessages() {
  try {
    const res = await fetch(`${API_BASE}/api/messages/public`)
    if (!res.ok) throw new Error()
    const data = await res.json()
    renderMessages(data)
    track("feedback_messages_loaded", { count: Array.isArray(data) ? data.length : 0 })
  } catch (e) {
  }
}
function renderMessages(items) {
  messagesList.innerHTML = ""
  for (const m of items) {
    const li = document.createElement("li")
    li.className = "message-item"
    const name = document.createElement("div")
    name.className = "message-name"
    name.textContent = m.name || "Anonymous User"
    const content = document.createElement("div")
    content.className = "message-content"
    content.textContent = m.content || ""
    const meta = document.createElement("div")
    meta.className = "message-meta"
    const ts = m.createdAt ? new Date(m.createdAt) : new Date()
    meta.textContent = ts.toLocaleString()
    li.appendChild(name)
    li.appendChild(content)
    li.appendChild(meta)
    messagesList.appendChild(li)
  }
}
feedbackSubmit.addEventListener("click", async () => {
  const text = (feedbackInput.value || "").trim()
  if (!text) {
    setStatus(feedbackStatus, "Please enter your suggestion.", "error")
    return
  }
  setBusy(feedbackSubmit, true, "Submit", "Submitting...")
  setStatus(feedbackStatus, "")
  try {
    const res = await fetch(`${API_BASE}/api/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text, name: "Anonymous User" })
    })
    if (!res.ok) throw new Error()
    feedbackInput.value = ""
    setStatus(feedbackStatus, "Submitted.", "success")
    await fetchMessages()
    track("feedback_submit_success")
  } catch (e) {
    setStatus(feedbackStatus, "Failed to submit. Is the server running?", "error")
    track("feedback_submit_error")
  } finally {
    setBusy(feedbackSubmit, false, "Submit", "Submitting...")
  }
})
feedbackRefresh.addEventListener("click", () => {
  setStatus(feedbackStatus, "")
  fetchMessages()
  track("feedback_refresh")
})
fetchMessages()
function applyTheme(initial) {
  const t = initial === "dark" ? "dark" : "light"
  document.documentElement.setAttribute("data-theme", t)
}
const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
applyTheme(localStorage.getItem("theme") || (prefersDark ? "dark" : "light"))
themeToggle.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme")
  const next = current === "dark" ? "light" : "dark"
  localStorage.setItem("theme", next)
  applyTheme(next)
  track("theme_toggle", { theme: next })
})

// ===== Images to PDF =====
const imgFilesInput = document.getElementById("imgFiles")
const imgListEl = document.getElementById("imgList")
const imgPageSize = document.getElementById("imgPageSize")
const imgNameInput = document.getElementById("imgName")
const img2pdfBtn = document.getElementById("img2pdfBtn")
const imgStatus = document.getElementById("imgStatus")
const clearImgs = document.getElementById("clearImgs")
const img2pdfCard = document.getElementById("img2pdfCard")
let imgItems = []
let imgDragIdx = null
const i2pOptsWrap = document.getElementById("i2pOptsWrap")

function renderImgList() {
  i2pOptsWrap.classList.toggle("hidden", imgItems.length === 0)
  imgListEl.innerHTML = ""
  for (let i = 0; i < imgItems.length; i++) {
    const item = imgItems[i]
    const li = document.createElement("li")
    li.className = "file-item"
    li.draggable = true
    li.dataset.index = String(i)
    const handle = document.createElement("div")
    handle.className = "handle"
    const thumb = document.createElement("img")
    thumb.className = "file-thumb"
    thumb.alt = ""
    if (!item._url) item._url = URL.createObjectURL(item.file)
    thumb.src = item._url
    const name = document.createElement("div")
    name.className = "filename"
    name.textContent = item.name
    const meta = document.createElement("div")
    meta.className = "file-meta"
    meta.textContent = formatSize(item.file.size)
    thumb.addEventListener("load", () => {
      meta.textContent = formatSize(item.file.size) + " \u00B7 " + thumb.naturalWidth + "\u00D7" + thumb.naturalHeight
    })
    const up = document.createElement("button")
    up.className = "move"
    up.textContent = "\u25B2"
    up.addEventListener("click", () => {
      const idx = parseInt(li.dataset.index, 10)
      if (idx > 0) {
        const a = imgItems[idx]
        imgItems.splice(idx, 1)
        imgItems.splice(idx - 1, 0, a)
        renderImgList()
      }
    })
    const down = document.createElement("button")
    down.className = "move"
    down.textContent = "\u25BC"
    down.addEventListener("click", () => {
      const idx = parseInt(li.dataset.index, 10)
      if (idx < imgItems.length - 1) {
        const a = imgItems[idx]
        imgItems.splice(idx, 1)
        imgItems.splice(idx + 1, 0, a)
        renderImgList()
      }
    })
    const remove = document.createElement("button")
    remove.className = "remove"
    remove.textContent = "Remove"
    remove.addEventListener("click", () => {
      const idx = parseInt(li.dataset.index, 10)
      if (imgItems[idx] && imgItems[idx]._url) URL.revokeObjectURL(imgItems[idx]._url)
      imgItems.splice(idx, 1)
      renderImgList()
    })
    li.appendChild(handle)
    li.appendChild(thumb)
    li.appendChild(name)
    li.appendChild(meta)
    li.appendChild(up)
    li.appendChild(down)
    li.appendChild(remove)
    li.addEventListener("dragstart", (e) => {
      imgDragIdx = parseInt(li.dataset.index, 10)
      li.classList.add("dragging")
      e.dataTransfer.effectAllowed = "move"
    })
    li.addEventListener("dragend", () => {
      imgDragIdx = null
      li.classList.remove("dragging")
    })
    li.addEventListener("dragover", (e) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = "move"
    })
    li.addEventListener("drop", (e) => {
      e.preventDefault()
      const targetIndex = parseInt(li.dataset.index, 10)
      if (imgDragIdx !== null && imgDragIdx !== targetIndex) {
        const [moved] = imgItems.splice(imgDragIdx, 1)
        imgItems.splice(targetIndex, 0, moved)
        renderImgList()
      }
    })
    imgListEl.appendChild(li)
  }
  if (imgItems.length === 0) clearImgs.classList.add("hidden")
}

imgFilesInput.addEventListener("change", (e) => {
  const files = Array.from(e.target.files || [])
  for (const f of files) imgItems.push({ id: genId(), file: f, name: f.name })
  if (imgItems.length > 0) clearImgs.classList.remove("hidden")
  renderImgList()
  setStatus(imgStatus, "")
  track("img2pdf_files_selected", { count: files.length })
})
clearImgs.addEventListener("click", (e) => {
  e.preventDefault()
  for (const it of imgItems) if (it._url) URL.revokeObjectURL(it._url)
  imgItems = []
  imgFilesInput.value = ""
  renderImgList()
  setStatus(imgStatus, "")
})

function loadImageElement(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const im = new Image()
    im.onload = () => resolve({ im, url })
    im.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Unsupported image: " + file.name)) }
    im.src = url
  })
}

img2pdfBtn.addEventListener("click", async () => {
  if (imgItems.length === 0) {
    setStatus(imgStatus, "Please add images.", "error")
    track("img2pdf_missing_files")
    return
  }
  setBusy(img2pdfBtn, true, "Create PDF", "Processing...")
  setStatus(imgStatus, "")
  try {
    track("img2pdf_start", { count: imgItems.length })
    const out = await PDFLib.PDFDocument.create()
    const A4 = [595.28, 841.89]
    for (const item of imgItems) {
      const { im, url } = await loadImageElement(item.file)
      const cv = document.createElement("canvas")
      cv.width = im.naturalWidth
      cv.height = im.naturalHeight
      cv.getContext("2d").drawImage(im, 0, 0)
      URL.revokeObjectURL(url)
      const isJpeg = item.file.type === "image/jpeg"
      const img = isJpeg
        ? await out.embedJpg(cv.toDataURL("image/jpeg", 0.92))
        : await out.embedPng(cv.toDataURL("image/png"))
      const iw = img.width * 0.75
      const ih = img.height * 0.75
      let page, dw = iw, dh = ih, x = 0, y = 0
      if (imgPageSize.value === "a4") {
        page = out.addPage(A4)
        const margin = 28
        const scale = Math.min((A4[0] - margin * 2) / iw, (A4[1] - margin * 2) / ih)
        dw = iw * scale
        dh = ih * scale
        x = (A4[0] - dw) / 2
        y = (A4[1] - dh) / 2
      } else {
        page = out.addPage([iw, ih])
      }
      page.drawImage(img, { x, y, width: dw, height: dh })
    }
    const bytes = await out.save()
    const custom = ensurePdfName(imgNameInput.value)
    downloadBytes(bytes, custom || "images.pdf")
    setStatus(imgStatus, "Done. " + imgItems.length + " images converted.", "success")
    track("img2pdf_success", { count: imgItems.length })
  } catch (err) {
    console.error("img2pdf error:", err)
    setStatus(imgStatus, "Failed to convert images.", "error")
    track("img2pdf_error")
  } finally {
    setBusy(img2pdfBtn, false, "Create PDF", "Processing...")
  }
})

img2pdfCard.addEventListener("dragover", (e) => handleDragOver(img2pdfCard, e))
img2pdfCard.addEventListener("dragenter", (e) => handleDragOver(img2pdfCard, e))
img2pdfCard.addEventListener("dragleave", (e) => handleDragLeave(img2pdfCard, e))
img2pdfCard.addEventListener("drop", (e) => {
  e.preventDefault()
  e.stopPropagation()
  img2pdfCard.classList.remove("drag-over")
  const files = Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith("image/"))
  if (files.length === 0) return
  const dt = new DataTransfer()
  files.forEach(f => dt.items.add(f))
  imgFilesInput.files = dt.files
  imgFilesInput.dispatchEvent(new Event("change"))
})

// ===== PDF to Images =====
const pdf2imgFileInput = document.getElementById("pdf2imgFile")
const imgScaleSelect = document.getElementById("imgScale")
const pdf2imgBtn = document.getElementById("pdf2imgBtn")
const pdf2imgStatus = document.getElementById("pdf2imgStatus")
const clearPdf2img = document.getElementById("clearPdf2img")
const pdf2imgCard = document.getElementById("pdf2imgCard")
let pdf2imgFileRef = null

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

const p2iOptsWrap = document.getElementById("p2iOptsWrap")
pdf2imgFileInput.addEventListener("change", (e) => {
  pdf2imgFileRef = e.target.files && e.target.files[0] ? e.target.files[0] : null
  setStatus(pdf2imgStatus, "")
  if (pdf2imgFileRef) clearPdf2img.classList.remove("hidden")
  else clearPdf2img.classList.add("hidden")
  p2iOptsWrap.classList.toggle("hidden", !pdf2imgFileRef)
})
clearPdf2img.addEventListener("click", (e) => {
  e.preventDefault()
  pdf2imgFileInput.value = ""
  pdf2imgFileRef = null
  clearPdf2img.classList.add("hidden")
  p2iOptsWrap.classList.add("hidden")
  setStatus(pdf2imgStatus, "")
})

pdf2imgBtn.addEventListener("click", async () => {
  if (!pdf2imgFileRef) {
    setStatus(pdf2imgStatus, "Please select a PDF.", "error")
    track("pdf2img_missing_file")
    return
  }
  if (pdf2imgFileRef.size > MAX_FILE_SIZE) {
    setStatus(pdf2imgStatus, "File is too large (max 100 MB).", "error")
    track("pdf2img_file_too_large")
    return
  }
  setBusy(pdf2imgBtn, true, "Convert to PNG", "Processing...")
  setStatus(pdf2imgStatus, "")
  try {
    track("pdf2img_start")
    const buffer = await pdf2imgFileRef.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
    const scale = parseFloat(imgScaleSelect.value) || 2
    const base = pdf2imgFileRef.name.replace(/\.pdf$/i, "")
    const files = []
    for (let i = 1; i <= pdf.numPages; i++) {
      setStatus(pdf2imgStatus, "Rendering page " + i + " of " + pdf.numPages + "\u2026")
      const page = await pdf.getPage(i)
      const vp = page.getViewport({ scale })
      const canvas = document.createElement("canvas")
      canvas.width = vp.width
      canvas.height = vp.height
      await page.render({ canvasContext: canvas.getContext("2d"), viewport: vp }).promise
      const blob = await new Promise(r => canvas.toBlob(r, "image/png"))
      files.push({ name: base + "_page_" + i + ".png", blob })
    }
    if (files.length === 1) {
      downloadBlob(files[0].blob, files[0].name)
    } else {
      const zip = new JSZip()
      for (const f of files) zip.file(f.name, f.blob)
      const zipBlob = await zip.generateAsync({ type: "blob" })
      downloadBlob(zipBlob, base + "_images.zip")
    }
    setStatus(pdf2imgStatus, "Done. " + files.length + " pages exported.", "success")
    track("pdf2img_success", { pages: files.length })
  } catch (err) {
    console.error("pdf2img error:", err)
    if (err && err.name === "PasswordException") {
      setStatus(pdf2imgStatus, "This PDF is password-protected. Remove the password first with Protect PDF.", "error")
    } else {
      setStatus(pdf2imgStatus, "Failed to convert file.", "error")
    }
    track("pdf2img_error")
  } finally {
    setBusy(pdf2imgBtn, false, "Convert to PNG", "Processing...")
  }
})

pdf2imgCard.addEventListener("dragover", (e) => handleDragOver(pdf2imgCard, e))
pdf2imgCard.addEventListener("dragenter", (e) => handleDragOver(pdf2imgCard, e))
pdf2imgCard.addEventListener("dragleave", (e) => handleDragLeave(pdf2imgCard, e))
pdf2imgCard.addEventListener("drop", (e) => {
  e.preventDefault()
  e.stopPropagation()
  pdf2imgCard.classList.remove("drag-over")
  const files = Array.from(e.dataTransfer.files || []).filter(f => f.type === "application/pdf" || f.name.endsWith(".pdf"))
  if (files.length === 0) return
  const dt = new DataTransfer()
  dt.items.add(files[0])
  pdf2imgFileInput.files = dt.files
  pdf2imgFileInput.dispatchEvent(new Event("change"))
})

// ===== Watermark PDF =====
const wmFileInput = document.getElementById("wmFile")
const wmTextInput = document.getElementById("wmText")
const wmSizeInput = document.getElementById("wmSize")
const wmSizeVal = document.getElementById("wmSizeVal")
const wmOpacityInput = document.getElementById("wmOpacity")
const wmOpacityVal = document.getElementById("wmOpacityVal")
const wmColorInput = document.getElementById("wmColor")
const wmAngleSelect = document.getElementById("wmAngle")
const wmLayoutSelect = document.getElementById("wmLayout")
const wmPagesSelect = document.getElementById("wmPages")
const wmControls = document.getElementById("wmControls")
const wmPreviewWrap = document.getElementById("wmPreviewWrap")
const wmPreviewCanvas = document.getElementById("wmPreview")
const wmBtn = document.getElementById("wmBtn")
const wmStatus = document.getElementById("wmStatus")
const clearWm = document.getElementById("clearWm")
const wmCard = document.getElementById("wmCard")
let wmFileRef = null
let wmBaseCanvas = null

function wmMarkCenters() {
  if (wmLayoutSelect.value === "tile") {
    const pts = []
    for (const cy of [1 / 6, 1 / 2, 5 / 6]) {
      for (const cx of [1 / 6, 1 / 2, 5 / 6]) pts.push({ x: cx, y: cy })
    }
    return pts
  }
  return [{ x: 0.5, y: 0.5 }]
}

function drawWmPreview() {
  if (!wmBaseCanvas) return
  wmPreviewCanvas.width = wmBaseCanvas.width
  wmPreviewCanvas.height = wmBaseCanvas.height
  const ctx = wmPreviewCanvas.getContext("2d")
  ctx.drawImage(wmBaseCanvas, 0, 0)
  const text = wmTextInput.value.trim()
  if (!text) return
  const cw = wmPreviewCanvas.width
  const ch = wmPreviewCanvas.height
  const scale = cw / wmBaseCanvas._pageW
  const angle = parseFloat(wmAngleSelect.value) * Math.PI / 180
  ctx.save()
  ctx.globalAlpha = parseInt(wmOpacityInput.value, 10) / 100
  ctx.fillStyle = wmColorInput.value
  ctx.font = (parseInt(wmSizeInput.value, 10) * scale) + "px sans-serif"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  for (const c of wmMarkCenters()) {
    ctx.save()
    ctx.translate(c.x * cw, c.y * ch)
    ctx.rotate(-angle)
    ctx.fillText(text, 0, 0)
    ctx.restore()
  }
  ctx.restore()
}

const wmTextWrap = document.getElementById("wmTextWrap")
async function loadWmPreview() {
  wmBaseCanvas = null
  if (!wmFileRef) {
    wmControls.classList.add("hidden")
    wmPreviewWrap.classList.add("hidden")
    wmTextWrap.classList.add("hidden")
    return
  }
  try {
    const buffer = await wmFileRef.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
    const page = await pdf.getPage(1)
    const vp0 = page.getViewport({ scale: 1 })
    const scale = Math.min(460 / vp0.width, 360 / vp0.height, 1.5)
    const vp = page.getViewport({ scale })
    const cv = document.createElement("canvas")
    cv.width = vp.width
    cv.height = vp.height
    cv._pageW = vp0.width
    await page.render({ canvasContext: cv.getContext("2d"), viewport: vp }).promise
    wmBaseCanvas = cv
    wmControls.classList.remove("hidden")
    wmPreviewWrap.classList.remove("hidden")
    wmTextWrap.classList.remove("hidden")
    drawWmPreview()
  } catch (e) {
    wmControls.classList.add("hidden")
    wmPreviewWrap.classList.add("hidden")
    wmTextWrap.classList.add("hidden")
    if (e && e.name === "PasswordException") {
      setStatus(wmStatus, "This PDF is password-protected. Remove the password first with Protect PDF.", "error")
    } else {
      setStatus(wmStatus, "Failed to load preview.", "error")
    }
  }
}

wmFileInput.addEventListener("change", (e) => {
  wmFileRef = e.target.files && e.target.files[0] ? e.target.files[0] : null
  setStatus(wmStatus, "")
  if (wmFileRef) clearWm.classList.remove("hidden")
  else clearWm.classList.add("hidden")
  loadWmPreview()
})
clearWm.addEventListener("click", (e) => {
  e.preventDefault()
  wmFileInput.value = ""
  wmFileRef = null
  clearWm.classList.add("hidden")
  setStatus(wmStatus, "")
  loadWmPreview()
})
wmTextInput.addEventListener("input", drawWmPreview)
wmSizeInput.addEventListener("input", () => { wmSizeVal.textContent = wmSizeInput.value; drawWmPreview() })
wmOpacityInput.addEventListener("input", () => { wmOpacityVal.textContent = wmOpacityInput.value; drawWmPreview() })
wmColorInput.addEventListener("input", drawWmPreview)
wmAngleSelect.addEventListener("change", drawWmPreview)
wmLayoutSelect.addEventListener("change", drawWmPreview)

wmBtn.addEventListener("click", async () => {
  if (!wmFileRef) {
    setStatus(wmStatus, "Please select a PDF.", "error")
    track("wm_missing_file")
    return
  }
  const text = wmTextInput.value.trim()
  if (!text) {
    setStatus(wmStatus, "Please enter watermark text.", "error")
    track("wm_missing_text")
    return
  }
  if (wmFileRef.size > MAX_FILE_SIZE) {
    setStatus(wmStatus, "File is too large (max 100 MB).", "error")
    return
  }
  setBusy(wmBtn, true, "Add Watermark", "Processing...")
  setStatus(wmStatus, "")
  try {
    track("wm_start")
    const buffer = await wmFileRef.arrayBuffer()
    const src = await PDFLib.PDFDocument.load(buffer)
    const out = await PDFLib.PDFDocument.create()
    const total = src.getPageCount()
    const indices = Array.from({ length: total }, (_, i) => i)
    const pages = await out.copyPages(src, indices)
    const sizePt = parseInt(wmSizeInput.value, 10) || 48
    const opacity = (parseInt(wmOpacityInput.value, 10) || 25) / 100
    const angleDeg = parseFloat(wmAngleSelect.value) || 0
    const theta = angleDeg * Math.PI / 180
    const R = 3
    const fontPx = sizePt * R
    const cv = document.createElement("canvas")
    let ctx = cv.getContext("2d")
    ctx.font = fontPx + "px sans-serif"
    const tw = Math.ceil(ctx.measureText(text).width)
    const pad = Math.ceil(fontPx * 0.15)
    cv.width = tw + pad * 2
    cv.height = Math.ceil(fontPx * 1.4)
    ctx = cv.getContext("2d")
    ctx.font = fontPx + "px sans-serif"
    ctx.fillStyle = wmColorInput.value
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(text, cv.width / 2, cv.height / 2)
    const img = await out.embedPng(cv.toDataURL("image/png"))
    const Wt = cv.width / R
    const Ht = cv.height / R
    const centers = wmMarkCenters()
    const firstOnly = wmPagesSelect.value === "first"
    for (let i = 0; i < pages.length; i++) {
      let p = pages[i]
      const marked = !firstOnly || i === 0
      if (marked) {
        p = await addPageBaked(out, p)
        const w = p.getWidth()
        const h = p.getHeight()
        for (const c of centers) {
          const px = c.x * w
          const py = (1 - c.y) * h
          const ax = px - (Wt / 2 * Math.cos(theta) - Ht / 2 * Math.sin(theta))
          const ay = py - (Wt / 2 * Math.sin(theta) + Ht / 2 * Math.cos(theta))
          p.drawImage(img, { x: ax, y: ay, width: Wt, height: Ht, rotate: PDFLib.degrees(angleDeg), opacity })
        }
      } else {
        out.addPage(p)
      }
    }
    const bytes = await out.save()
    const base = wmFileRef.name.replace(/\.pdf$/i, "")
    downloadBytes(bytes, base + "_watermarked.pdf")
    setStatus(wmStatus, "Done. Watermark added to " + (firstOnly ? "1 page" : total + " pages") + ".", "success")
    track("wm_success", { pages: firstOnly ? 1 : total })
  } catch (err) {
    console.error("watermark error:", err)
    if (String(err.message || "").includes("encrypted")) {
      setStatus(wmStatus, "This PDF is password-protected. Remove the password first with Protect PDF.", "error")
    } else {
      setStatus(wmStatus, "Failed to process file.", "error")
    }
    track("wm_error")
  } finally {
    setBusy(wmBtn, false, "Add Watermark", "Processing...")
  }
})

wmCard.addEventListener("dragover", (e) => handleDragOver(wmCard, e))
wmCard.addEventListener("dragenter", (e) => handleDragOver(wmCard, e))
wmCard.addEventListener("dragleave", (e) => handleDragLeave(wmCard, e))
wmCard.addEventListener("drop", (e) => {
  e.preventDefault()
  e.stopPropagation()
  wmCard.classList.remove("drag-over")
  const files = Array.from(e.dataTransfer.files || []).filter(f => f.type === "application/pdf" || f.name.endsWith(".pdf"))
  if (files.length === 0) return
  const dt = new DataTransfer()
  dt.items.add(files[0])
  wmFileInput.files = dt.files
  wmFileInput.dispatchEvent(new Event("change"))
})

// ===== Protect PDF (qpdf-wasm, lazy loaded) =====
const protModeSelect = document.getElementById("protMode")
const protFileInput = document.getElementById("protFile")
const protPwInput = document.getElementById("protPw")
const protPwLabel = document.getElementById("protPwLabel")
const protPw2Input = document.getElementById("protPw2")
const protPw2Field = document.getElementById("protPw2Field")
const protPerms = document.getElementById("protPerms")
const protPrintCheck = document.getElementById("protPrint")
const protCopyCheck = document.getElementById("protCopy")
const protBtn = document.getElementById("protBtn")
const protStatus = document.getElementById("protStatus")
const clearProt = document.getElementById("clearProt")
const protCard = document.getElementById("protCard")
let protFileRef = null
const QPDF_CDN = "https://cdn.jsdelivr.net/npm/@jspawn/qpdf-wasm@0.0.2/"
let qpdfScriptPromise = null

function loadQpdfScript() {
  if (!qpdfScriptPromise) {
    qpdfScriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script")
      s.src = QPDF_CDN + "qpdf.js"
      s.onload = resolve
      s.onerror = () => { qpdfScriptPromise = null; reject(new Error("Failed to load encryption engine. Check your connection.")) }
      document.head.appendChild(s)
    })
  }
  return qpdfScriptPromise
}

async function runQpdf(args, inputBytes) {
  await loadQpdfScript()
  const errs = []
  const mod = await window.Module({
    noInitialRun: true,
    locateFile: (p) => QPDF_CDN + p,
    print: () => {},
    printErr: (t) => { errs.push(t) },
  })
  if (inputBytes) mod.FS.writeFile("in.pdf", inputBytes)
  let rc = 0
  try { rc = mod.callMain(args) } catch (e) { rc = e && e.status != null ? e.status : 1 }
  let out = null
  try { out = new Uint8Array(mod.FS.readFile(args[args.length - 1])) } catch (_) {}
  return { rc, out, errs }
}

function looksEncrypted(bytes) {
  const dec = new TextDecoder("latin1")
  const head = dec.decode(bytes.slice(0, 4096))
  const tail = dec.decode(bytes.slice(Math.max(0, bytes.length - 4096)))
  return head.indexOf("/Encrypt") >= 0 || tail.indexOf("/Encrypt") >= 0
}

const protOptsWrap = document.getElementById("protOptsWrap")
function updateProtMode() {
  const enc = protModeSelect.value === "encrypt"
  protPw2Field.classList.toggle("hidden", !enc)
  protPerms.classList.toggle("hidden", !enc)
  protPwLabel.textContent = enc ? "Password" : "Current password"
  protPwInput.placeholder = enc ? "Password" : "Password of this PDF"
  protBtn.textContent = enc ? "Protect PDF" : "Remove Password"
  setStatus(protStatus, "")
}
protModeSelect.addEventListener("change", updateProtMode)

protFileInput.addEventListener("change", (e) => {
  protFileRef = e.target.files && e.target.files[0] ? e.target.files[0] : null
  setStatus(protStatus, "")
  if (protFileRef) clearProt.classList.remove("hidden")
  else clearProt.classList.add("hidden")
  protOptsWrap.classList.toggle("hidden", !protFileRef)
})
clearProt.addEventListener("click", (e) => {
  e.preventDefault()
  protFileInput.value = ""
  protFileRef = null
  clearProt.classList.add("hidden")
  protOptsWrap.classList.add("hidden")
  setStatus(protStatus, "")
})

protBtn.addEventListener("click", async () => {
  const enc = protModeSelect.value === "encrypt"
  if (!protFileRef) {
    setStatus(protStatus, "Please select a PDF.", "error")
    track("prot_missing_file")
    return
  }
  if (protFileRef.size > MAX_FILE_SIZE) {
    setStatus(protStatus, "File is too large (max 100 MB).", "error")
    return
  }
  const pw = protPwInput.value
  if (enc) {
    if (!pw) {
      setStatus(protStatus, "Please enter a password.", "error")
      return
    }
    if (pw !== protPw2Input.value) {
      setStatus(protStatus, "Passwords do not match.", "error")
      return
    }
  }
  const idleText = enc ? "Protect PDF" : "Remove Password"
  setBusy(protBtn, true, idleText, "Processing...")
  setStatus(protStatus, "Loading encryption engine (first use only)\u2026")
  try {
    const buffer = new Uint8Array(await protFileRef.arrayBuffer())
    const base = protFileRef.name.replace(/\.pdf$/i, "")
    if (enc) {
      track("prot_encrypt_start")
      setStatus(protStatus, "Encrypting\u2026")
      const args = ["--encrypt", pw, pw, "256",
        "--print=" + (protPrintCheck.checked ? "full" : "none"),
        "--extract=" + (protCopyCheck.checked ? "y" : "n"),
        "--", "in.pdf", "out.pdf"]
      const { rc, out } = await runQpdf(args, buffer)
      if (rc !== 0 || !out) throw new Error("Encryption failed.")
      downloadBytes(out, base + "_protected.pdf")
      setStatus(protStatus, "Done. AES-256 password added.", "success")
      track("prot_encrypt_success")
    } else {
      track("prot_decrypt_start")
      if (!looksEncrypted(buffer)) {
        setStatus(protStatus, "This PDF has no password.", "success")
        return
      }
      setStatus(protStatus, "Removing password\u2026")
      const { rc, out } = await runQpdf(["--decrypt", "--password=" + pw, "in.pdf", "out.pdf"], buffer)
      if (rc !== 0 || !out) {
        setStatus(protStatus, "Wrong password (or the file is damaged). Please try again.", "error")
        track("prot_decrypt_wrong_password")
        return
      }
      downloadBytes(out, base + "_unlocked.pdf")
      setStatus(protStatus, "Done. Password removed.", "success")
      track("prot_decrypt_success")
    }
    protPwInput.value = ""
    protPw2Input.value = ""
  } catch (err) {
    console.error("protect error:", err)
    setStatus(protStatus, err.message || "Failed to process file.", "error")
    track("prot_error")
  } finally {
    setBusy(protBtn, false, idleText, "Processing...")
  }
})

protCard.addEventListener("dragover", (e) => handleDragOver(protCard, e))
protCard.addEventListener("dragenter", (e) => handleDragOver(protCard, e))
protCard.addEventListener("dragleave", (e) => handleDragLeave(protCard, e))
protCard.addEventListener("drop", (e) => {
  e.preventDefault()
  e.stopPropagation()
  protCard.classList.remove("drag-over")
  const files = Array.from(e.dataTransfer.files || []).filter(f => f.type === "application/pdf" || f.name.endsWith(".pdf"))
  if (files.length === 0) return
  const dt = new DataTransfer()
  dt.items.add(files[0])
  protFileInput.files = dt.files
  protFileInput.dispatchEvent(new Event("change"))
})

// ===== Rotate PDF =====
const rotFileInput = document.getElementById("rotFile")
const rotArea = document.getElementById("rotArea")
const rotGrid = document.getElementById("rotGrid")
const rotBtn = document.getElementById("rotBtn")
const rotStatus = document.getElementById("rotStatus")
const clearRot = document.getElementById("clearRot")
const rotCard = document.getElementById("rotCard")
const rotAllLeft = document.getElementById("rotAllLeft")
const rotAllRight = document.getElementById("rotAllRight")
const rotReset = document.getElementById("rotReset")
let rotFileRef = null
let rotPages = []

function rotBadgeText(d) {
  return d === 0 ? "" : (((d % 360) + 360) % 360) + "\u00B0"
}
function renderRotGrid() {
  rotGrid.innerHTML = ""
  rotPages.forEach((p, i) => {
    const item = document.createElement("div")
    item.className = "page-item"
    const box = document.createElement("div")
    box.className = "page-box"
    p.canvas.style.transform = "rotate(" + p.delta + "deg)"
    box.appendChild(p.canvas)
    const badge = document.createElement("span")
    badge.className = "rot-badge" + (p.delta === 0 ? " hidden" : "")
    badge.textContent = rotBadgeText(p.delta)
    const btns = document.createElement("div")
    btns.className = "page-rot-btns"
    const left = document.createElement("button")
    left.className = "tool-btn"
    left.textContent = "\u27F2"
    left.title = "Rotate left 90\u00B0"
    left.addEventListener("click", () => { p.delta -= 90; renderRotGrid() })
    const right = document.createElement("button")
    right.className = "tool-btn"
    right.textContent = "\u27F3"
    right.title = "Rotate right 90\u00B0"
    right.addEventListener("click", () => { p.delta += 90; renderRotGrid() })
    btns.appendChild(left)
    btns.appendChild(right)
    const label = document.createElement("div")
    label.className = "page-num"
    label.textContent = "Page " + (i + 1)
    item.appendChild(badge)
    item.appendChild(box)
    item.appendChild(btns)
    item.appendChild(label)
    rotGrid.appendChild(item)
  })
}
async function loadRotPages() {
  rotPages = []
  if (!rotFileRef) {
    rotArea.classList.add("hidden")
    return
  }
  rotGrid.innerHTML = "<div style='text-align:center;padding:20px;color:var(--muted)'>Loading pages\u2026</div>"
  rotArea.classList.remove("hidden")
  try {
    const buffer = await rotFileRef.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
    rotGrid.innerHTML = ""
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const vp = page.getViewport({ scale: 0.35 })
      const canvas = document.createElement("canvas")
      canvas.width = vp.width
      canvas.height = vp.height
      await page.render({ canvasContext: canvas.getContext("2d"), viewport: vp }).promise
      rotPages.push({ canvas, delta: 0 })
    }
    renderRotGrid()
  } catch (e) {
    rotArea.classList.add("hidden")
    if (e && e.name === "PasswordException") {
      setStatus(rotStatus, "This PDF is password-protected. Remove the password first with Protect PDF.", "error")
    } else {
      setStatus(rotStatus, "Failed to load file.", "error")
    }
  }
}
rotFileInput.addEventListener("change", (e) => {
  rotFileRef = e.target.files && e.target.files[0] ? e.target.files[0] : null
  setStatus(rotStatus, "")
  if (rotFileRef) clearRot.classList.remove("hidden")
  else clearRot.classList.add("hidden")
  loadRotPages()
})
clearRot.addEventListener("click", (e) => {
  e.preventDefault()
  rotFileInput.value = ""
  rotFileRef = null
  clearRot.classList.add("hidden")
  setStatus(rotStatus, "")
  loadRotPages()
})
rotAllLeft.addEventListener("click", () => { rotPages.forEach(p => p.delta -= 90); renderRotGrid() })
rotAllRight.addEventListener("click", () => { rotPages.forEach(p => p.delta += 90); renderRotGrid() })
rotReset.addEventListener("click", () => { rotPages.forEach(p => p.delta = 0); renderRotGrid() })
rotBtn.addEventListener("click", async () => {
  if (!rotFileRef) {
    setStatus(rotStatus, "Please select a PDF.", "error")
    track("rot_missing_file")
    return
  }
  if (rotFileRef.size > MAX_FILE_SIZE) {
    setStatus(rotStatus, "File is too large (max 100 MB).", "error")
    return
  }
  setBusy(rotBtn, true, "Save PDF", "Processing...")
  setStatus(rotStatus, "")
  try {
    track("rot_start")
    const buffer = await rotFileRef.arrayBuffer()
    const doc = await PDFLib.PDFDocument.load(buffer)
    const pages = doc.getPages()
    let changed = 0
    pages.forEach((p, i) => {
      const d = rotPages[i] ? rotPages[i].delta : 0
      if (d !== 0) {
        p.setRotation(PDFLib.degrees(p.getRotation().angle + d))
        changed++
      }
    })
    const bytes = await doc.save()
    const base = rotFileRef.name.replace(/\.pdf$/i, "")
    downloadBytes(bytes, base + "_rotated.pdf")
    setStatus(rotStatus, changed === 0 ? "No rotation changes to save." : "Done. " + changed + " page(s) rotated.", changed === 0 ? "" : "success")
    track("rot_success", { changed })
  } catch (err) {
    console.error("rotate error:", err)
    if (String(err.message || "").includes("encrypted")) {
      setStatus(rotStatus, "This PDF is password-protected. Remove the password first with Protect PDF.", "error")
    } else {
      setStatus(rotStatus, "Failed to process file.", "error")
    }
    track("rot_error")
  } finally {
    setBusy(rotBtn, false, "Save PDF", "Processing...")
  }
})
rotCard.addEventListener("dragover", (e) => handleDragOver(rotCard, e))
rotCard.addEventListener("dragenter", (e) => handleDragOver(rotCard, e))
rotCard.addEventListener("dragleave", (e) => handleDragLeave(rotCard, e))
rotCard.addEventListener("drop", (e) => {
  e.preventDefault()
  e.stopPropagation()
  rotCard.classList.remove("drag-over")
  const files = Array.from(e.dataTransfer.files || []).filter(f => f.type === "application/pdf" || f.name.endsWith(".pdf"))
  if (files.length === 0) return
  const dt = new DataTransfer()
  dt.items.add(files[0])
  rotFileInput.files = dt.files
  rotFileInput.dispatchEvent(new Event("change"))
})

// ===== Organize Pages =====
const orgFileInput = document.getElementById("orgFile")
const orgArea = document.getElementById("orgArea")
const orgGrid = document.getElementById("orgGrid")
const orgCount = document.getElementById("orgCount")
const orgBtn = document.getElementById("orgBtn")
const orgStatus = document.getElementById("orgStatus")
const clearOrg = document.getElementById("clearOrg")
const orgCard = document.getElementById("orgCard")
const orgReset = document.getElementById("orgReset")
let orgFileRef = null
let orgItems = []
let orgAll = []
let orgPdf = null
let orgTotal = 0
let orgDragIdx = null

function updateOrgCount() {
  orgCount.textContent = orgItems.length + " of " + orgTotal + " pages kept"
}
function renderOrgGrid() {
  orgGrid.innerHTML = ""
  orgItems.forEach((it, i) => {
    const item = document.createElement("div")
    item.className = "page-item"
    item.draggable = true
    item.dataset.index = String(i)
    const del = document.createElement("button")
    del.className = "page-del"
    del.textContent = "\u00D7"
    del.title = "Delete this page"
    del.addEventListener("click", () => {
      const idx = parseInt(item.dataset.index, 10)
      orgItems.splice(idx, 1)
      renderOrgGrid()
      updateOrgCount()
    })
    const box = document.createElement("div")
    box.className = "page-box"
    box.appendChild(it.canvas)
    const label = document.createElement("div")
    label.className = "page-num"
    label.textContent = "Page " + (it.orig + 1)
    item.appendChild(del)
    item.appendChild(box)
    item.appendChild(label)
    item.addEventListener("dragstart", (e) => {
      orgDragIdx = parseInt(item.dataset.index, 10)
      item.classList.add("dragging")
      e.dataTransfer.effectAllowed = "move"
    })
    item.addEventListener("dragend", () => {
      orgDragIdx = null
      item.classList.remove("dragging")
    })
    item.addEventListener("dragover", (e) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = "move"
    })
    item.addEventListener("drop", (e) => {
      e.preventDefault()
      const target = parseInt(item.dataset.index, 10)
      if (orgDragIdx !== null && orgDragIdx !== target) {
        const [moved] = orgItems.splice(orgDragIdx, 1)
        orgItems.splice(target, 0, moved)
        renderOrgGrid()
      }
    })
    orgGrid.appendChild(item)
  })
  updateOrgCount()
}
async function loadOrgPages() {
  orgItems = []
  orgAll = []
  orgPdf = null
  orgTotal = 0
  if (!orgFileRef) {
    orgArea.classList.add("hidden")
    return
  }
  orgGrid.innerHTML = "<div style='text-align:center;padding:20px;color:var(--muted)'>Loading pages\u2026</div>"
  orgArea.classList.remove("hidden")
  try {
    const buffer = await orgFileRef.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
    orgGrid.innerHTML = ""
    orgTotal = pdf.numPages
    orgPdf = pdf
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const vp = page.getViewport({ scale: 0.35 })
      const canvas = document.createElement("canvas")
      canvas.width = vp.width
      canvas.height = vp.height
      await page.render({ canvasContext: canvas.getContext("2d"), viewport: vp }).promise
      orgItems.push({ orig: i - 1, canvas })
    }
    orgAll = orgItems.slice()
    renderOrgGrid()
  } catch (e) {
    orgArea.classList.add("hidden")
    if (e && e.name === "PasswordException") {
      setStatus(orgStatus, "This PDF is password-protected. Remove the password first with Protect PDF.", "error")
    } else {
      setStatus(orgStatus, "Failed to load file.", "error")
    }
  }
}
orgFileInput.addEventListener("change", (e) => {
  orgFileRef = e.target.files && e.target.files[0] ? e.target.files[0] : null
  setStatus(orgStatus, "")
  if (orgFileRef) clearOrg.classList.remove("hidden")
  else clearOrg.classList.add("hidden")
  loadOrgPages()
})
clearOrg.addEventListener("click", (e) => {
  e.preventDefault()
  orgFileInput.value = ""
  orgFileRef = null
  clearOrg.classList.add("hidden")
  setStatus(orgStatus, "")
  loadOrgPages()
})
orgReset.addEventListener("click", () => {
  orgItems = orgAll.slice()
  renderOrgGrid()
})
const orgBlank = document.getElementById("orgBlank")
orgBlank.addEventListener("click", async () => {
  if (!orgItems.length || !orgPdf) return
  setBusy(orgBlank, true, "Detect blank pages", "Detecting...")
  try {
    const blanks = []
    for (const it of orgItems) {
      const page = await orgPdf.getPage(it.orig + 1)
      const vp = page.getViewport({ scale: 1 })
      const cv = document.createElement("canvas")
      cv.width = vp.width
      cv.height = vp.height
      await page.render({ canvasContext: cv.getContext("2d"), viewport: vp }).promise
      if (inkCoverage(cv) < 0.001) blanks.push(it)
    }
    if (!blanks.length) {
      setStatus(orgStatus, "No blank pages detected.", "success")
      return
    }
    orgItems = orgItems.filter(it => !blanks.includes(it))
    renderOrgGrid()
    setStatus(orgStatus, "Removed " + blanks.length + " blank page(s). Reset pages restores them.", "success")
    track("org_blank", { removed: blanks.length })
  } catch (e) {
    setStatus(orgStatus, "Blank detection failed.", "error")
  } finally {
    setBusy(orgBlank, false, "Detect blank pages", "Detecting...")
  }
})
orgBtn.addEventListener("click", async () => {
  if (!orgFileRef) {
    setStatus(orgStatus, "Please select a PDF.", "error")
    track("org_missing_file")
    return
  }
  if (orgItems.length === 0) {
    setStatus(orgStatus, "No pages left. Reset order to restore pages.", "error")
    return
  }
  if (orgFileRef.size > MAX_FILE_SIZE) {
    setStatus(orgStatus, "File is too large (max 100 MB).", "error")
    return
  }
  setBusy(orgBtn, true, "Save PDF", "Processing...")
  setStatus(orgStatus, "")
  try {
    track("org_start", { kept: orgItems.length, total: orgTotal })
    const buffer = await orgFileRef.arrayBuffer()
    const src = await PDFLib.PDFDocument.load(buffer)
    const out = await PDFLib.PDFDocument.create()
    const pages = await out.copyPages(src, orgItems.map(it => it.orig))
    for (const p of pages) out.addPage(p)
    const bytes = await out.save()
    const base = orgFileRef.name.replace(/\.pdf$/i, "")
    downloadBytes(bytes, base + "_organized.pdf")
    setStatus(orgStatus, "Done. " + orgItems.length + " of " + orgTotal + " pages saved.", "success")
    track("org_success", { kept: orgItems.length })
  } catch (err) {
    console.error("organize error:", err)
    if (String(err.message || "").includes("encrypted")) {
      setStatus(orgStatus, "This PDF is password-protected. Remove the password first with Protect PDF.", "error")
    } else {
      setStatus(orgStatus, "Failed to process file.", "error")
    }
    track("org_error")
  } finally {
    setBusy(orgBtn, false, "Save PDF", "Processing...")
  }
})
orgCard.addEventListener("dragover", (e) => handleDragOver(orgCard, e))
orgCard.addEventListener("dragenter", (e) => handleDragOver(orgCard, e))
orgCard.addEventListener("dragleave", (e) => handleDragLeave(orgCard, e))
orgCard.addEventListener("drop", (e) => {
  e.preventDefault()
  e.stopPropagation()
  orgCard.classList.remove("drag-over")
  const files = Array.from(e.dataTransfer.files || []).filter(f => f.type === "application/pdf" || f.name.endsWith(".pdf"))
  if (files.length === 0) return
  const dt = new DataTransfer()
  dt.items.add(files[0])
  orgFileInput.files = dt.files
  orgFileInput.dispatchEvent(new Event("change"))
})

// ===== Add Page Numbers =====
const pnFileInput = document.getElementById("pnFile")
const pnControls = document.getElementById("pnControls")
const pnPosition = document.getElementById("pnPosition")
const pnFormat = document.getElementById("pnFormat")
const pnStart = document.getElementById("pnStart")
const pnSize = document.getElementById("pnSize")
const pnSizeVal = document.getElementById("pnSizeVal")
const pnMargin = document.getElementById("pnMargin")
const pnMarginVal = document.getElementById("pnMarginVal")
const pnPreviewWrap = document.getElementById("pnPreviewWrap")
const pnPreviewCanvas = document.getElementById("pnPreview")
const pnBtn = document.getElementById("pnBtn")
const pnStatus = document.getElementById("pnStatus")
const clearPn = document.getElementById("clearPn")
const pnCard = document.getElementById("pnCard")
let pnFileRef = null
let pnBaseCanvas = null
let pnTotal = 0

function pnLabel(n) {
  const fmt = pnFormat.value
  if (fmt === "n-of-total") return n + " / " + pnTotal
  if (fmt === "page-n") return "Page " + n
  if (fmt === "page-n-of-total") return "Page " + n + " of " + pnTotal
  return String(n)
}
function drawPnPreview() {
  if (!pnBaseCanvas) return
  pnPreviewCanvas.width = pnBaseCanvas.width
  pnPreviewCanvas.height = pnBaseCanvas.height
  const ctx = pnPreviewCanvas.getContext("2d")
  ctx.drawImage(pnBaseCanvas, 0, 0)
  const start = Math.max(1, parseInt(pnStart.value, 10) || 1)
  const text = pnLabel(start)
  const sizePt = parseInt(pnSize.value, 10) || 11
  const marginPt = parseInt(pnMargin.value, 10) || 24
  const scale = pnBaseCanvas.width / pnBaseCanvas._pageW
  const fontPx = sizePt * scale
  const margin = marginPt * scale
  const pos = pnPosition.value
  ctx.font = fontPx + "px Helvetica, Arial, sans-serif"
  ctx.fillStyle = "#111111"
  ctx.textBaseline = "alphabetic"
  const tw = ctx.measureText(text).width
  const x = pos.endsWith("left") ? margin : pos.endsWith("right") ? pnPreviewCanvas.width - margin - tw : (pnPreviewCanvas.width - tw) / 2
  const y = pos.startsWith("bottom") ? pnPreviewCanvas.height - margin : margin + fontPx * 0.78
  ctx.fillText(text, x, y)
}
async function loadPnPreview() {
  pnBaseCanvas = null
  pnTotal = 0
  if (!pnFileRef) {
    pnControls.classList.add("hidden")
    return
  }
  try {
    const buffer = await pnFileRef.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
    pnTotal = pdf.numPages
    const page = await pdf.getPage(1)
    const vp0 = page.getViewport({ scale: 1 })
    const scale = Math.min(460 / vp0.width, 360 / vp0.height, 1.5)
    const vp = page.getViewport({ scale })
    const cv = document.createElement("canvas")
    cv.width = vp.width
    cv.height = vp.height
    cv._pageW = vp0.width
    await page.render({ canvasContext: cv.getContext("2d"), viewport: vp }).promise
    pnBaseCanvas = cv
    pnControls.classList.remove("hidden")
    drawPnPreview()
  } catch (e) {
    pnControls.classList.add("hidden")
    if (e && e.name === "PasswordException") {
      setStatus(pnStatus, "This PDF is password-protected. Remove the password first with Protect PDF.", "error")
    } else {
      setStatus(pnStatus, "Failed to load preview.", "error")
    }
  }
}
pnFileInput.addEventListener("change", (e) => {
  pnFileRef = e.target.files && e.target.files[0] ? e.target.files[0] : null
  setStatus(pnStatus, "")
  if (pnFileRef) clearPn.classList.remove("hidden")
  else clearPn.classList.add("hidden")
  loadPnPreview()
})
clearPn.addEventListener("click", (e) => {
  e.preventDefault()
  pnFileInput.value = ""
  pnFileRef = null
  clearPn.classList.add("hidden")
  setStatus(pnStatus, "")
  loadPnPreview()
})
pnPosition.addEventListener("change", drawPnPreview)
pnFormat.addEventListener("change", drawPnPreview)
pnStart.addEventListener("input", drawPnPreview)
pnSize.addEventListener("input", () => { pnSizeVal.textContent = pnSize.value; drawPnPreview() })
pnMargin.addEventListener("input", () => { pnMarginVal.textContent = pnMargin.value; drawPnPreview() })
pnBtn.addEventListener("click", async () => {
  if (!pnFileRef) {
    setStatus(pnStatus, "Please select a PDF.", "error")
    track("pn_missing_file")
    return
  }
  if (pnFileRef.size > MAX_FILE_SIZE) {
    setStatus(pnStatus, "File is too large (max 100 MB).", "error")
    return
  }
  setBusy(pnBtn, true, "Add Numbers", "Processing...")
  setStatus(pnStatus, "")
  try {
    track("pn_start")
    const buffer = await pnFileRef.arrayBuffer()
    const src = await PDFLib.PDFDocument.load(buffer)
    const out = await PDFLib.PDFDocument.create()
    const font = await out.embedFont(PDFLib.StandardFonts.Helvetica)
    const total = src.getPageCount()
    const start = Math.max(1, parseInt(pnStart.value, 10) || 1)
    const sizePt = parseInt(pnSize.value, 10) || 11
    const marginPt = parseInt(pnMargin.value, 10) || 24
    const pos = pnPosition.value
    const pages = await out.copyPages(src, Array.from({ length: total }, (_, i) => i))
    for (let i = 0; i < pages.length; i++) {
      const p = await addPageBaked(out, pages[i])
      const w = p.getWidth()
      const h = p.getHeight()
      const text = pnLabel(start + i)
      const tw = font.widthOfTextAtSize(text, sizePt)
      const x = pos.endsWith("left") ? marginPt : pos.endsWith("right") ? w - marginPt - tw : (w - tw) / 2
      const y = pos.startsWith("bottom") ? marginPt : h - marginPt - sizePt * 0.78
      p.drawText(text, { x, y, size: sizePt, font, color: PDFLib.rgb(0.07, 0.07, 0.07) })
    }
    const bytes = await out.save()
    const base = pnFileRef.name.replace(/\.pdf$/i, "")
    downloadBytes(bytes, base + "_numbered.pdf")
    setStatus(pnStatus, "Done. " + total + " pages numbered.", "success")
    track("pn_success", { pages: total })
  } catch (err) {
    console.error("page numbers error:", err)
    if (String(err.message || "").includes("encrypted")) {
      setStatus(pnStatus, "This PDF is password-protected. Remove the password first with Protect PDF.", "error")
    } else {
      setStatus(pnStatus, "Failed to process file.", "error")
    }
    track("pn_error")
  } finally {
    setBusy(pnBtn, false, "Add Numbers", "Processing...")
  }
})
pnCard.addEventListener("dragover", (e) => handleDragOver(pnCard, e))
pnCard.addEventListener("dragenter", (e) => handleDragOver(pnCard, e))
pnCard.addEventListener("dragleave", (e) => handleDragLeave(pnCard, e))
pnCard.addEventListener("drop", (e) => {
  e.preventDefault()
  e.stopPropagation()
  pnCard.classList.remove("drag-over")
  const files = Array.from(e.dataTransfer.files || []).filter(f => f.type === "application/pdf" || f.name.endsWith(".pdf"))
  if (files.length === 0) return
  const dt = new DataTransfer()
  dt.items.add(files[0])
  pnFileInput.files = dt.files
  pnFileInput.dispatchEvent(new Event("change"))
})

// ===== Shared helpers for sign / crop =====
function trimCanvasAlpha(src, pad) {
  const ctx = src.getContext("2d")
  const { width: w, height: h } = src
  const data = ctx.getImageData(0, 0, w, h).data
  let x0 = w, y0 = h, x1 = -1, y1 = -1
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 10) {
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
    }
  }
  if (x1 < 0) return null
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad)
  x1 = Math.min(w - 1, x1 + pad); y1 = Math.min(h - 1, y1 + pad)
  const out = document.createElement("canvas")
  out.width = x1 - x0 + 1
  out.height = y1 - y0 + 1
  out.getContext("2d").drawImage(src, x0, y0, out.width, out.height, 0, 0, out.width, out.height)
  return out
}
async function renderPagePreview(pdf, idx, canvas, maxW, maxH) {
  const page = await pdf.getPage(idx + 1)
  const vp0 = page.getViewport({ scale: 1 })
  const scale = Math.min(maxW / vp0.width, maxH / vp0.height, 1.5)
  const vp = page.getViewport({ scale })
  canvas.width = vp.width
  canvas.height = vp.height
  await page.render({ canvasContext: canvas.getContext("2d"), viewport: vp }).promise
  return { w: vp0.width, h: vp0.height }
}
function fillPageSelect(sel, total) {
  sel.innerHTML = ""
  for (let i = 1; i <= total; i++) {
    const o = document.createElement("option")
    o.value = String(i - 1)
    o.textContent = "Page " + i
    sel.appendChild(o)
  }
}
function encryptedMsg(err) {
  return String(err.message || "").includes("encrypted") || (err && err.name === "PasswordException")
}
const ENCRYPTED_HINT = "This PDF is password-protected. Remove the password first with Protect PDF."
function inkCoverage(canvas) {
  const ctx = canvas.getContext("2d")
  const { width: w, height: h } = canvas
  if (!w || !h) return 1
  const data = ctx.getImageData(0, 0, w, h).data
  let ink = 0
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 10 && data[i] + data[i + 1] + data[i + 2] < 735) ink++
  }
  return ink / (w * h)
}

// ===== Sign PDF =====
const sigFileInput = document.getElementById("sigFile")
const sigModeSelect = document.getElementById("sigMode")
const sigPadWrap = document.getElementById("sigPadWrap")
const sigPad = document.getElementById("sigPad")
const sigPadClear = document.getElementById("sigPadClear")
const sigInk = document.getElementById("sigInk")
const sigUploadWrap = document.getElementById("sigUploadWrap")
const sigImgFile = document.getElementById("sigImgFile")
const sigControls = document.getElementById("sigControls")
const sigPageSelect = document.getElementById("sigPage")
const sigSizeInput = document.getElementById("sigSize")
const sigSizeVal = document.getElementById("sigSizeVal")
const sigPreviewBox = document.getElementById("sigPreviewBox")
const sigPreviewCanvas = document.getElementById("sigPreview")
const sigOverlay = document.getElementById("sigOverlay")
const sigBtn = document.getElementById("sigBtn")
const sigStatus = document.getElementById("sigStatus")
const clearSig = document.getElementById("clearSig")
const sigCard = document.getElementById("sigCard")
const sigSourceWrap = document.getElementById("sigSourceWrap")
let sigFileRef = null
let sigPdf = null
let sigPageIdx = 0
let sigTrim = null
let sigFrac = 0.25
let sigPos = { fx: 0.62, fy: 0.78 }
let sigDrawing = false

sigOverlay.draggable = false
function sigAspect() {
  return sigTrim ? sigTrim.height / sigTrim.width : 0.4
}
function updateSigOverlay() {
  if (!sigTrim || !sigPdf) {
    sigOverlay.classList.add("hidden")
    return
  }
  const boxW = sigPreviewCanvas.getBoundingClientRect().width
  const boxH = sigPreviewCanvas.getBoundingClientRect().height
  if (!boxW) return
  const w = sigFrac * boxW
  const h = w * sigAspect()
  sigPos.fx = Math.min(Math.max(sigPos.fx, 0), Math.max(0, 1 - sigFrac))
  sigPos.fy = Math.min(Math.max(sigPos.fy, 0), Math.max(0, 1 - h / boxH))
  sigOverlay.style.left = (sigPos.fx * boxW) + "px"
  sigOverlay.style.top = (sigPos.fy * boxH) + "px"
  sigOverlay.style.width = w + "px"
  sigOverlay.style.height = h + "px"
  sigOverlay.classList.remove("hidden")
}
function refreshSigTrim() {
  sigTrim = trimCanvasAlpha(sigPad, 4)
  if (sigTrim) sigOverlay.src = sigTrim.toDataURL("image/png")
  updateSigOverlay()
}
function padPoint(e) {
  const r = sigPad.getBoundingClientRect()
  return { x: (e.clientX - r.left) * (sigPad.width / r.width), y: (e.clientY - r.top) * (sigPad.height / r.height) }
}
sigPad.addEventListener("pointerdown", (e) => {
  e.preventDefault()
  sigDrawing = true
  try { sigPad.setPointerCapture(e.pointerId) } catch (_) {}
  const ctx = sigPad.getContext("2d")
  const p = padPoint(e)
  ctx.strokeStyle = sigInk.value
  ctx.lineWidth = 3.5
  ctx.lineCap = "round"
  ctx.lineJoin = "round"
  ctx.beginPath()
  ctx.moveTo(p.x, p.y)
  ctx.lineTo(p.x + 0.1, p.y + 0.1)
  ctx.stroke()
})
sigPad.addEventListener("pointermove", (e) => {
  if (!sigDrawing) return
  const p = padPoint(e)
  const ctx = sigPad.getContext("2d")
  ctx.lineTo(p.x, p.y)
  ctx.stroke()
})
sigPad.addEventListener("pointerup", () => {
  if (!sigDrawing) return
  sigDrawing = false
  refreshSigTrim()
})
sigPad.addEventListener("pointercancel", () => { sigDrawing = false; refreshSigTrim() })
sigPadClear.addEventListener("click", () => {
  sigPad.getContext("2d").clearRect(0, 0, sigPad.width, sigPad.height)
  sigTrim = null
  updateSigOverlay()
})
sigModeSelect.addEventListener("change", () => {
  const draw = sigModeSelect.value === "draw"
  sigPadWrap.classList.toggle("hidden", !draw)
  sigUploadWrap.classList.toggle("hidden", draw)
  if (draw) refreshSigTrim()
})
sigImgFile.addEventListener("change", async (e) => {
  const f = e.target.files && e.target.files[0]
  if (!f) return
  try {
    const { im, url } = await loadImageElement(f)
    const cv = document.createElement("canvas")
    cv.width = im.naturalWidth
    cv.height = im.naturalHeight
    cv.getContext("2d").drawImage(im, 0, 0)
    URL.revokeObjectURL(url)
    sigTrim = trimCanvasAlpha(cv, 2)
    if (sigTrim) sigOverlay.src = sigTrim.toDataURL("image/png")
    updateSigOverlay()
    setStatus(sigStatus, sigTrim ? "" : "No visible signature found in that image.", sigTrim ? "" : "error")
  } catch (err) {
    setStatus(sigStatus, "Failed to load image.", "error")
  }
})
async function loadSigPreview() {
  sigPdf = null
  if (!sigFileRef) {
    sigControls.classList.add("hidden")
    sigSourceWrap.classList.add("hidden")
    updateSigOverlay()
    return
  }
  try {
    const buffer = await sigFileRef.arrayBuffer()
    sigPdf = await pdfjsLib.getDocument({ data: buffer }).promise
    fillPageSelect(sigPageSelect, sigPdf.numPages)
    sigPageIdx = 0
    sigPageSelect.value = "0"
    await renderPagePreview(sigPdf, sigPageIdx, sigPreviewCanvas, 440, 400)
    sigControls.classList.remove("hidden")
    sigSourceWrap.classList.remove("hidden")
    updateSigOverlay()
  } catch (e) {
    sigControls.classList.add("hidden")
    sigSourceWrap.classList.add("hidden")
    setStatus(sigStatus, encryptedMsg(e) ? ENCRYPTED_HINT : "Failed to load file.", "error")
  }
}
sigFileInput.addEventListener("change", (e) => {
  sigFileRef = e.target.files && e.target.files[0] ? e.target.files[0] : null
  setStatus(sigStatus, "")
  if (sigFileRef) clearSig.classList.remove("hidden")
  else clearSig.classList.add("hidden")
  loadSigPreview()
})
clearSig.addEventListener("click", (e) => {
  e.preventDefault()
  sigFileInput.value = ""
  sigFileRef = null
  clearSig.classList.add("hidden")
  setStatus(sigStatus, "")
  loadSigPreview()
})
sigPageSelect.addEventListener("change", async () => {
  sigPageIdx = parseInt(sigPageSelect.value, 10) || 0
  if (sigPdf) {
    await renderPagePreview(sigPdf, sigPageIdx, sigPreviewCanvas, 440, 400)
    updateSigOverlay()
  }
})
sigSizeInput.addEventListener("input", () => {
  sigSizeVal.textContent = sigSizeInput.value
  sigFrac = (parseInt(sigSizeInput.value, 10) || 25) / 100
  updateSigOverlay()
})
sigOverlay.addEventListener("pointerdown", (e) => {
  e.preventDefault()
  try { sigOverlay.setPointerCapture(e.pointerId) } catch (_) {}
  const box = sigPreviewCanvas.getBoundingClientRect()
  const startX = e.clientX, startY = e.clientY
  const origFx = sigPos.fx, origFy = sigPos.fy
  const move = (ev) => {
    sigPos.fx = origFx + (ev.clientX - startX) / box.width
    sigPos.fy = origFy + (ev.clientY - startY) / box.height
    updateSigOverlay()
  }
  const up = () => {
    sigOverlay.removeEventListener("pointermove", move)
    sigOverlay.removeEventListener("pointerup", up)
    sigOverlay.removeEventListener("pointercancel", up)
  }
  sigOverlay.addEventListener("pointermove", move)
  sigOverlay.addEventListener("pointerup", up)
  sigOverlay.addEventListener("pointercancel", up)
})
sigBtn.addEventListener("click", async () => {
  if (!sigFileRef) {
    setStatus(sigStatus, "Please select a PDF.", "error")
    track("sig_missing_file")
    return
  }
  if (!sigTrim) {
    setStatus(sigStatus, "Draw or upload a signature first.", "error")
    track("sig_missing_signature")
    return
  }
  if (sigFileRef.size > MAX_FILE_SIZE) {
    setStatus(sigStatus, "File is too large (max 100 MB).", "error")
    return
  }
  setBusy(sigBtn, true, "Apply Signature", "Processing...")
  setStatus(sigStatus, "")
  try {
    track("sig_start")
    const buffer = await sigFileRef.arrayBuffer()
    const src = await PDFLib.PDFDocument.load(buffer)
    const out = await PDFLib.PDFDocument.create()
    const img = await out.embedPng(sigTrim.toDataURL("image/png"))
    const total = src.getPageCount()
    const pages = await out.copyPages(src, Array.from({ length: total }, (_, i) => i))
    for (let i = 0; i < pages.length; i++) {
      if (i !== sigPageIdx) { out.addPage(pages[i]); continue }
      const p = await addPageBaked(out, pages[i])
      const w = p.getWidth(), h = p.getHeight()
      const sw = sigFrac * w
      const sh = sw * sigAspect()
      p.drawImage(img, { x: sigPos.fx * w, y: h - sigPos.fy * h - sh, width: sw, height: sh })
    }
    const bytes = await out.save()
    const base = sigFileRef.name.replace(/\.pdf$/i, "")
    downloadBytes(bytes, base + "_signed.pdf")
    setStatus(sigStatus, "Done. Signature applied to page " + (sigPageIdx + 1) + ".", "success")
    track("sig_success", { page: sigPageIdx + 1 })
  } catch (err) {
    console.error("sign error:", err)
    setStatus(sigStatus, encryptedMsg(err) ? ENCRYPTED_HINT : "Failed to process file.", "error")
    track("sig_error")
  } finally {
    setBusy(sigBtn, false, "Apply Signature", "Processing...")
  }
})
sigCard.addEventListener("dragover", (e) => handleDragOver(sigCard, e))
sigCard.addEventListener("dragenter", (e) => handleDragOver(sigCard, e))
sigCard.addEventListener("dragleave", (e) => handleDragLeave(sigCard, e))
sigCard.addEventListener("drop", (e) => {
  e.preventDefault()
  e.stopPropagation()
  sigCard.classList.remove("drag-over")
  const files = Array.from(e.dataTransfer.files || []).filter(f => f.type === "application/pdf" || f.name.endsWith(".pdf"))
  if (files.length === 0) return
  const dt = new DataTransfer()
  dt.items.add(files[0])
  sigFileInput.files = dt.files
  sigFileInput.dispatchEvent(new Event("change"))
})

// ===== Crop PDF =====
const cropFileInput = document.getElementById("cropFile")
const cropControls = document.getElementById("cropControls")
const cropPageSelect = document.getElementById("cropPage")
const cropAllCheck = document.getElementById("cropAll")
const cropPreviewBox = document.getElementById("cropPreviewBox")
const cropPreviewCanvas = document.getElementById("cropPreview")
const cropRectEl = document.getElementById("cropRect")
const cropReset = document.getElementById("cropReset")
const cropAuto = document.getElementById("cropAuto")
const cropBtn = document.getElementById("cropBtn")
const cropStatus = document.getElementById("cropStatus")
const clearCrop = document.getElementById("clearCrop")
const cropCard = document.getElementById("cropCard")
let cropFileRef = null
let cropPdf = null
let cropPageIdx = 0
let cropRect = { x: 0.05, y: 0.05, w: 0.9, h: 0.9 }

function positionCropRect() {
  const r = cropPreviewCanvas.getBoundingClientRect()
  if (!r.width) return
  cropRectEl.style.left = (cropRect.x * r.width) + "px"
  cropRectEl.style.top = (cropRect.y * r.height) + "px"
  cropRectEl.style.width = (cropRect.w * r.width) + "px"
  cropRectEl.style.height = (cropRect.h * r.height) + "px"
}
function clampCrop() {
  const MIN = 0.05
  cropRect.w = Math.min(Math.max(cropRect.w, MIN), 1)
  cropRect.h = Math.min(Math.max(cropRect.h, MIN), 1)
  cropRect.x = Math.min(Math.max(cropRect.x, 0), 1 - cropRect.w)
  cropRect.y = Math.min(Math.max(cropRect.y, 0), 1 - cropRect.h)
}
async function loadCropPreview() {
  cropPdf = null
  if (!cropFileRef) {
    cropControls.classList.add("hidden")
    return
  }
  try {
    const buffer = await cropFileRef.arrayBuffer()
    cropPdf = await pdfjsLib.getDocument({ data: buffer }).promise
    fillPageSelect(cropPageSelect, cropPdf.numPages)
    cropPageIdx = 0
    cropPageSelect.value = "0"
    await renderPagePreview(cropPdf, cropPageIdx, cropPreviewCanvas, 440, 400)
    cropControls.classList.remove("hidden")
    positionCropRect()
  } catch (e) {
    cropControls.classList.add("hidden")
    setStatus(cropStatus, encryptedMsg(e) ? ENCRYPTED_HINT : "Failed to load file.", "error")
  }
}
cropFileInput.addEventListener("change", (e) => {
  cropFileRef = e.target.files && e.target.files[0] ? e.target.files[0] : null
  setStatus(cropStatus, "")
  if (cropFileRef) clearCrop.classList.remove("hidden")
  else clearCrop.classList.add("hidden")
  loadCropPreview()
})
clearCrop.addEventListener("click", (e) => {
  e.preventDefault()
  cropFileInput.value = ""
  cropFileRef = null
  clearCrop.classList.add("hidden")
  setStatus(cropStatus, "")
  loadCropPreview()
})
cropPageSelect.addEventListener("change", async () => {
  cropPageIdx = parseInt(cropPageSelect.value, 10) || 0
  if (cropPdf) {
    await renderPagePreview(cropPdf, cropPageIdx, cropPreviewCanvas, 440, 400)
    positionCropRect()
  }
})
cropReset.addEventListener("click", () => {
  cropRect = { x: 0, y: 0, w: 1, h: 1 }
  positionCropRect()
})
cropRectEl.addEventListener("pointerdown", (e) => {
  e.preventDefault()
  try { cropRectEl.setPointerCapture(e.pointerId) } catch (_) {}
  const handle = e.target.closest(".crop-h")
  const mode = handle ? handle.dataset.h : "move"
  const box = cropPreviewCanvas.getBoundingClientRect()
  const startX = e.clientX, startY = e.clientY
  const orig = { ...cropRect }
  const move = (ev) => {
    const dx = (ev.clientX - startX) / box.width
    const dy = (ev.clientY - startY) / box.height
    if (mode === "move") {
      cropRect.x = orig.x + dx
      cropRect.y = orig.y + dy
    } else {
      if (mode.includes("w")) { cropRect.x = orig.x + dx; cropRect.w = orig.w - dx }
      if (mode.includes("e")) { cropRect.w = orig.w + dx }
      if (mode.includes("n")) { cropRect.y = orig.y + dy; cropRect.h = orig.h - dy }
      if (mode.includes("s")) { cropRect.h = orig.h + dy }
    }
    clampCrop()
    positionCropRect()
  }
  const up = () => {
    cropRectEl.removeEventListener("pointermove", move)
    cropRectEl.removeEventListener("pointerup", up)
    cropRectEl.removeEventListener("pointercancel", up)
  }
  cropRectEl.addEventListener("pointermove", move)
  cropRectEl.addEventListener("pointerup", up)
  cropRectEl.addEventListener("pointercancel", up)
})
cropBtn.addEventListener("click", async () => {
  if (!cropFileRef) {
    setStatus(cropStatus, "Please select a PDF.", "error")
    track("crop_missing_file")
    return
  }
  if (cropFileRef.size > MAX_FILE_SIZE) {
    setStatus(cropStatus, "File is too large (max 100 MB).", "error")
    return
  }
  setBusy(cropBtn, true, "Crop PDF", "Processing...")
  setStatus(cropStatus, "")
  try {
    track("crop_start", { all: cropAllCheck.checked })
    const buffer = await cropFileRef.arrayBuffer()
    const src = await PDFLib.PDFDocument.load(buffer)
    const out = await PDFLib.PDFDocument.create()
    const total = src.getPageCount()
    const pages = await out.copyPages(src, Array.from({ length: total }, (_, i) => i))
    let cropped = 0
    for (let i = 0; i < pages.length; i++) {
      const apply = cropAllCheck.checked || i === cropPageIdx
      if (!apply) { out.addPage(pages[i]); continue }
      const p = await addPageBaked(out, pages[i])
      const w = p.getWidth(), h = p.getHeight()
      const cw = cropRect.w * w
      const ch = cropRect.h * h
      const cx = cropRect.x * w
      const cy = h - cropRect.y * h - ch
      p.setMediaBox(cx, cy, cw, ch)
      p.setCropBox(cx, cy, cw, ch)
      cropped++
    }
    const bytes = await out.save()
    const base = cropFileRef.name.replace(/\.pdf$/i, "")
    downloadBytes(bytes, base + "_cropped.pdf")
    setStatus(cropStatus, "Done. " + cropped + " page(s) cropped.", "success")
    track("crop_success", { pages: cropped })
  } catch (err) {
    console.error("crop error:", err)
    setStatus(cropStatus, encryptedMsg(err) ? ENCRYPTED_HINT : "Failed to process file.", "error")
    track("crop_error")
  } finally {
    setBusy(cropBtn, false, "Crop PDF", "Processing...")
  }
})
cropCard.addEventListener("dragover", (e) => handleDragOver(cropCard, e))
cropCard.addEventListener("dragenter", (e) => handleDragOver(cropCard, e))
cropCard.addEventListener("dragleave", (e) => handleDragLeave(cropCard, e))
cropCard.addEventListener("drop", (e) => {
  e.preventDefault()
  e.stopPropagation()
  cropCard.classList.remove("drag-over")
  const files = Array.from(e.dataTransfer.files || []).filter(f => f.type === "application/pdf" || f.name.endsWith(".pdf"))
  if (files.length === 0) return
  const dt = new DataTransfer()
  dt.items.add(files[0])
  cropFileInput.files = dt.files
  cropFileInput.dispatchEvent(new Event("change"))
})
cropAuto.addEventListener("click", () => {
  if (!cropPdf) return
  const cv = cropPreviewCanvas
  const { width: w, height: h } = cv
  const data = cv.getContext("2d").getImageData(0, 0, w, h).data
  let x0 = w, y0 = h, x1 = -1, y1 = -1
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      if (data[i + 3] > 10 && data[i] + data[i + 1] + data[i + 2] < 735) {
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
    }
  }
  if (x1 < 0) {
    setStatus(cropStatus, "This page looks blank — nothing to trim.", "error")
    return
  }
  const pad = 3
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad)
  x1 = Math.min(w - 1, x1 + pad); y1 = Math.min(h - 1, y1 + pad)
  cropRect = { x: x0 / w, y: y0 / h, w: (x1 - x0 + 1) / w, h: (y1 - y0 + 1) / h }
  clampCrop()
  positionCropRect()
  setStatus(cropStatus, "Frame fitted to content — review, then crop.", "success")
  track("crop_auto")
})

// ===== PDF to Text =====
const txtFileInput = document.getElementById("txtFile")
const txtControls = document.getElementById("txtControls")
const txtInfo = document.getElementById("txtInfo")
const txtOut = document.getElementById("txtOut")
const txtCopy = document.getElementById("txtCopy")
const txtDownload = document.getElementById("txtDownload")
const txtStatus = document.getElementById("txtStatus")
const clearTxt = document.getElementById("clearTxt")
const txtCard = document.getElementById("txtCard")
let txtFileRef = null

async function loadTxt() {
  if (!txtFileRef) {
    txtControls.classList.add("hidden")
    txtOut.value = ""
    return
  }
  try {
    const buffer = await txtFileRef.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
    const parts = []
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const tc = await page.getTextContent()
      let pageText = ""
      for (const it of tc.items) {
        if (typeof it.str !== "string") continue
        pageText += it.str + (it.hasEOL ? "\n" : " ")
      }
      parts.push(pageText.replace(/[ \t]+\n/g, "\n").trim())
    }
    const text = parts.join("\n\n")
    txtOut.value = text
    txtInfo.textContent = pdf.numPages + " page(s) · " + text.length.toLocaleString() + " characters"
    txtControls.classList.remove("hidden")
    setStatus(txtStatus, text.trim() ? "" : "No selectable text found — this PDF may be scanned images.", text.trim() ? "" : "error")
  } catch (e) {
    txtControls.classList.add("hidden")
    setStatus(txtStatus, encryptedMsg(e) ? ENCRYPTED_HINT : "Failed to load file.", "error")
  }
}
txtFileInput.addEventListener("change", (e) => {
  txtFileRef = e.target.files && e.target.files[0] ? e.target.files[0] : null
  setStatus(txtStatus, "")
  if (txtFileRef) clearTxt.classList.remove("hidden")
  else clearTxt.classList.add("hidden")
  loadTxt()
})
clearTxt.addEventListener("click", (e) => {
  e.preventDefault()
  txtFileInput.value = ""
  txtFileRef = null
  clearTxt.classList.add("hidden")
  setStatus(txtStatus, "")
  loadTxt()
})
txtCopy.addEventListener("click", async () => {
  if (!txtOut.value) {
    setStatus(txtStatus, "Nothing to copy yet — select a PDF first.", "error")
    return
  }
  let ok = false
  try { await navigator.clipboard.writeText(txtOut.value); ok = true } catch (_) {
    try { txtOut.focus(); txtOut.select(); ok = document.execCommand("copy") } catch (_) { ok = false }
  }
  setStatus(txtStatus, ok ? "Copied to clipboard." : "Copy failed — select the text manually.", ok ? "success" : "error")
  track("txt_copy", { ok })
})
txtDownload.addEventListener("click", () => {
  if (!txtOut.value) {
    setStatus(txtStatus, "Nothing to download yet — select a PDF first.", "error")
    return
  }
  const base = txtFileRef ? txtFileRef.name.replace(/\.pdf$/i, "") : "extracted"
  downloadBytes(new TextEncoder().encode(txtOut.value), base + ".txt")
  setStatus(txtStatus, "Done. Text file downloaded.", "success")
  track("txt_download")
})
txtCard.addEventListener("dragover", (e) => handleDragOver(txtCard, e))
txtCard.addEventListener("dragenter", (e) => handleDragOver(txtCard, e))
txtCard.addEventListener("dragleave", (e) => handleDragLeave(txtCard, e))
txtCard.addEventListener("drop", (e) => {
  e.preventDefault()
  e.stopPropagation()
  txtCard.classList.remove("drag-over")
  const files = Array.from(e.dataTransfer.files || []).filter(f => f.type === "application/pdf" || f.name.endsWith(".pdf"))
  if (files.length === 0) return
  const dt = new DataTransfer()
  dt.items.add(files[0])
  txtFileInput.files = dt.files
  txtFileInput.dispatchEvent(new Event("change"))
})

// ===== Compress PDF =====
const cmpFileInput = document.getElementById("cmpFile")
const cmpOptsWrap = document.getElementById("cmpOptsWrap")
const cmpModeSelect = document.getElementById("cmpMode")
const cmpQualityField = document.getElementById("cmpQualityField")
const cmpQualityInput = document.getElementById("cmpQuality")
const cmpQualityVal = document.getElementById("cmpQualityVal")
const cmpInfo = document.getElementById("cmpInfo")
const cmpBtn = document.getElementById("cmpBtn")
const cmpStatus = document.getElementById("cmpStatus")
const clearCmp = document.getElementById("clearCmp")
const cmpCard = document.getElementById("cmpCard")
let cmpFileRef = null

cmpModeSelect.addEventListener("change", () => {
  cmpQualityField.classList.toggle("hidden", cmpModeSelect.value !== "strong")
})
cmpQualityInput.addEventListener("input", () => {
  cmpQualityVal.textContent = cmpQualityInput.value
})
cmpFileInput.addEventListener("change", (e) => {
  cmpFileRef = e.target.files && e.target.files[0] ? e.target.files[0] : null
  setStatus(cmpStatus, "")
  if (cmpFileRef) clearCmp.classList.remove("hidden")
  else clearCmp.classList.add("hidden")
  cmpOptsWrap.classList.toggle("hidden", !cmpFileRef)
  if (cmpFileRef) cmpInfo.textContent = "Original size: " + formatSize(cmpFileRef.size)
})
clearCmp.addEventListener("click", (e) => {
  e.preventDefault()
  cmpFileInput.value = ""
  cmpFileRef = null
  clearCmp.classList.add("hidden")
  cmpOptsWrap.classList.add("hidden")
  setStatus(cmpStatus, "")
})

async function recompressImages(doc, quality) {
  const scale = quality <= 40 ? 0.7 : quality <= 70 ? 0.85 : 1
  let changed = 0
  const seen = new Set()
  for (const page of doc.getPages()) {
    const resRef = page.node.get(PDFLib.PDFName.of("Resources"))
    const res = resRef instanceof PDFLib.PDFRef ? doc.context.lookup(resRef) : resRef
    if (!res || !res.get) continue
    const xoRef = res.get(PDFLib.PDFName.of("XObject"))
    const xo = xoRef instanceof PDFLib.PDFRef ? doc.context.lookup(xoRef) : xoRef
    if (!xo || !xo.entries) continue
    for (const [, ref] of xo.entries()) {
      const key = ref instanceof PDFLib.PDFRef ? ref.toString() : null
      if (key) {
        if (seen.has(key)) continue
        seen.add(key)
      }
      const st = ref instanceof PDFLib.PDFRef ? doc.context.lookup(ref) : ref
      if (!st || !st.dict || !st.contents) continue
      const d = st.dict
      if (d.get(PDFLib.PDFName.of("Subtype")) !== PDFLib.PDFName.of("Image")) continue
      const filt = d.get(PDFLib.PDFName.of("Filter"))
      const isDct = filt === PDFLib.PDFName.of("DCTDecode") ||
        (filt instanceof PDFLib.PDFArray && filt.size() === 1 && filt.get(0) === PDFLib.PDFName.of("DCTDecode"))
      if (!isDct) continue
      if (d.get(PDFLib.PDFName.of("SMask"))) continue
      const cs = d.get(PDFLib.PDFName.of("ColorSpace"))
      if (cs !== PDFLib.PDFName.of("DeviceRGB") && cs !== PDFLib.PDFName.of("DeviceGray")) continue
      const bpc = d.get(PDFLib.PDFName.of("BitsPerComponent"))
      if (bpc && Number(String(bpc)) !== 8) continue
      const w = Number(String(d.get(PDFLib.PDFName.of("Width"))))
      const h = Number(String(d.get(PDFLib.PDFName.of("Height"))))
      if (!w || !h) continue
      try {
        const bmp = await createImageBitmap(new Blob([st.contents], { type: "image/jpeg" }))
        const nw = Math.max(1, Math.round(w * scale))
        const nh = Math.max(1, Math.round(h * scale))
        const cv = document.createElement("canvas")
        cv.width = nw
        cv.height = nh
        const cx = cv.getContext("2d")
        cx.fillStyle = "#fff"
        cx.fillRect(0, 0, nw, nh)
        cx.drawImage(bmp, 0, 0, nw, nh)
        bmp.close()
        const blob = await new Promise(r => cv.toBlob(r, "image/jpeg", quality / 100))
        if (!blob) continue
        const buf = new Uint8Array(await blob.arrayBuffer())
        if (buf.length >= st.contents.length) continue
        st.contents = buf
        d.set(PDFLib.PDFName.of("Width"), PDFLib.PDFNumber.of(nw))
        d.set(PDFLib.PDFName.of("Height"), PDFLib.PDFNumber.of(nh))
        changed++
      } catch (_) { /* unsupported image variant — leave untouched */ }
    }
  }
  return changed
}

cmpBtn.addEventListener("click", async () => {
  if (!cmpFileRef) {
    setStatus(cmpStatus, "Please select a PDF.", "error")
    track("cmp_missing_file")
    return
  }
  if (cmpFileRef.size > MAX_FILE_SIZE) {
    setStatus(cmpStatus, "File is too large (max 100 MB).", "error")
    return
  }
  const mode = cmpModeSelect.value
  setBusy(cmpBtn, true, "Compress PDF", "Processing...")
  setStatus(cmpStatus, "")
  try {
    track("cmp_start", { mode })
    const buffer = new Uint8Array(await cmpFileRef.arrayBuffer())
    if (looksEncrypted(buffer)) {
      setStatus(cmpStatus, ENCRYPTED_HINT, "error")
      return
    }
    const base = cmpFileRef.name.replace(/\.pdf$/i, "")
    const qArgs = ["--recompress-flate", "--compression-level=9", "--object-streams=generate", "--stream-data=compress", "--", "in.pdf", "out.pdf"]
    let payload = buffer
    let reencoded = 0
    if (mode === "strong") {
      setStatus(cmpStatus, "Re-encoding images…")
      const doc = await PDFLib.PDFDocument.load(buffer)
      reencoded = await recompressImages(doc, parseInt(cmpQualityInput.value, 10) || 60)
      payload = new Uint8Array(await doc.save())
    }
    setStatus(cmpStatus, mode === "strong" ? "Optimizing structure…" : "Compressing (loading engine on first use)…")
    const { rc, out } = await runQpdf(qArgs, payload)
    const finalBytes = (rc === 0 && out) ? out : payload
    if (finalBytes.length >= buffer.length) {
      setStatus(cmpStatus, "This PDF is already well optimized — no savings possible" + (mode === "lossless" ? " without quality loss." : " at these settings."), "success")
      track("cmp_nogain", { mode })
      return
    }
    downloadBytes(finalBytes, base + "_compressed.pdf")
    const pct = Math.round((1 - finalBytes.length / buffer.length) * 100)
    setStatus(cmpStatus, "Done. " + formatSize(buffer.length) + " → " + formatSize(finalBytes.length) + " (−" + pct + "%)" + (reencoded ? ", " + reencoded + " image(s) re-encoded." : "."), "success")
    track("cmp_success", { mode, before: buffer.length, after: finalBytes.length, reencoded })
  } catch (err) {
    console.error("compress error:", err)
    setStatus(cmpStatus, encryptedMsg(err) ? ENCRYPTED_HINT : "Failed to process file.", "error")
    track("cmp_error")
  } finally {
    setBusy(cmpBtn, false, "Compress PDF", "Processing...")
  }
})
cmpCard.addEventListener("dragover", (e) => handleDragOver(cmpCard, e))
cmpCard.addEventListener("dragenter", (e) => handleDragOver(cmpCard, e))
cmpCard.addEventListener("dragleave", (e) => handleDragLeave(cmpCard, e))
cmpCard.addEventListener("drop", (e) => {
  e.preventDefault()
  e.stopPropagation()
  cmpCard.classList.remove("drag-over")
  const files = Array.from(e.dataTransfer.files || []).filter(f => f.type === "application/pdf" || f.name.endsWith(".pdf"))
  if (files.length === 0) return
  const dt = new DataTransfer()
  dt.items.add(files[0])
  cmpFileInput.files = dt.files
  cmpFileInput.dispatchEvent(new Event("change"))
})

// ===== Fill & Flatten Forms =====
const formFileInput = document.getElementById("formFile")
const formWrap = document.getElementById("formWrap")
const formInfo = document.getElementById("formInfo")
const formFields = document.getElementById("formFields")
const formFlatten = document.getElementById("formFlatten")
const formBtn = document.getElementById("formBtn")
const formStatus = document.getElementById("formStatus")
const clearForm = document.getElementById("clearForm")
const formCard = document.getElementById("formCard")
let formFileRef = null
let formEntries = []

function prettyFieldName(n) {
  const seg = n.split(/[.[\]]/).filter(Boolean).pop() || n
  return seg.replace(/[_-]+/g, " ")
}
function buildFormUI(fields) {
  formFields.innerHTML = ""
  formEntries = []
  for (const f of fields) {
    const name = f.getName()
    const wrap = document.createElement("div")
    wrap.className = "field"
    const label = document.createElement("label")
    label.title = name
    let el = null
    let kind = null
    if (f instanceof PDFLib.PDFTextField) {
      kind = "text"
      if (f.isMultiline()) { el = document.createElement("textarea"); el.rows = 2 }
      else { el = document.createElement("input"); el.type = "text" }
      el.value = f.getText() || ""
    } else if (f instanceof PDFLib.PDFCheckBox) {
      kind = "check"
      el = document.createElement("input")
      el.type = "checkbox"
      el.checked = f.isChecked()
    } else if (f instanceof PDFLib.PDFDropdown) {
      kind = "dropdown"
      el = document.createElement("select")
      for (const o of f.getOptions()) {
        const op = document.createElement("option")
        op.value = o
        op.textContent = o
        el.appendChild(op)
      }
      el.value = (f.getSelected() || [])[0] || ""
    } else if (f instanceof PDFLib.PDFOptionList) {
      kind = "list"
      el = document.createElement("select")
      el.multiple = true
      el.size = 4
      for (const o of f.getOptions()) {
        const op = document.createElement("option")
        op.value = o
        op.textContent = o
        el.appendChild(op)
      }
      const sel = f.getSelected() || []
      for (const op of el.options) op.selected = sel.includes(op.value)
    } else if (f instanceof PDFLib.PDFRadioGroup) {
      kind = "radio"
      el = document.createElement("select")
      const none = document.createElement("option")
      none.value = ""
      none.textContent = "— not selected —"
      el.appendChild(none)
      for (const o of f.getOptions()) {
        const op = document.createElement("option")
        op.value = o
        op.textContent = o
        el.appendChild(op)
      }
      el.value = f.getSelected() || ""
    } else {
      continue
    }
    const typeHint = document.createElement("span")
    typeHint.className = "ff-type"
    typeHint.textContent = kind === "check" ? "" : kind
    if (kind === "check") {
      label.className = "check-label"
      label.appendChild(el)
      label.appendChild(document.createTextNode(" " + prettyFieldName(name)))
    } else {
      label.appendChild(document.createTextNode(prettyFieldName(name)))
      label.appendChild(typeHint)
      label.appendChild(el)
    }
    wrap.appendChild(label)
    formFields.appendChild(wrap)
    formEntries.push({ name, kind, el })
  }
  formInfo.textContent = formEntries.length ? formEntries.length + " fillable field(s)" : "No fillable form fields in this PDF."
}
async function loadForm() {
  formEntries = []
  if (!formFileRef) {
    formWrap.classList.add("hidden")
    return
  }
  try {
    const buffer = await formFileRef.arrayBuffer()
    const doc = await PDFLib.PDFDocument.load(buffer)
    buildFormUI(doc.getForm().getFields())
    formWrap.classList.remove("hidden")
  } catch (e) {
    formWrap.classList.add("hidden")
    setStatus(formStatus, encryptedMsg(e) ? ENCRYPTED_HINT : "Failed to load file.", "error")
  }
}
formFileInput.addEventListener("change", (e) => {
  formFileRef = e.target.files && e.target.files[0] ? e.target.files[0] : null
  setStatus(formStatus, "")
  if (formFileRef) clearForm.classList.remove("hidden")
  else clearForm.classList.add("hidden")
  loadForm()
})
clearForm.addEventListener("click", (e) => {
  e.preventDefault()
  formFileInput.value = ""
  formFileRef = null
  clearForm.classList.add("hidden")
  setStatus(formStatus, "")
  loadForm()
})
formBtn.addEventListener("click", async () => {
  if (!formFileRef) {
    setStatus(formStatus, "Please select a PDF.", "error")
    track("form_missing_file")
    return
  }
  if (!formEntries.length) {
    setStatus(formStatus, "This PDF has no fillable form fields.", "error")
    return
  }
  if (formFileRef.size > MAX_FILE_SIZE) {
    setStatus(formStatus, "File is too large (max 100 MB).", "error")
    return
  }
  setBusy(formBtn, true, "Save PDF", "Processing...")
  setStatus(formStatus, "")
  try {
    track("form_start", { fields: formEntries.length, flatten: formFlatten.checked })
    const buffer = await formFileRef.arrayBuffer()
    const doc = await PDFLib.PDFDocument.load(buffer)
    const form = doc.getForm()
    const byName = new Map(form.getFields().map(f => [f.getName(), f]))
    for (const en of formEntries) {
      const f = byName.get(en.name)
      if (!f) continue
      if (en.kind === "text") f.setText(en.el.value)
      else if (en.kind === "check") { if (en.el.checked) f.check(); else f.uncheck() }
      else if (en.kind === "dropdown") { if (en.el.value) f.select(en.el.value) }
      else if (en.kind === "list") f.select(...Array.from(en.el.selectedOptions).map(o => o.value))
      else if (en.kind === "radio") { if (en.el.value) f.select(en.el.value) }
    }
    const font = await doc.embedFont(PDFLib.StandardFonts.Helvetica)
    try {
      form.updateFieldAppearances(font)
    } catch (_) {
      setStatus(formStatus, "Some field text uses characters the built-in font cannot render. Please use Latin characters.", "error")
      return
    }
    if (formFlatten.checked) form.flatten()
    const bytes = await doc.save()
    const base = formFileRef.name.replace(/\.pdf$/i, "")
    downloadBytes(bytes, base + "_filled.pdf")
    setStatus(formStatus, "Done. " + formEntries.length + " field(s) saved" + (formFlatten.checked ? " and flattened." : " (still editable)."), "success")
    track("form_success", { flatten: formFlatten.checked })
  } catch (err) {
    console.error("form error:", err)
    setStatus(formStatus, encryptedMsg(err) ? ENCRYPTED_HINT : "Failed to process file.", "error")
    track("form_error")
  } finally {
    setBusy(formBtn, false, "Save PDF", "Processing...")
  }
})
formCard.addEventListener("dragover", (e) => handleDragOver(formCard, e))
formCard.addEventListener("dragenter", (e) => handleDragOver(formCard, e))
formCard.addEventListener("dragleave", (e) => handleDragLeave(formCard, e))
formCard.addEventListener("drop", (e) => {
  e.preventDefault()
  e.stopPropagation()
  formCard.classList.remove("drag-over")
  const files = Array.from(e.dataTransfer.files || []).filter(f => f.type === "application/pdf" || f.name.endsWith(".pdf"))
  if (files.length === 0) return
  const dt = new DataTransfer()
  dt.items.add(files[0])
  formFileInput.files = dt.files
  formFileInput.dispatchEvent(new Event("change"))
})

