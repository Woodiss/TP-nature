import { SceneSetup }      from './src/core/SceneSetup.js';
import { PostProcessing }   from './src/core/PostProcessing.js';
import { setupEnvironment } from './src/core/Environment.js';
import { PerfOverlay }      from './src/core/PerfOverlay.js';
import { Terrain }          from './src/terrain/Terrain.js';
import { TreeSystem }       from './src/vegetation/Trees.js';
import { GrassSystem }      from './src/vegetation/Grass.js';
import { BushSystem }       from './src/vegetation/Bushes.js';
import { FlowerSystem }     from './src/vegetation/Flowers.js';
import { WaterMesh }        from './src/water/Water.js';
import { LeafSystem }       from './src/particles/Leaves.js';
import { Soldier }          from './soldier.js';

const { scene, camera, renderer, clock, stats } = new SceneSetup();
const postProcessing = new PostProcessing(renderer, scene, camera);
const perfOverlay    = new PerfOverlay(stats, renderer);

setupEnvironment(scene);
camera.position.set(15, 10, 15);

const terrain = new Terrain(scene);

const trees = new TreeSystem(scene, terrain.sampler, terrain.mesh);
trees.load();

new GrassSystem(scene,  terrain.sampler, terrain.mesh);
new BushSystem(scene,   terrain.sampler, terrain.mesh);
new FlowerSystem(scene, terrain.sampler, terrain.mesh);

const water  = new WaterMesh(scene);
const leaves = new LeafSystem(scene);

const soldier = new Soldier(scene, camera);
soldier.load('assets/soldier.glb');

// ─── Diagnostic de performance ────────────────────────────────────────────────
// Mesure sur 60 frames glissantes :
//   JS      = tout le travail CPU avant soumission GPU (soldier, LOD, leaves…)
//   Render  = temps de soumission des commandes WebGL (Three.js state + draw calls)
//   Frame Δ = temps réel entre 2 rAF — inclut l'attente de fin GPU frame précédente
//   GPU est ≈ Frame Δ - JS - Render
//
// Si "GPU est" >> "JS + Render" → bottleneck GPU (fill rate, shaders, bloom…)
// Si "JS" >> reste              → bottleneck CPU (animations, LOD, raycaster…)
// ─────────────────────────────────────────────────────────────────────────────
let _lastRafTime = performance.now();
let _accumJS = 0, _accumRender = 0, _accumFrame = 0, _diagFrames = 0;

let frameCount = 0;

function animate() {
    const rafNow   = performance.now();
    const frameDt  = rafNow - _lastRafTime;
    _lastRafTime   = rafNow;

    stats.begin();
    const delta = clock.getDelta();
    const time  = performance.now() / 1000;
    frameCount++;

    // — CPU : logique JS ——
    const t0 = performance.now();
    soldier.update(delta);
    if (frameCount % 10 === 0) trees.update(camera);
    water.update(time);
    leaves.update(time);
    const jsMs = performance.now() - t0;

    // — CPU : soumission des commandes GPU ——
    const t1 = performance.now();
    postProcessing.render();
    const renderMs = performance.now() - t1;

    perfOverlay.update();
    stats.end();

    // Accumulation pour moyenne sur 60 frames
    _accumJS     += jsMs;
    _accumRender += renderMs;
    _accumFrame  += frameDt;
    _diagFrames++;

    if (_diagFrames === 60) {
        const avgJs     = (_accumJS     / 60).toFixed(2);
        const avgRender = (_accumRender / 60).toFixed(2);
        const avgFrame  = (_accumFrame  / 60).toFixed(2);
        const avgGPU    = Math.max(0, parseFloat(avgFrame) - parseFloat(avgJs) - parseFloat(avgRender)).toFixed(2);
        console.log(
            `[PERF] Frame: ${avgFrame}ms` +
            ` | JS logique: ${avgJs}ms` +
            ` | Soumission GPU: ${avgRender}ms` +
            ` | Attente GPU≈: ${avgGPU}ms`
        );
        _accumJS = _accumRender = _accumFrame = _diagFrames = 0;
    }

    requestAnimationFrame(animate);
}
animate();
