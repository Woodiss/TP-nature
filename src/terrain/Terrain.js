import * as THREE from 'three';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
import { CONFIG } from '../config.js';
import { textureLoader } from '../core/Loaders.js';
import { noise2D, myRandom } from '../utils/random.js';

export class Terrain {
    constructor(scene) {
        this._scene = scene;
        this._initMaterial();
        this._build(CONFIG.terrainSize, CONFIG.terrainSegments);
    }

    _initMaterial() {
        const diffTex = textureLoader.load('assets/ground/rocky_terrain_02_diff_1k.png');
        const normTex = textureLoader.load('assets/ground/rocky_terrain_02_nor_dx_1k.png');
        const armTex  = textureLoader.load('assets/ground/rocky_terrain_02_arm_1k.png');
        [diffTex, normTex, armTex].forEach(t => {
            t.wrapS = t.wrapT = THREE.RepeatWrapping;
            t.repeat.set(10, 10);
        });
        this._material = new THREE.MeshStandardMaterial({
            map:          diffTex,
            normalMap:    normTex,
            aoMap:        armTex,
            roughnessMap: armTex,
            metalnessMap: armTex,
            roughness:    1,
            metalness:    0,
        });
    }

    _build(terrainSize, terrainSegments) {
        const geometry = new THREE.PlaneGeometry(
            terrainSize, terrainSize, terrainSegments, terrainSegments
        );
        const posAttr = geometry.attributes.position;
        for (let i = 0; i < posAttr.count; i++) {
            posAttr.setZ(i, noise2D(posAttr.getX(i) * 0.02, posAttr.getY(i) * 0.02) * 5);
        }
        posAttr.needsUpdate = true;
        geometry.computeVertexNormals();

        this.mesh = new THREE.Mesh(geometry, this._material);
        this.mesh.rotation.x = -Math.PI / 2;
        this.mesh.receiveShadow = true;
        this._scene.add(this.mesh);

        this.sampler = new MeshSurfaceSampler(this.mesh);
        this.sampler.setRandomGenerator(myRandom);
        this.sampler.build();
    }

    dispose() {
        if (!this.mesh) return;
        this._scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.mesh    = null;
        this.sampler = null;
    }

    regenerate({ terrainSize, terrainSegments }) {
        this.dispose();
        this._build(terrainSize, terrainSegments);
    }
}
