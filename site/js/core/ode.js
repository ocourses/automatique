// Intégrateurs à pas fixe pour ẋ = F(t, x), x étant un tableau de nombres.

function combine(x, a, k) {
  return x.map((xi, i) => xi + a * k[i]);
}

// Un pas de Runge-Kutta d'ordre 4.
export function rk4(F, t, x, h) {
  const k1 = F(t, x);
  const k2 = F(t + h / 2, combine(x, h / 2, k1));
  const k3 = F(t + h / 2, combine(x, h / 2, k2));
  const k4 = F(t + h, combine(x, h, k3));
  return x.map((xi, i) => xi + (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
}

// Un pas d'Euler explicite.
export function euler(F, t, x, h) {
  return combine(x, h, F(t, x));
}

// Intègre de t0 à t1 par pas h (le dernier pas est raccourci si besoin).
export function integre(pas, F, t0, x0, t1, h) {
  let t = t0;
  let x = x0.slice();
  while (t < t1 - 1e-12) {
    const hk = Math.min(h, t1 - t);
    x = pas(F, t, x, hk);
    t += hk;
  }
  return x;
}
