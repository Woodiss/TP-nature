import { SceneSetup }      from './src/core/SceneSetup.js';
import { PostProcessing }   from './src/core/PostProcessing.js';
import { setupEnvironment } from './src/core/Environment.js';
import { PerfOverlay }      from './src/core/PerfOverlay.js';
import { DebugPanel }       from './src/debug/DebugPanel.js';
import { Terrain }          from './src/terrain/Terrain.js';
import { TreeSystem }       from './src/vegetation/Trees.js';
import { GrassSystem }      from './src/vegetation/Grass.js';
import { BushSystem }       from './src/vegetation/Bushes.js';
import { FlowerSystem }     from './src/vegetation/Flowers.js';
import { WaterMesh }        from './src/water/Water.js';
import { LeafSystem }       from './src/particles/Leaves.js';
import { Soldier }          from './src/player/Soldier.js';

// ─── Setup ───────────────────────────────────────────────────────────────────
const { scene, camera, renderer, clock, stats } = new SceneSetup();
const postProcessing = new PostProcessing(renderer, scene, camera);
const perfOverlay    = new PerfOverlay(stats, renderer);

const { sunLight } = setupEnvironment(scene);
camera.position.set(15, 10, 15);

// ─── Scène ───────────────────────────────────────────────────────────────────
const terrain = new Terrain(scene);

const trees   = new TreeSystem(scene, terrain.sampler, terrain.mesh);
const grass   = new GrassSystem(scene,  terrain.sampler, terrain.mesh);
const bushes  = new BushSystem(scene,   terrain.sampler, terrain.mesh);
const flowers = new FlowerSystem(scene, terrain.sampler, terrain.mesh);
const water   = new WaterMesh(scene);
const leaves  = new LeafSystem(scene);
const soldier = new Soldier(scene, camera);

// ─── Debug panel (uniquement avec ?debug=1) ───────────────────────────────────
new DebugPanel({ scene, postProcessing, systems: { trees, grass, bushes, flowers, water, leaves }, terrain, sunLight });

// ─── Chargement async + compilation shaders ──────────────────────────────────
async function init() {
    await Promise.all([
        trees.load(),
        soldier.load('assets/soldier.glb'),
    ]);

    // Tous les objets sont dans la scène : on compile tous les shaders d'un coup.
    // Élimine les pics de 30ms dus à la compilation GLSL JIT sur les premières frames.
    renderer.compile(scene, camera);

    hideLoader();
    animate();
}

function hideLoader() {
    const el = document.getElementById('loading-wrapper');
    if (!el) return;
    el.classList.add('hidden');
    setTimeout(() => { el.style.display = 'none'; }, 850);
}

// ─── Boucle d'animation ──────────────────────────────────────────────────────
let _lastRafTime = performance.now();
let _accumJS = 0, _accumRender = 0, _accumFrame = 0, _diagFrames = 0;
let frameCount = 0;

function animate() {
    const rafNow  = performance.now();
    const frameDt = rafNow - _lastRafTime;
    _lastRafTime  = rafNow;

    stats.begin();
    const delta = clock.getDelta();
    const time  = performance.now() / 1000;
    frameCount++;

    const t0 = performance.now();
    soldier.update(delta);
    if (frameCount % 10 === 0) trees.update(camera);
    water.update(time);
    leaves.update(time);
    const jsMs = performance.now() - t0;

    const t1 = performance.now();
    postProcessing.render();
    const renderMs = performance.now() - t1;

    perfOverlay.update();
    stats.end();

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
            ` | JS: ${avgJs}ms` +
            ` | Submit: ${avgRender}ms` +
            ` | GPU wait≈: ${avgGPU}ms`
        );
        _accumJS = _accumRender = _accumFrame = _diagFrames = 0;
    }

    requestAnimationFrame(animate);
}

init();
