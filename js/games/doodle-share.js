// Pure helper: can this browser share a PNG file, or should we fall back to saving it?

/** @returns {'share' | 'download'} */
export function shareMethod(nav, file) {
  try {
    if (!nav || typeof nav.share !== 'function' || typeof nav.canShare !== 'function') return 'download';
    return nav.canShare({ files: [file] }) ? 'share' : 'download';
  } catch {
    return 'download';
  }
}
