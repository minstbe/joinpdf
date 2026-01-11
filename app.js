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
let splitFileRef = null
let mergeItems = []
let draggingIndex = null
const API_BASE = (location.hostname === "localhost" || location.hostname === "127.0.0.1") ? "http://localhost:5600" : ""
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
function setStatus(el, text) {
  el.textContent = text || ""
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
splitFileInput.addEventListener("change", e => {
  splitFileRef = e.target.files && e.target.files[0] ? e.target.files[0] : null
  setStatus(splitStatus, "")
})
splitBtn.addEventListener("click", async () => {
  if (!splitFileRef) {
    setStatus(splitStatus, "Please select a PDF.")
    track("split_missing_file")
    return
  }
  setBusy(splitBtn, true, "Extract Pages", "Processing...")
  setStatus(splitStatus, "")
  try {
    track("split_start")
    const buffer = await splitFileRef.arrayBuffer()
    const src = await PDFLib.PDFDocument.load(buffer)
    const total = src.getPageCount()
    const indices = parsePages(pageSpecInput.value || "", total)
    if (!indices || indices.length === 0) {
      setStatus(splitStatus, "Invalid page specification.")
      setBusy(splitBtn, false, "Extract Pages", "Processing...")
      track("split_invalid_pages")
      return
    }
    const out = await PDFLib.PDFDocument.create()
    const pages = await out.copyPages(src, indices)
    for (const p of pages) out.addPage(p)
    const bytes = await out.save()
    const base = splitFileRef.name.replace(/\.pdf$/i, "")
    const custom = ensurePdfName(splitNameInput.value)
    const finalName = custom || base + "_split.pdf"
    downloadBytes(bytes, finalName)
    setStatus(splitStatus, "Done.")
    track("split_success", { pages: indices.length })
  } catch (err) {
    setStatus(splitStatus, "Failed to process file.")
    track("split_error")
  } finally {
    setBusy(splitBtn, false, "Extract Pages", "Processing...")
  }
})
mergeFilesInput.addEventListener("change", e => {
  const files = Array.from(e.target.files || [])
  for (const f of files) {
    mergeItems.push({ id: genId(), file: f, name: f.name })
  }
  renderList()
  setStatus(mergeStatus, "")
  track("merge_files_selected", { count: files.length })
})
clearListBtn.addEventListener("click", () => {
  mergeItems = []
  renderList()
  setStatus(mergeStatus, "")
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
    const name = document.createElement("div")
    name.className = "filename"
    name.textContent = item.name
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
    li.appendChild(name)
    li.appendChild(up)
    li.appendChild(down)
    li.appendChild(remove)
    li.addEventListener("dragstart", () => {
      draggingIndex = parseInt(li.dataset.index, 10)
      li.classList.add("dragging")
    })
    li.addEventListener("dragend", () => {
      draggingIndex = null
      li.classList.remove("dragging")
      renderList()
    })
    li.addEventListener("dragover", e => {
      e.preventDefault()
      const targetIndex = parseInt(li.dataset.index, 10)
      if (draggingIndex === null || draggingIndex === targetIndex) return
      const a = mergeItems[draggingIndex]
      mergeItems.splice(draggingIndex, 1)
      mergeItems.splice(targetIndex, 0, a)
      draggingIndex = targetIndex
      renderList()
    })
    fileListEl.appendChild(li)
  }
}
mergeBtn.addEventListener("click", async () => {
  if (mergeItems.length === 0) {
    setStatus(mergeStatus, "Please add PDF files.")
    track("merge_missing_files")
    return
  }
  setBusy(mergeBtn, true, "Merge Files", "Processing...")
  setStatus(mergeStatus, "")
  try {
    track("merge_start", { count: mergeItems.length })
    const out = await PDFLib.PDFDocument.create()
    for (const item of mergeItems) {
      const buffer = await item.file.arrayBuffer()
      const src = await PDFLib.PDFDocument.load(buffer)
      const count = src.getPageCount()
      const indices = Array.from({ length: count }, (_, i) => i)
      const pages = await out.copyPages(src, indices)
      for (const p of pages) out.addPage(p)
    }
    const bytes = await out.save()
    const custom = ensurePdfName(mergeNameInput.value)
    downloadBytes(bytes, custom || "merged.pdf")
    setStatus(mergeStatus, "Done.")
    track("merge_success", { count: mergeItems.length })
  } catch (err) {
    setStatus(mergeStatus, "Failed to process files.")
    track("merge_error")
  } finally {
    setBusy(mergeBtn, false, "Merge Files", "Processing...")
  }
})
async function fetchMessages() {
  try {
    const res = await fetch(`${API_BASE}/api/messages`)
    if (!res.ok) throw new Error()
    const data = await res.json()
    renderMessages(data)
    track("feedback_messages_loaded", { count: Array.isArray(data) ? data.length : 0 })
  } catch (e) {
    setStatus(feedbackStatus, "Failed to load messages.")
    track("feedback_messages_error")
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
    setStatus(feedbackStatus, "Please enter your suggestion.")
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
    setStatus(feedbackStatus, "Submitted.")
    await fetchMessages()
    track("feedback_submit_success")
  } catch (e) {
    setStatus(feedbackStatus, "Failed to submit.")
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
