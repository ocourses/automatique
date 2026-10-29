// Faux stockage local (localStorage) : une Map derrière getItem et setItem.

export const fauxStockage = () => {
  const donnees = new Map();
  return { donnees, getItem: (k) => donnees.get(k) ?? null, setItem: (k, v) => donnees.set(k, v) };
};
