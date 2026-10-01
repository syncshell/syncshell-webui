export function identiconRects(id = '') {
  const value = id.replace(/[\W_]/g, '');
  const rects = [];
  if (!value) return rects;
  for (let row = 0; row < 5; row++) {
    for (let col = 2; col >= 0; col--) {
      if (!(value.charCodeAt(row + col * 5) % 2)) {
        rects.push([col, row]);
        if (col !== 2) rects.push([4 - col, row]);
      }
    }
  }
  return rects;
}
