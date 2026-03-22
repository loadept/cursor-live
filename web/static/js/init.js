import { connectWS } from "./ws.js"
import { draw, resizeCanvas } from "./draw.js"

/** @type {{ bgColor: string }} */
const state = {
  bgColor: getComputedStyle(document.documentElement).getPropertyValue("--background").trim() || "#f8f7f4"
}
/** @type {{ x: number, y: number, color: string, label: string }} */
const localCursor = { x: 0, y: 0, color: "#000", label: "" }
/** @type {Record<string, { x: number, y: number, color: string, label: string, lastSeen: number, targetX: number, targetY: number }>} */
const remoteCursors = {}

/** @type {HTMLInputElement} */
const label = document.getElementById("label")
/** @type {HTMLInputElement} */
const color = document.getElementById("color")

/** @type {HTMLCanvasElement} */
const canvas = document.getElementById("draw-area")
const ctx = canvas.getContext("2d")

document.getElementById("theme-toggle").addEventListener("click", () => {
  document.documentElement.classList.toggle("dark")
  state.bgColor = getComputedStyle(document.documentElement).getPropertyValue("--background").trim() || "#f8f7f4"
})

document.getElementById("start-btn").addEventListener("click", () => {
  /** @type {HTMLInputElement} */
  const input = document.getElementById("welcome-input")
  localCursor.label = input.value.trim() || "anonymous"

  label.value = localCursor.label
  document.getElementById("modal").classList.add("hidden")
  input.value = ""
})

document.getElementById("welcome-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    document.getElementById("start-btn").click()
  }
})

resizeCanvas(canvas)
window.addEventListener("resize", () => resizeCanvas(canvas))
draw(canvas, ctx, remoteCursors, localCursor, state)

/**
 * @param {string} message
 */
const showNotification = (message) => {
  /** @type {HTMLDivElement} */
  const notifications = document.getElementById("notifications")
  const notif = document.createElement("div")
  notif.className = "p-5 border border-border bg-background text-md animate-fade-in"
  notif.innerHTML = `<span class="inline-block w-1.5 h-1.5 bg-accent mr-2"></span>${message}`
  notifications.appendChild(notif)

  setTimeout(() => {
    notif.classList.add("animate-fade-out")
    setTimeout(() => notif.remove(), 200)
  }, 5000)
}

label.addEventListener("change", () => {
  localCursor.label = label.value.substring(0, 50)
})

const ws = connectWS(showNotification, remoteCursors)

let lastSend = 0
const interval = 100
canvas.addEventListener("mousemove", (e) => {
  const x = e.offsetX
  const y = e.offsetY
  // const rect = canvas.getBoundingClientRect()
  // const x = Math.round(e.clientX - rect.left)
  // const y = Math.round(e.clientY - rect.top)

  localCursor.x = x
  localCursor.y = y
  localCursor.color = color.value

  const data = {
    payload: {
      label: localCursor.label,
      timestamp: new Date().toISOString(),
      color: localCursor.color,
      x,
      y,
    }
  }

  const now = Date.now()
  if (now - lastSend > interval) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data))
    }
    lastSend = now
  }
})
