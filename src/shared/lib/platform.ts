/** True when the page runs as an installed PWA rather than a browser tab. */
export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari predates display-mode and exposes this instead.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function isIOS(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPadOS reports as a Mac, so fall back to touch support.
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}
