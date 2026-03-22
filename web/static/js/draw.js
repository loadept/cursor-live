const getCursorLabelColor = () => {
  return document.documentElement.classList.contains("dark") ? "rgba(171, 178, 191, 0.8)" : "rgba(0, 0, 0, 0.6)"
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {string} label
 * @param {string} color
 */
const drawCursor = (ctx, x, y, label, color) => {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x, y, 10, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = getCursorLabelColor()
  ctx.font = "13px firacode"
  ctx.textAlign = "center"
  ctx.fillText(label, x, y - 15)
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {CanvasRenderingContext2D} ctx
 * @param {Record<string, { x: number, y: number, color: string, label: string, lastSeen: number, targetX: number, targetY: number }>} remoteCursors
 * @param {{ x: number, y: number, color: string, label: string }} localCursor
 * @param {{ bgColor: string }} state
 */
export const draw = (canvas, ctx, remoteCursors, localCursor, state) => {
  ctx.fillStyle = state.bgColor
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const now = Date.now()
  for (let id in remoteCursors) {
    let c = remoteCursors[id]

    if (now - c.lastSeen > 30000) {
      delete remoteCursors[id]
      continue
    }

    c.x += (c.targetX - c.x) * 0.15
    c.y += (c.targetY - c.y) * 0.15
    drawCursor(ctx, c.x, c.y, c.label, c.color)
  }

  drawCursor(ctx, localCursor.x, localCursor.y, `${localCursor.label} (me)`, localCursor.color)
  requestAnimationFrame(() => draw(canvas, ctx, remoteCursors, localCursor, state))
}

/**
 * @param {HTMLCanvasElement} canvas
 */
export const resizeCanvas = (canvas) => {
  const container = canvas.parentElement
  canvas.width = container.clientWidth
  canvas.height = container.clientHeight
}

