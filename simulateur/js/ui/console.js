// Console du bas de page : mesures en direct (nombres), analyse du bouclé
// (matrice, polynôme caractéristique, indications) et journal des événements.

import { polynomeCaracteristique } from '../core/linalg.js';
import { afficheIndications, nomBoucle } from './hints.js';
import { latexComplexe, latexMatrice, latexNombre, nombreCourt, polynomeLatex, texte } from './format.js';
import { rend } from './katex.js';

const MAX_LIGNES = 400;
const FUSION_MS = 900; // des réglages successifs d'un même curseur ne forment qu'une ligne

const $ = (id) => document.getElementById(id);

export class Console {
  constructor(modele, sim, { affichage }) {
    this.modele = modele;
    this.sim = sim;
    this.affichage = affichage;
    this.lignes = [];
    this.construitMesures();
    $('console-seuil').value = String(sim.seuil).replace('.', ',');
    $('console-seuil').addEventListener('change', () => {
      const v = Number($('console-seuil').value.replace(',', '.'));
      if (Number.isFinite(v) && v > 0) {
        sim.fixeSeuil(v);
        this.ecrit(`Seuil ε = ${texte(v)}`, { cle: 'seuil' });
      }
      $('console-seuil').value = String(sim.seuil).replace('.', ',');
    });
    $('journal-effacer').addEventListener('click', () => {
      $('journal').textContent = '';
      this.lignes = [];
    });
    const bouton = $('console-replier');
    const replie = (oui) => {
      $('console').classList.toggle('replie', oui);
      bouton.setAttribute('aria-expanded', String(!oui));
      bouton.textContent = oui ? 'Déplier' : 'Replier';
    };
    bouton.addEventListener('click', () => replie(!$('console').classList.contains('replie')));
    // Sur téléphone, la console est un tiroir (voir app.js) : le repli ne sert qu'au bureau.
    replie(false);
  }

  // ---- Journal --------------------------------------------------------------

  // Ajoute une ligne au journal. Avec `cle`, une ligne récente de même clé est
  // mise à jour plutôt que dupliquée (glissement d'un curseur).
  ecrit(message, { niveau = 'info', t = this.sim.t, cle = null } = {}) {
    const maintenant = performance.now();
    const dernier = this.lignes[this.lignes.length - 1];
    if (cle && dernier && dernier.cle === cle && maintenant - dernier.horloge < FUSION_MS) {
      dernier.t.textContent = this.formatTemps(t);
      dernier.msg.textContent = message;
      dernier.horloge = maintenant;
      return;
    }
    const el = document.createElement('div');
    el.className = `ligne ${niveau}`;
    const tEl = document.createElement('span');
    tEl.className = 'temps-ligne';
    tEl.textContent = this.formatTemps(t);
    const msg = document.createElement('span');
    msg.textContent = message;
    el.append(tEl, msg);
    this.ajoute({ el, t: tEl, msg, cle, horloge: maintenant });
  }

  // Séparation entre deux trajectoires.
  separateur(message) {
    const el = document.createElement('div');
    el.className = 'ligne sep';
    el.textContent = message;
    this.ajoute({ el, cle: null, horloge: 0 });
  }

  formatTemps(t) {
    return `t = ${t.toFixed(2).replace('.', ',')} s`;
  }

  ajoute(ligne) {
    const zone = $('journal');
    const enBas = zone.scrollHeight - zone.scrollTop - zone.clientHeight < 40;
    zone.appendChild(ligne.el);
    this.lignes.push(ligne);
    while (this.lignes.length > MAX_LIGNES) this.lignes.shift().el.remove();
    if (enBas) zone.scrollTop = zone.scrollHeight;
  }

  // ---- Mesures --------------------------------------------------------------

  // Une ligne par grandeur : valeur, valeur à l'équilibre, écart, et « ≈ 0 »
  // lorsque l'écart passe sous le seuil ε.
  construitMesures() {
    const { modele, sim } = this;
    const corps = $('mesures').querySelector('tbody');
    const corpsAgreg = $('mesures-agreg').querySelector('tbody');
    this.rangees = [];
    const ajoute = (nom, unite, valeur, { equilibre = null, zero = null, visible = () => true, agreg = false } = {}) => {
      const tr = document.createElement('tr');
      const colonnes = agreg ? ['nom', 'val', 'marque'] : ['nom', 'val', 'eq', 'ecart', 'marque'];
      const cellules = colonnes.map((classe) => {
        const td = document.createElement('td');
        td.className = classe;
        tr.appendChild(td);
        return td;
      });
      cellules[0].textContent = unite ? `${nom} (${unite})` : nom;
      (agreg ? corpsAgreg : corps).appendChild(tr);
      this.rangees.push({ tr, cellules, valeur, equilibre, zero, visible, agreg });
    };

    modele.etats.forEach((e, i) => ajoute(e.texte, e.unite, () => sim.x[i], { equilibre: () => sim.xe[i] }));
    if (sim.obs) {
      modele.etats.forEach((e, i) =>
        ajoute(`${e.texte} estimé`, e.unite, () => sim.xh[i], { equilibre: () => sim.xe[i] }),
      );
    }
    modele.commandes.forEach((c, i) => ajoute(c.texte, c.unite, () => sim.commande()[i], { equilibre: () => sim.ue[i] }));
    const c0 = modele.commandes[0];
    ajoute('d (perturbation)', c0.unite, () => sim.perturbationEn(sim.t)[0], {
      equilibre: () => 0,
      visible: () => sim.perturbation.type !== 'aucune',
    });
    const s = sim.sortie;
    ajoute('y mesurée', modele.etats[s].unite, () => sim.x[s] + sim.bruit[s], {
      equilibre: () => sim.xe[s],
      visible: () => !modele.sansSortie,
    });
    ajoute('‖x − x_e‖', '', () => sim.normeEcart(), { agreg: true, zero: (v) => v < sim.seuil });
    ajoute('‖x − x̂‖', '', () => sim.normeErreur(), {
      agreg: true,
      visible: () => Boolean(sim.obs),
      zero: (v) => v < sim.seuil,
    });
    ajoute('‖u − u_e‖', '', () => Math.hypot(...sim.commande().map((u, i) => u - sim.ue[i])), {
      agreg: true,
      zero: (v) => v < sim.seuil,
    });
    ajoute('V', '', () => modele.invariant?.(sim.x, sim.p, sim.K)?.valeur ?? NaN, {
      agreg: true,
      visible: () => sim.mode === 'gains' && Number.isFinite(modele.invariant?.(sim.x, sim.p, sim.K)?.valeur),
    });
    ajoute('‖x − x_fantôme‖', '', () => Math.hypot(...sim.x.map((v, i) => v - sim.xFantome[i])), {
      agreg: true,
      visible: () => this.affichage.fantome && sim.xFantome.every(Number.isFinite),
    });
  }

