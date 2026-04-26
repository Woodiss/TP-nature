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
        map: alphaTex,
        transparent: true,
        alphaTest: 0.5,
        side: THREE.DoubleSide,
    });

    material.onBeforeCompile = (shader) => {
        shader.uniforms.uFlowerColor = { value: flowerColor };
        shader.uniforms.uStemColor   = { value: new THREE.Color('#2e4a1e') };
        shader.uniforms.uThreshold   = { value: threshold };
        shader.uniforms.uMode        = { value: mode };

        shader.vertexShader = `varying vec2 vUv;\n` + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace(
            '#include <uv_vertex>',
            `#include <uv_vertex>\nvUv = uv;`
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
            vec4 texElement = texture2D(map, vUv);
            float mask = texElement.r;
            float factor = (uMode > 0.5)
                ? abs(vUv.x - 0.5) * 2.0
                : vUv.y;
            float mixStrength = smoothstep(uThreshold - 0.1, uThreshold + 0.1, factor);
            vec3 finalColor = mix(uStemColor, uFlowerColor, mixStrength);
            diffuseColor.rgb = finalColor * 15.0;
            diffuseColor.a = mask;
            `
        );
    };
    return material;
}

export class FlowerSystem {
    constructor(scene, sampler, terrainMesh) {
        const basePlane = new THREE.PlaneGeometry(1, 1);
        basePlane.translate(0, 0.5, 0);
        const crossedGeo = BufferGeometryUtils.mergeGeometries([
            basePlane.clone(),
            basePlane.clone().rotateY(Math.PI / 2),
        ]);

        const dummy   = new THREE.Object3D();
        const _pos    = new THREE.Vector3();
        const _normal = new THREE.Vector3();

        [1, 2, 3, 4, 5].forEach((n, i) => {
            const tex  = textureLoader.load(`assets/flower/FlowerAlpha${n}.png`);
            const cfg  = FLOWER_CONFIGS[i];
            const mesh = new THREE.InstancedMesh(
                crossedGeo,
                createFlowerMaterial(tex, FLOWER_COLORS[i], cfg.threshold, cfg.mode),
                CONFIG.flowersPerType
            );
            initInvisible(mesh, CONFIG.flowersPerType);

            for (let j = 0; j < CONFIG.flowersPerType; j++) {
                sampler.sample(_pos, _normal);
                terrainMesh.localToWorld(_pos);
                if (_pos.y < 0.25) continue;

                dummy.position.copy(_pos);
                dummy.rotation.y = myRandom() * Math.PI;
                const s = 1.5 + myRandom() * 1.0;
                dummy.scale.set(s, s, s);
                dummy.updateMatrix();
                mesh.setMatrixAt(j, dummy.matrix);
            }
            mesh.instanceMatrix.needsUpdate = true;
            scene.add(mesh);
        });
    }
}
