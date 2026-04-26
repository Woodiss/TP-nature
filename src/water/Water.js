import * as THREE from 'three';
import { CONFIG } from '../config.js';

const VERTEX_SHADER = /* glsl */`
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const FRAGMENT_SHADER = /* glsl */`
    uniform float uTime;
    uniform vec2 uResolution;
    varying vec2 vUv;

    #define TAU 6.28318530718
    #define MAX_ITER 5

    void main() {
        float time = uTime * 0.2;
        vec2 p = mod(vUv * TAU * 5.0, TAU) - 250.0;
        vec2 i = vec2(p);
        float c = 1.0;
        float inten = .005;

        for (int n = 0; n < MAX_ITER; n++) {
            float t = time * (1.0 - (3.5 / float(n + 1)));
            i = p + vec2(cos(t - i.x) + sin(t + i.y), sin(t - i.y) + cos(t + i.x));
            c += 1.0 / length(vec2(p.x / (sin(i.x + t) / inten), p.y / (cos(i.y + t) / inten)));
        }

        c /= float(MAX_ITER);
        c = 1.17 - pow(c, 1.4);
        vec3 colour = vec3(pow(abs(c), 8.0));
        colour = clamp(colour + vec3(0.0, 0.35, 0.5), 0.0, 1.0);
        gl_FragColor = vec4(colour, 0.3);
    }
`;

export class WaterMesh {
    constructor(scene) {
        this._material = new THREE.ShaderMaterial({
            uniforms: {
                uTime:       { value: 0 },
                uResolution: { value: new THREE.Vector2(CONFIG.terrainSize, CONFIG.terrainSize) },
            },
            transparent: true,
            vertexShader:   VERTEX_SHADER,
            fragmentShader: FRAGMENT_SHADER,
        });

        const mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(CONFIG.terrainSize, CONFIG.terrainSize),
            this._material
        );
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.y = 0.25;
        scene.add(mesh);
    }

    update(time) {
        this._material.uniforms.uTime.value = time;
    }
}
