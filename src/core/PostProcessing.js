import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { CONFIG } from '../config.js';

export class PostProcessing {
    constructor(renderer, scene, camera) {
        const pixelRatio = Math.min(window.devicePixelRatio, CONFIG.maxPixelRatio);
        renderer.setPixelRatio(pixelRatio);

        this.composer = new EffectComposer(renderer);
        this.composer.setSize(window.innerWidth, window.innerHeight);
        this.composer.setPixelRatio(pixelRatio);

        this.composer.addPass(new RenderPass(scene, camera));

        // ?bloom=0 dans l'URL pour désactiver (test de perf)
        const bloomDisabled = new URLSearchParams(window.location.search).get('bloom') === '0';
        this.bloomPass = null;
        if (!bloomDisabled) {
            const bw = window.innerWidth  * CONFIG.bloomResScale;
            const bh = window.innerHeight * CONFIG.bloomResScale;
            this.bloomPass = new UnrealBloomPass(
                new THREE.Vector2(bw, bh),
                CONFIG.bloomStrength, 0.5, 0.8
            );
            this.composer.addPass(this.bloomPass);
            console.log(`[Bloom] actif — résolution ×${CONFIG.bloomResScale}`);
        } else {
            console.log('[Bloom] désactivé (?bloom=0)');
        }

        this.composer.addPass(new OutputPass());

        window.addEventListener('resize', () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            renderer.setSize(w, h);
            this.composer.setSize(w, h);
        });
    }

    render() {
        this.composer.render();
    }
}
