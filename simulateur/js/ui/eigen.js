// Plan complexe : valeurs propres de A et de A + BK, demi-plan Re < 0 grisé.

import { couleurs } from './theme.js';

function pasGraduation(R) {
  const brut = R / 3;
  const p = 10 ** Math.floor(Math.log10(brut));
  return [1, 2, 5, 10].map((k) => k * p).find((v) => v >= brut);
}

export function dessinePlan(canvas, vpA, vpABK) {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  const ctx = canvas.getContext('2d');
  const col = couleurs();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const W = rect.width;
  const H = rect.height;

  const module = Math.max(1, ...[...vpA, ...vpABK].map((z) => Math.max(Math.abs(z.re), Math.abs(z.im))));
  const R = 1.25 * module;
  const s = Math.min(W, H) / (2 * R);
  const X = (re) => W / 2 + re * s;
  const Y = (im) => H / 2 - im * s;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = col.zone;
  ctx.fillRect(0, 0, W / 2, H);

  // Grille et axes.
  const pas = pasGraduation(R);
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillStyle = col.discret;
  ctx.strokeStyle = col.grille;
  ctx.lineWidth = 1;
  const nMax = Math.ceil(Math.max(W, H) / (2 * s * pas));
  for (let k = -nMax; k <= nMax; k++) {
    if (k === 0) continue;
    const v = k * pas;
    ctx.beginPath();
    ctx.moveTo(X(v), 0);
    ctx.lineTo(X(v), H);
    ctx.moveTo(0, Y(v));
    ctx.lineTo(W, Y(v));
    ctx.stroke();
    const t = String(Number(v.toPrecision(3))).replace('.', ',').replace('-', '−');
    ctx.textAlign = 'center';
    ctx.fillText(t, X(v), H / 2 + 14);
    ctx.textAlign = 'left';
    ctx.fillText(t, W / 2 + 4, Y(v) + 4);
  }
  ctx.strokeStyle = col.discret;
  ctx.beginPath();
  ctx.moveTo(0, H / 2);
  ctx.lineTo(W, H / 2);
  ctx.moveTo(W / 2, 0);
  ctx.lineTo(W / 2, H);
  ctx.stroke();
  ctx.textAlign = 'right';
  ctx.fillText('Re', W - 4, H / 2 - 6);
  ctx.textAlign = 'left';
  ctx.fillText('Im', W / 2 + 6, 12);

  // Valeurs propres de A : cercles creux ; de A + BK : croix pleines.
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = col.discret;
  for (const z of vpA) {
    ctx.beginPath();
    ctx.arc(X(z.re), Y(z.im), 6, 0, 2 * Math.PI);
    ctx.stroke();
  }
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = col.accent;
  for (const z of vpABK) {
    const x = X(z.re);
    const y = Y(z.im);
    ctx.beginPath();
    ctx.moveTo(x - 6, y - 6);
    ctx.lineTo(x + 6, y + 6);
    ctx.moveTo(x - 6, y + 6);
    ctx.lineTo(x + 6, y - 6);
    ctx.stroke();
  }
}
