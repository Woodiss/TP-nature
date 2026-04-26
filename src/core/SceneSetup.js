import * as THREE from 'three';
import Stats from 'stats.js';
import { CONFIG } from '../config.js';

export class SceneSetup {
    constructor() {
        this.scene  = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.clock  = new THREE.Clock();

        this.renderer = new THREE.WebGLRenderer({ antialias: CONFIG.antialias });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.toneMapping = THREE.ReinhardToneMapping;

        if (CONFIG.shadows) {
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = {
                pcfsoft: THREE.PCFSoftShadowMap,
                pcf:     THREE.PCFShadowMap,
                basic:   THREE.BasicShadowMap,
            }[CONFIG.shadowType];
        }

        document.getElementById('ThreeJS').appendChild(this.renderer.domElement);

        this.stats = new Stats();
        document.body.appendChild(this.stats.dom);

        window.addEventListener('resize', () => this._onResize());
    }

    _onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
    }
}
