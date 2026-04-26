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

let frameCount = 0;

function animate() {
    stats.begin();
    const delta = clock.getDelta();
    const time  = performance.now() / 1000;
    frameCount++;

    soldier.update(delta, terrain.mesh);
    if (frameCount % 10 === 0) trees.update(camera);
    water.update(time);
    leaves.update(time);

    postProcessing.render();
    perfOverlay.update();
    stats.end();
    requestAnimationFrame(animate);
}
animate();
