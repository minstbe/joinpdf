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
const feedbackOpen = document.getElementById("feedbackOpen")
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
let splitFileRef = null
let mergeItems = []
let draggingIndex = null
let splitPages = []
let selectedIndices = []
let selDragIdx = null
let annotations = {}
let currentTool = "pointer"
let isDrawing = false
let currentStroke = null
let drawingPageIdx = null
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
feedbackOpen && feedbackOpen.addEventListener("click", openFeedback)
feedbackClose && feedbackClose.addEventListener("click", closeFeedback)
window.addEventListener("keydown", e => {
  if (e.key === "Escape") closeFeedback()
})
feedbackModal && feedbackModal.addEventListener("click", e => {
  if (e.target === feedbackModal) closeFeedback()
})
async function renderThumbnails(file) {
  thumbnailGrid.innerHTML = "<div style='text-align:center;padding:20px;color:var(--muted)'>Loading page thumbnails…</div>"
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

function syncThumbnailAnnotation(pageIdx) {
  const item = thumbnailGrid.querySelector(`.thumb-item[data-page="${pageIdx}"]`)
  if (!item) return
  const thumbCanvas = item.querySelector("canvas.thumb-canvas, canvas")
  if (!thumbCanvas) return
  let dl = item.querySelector(".anno-overlay")
  if (!dl) {
    dl = document.createElement("canvas")
    dl.className = "anno-overlay"
    dl.width = thumbCanvas.width
    dl.height = thumbCanvas.height
    dl.style.cssText = "position:absolute;top:0;left:0;width:" + thumbCanvas.width + "px;height:" + thumbCanvas.height + "px;pointer-events:none;"
    item.style.position = "relative"
    const label = item.querySelector(".thumb-label")
    if (label) {
      item.insertBefore(dl, label)
    } else {
      item.appendChild(dl)
    }
  }
  const ctx = dl.getContext("2d")
  ctx.clearRect(0, 0, dl.width, dl.height)
  const strokes = annotations[pageIdx] || []
  const scale = dl.width / 3
  for (const s of strokes) {
    ctx.strokeStyle = s.color
    ctx.globalAlpha = s.type === "highlighter" ? 0.45 : 1
    ctx.lineWidth = s.width / 3
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    if (s.points.length >= 2) {
      ctx.beginPath()
      ctx.moveTo(s.points[0].x / 3, s.points[0].y / 3)
      for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i].x / 3, s.points[i].y / 3)
      ctx.stroke()
    }
  }
  ctx.globalAlpha = 1
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
    fsDrawLayer.style.width = vp.width + "px"
    fsDrawLayer.style.height = vp.height + "px"
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
  const sx = fsDrawLayer.width / 3
  for (const s of strokes) {
    ctx.strokeStyle = s.color
    ctx.globalAlpha = s.type === "highlighter" ? 0.45 : 1
    ctx.lineWidth = s.width * sx / 3
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    if (s.points.length >= 2) {
      ctx.beginPath()
      ctx.moveTo(s.points[0].x * sx, s.points[0].y * sx)
      for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i].x * sx, s.points[i].y * sx)
      ctx.stroke()
    }
  }
  ctx.globalAlpha = 1
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