  // Rafraîchit les nombres (appelé quelques fois par seconde).
  actualiseMesures(enLecture) {
    const { sim } = this;
    for (const r of this.rangees) {
      const visible = r.visible();
      r.tr.hidden = !visible;
      if (!visible) continue;
      const v = r.valeur();
      const cVal = r.cellules[1];
      const cMarque = r.cellules[r.cellules.length - 1];
      cVal.textContent = nombreCourt(v);
      let zero = false;
      if (r.agreg) {
        if (r.zero) zero = r.zero(v);
      } else if (r.equilibre) {
        const [, , cEq, cEcart] = r.cellules;
        const e = r.equilibre();
        cEq.textContent = nombreCourt(e);
        cEcart.textContent = nombreCourt(v - e);
        zero = Math.abs(v - e) < sim.seuil;
      }
      cMarque.textContent = zero ? '≈ 0' : '';
      r.tr.classList.toggle('zero', zero);
    }
    // Ligne d'état, aussi recopiée dans l'en-tête de la console.
    let etat;
    let niveau;
    if (sim.diverge) {
      etat = 'divergence';
      niveau = 'alerte';
    } else if (sim.dansBoule) {
      etat = `stabilisé depuis t = ${nombreCourt(sim.entreeBoule)} s`;
      niveau = 'ok';
    } else {
      etat = 'en transition';
      niveau = 'info';
    }
    const norme = sim.normeEcart();
    $('console-t').textContent = `t = ${sim.t.toFixed(2).replace('.', ',')} s${enLecture ? '' : ' (pause)'}`;
    $('console-norme').textContent = `‖x − x_e‖ = ${nombreCourt(norme, 3)}`;
    const badge = $('console-badge');
    badge.textContent = etat;
    badge.className = `badge-etat ${niveau}`;
    // Résumé court de la barre du bas (téléphone), pour garder l'état sous les yeux.
    $('barre-norme').textContent = `‖x − x_e‖ = ${nombreCourt(norme, 3)}`;
    const court = $('barre-badge');
    court.textContent = sim.diverge ? 'divergence' : sim.dansBoule ? 'stabilisé' : 'en transition';
    court.className = `badge-etat ${niveau}`;
  }

  // ---- Analyse --------------------------------------------------------------

  // Matrice du bouclé, polynôme caractéristique, spectre et indications.
  analyse() {
    const { sim } = this;
    const J = nomBoucle(sim);
    const chi = polynomeCaracteristique(sim.Jbf);
    rend($('analyse-matrice'), `${J} = ${latexMatrice(sim.Jbf)}`);
    rend($('analyse-chi'), `\\chi(\\lambda) = ${polynomeLatex(chi)}`);
    const alpha = Math.max(...sim.vpBF.map((z) => z.re));
    rend(
      $('analyse-spectre'),
      `\\operatorname{spec} = \\{${sim.vpBF.map((z) => latexComplexe(z)).join(',\\ ')}\\}, \\quad \\alpha = \\max\\operatorname{Re}\\lambda = ${latexNombre(alpha)}`,
    );
    const n = sim.Jbf.length;
    const positifs = chi.every((c) => c > 1e-9);
    $('analyse-hurwitz').textContent =
      n <= 2
        ? `Critère de Routh–Hurwitz (n ≤ 2) : ${positifs ? 'tous les coefficients de χ sont strictement positifs, la matrice est Hurwitz.' : 'un coefficient de χ est négatif ou nul, la matrice n’est pas Hurwitz.'}`
        : `Pour n ≥ 3, des coefficients de χ tous strictement positifs ne sont qu’une condition nécessaire (${positifs ? 'vérifiée' : 'non vérifiée ici'}) : on lit les valeurs propres.`;
    // Observateur : A − LC, polynôme caractéristique et spectre.
    $('analyse-obs').hidden = !sim.obs;
    if (sim.obs) {
      const chiO = polynomeCaracteristique(sim.ALC);
      rend($('analyse-obs'), `A - LC = ${latexMatrice(sim.ALC)}, \\quad \\chi_{A-LC}(\\lambda) = ${polynomeLatex(chiO)}`);
    }
    afficheIndications($('indications'), sim);
  }
}
