import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CONFIG } from '../config.js';
import { textureLoader } from '../core/Loaders.js';
import { myRandom } from '../utils/random.js';
import { initInvisible } from '../utils/instancing.js';

const FLOWER_COLORS = [
    new THREE.Color('#FF0055'),
    new THREE.Color('#c37b10'),
    new THREE.Color('#AA00FF'),
    new THREE.Color('#19cfab'),
    new THREE.Color('#FFD700'),
];

const FLOWER_CONFIGS = [
    { threshold: 0.55, mode: 0.0 },
    { threshold: 0.00, mode: 1.0 },
    { threshold: 0.15, mode: 1.0 },
    { threshold: 0.00, mode: 1.0 },
    { threshold: 0.10, mode: 1.0 },
];

function createFlowerMaterial(alphaTex, flowerColor, threshold, mode) {
    const material = new THREE.MeshStandardMaterial({
        map: alphaTex, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide,
    });
    material.onBeforeCompile = (shader) => {
        shader.uniforms.uFlowerColor = { value: flowerColor };
        shader.uniforms.uStemColor   = { value: new THREE.Color('#2e4a1e') };
        shader.uniforms.uThreshold   = { value: threshold };
        shader.uniforms.uMode        = { value: mode };

        shader.vertexShader = `varying vec2 vUv;\n` + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace(
            '#include <uv_vertex>', `#include <uv_vertex>\nvUv = uv;`
        );
        shader.fragmentShader = `
            uniform vec3 uFlowerColor;
            uniform vec3 uStemColor;
            uniform float uThreshold;
            uniform float uMode;
            varying vec2 vUv;
        ` + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <color_fragment>',
            `
            float mask = texture2D(map, vUv).r;
            float factor = (uMode > 0.5) ? abs(vUv.x - 0.5) * 2.0 : vUv.y;
            float mixStrength = smoothstep(uThreshold - 0.1, uThreshold + 0.1, factor);
            diffuseColor.rgb = mix(uStemColor, uFlowerColor, mixStrength) * 15.0;
            diffuseColor.a = mask;
            `
        );
    };
    return material;
}

export class FlowerSystem {
    constructor(scene, sampler, terrainMesh) {
        this._scene       = scene;
        this._sampler     = sampler;
        this._terrainMesh = terrainMesh;
        this._meshes      = [];

        const basePlane = new THREE.PlaneGeometry(1, 1);
        basePlane.translate(0, 0.5, 0);
        this._crossedGeo = BufferGeometryUtils.mergeGeometries([
            basePlane.clone(),
            basePlane.clone().rotateY(Math.PI / 2),
        ]);

        // Matériaux créés une fois (compilation shader = coûteux)
        this._materials = [1, 2, 3, 4, 5].map((n, i) => createFlowerMaterial(
            textureLoader.load(`assets/flower/FlowerAlpha${n}.png`),
            FLOWER_COLORS[i], FLOWER_CONFIGS[i].threshold, FLOWER_CONFIGS[i].mode
        ));

        this._place({ countPerType: CONFIG.flowersPerType, scaleMin: 1.5, scaleMax: 2.5 });
    }

    _place({ countPerType, scaleMin, scaleMax }) {
        const dummy   = new THREE.Object3D();
        const _pos    = new THREE.Vector3();
        const _normal = new THREE.Vector3();

        this._meshes = this._materials.map((mat) => {
            const mesh = new THREE.InstancedMesh(this._crossedGeo, mat, countPerType);
            initInvisible(mesh, countPerType);

            for (let j = 0; j < countPerType; j++) {
                this._sampler.sample(_pos, _normal);
                this._terrainMesh.localToWorld(_pos);
                if (_pos.y < 0.25) continue;

                dummy.position.copy(_pos);
                dummy.rotation.y = myRandom() * Math.PI;
                const s = scaleMin + myRandom() * (scaleMax - scaleMin);
                dummy.scale.set(s, s, s);
                dummy.updateMatrix();
                mesh.setMatrixAt(j, dummy.matrix);
            }
            mesh.instanceMatrix.needsUpdate = true;
            this._scene.add(mesh);
            return mesh;
        });
    }

    updateSampler(sampler, terrainMesh) {
        this._sampler     = sampler;
        this._terrainMesh = terrainMesh;
    }

    dispose() {
        this._meshes.forEach(m => this._scene.remove(m));
        this._meshes = [];
    }

    regenerate(config) {
        this.dispose();
        this._place(config);
    }
}
