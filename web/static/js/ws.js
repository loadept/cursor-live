/**
 * @param {(message: string) => void} showNotification
 * @param {Record<string, { x: number, y: number, color: string, label: string, lastSeen: number, targetX: number, targetY: number }>} remoteCursors
 * @returns {WebSocket}
 */
export const connectWS = (showNotification, remoteCursors) => {
  const ws = new WebSocket("/ws")

  ws.onopen = () => console.info("connected to ws server")

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data)
    if (data.type === "disconnected") {
      delete remoteCursors[data.conn_id]
      showNotification("A user has disconnected")
      return null
    }

    const id = data.conn_id
    const payload = data.payload

    if (!remoteCursors[id]) {
      remoteCursors[id] = {
        x: payload.x,
        y: payload.y,
        targetX: payload.x,
        targetY: payload.y,
        label: payload.label,
        color: payload.color,
        lastSeen: Date.now(),
      }
    } else {
      remoteCursors[id].targetX = payload.x
      remoteCursors[id].targetY = payload.y
      remoteCursors[id].label = payload.label
      remoteCursors[id].color = payload.color
      remoteCursors[id].lastSeen = Date.now()
    }
  }

  ws.onclose = () => {
    console.error("ws connection closed, retrying...")
    Object.keys(remoteCursors).forEach(key => delete remoteCursors[key])
    setTimeout(() => connectWS(showNotification, remoteCursors), 3000)
  }

  ws.onerror = (error) => console.error("ws error:", error)

  return ws
}