{ let startX, startY, drawStarted
  fsDrawLayer.addEventListener("pointerdown", (e) => {
    if (currentTool === "pointer") return
    e.preventDefault()
    fsDrawLayer.setPointerCapture(e.pointerId)
    startX = e.clientX; startY = e.clientY
    drawStarted = true
    if (!annotations[activePreviewPage]) annotations[activePreviewPage] = []
    const r = fsDrawLayer.getBoundingClientRect()
    const sx = fsDrawLayer.width / 3
    const p = { x: (e.clientX - r.left) / sx, y: (e.clientY - r.top) / sx }
    if (currentTool === "eraser") {
      const strokes = annotations[activePreviewPage]
      if (strokes) {
        for (let i = strokes.length - 1; i >= 0; i--) {
          for (const pt of strokes[i].points) {
            if (Math.hypot(pt.x - p.x, pt.y - p.y) < 20) {
              strokes.splice(i, 1)
              break
            }
          }
        }
      }
      redrawFS(activePreviewPage)
      syncThumbnailAnnotation(activePreviewPage)
    } else {
      currentStroke = { type: currentTool, color: currentTool === "highlighter" ? "#ffeb3b" : fsAnnoColor.value, points: [p], width: currentTool === "highlighter" ? 18 : 2 }
      annotations[activePreviewPage].push(currentStroke)
    }
  })
  fsDrawLayer.addEventListener("pointermove", (e) => {
    if (!drawStarted || currentTool === "pointer") return
    const r = fsDrawLayer.getBoundingClientRect()
    const sx = fsDrawLayer.width / 3
    const p = { x: (e.clientX - r.left) / sx, y: (e.clientY - r.top) / sx }
    if (currentTool === "eraser") {
      const strokes = annotations[activePreviewPage]
      if (strokes) {
        for (let i = strokes.length - 1; i >= 0; i--) {
          for (const pt of strokes[i].points) {
            if (Math.hypot(pt.x - p.x, pt.y - p.y) < 20) {
              strokes.splice(i, 1)
              break
            }
          }
        }
      }
      redrawFS(activePreviewPage)
      syncThumbnailAnnotation(activePreviewPage)
    } else if (currentStroke) {
      currentStroke.points.push(p)
      redrawFS(activePreviewPage)
    }
  })
  fsDrawLayer.addEventListener("pointerup", (e) => {
    fsDrawLayer.releasePointerCapture(e.pointerId)
    if (drawStarted && currentStroke && currentStroke.points.length <= 1) {
      annotations[activePreviewPage].pop()
      redrawFS(activePreviewPage)
    }
    if (drawStarted) syncThumbnailAnnotation(activePreviewPage)
    currentStroke = null; drawStarted = false
  })
  fsDrawLayer.addEventListener("pointerleave", () => {
    if (drawStarted) syncThumbnailAnnotation(activePreviewPage)
    currentStroke = null; drawStarted = false
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
fsClearPage.addEventListener("click", () => {
  if (activePreviewPage !== null) {
    delete annotations[activePreviewPage]
    redrawFS(activePreviewPage)
    syncThumbnailAnnotation(activePreviewPage)
  }
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

function attachDrawEvents(drawCanvas, pageIdx, item) {
  let startX = 0, startY = 0, drawStarted = false
  const getPos = (e) => {
    const r = item.getBoundingClientRect()
    const canvasW = drawCanvas.width
    const canvasH = drawCanvas.height
    const imgEl = item.querySelector("canvas:not(.draw-layer)")
    const imgR = imgEl ? imgEl.getBoundingClientRect() : r
    return { x: (e.clientX - imgR.left) * (canvasW / imgR.width), y: (e.clientY - imgR.top) * (canvasH / imgR.height) }
  }
  item.addEventListener("pointerdown", (e) => {
    if (e.target.classList.contains("remove-sel")) return
    startX = e.clientX
    startY = e.clientY
    drawStarted = false
    if (!annotations[pageIdx]) annotations[pageIdx] = []
  })
  item.addEventListener("pointermove", (e) => {
    if (Math.hypot(e.clientX - startX, e.clientY - startY) < 6) return
    if (!drawStarted) {
      drawStarted = true
      const p = getPos(e)
      currentStroke = { type: currentTool, color: currentTool === "highlighter" ? "#ffeb3b" : annoColor.value, points: [p], width: currentTool === "highlighter" ? 18 : 2 }
      annotations[pageIdx].push(currentStroke)
    }
    if (currentTool === "eraser") {
      const p = getPos(e)
      checkErase(pageIdx, p)
    } else if (currentStroke) {
      currentStroke.points.push(getPos(e))
    }
    redrawPage(pageIdx)
  })
  item.addEventListener("pointerup", () => {
    if (drawStarted && currentStroke && currentStroke.points.length === 1) {
      annotations[pageIdx].pop()
      redrawPage(pageIdx)
    }
    currentStroke = null
    drawStarted = false
  })
  item.addEventListener("pointerleave", () => {
    currentStroke = null
    drawStarted = false
  })
  item.addEventListener("click", (e) => {
    if (drawStarted || (e.target.classList && e.target.classList.contains("remove-sel"))) {
      e.stopPropagation()
      e.preventDefault()
    }
  }, true)
}

function checkErase(pageIdx, p) {
  const strokes = annotations[pageIdx]
  if (!strokes) return
  const r = 12
  for (let i = strokes.length - 1; i >= 0; i--) {
    for (const pt of strokes[i].points) {
      if (Math.hypot(pt.x - p.x, pt.y - p.y) < r) {
        strokes.splice(i, 1)
        return
      }
    }
  }
}

function redrawPage(pageIdx) {
  const item = thumbnailGrid.querySelector(`.thumb-item[data-page="${pageIdx}"]`)
  if (!item) return
  const drawCanvas = item.querySelector(".draw-layer")
  if (!drawCanvas) return
  const ctx = drawCanvas.getContext("2d")
  ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height)
  const strokes = annotations[pageIdx] || []
  for (const s of strokes) {
    if (s.type === "highlighter") {
      ctx.strokeStyle = s.color
      ctx.globalAlpha = 0.45
      ctx.lineWidth = s.width
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
    } else {
      ctx.strokeStyle = s.color
      ctx.globalAlpha = 1
      ctx.lineWidth = s.width
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
    }
    if (s.points.length < 2) {
      ctx.beginPath()
      ctx.arc(s.points[0].x, s.points[0].y, s.width / 2, 0, Math.PI * 2)
      ctx.fillStyle = ctx.strokeStyle
      ctx.fill()
      continue
    }
    ctx.beginPath()
    ctx.moveTo(s.points[0].x, s.points[0].y)
    for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i].x, s.points[i].y)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
}

function flattenAnnotations(pdfPage, pageIdx) {
  const strokes = annotations[pageIdx]
  if (!strokes || strokes.length === 0) return
  const scale = 0.4
  const pageW = pdfPage.getWidth()
  const pageH = pdfPage.getHeight()
  const thumbW = pageW * scale
  const thumbH = pageH * scale
  const sx = pageW / thumbW
  const sy = pageH / thumbH
  for (const s of strokes) {
    if (s.points.length < 2) continue
    const color = s.type === "highlighter" ? PDFLib.rgb(1, 0.92, 0.23) : hexToRgb(s.color)
    const pathData = pointsToSvgPath(s.points, sx, sy)
    pdfPage.drawSvgPath(pathData, {
      borderColor: color,
      borderWidth: s.width * sx,
      opacity: s.type === "highlighter" ? 0.45 : 1,
    })
  }
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  return PDFLib.rgb(r, g, b)
}

function pointsToSvgPath(points, sx, sy) {
  let d = `M ${points[0].x * sx} ${points[0].y * sy}`
  for (let i = 1; i < points.length; i++) d += ` L ${points[i].x * sx} ${points[i].y * sy}`
  return d
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
annoColor.addEventListener("input", () => {})
clearPageAnno.addEventListener("click", () => {
  if (activePreviewPage !== null) {
    delete annotations[activePreviewPage]
    redrawPreview(activePreviewPage)
  }
})
clearAllAnno.addEventListener("click", () => {
  annotations = {}
  if (activePreviewPage !== null) redrawPreview(activePreviewPage)
})
function getLastTouchedPage() {
  return activePreviewPage
}

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
  const sx = previewDrawLayer.width / (previewDrawLayer.width > 0 ? previewDrawLayer.width : 1)
  for (const s of strokes) {
    ctx.strokeStyle = s.color
    ctx.globalAlpha = s.type === "highlighter" ? 0.45 : 1
    ctx.lineWidth = s.width * 3
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    if (s.points.length >= 2) {
      ctx.beginPath()
      ctx.moveTo(s.points[0].x * 3, s.points[0].y * 3)
      for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i].x * 3, s.points[i].y * 3)
      ctx.stroke()
    }
  }
  ctx.globalAlpha = 1
}
closePreview.addEventListener("click", () => {
  previewArea.classList.add("hidden")
  previewPdfDoc = null
  activePreviewPage = null
})

{ let startX, startY, drawStarted
  previewDrawLayer.addEventListener("pointerdown", (e) => {
    if (activePreviewPage === null || currentTool === "pointer") return
    e.preventDefault()
    previewDrawLayer.setPointerCapture(e.pointerId)
    startX = e.clientX; startY = e.clientY
    drawStarted = true
    if (!annotations[activePreviewPage]) annotations[activePreviewPage] = []
    const r = previewDrawLayer.getBoundingClientRect()
    const p = { x: (e.clientX - r.left) / 3, y: (e.clientY - r.top) / 3 }
    if (currentTool === "eraser") {
      const strokes = annotations[activePreviewPage]
      if (strokes) {
        const r2 = 18
        for (let i = strokes.length - 1; i >= 0; i--) {
          for (const pt of strokes[i].points) {
            if (Math.hypot(pt.x - p.x, pt.y - p.y) < r2) {
              strokes.splice(i, 1)
              break
            }
          }
        }
      }
      redrawPreview(activePreviewPage)
    } else {
      currentStroke = { type: currentTool, color: currentTool === "highlighter" ? "#ffeb3b" : annoColor.value, points: [p], width: currentTool === "highlighter" ? 18 : 2 }
      annotations[activePreviewPage].push(currentStroke)
    }
  })
  previewDrawLayer.addEventListener("pointermove", (e) => {
    if (!drawStarted || currentTool === "pointer") return
    if (activePreviewPage === null) return
    const r = previewDrawLayer.getBoundingClientRect()
    const p = { x: (e.clientX - r.left) / 3, y: (e.clientY - r.top) / 3 }
    if (currentTool === "eraser") {
      const strokes = annotations[activePreviewPage]
      if (strokes) {
        const r2 = 18
        for (let i = strokes.length - 1; i >= 0; i--) {
          for (const pt of strokes[i].points) {
            if (Math.hypot(pt.x - p.x, pt.y - p.y) < r2) {
              strokes.splice(i, 1)
              break
            }
          }
        }
      }
      redrawPreview(activePreviewPage)
    } else if (currentStroke) {
      currentStroke.points.push(p)
      redrawPreview(activePreviewPage)
    }
  })
  previewDrawLayer.addEventListener("pointerup", (e) => {
    previewDrawLayer.releasePointerCapture(e.pointerId)
    if (drawStarted && currentStroke && currentStroke.points.length <= 1) {
      annotations[activePreviewPage].pop()
      redrawPreview(activePreviewPage)
    }
    if (drawStarted) syncThumbnailAnnotation(activePreviewPage)
    currentStroke = null; drawStarted = false
  })
  previewDrawLayer.addEventListener("pointerleave", () => {
    if (drawStarted) syncThumbnailAnnotation(activePreviewPage)
    currentStroke = null; drawStarted = false
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
      const p = pages[i]
      flattenAnnotations(p, indices[i])
      out.addPage(p)
    }
    const bytes = await out.save()
    const base = splitFileRef.name.replace(/\.pdf$/i, "")
    const custom = ensurePdfName(splitNameInput.value)
    const finalName = custom || base + "_split.pdf"
    downloadBytes(bytes, finalName)
    setStatus(splitStatus, "Done. " + indices.length + " pages extracted.", "success")
    track("split_success", { pages: indices.length })
  } catch (err) {
    setStatus(splitStatus, "Failed to process file.", "error")
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
    up.textContent = "▲"
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
    down.textContent = "▼"
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
    setStatus(mergeStatus, "Failed to process files.", "error")
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
