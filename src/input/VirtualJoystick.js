export class VirtualJoystick {
    constructor() {
        this.dx = 0;
        this.dy = 0;
        this.active = false;

        this._touchId = null;
        this._originX = 0;
        this._originY = 0;
        this._maxRadius = 45;

        this._createDOM();
        this._bindEvents();
    }

    _createDOM() {
        this._zone = document.createElement('div');
        this._zone.id = 'jstick-zone';

        this._base = document.createElement('div');
        this._base.id = 'jstick-base';

        this._knob = document.createElement('div');
        this._knob.id = 'jstick-knob';

        this._base.appendChild(this._knob);
        document.body.appendChild(this._zone);
        document.body.appendChild(this._base);
    }

    _bindEvents() {
        this._zone.addEventListener('touchstart', e => {
            if (document.querySelector('#controls-popup:not([style*="none"]):not(.hidden)')) return;
            if (this._touchId !== null) return;
            e.preventDefault();

            const t = e.changedTouches[0];
            this._touchId = t.identifier;
            this._originX = t.clientX;
            this._originY = t.clientY;

            this._base.style.left = `${t.clientX}px`;
            this._base.style.top = `${t.clientY}px`;
            this._base.style.opacity = '1';
            this._knob.style.transform = 'translate(-50%, -50%)';
            this.active = true;
        }, { passive: false });

        window.addEventListener('touchmove', e => {
            if (this._touchId === null) return;
            for (const t of e.changedTouches) {
                if (t.identifier !== this._touchId) continue;
                const dx = t.clientX - this._originX;
                const dy = t.clientY - this._originY;
                const len = Math.hypot(dx, dy) || 1;
                const c = Math.min(len, this._maxRadius);
                const kx = (dx / len) * c;
                const ky = (dy / len) * c;

                this._knob.style.transform = `translate(calc(-50% + ${kx}px), calc(-50% + ${ky}px))`;
                this.dx = kx / this._maxRadius;
                this.dy = ky / this._maxRadius;
            }
        }, { passive: true });

        window.addEventListener('touchend', e => {
            for (const t of e.changedTouches) {
                if (t.identifier !== this._touchId) continue;
                this._touchId = null;
                this._base.style.opacity = '0';
                this._knob.style.transform = 'translate(-50%, -50%)';
                this.dx = 0;
                this.dy = 0;
                this.active = false;
            }
        }, { passive: true });
    }
}
