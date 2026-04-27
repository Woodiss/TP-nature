import GUI from 'lil-gui';
import { CONFIG } from '../config.js';
import { resetSeed } from '../utils/random.js';

export class DebugPanel {
    constructor({ scene, postProcessing, systems, terrain, sunLight }) {
        if (new URLSearchParams(window.location.search).get('debug') !== '1') return;

        const gui = new GUI({ title: "Shrek's Garden — Debug" });
        gui.domElement.style.zIndex = '999';

        this._treeState = { count: CONFIG.treeCount, scaleMin: 2, scaleMax: 3.5, lod0Dist: 40, lod1Dist: 90 };
        this._grassState = { count: CONFIG.grassCount, scaleMin: 0.5, scaleMax: 3.5 };
        this._bushState = { count: CONFIG.bushCount, scaleMin: 0.5, scaleMax: 1.5 };
        this._flowerState = { countPerType: CONFIG.flowersPerType, scaleMin: 1.5, scaleMax: 2.5 };
        this._terrainState = { terrainSize: CONFIG.terrainSize, terrainSegments: CONFIG.terrainSegments, seed: 42 };

        this._buildEnvironment(gui, scene);
        this._buildBloom(gui, postProcessing);
        this._buildTerrain(gui, terrain, systems);
        this._buildShadows(gui, sunLight);
        this._buildTrees(gui, systems.trees);
        this._buildGrass(gui, systems.grass);
        this._buildBushes(gui, systems.bushes);
        this._buildFlowers(gui, systems.flowers);
        this._buildWater(gui, systems.water);
        this._buildLeaves(gui, systems.leaves);
    }

    _buildEnvironment(gui, scene) {
        const f = gui.addFolder('🌫️ Environnement');
        const state = { fogDensity: 0.005 };
        f.add(state, 'fogDensity', 0, 0.04, 0.0001)
            .name('Brouillard')
            .onChange(v => { scene.fog.density = v; });
        f.close();
    }

    _buildBloom(gui, postProcessing) {
        const bp = postProcessing.bloomPass;
        if (!bp) return;
        const f = gui.addFolder('✨ Bloom');
        f.add(bp, 'strength', 0, 2, 0.01).name('Intensité');
        f.add(bp, 'radius', 0, 1, 0.01).name('Rayon');
        f.add(bp, 'threshold', 0, 1, 0.01).name('Seuil');
        f.close();
    }

    _buildTerrain(gui, terrain, systems) {
        const f = gui.addFolder('🏔️ Terrain');
        const state = this._terrainState;

        f.add(state, 'terrainSize', 32, 512, 8).name('Taille');
        f.add(state, 'terrainSegments', 16, 512, 8).name('Segments');
        f.add(state, 'seed', 1, 9999, 1).name('Graine');

        f.add({
            regen: () => {
                resetSeed(state.seed);
                terrain.regenerate({ terrainSize: state.terrainSize, terrainSegments: state.terrainSegments });
                systems.water.regenerateGeometry(state.terrainSize);

                const veg = [systems.trees, systems.grass, systems.bushes, systems.flowers];
                veg.forEach(s => s.updateSampler(terrain.sampler, terrain.mesh));

                systems.trees.regeneratePlacement(this._treeState);
                systems.grass.regenerate(this._grassState);
                systems.bushes.regenerate(this._bushState);
                systems.flowers.regenerate(this._flowerState);
            }
        }, 'regen').name('↺ Régénérer tout');

        f.close();
    }

