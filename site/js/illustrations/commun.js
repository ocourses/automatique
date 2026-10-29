// Briques du socle (socle/js/briques/), plus ce qui n'appartient qu'à ce cours.

export * from '../../socle/js/briques/commun.js';
import { rk4 } from '../../socle/js/core/ode.js';

// Trajectoire de ẋ = F(t, x) sur [0, T] par RK4 de pas h : { t, x } où x[k]
// est l'état à t[k]. L'intégration s'arrête si l'état dépasse `borne`.
export function simule(F, x0, T, h = 0.01, borne = 1e6) {
  const t = [0];
  const x = [x0.slice()];
  let xk = x0.slice();
  const n = Math.round(T / h);
  for (let k = 1; k <= n; k++) {
    xk = rk4(F, (k - 1) * h, xk, h);
    if (!xk.every((v) => Number.isFinite(v) && Math.abs(v) < borne)) break;
    t.push(k * h);
    x.push(xk);
  }
  return { t, x };
}
