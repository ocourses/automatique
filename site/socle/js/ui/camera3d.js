// Caméra 3D orthographique, tournée à la souris : l'azimut tourne autour de
// l'axe vertical z, l'élévation incline la vue. Le geste saisit l'objet :
// tirer vers la droite le fait tourner vers la droite, tirer vers le bas fait
// voir le dessus. Partagée par les surfaces 3D et les animations des cours.

export class Camera {
  // `elevations` : bornes de l'élévation (une surface ne se regarde pas par-dessous).
  constructor({ azimut = -0.7, elevation = 0.5, elevations = [-1.5, 1.5] } = {}) {
    this.azimut = azimut;
    this.elevation = elevation;
    this.elevations = elevations;
  }

  // Branche la rotation à la souris sur `canvas` ; `rappel()` après chaque mouvement.
  attache(canvas, rappel = () => {}) {
    canvas.classList.add('saisissable');
    let prise = null;
    canvas.addEventListener('pointerdown', (ev) => {
      prise = { x: ev.clientX, y: ev.clientY, az: this.azimut, el: this.elevation };
      canvas.setPointerCapture(ev.pointerId);
    });
    canvas.addEventListener('pointermove', (ev) => {
      if (!prise) return;
      this.azimut = prise.az + (ev.clientX - prise.x) * 0.01;
      this.elevation = Math.min(this.elevations[1], Math.max(this.elevations[0], prise.el + (ev.clientY - prise.y) * 0.01));
      rappel();
    });
    const fin = () => (prise = null);
    canvas.addEventListener('pointerup', fin);
    canvas.addEventListener('pointercancel', fin);
    return this;
  }

  // Point (u, v, w), w vertical : abscisse et ordonnée à l'écran (unités du
  // monde, y vers le haut) et profondeur (plus grande = plus loin).
  tourne(u, v, w) {
    const ca = Math.cos(this.azimut);
    const sa = Math.sin(this.azimut);
    const X = u * ca - v * sa;
    const Y = u * sa + v * ca;
    const ce = Math.cos(this.elevation);
    const se = Math.sin(this.elevation);
    return { X, H: Y * se + w * ce, prof: Y * ce - w * se };
  }
}
