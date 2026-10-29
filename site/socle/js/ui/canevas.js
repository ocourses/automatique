// Ajuste un canevas à sa taille affichée et à la densité de pixels de l'écran,
// puis l'efface. Renvoie son rectangle, ou null s'il est masqué (taille nulle).

export function ajusteCanevas(canvas, ctx) {
  const rect = canvas.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return null;
  const dpr = window.devicePixelRatio || 1;
  const w = Math.round(rect.width * dpr);
  const h = Math.round(rect.height * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);
  return rect;
}
