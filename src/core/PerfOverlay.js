import Stats from 'stats.js';
import { PROFILE } from './DeviceProfile.js';


export class PerfOverlay {
    constructor(stats, renderer) {
        this._renderer = renderer;
        this._panelDC = new Stats.Panel('DC', '#f8f', '#212');
        this._panelTri = new Stats.Panel('KTri', '#0ff', '#022');
        stats.addPanel(this._panelDC);
        stats.addPanel(this._panelTri);

        // debug profile type
        console.log(`[PerfOverlay] Profil GPU détecté : ${PROFILE}`);
    }

    update() {
        const info = this._renderer.info.render;
        this._panelDC.update(info.calls, 300);
        this._panelTri.update(Math.round(info.triangles / 1000), 5000);
    }
}
