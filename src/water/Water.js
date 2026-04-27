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
    uniform float uSpeed;
    uniform float uOpacity;
    varying vec2 vUv;

    #define TAU 6.28318530718

    void main() {
        float time = uTime * uSpeed;
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
        gl_FragColor = vec4(colour, uOpacity);
    }
`;

export class WaterMesh {
    constructor(scene) {
        this._scene = scene;
        this._material = new THREE.ShaderMaterial({
            defines:  { MAX_ITER: CONFIG.waterIter },
            uniforms: {
                uTime:    { value: 0 },
                uSpeed:   { value: 0.2 },
                uOpacity: { value: 0.3 },
            },
            transparent:    true,
            vertexShader:   VERTEX_SHADER,
            fragmentShader: FRAGMENT_SHADER,
        });

        this._buildMesh(CONFIG.terrainSize);
    }

    _buildMesh(terrainSize) {
        this._mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(terrainSize, terrainSize),
            this._material
        );
        this._mesh.rotation.x = -Math.PI / 2;
        this._mesh.position.y = 0.25;
        this._scene.add(this._mesh);
    }

    regenerateGeometry(terrainSize) {
        this._scene.remove(this._mesh);
        this._mesh.geometry.dispose();
        this._buildMesh(terrainSize);
    }

    update(time)  { this._material.uniforms.uTime.value    = time; }
    setSpeed(v)   { this._material.uniforms.uSpeed.value   = v; }
    setOpacity(v) { this._material.uniforms.uOpacity.value = v; }
}
