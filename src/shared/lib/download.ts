/** Hands the browser a file to save, without a server round trip. */
export function downloadText(filename: string, text: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Revoking immediately can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** "life-assistant-2026-10-16.json" — sortable, and unique per day. */
export function stampedName(prefix: string, extension: string, at = new Date()): string {
  const date = at.toISOString().slice(0, 10)
  return `${prefix}-${date}.${extension}`
}