    _buildShadows(gui, sunLight) {
        if (!sunLight || !sunLight.castShadow) return;
        const f = gui.addFolder('🌑 Ombres');
        const state = { mapSize: CONFIG.shadowMapSize, bias: 0, frustumSize: 70 };

        f.add(state, 'mapSize', [256, 512, 1024, 2048, 4096])
            .name('Résolution carte')
            .onChange(v => {
                const s = sunLight.shadow;
                if (s.map) { s.map.dispose(); s.map = null; }
                s.mapSize.set(v, v);
            });

        f.add(state, 'bias', -0.05, 0.05, 0.001)
            .name('Biais')
            .onChange(v => { sunLight.shadow.bias = v; });

        f.add(state, 'frustumSize', 10, 300, 1)
            .name('Portée frustum')
            .onChange(v => {
                const sc = sunLight.shadow.camera;
                sc.left = sc.bottom = -v;
                sc.right = sc.top = v;
                sc.updateProjectionMatrix();
            });

        f.close();
    }

    _buildTrees(gui, trees) {
        const f = gui.addFolder('🌲 Arbres');
        const state = this._treeState;
        f.add(state, 'count', 1, 500, 1).name('Quantité');
        f.add(state, 'scaleMin', 0.1, 5, 0.1).name('Scale min');
        f.add(state, 'scaleMax', 0.1, 5, 0.1).name('Scale max');
        f.add(state, 'lod0Dist', 5, 150, 1).name('LOD haute dist.');
        f.add(state, 'lod1Dist', 5, 300, 1).name('LOD moyenne dist.');
        f.add({ regen: () => trees.regeneratePlacement(state) }, 'regen').name('↺ Régénérer');
        f.close();
    }

    _buildGrass(gui, grass) {
        const f = gui.addFolder('🌿 Herbe');
        const state = this._grassState;
        f.add(state, 'count', 1000, 200000, 1000).name('Quantité');
        f.add(state, 'scaleMin', 0.1, 5, 0.1).name('Scale min');
        f.add(state, 'scaleMax', 0.1, 5, 0.1).name('Scale max');
        f.add({ regen: () => grass.regenerate(state) }, 'regen').name('↺ Régénérer');
        f.close();
    }

    _buildBushes(gui, bushes) {
        const f = gui.addFolder('🌳 Buissons');
        const state = this._bushState;
        f.add(state, 'count', 1, 500, 1).name('Quantité');
        f.add(state, 'scaleMin', 0.1, 5, 0.1).name('Scale min');
        f.add(state, 'scaleMax', 0.1, 5, 0.1).name('Scale max');
        f.add({ regen: () => bushes.regenerate(state) }, 'regen').name('↺ Régénérer');
        f.close();
    }

    _buildFlowers(gui, flowers) {
        const f = gui.addFolder('🌸 Fleurs');
        const state = this._flowerState;
        f.add(state, 'countPerType', 1, 500, 1).name('Quantité / type');
        f.add(state, 'scaleMin', 0.1, 5, 0.1).name('Scale min');
        f.add(state, 'scaleMax', 0.1, 5, 0.1).name('Scale max');
        f.add({ regen: () => flowers.regenerate(state) }, 'regen').name('↺ Régénérer');
        f.close();
    }

    _buildWater(gui, water) {
        const f = gui.addFolder('💧 Eau');
        const state = { speed: 0.2, opacity: 0.3 };
        f.add(state, 'speed', 0, 2, 0.01).name('Vitesse').onChange(v => water.setSpeed(v));
        f.add(state, 'opacity', 0, 1, 0.01).name('Opacité').onChange(v => water.setOpacity(v));
        f.close();
    }

    _buildLeaves(gui, leaves) {
        const f = gui.addFolder('🍂 Feuilles');
        const state = { count: CONFIG.leafCount, scale: 0.2, speedMul: 1.0 };
        f.add(state, 'count', 1, 2000, 1).name('Quantité');
        f.add(state, 'scale', 0.05, 1, 0.01).name('Scale').onChange(v => leaves.setScale(v));
        f.add(state, 'speedMul', 0.1, 5, 0.1).name('Vitesse chute').onChange(v => leaves.setSpeedMul(v));
        f.add({ regen: () => leaves.regenerate(state) }, 'regen').name('↺ Régénérer');
        f.close();
    }
}
