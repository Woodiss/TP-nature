import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { textureLoader } from '../core/Loaders.js';
import { myRandom } from '../utils/random.js';

export class LeafSystem {
    constructor(scene) {
        this._scene    = scene;
        this._systems  = [];
        this._dummy    = new THREE.Object3D();
        this._scale    = 0.2;
        this._speedMul = 1.0;

        // Géométrie et matériaux partagés, créés une fois
        this._geo = new THREE.PlaneGeometry(4, 4);
        this._textures = [
            textureLoader.load('assets/particles/leaf.png'),
            textureLoader.load('assets/particles/leaf2.png'),
            textureLoader.load('assets/particles/shrek.png'),
        ];

        this._place({ count: CONFIG.leafCount });
    }

    _makeCounts(total) {
        const countShrek  = Math.floor(total * 0.05);
        const countNormal = Math.floor((total - countShrek) / 2);
        return [countNormal, countNormal, countShrek];
    }

    _place({ count }) {
        const counts = this._makeCounts(count);

        this._systems = this._textures.map((tex, index) => {
            const n = counts[index];
            const mat = new THREE.MeshStandardMaterial({
                map: tex, transparent: true, alphaTest: 0.5,
                side: THREE.DoubleSide, fog: true,
            });
            const mesh = new THREE.InstancedMesh(this._geo, mat, n);
            mesh.frustumCulled = false;
            this._scene.add(mesh);

            const data = Array.from({ length: n }, () => ({
                pos:      new THREE.Vector3(
                    (myRandom() - 0.5) * CONFIG.terrainSize,
                    myRandom() * 13 + 5,
                    (myRandom() - 0.5) * CONFIG.terrainSize
                ),
                speed:    0.02 + myRandom() * 0.05,
                rotSpeed: myRandom() * 0.02,
                oscFreq:  0.5 + myRandom() * 2,
                oscAmp:   0.2 + myRandom() * 0.5,
                offset:   myRandom() * Math.PI * 2,
            }));

            return { mesh, data, count: n };
        });
    }

    dispose() {
        this._systems.forEach(({ mesh }) => {
            this._scene.remove(mesh);
            mesh.material.dispose();
        });
        this._systems = [];
    }

    regenerate(config) {
        this.dispose();
        this._place(config);
    }

    setScale(v)        { this._scale    = v; }
    setSpeedMul(v)     { this._speedMul = v; }

    update(time) {
        const { _dummy, _scale, _speedMul } = this;
        this._systems.forEach(({ mesh, data, count }) => {
            for (let i = 0; i < count; i++) {
                const p = data[i];
                p.pos.y -= p.speed * _speedMul;

                if (p.pos.y < 0) {
                    p.pos.y = 13;
                    p.pos.x = (myRandom() - 0.5) * CONFIG.terrainSize;
                    p.pos.z = (myRandom() - 0.5) * CONFIG.terrainSize;
                }

                _dummy.position.set(
                    p.pos.x + Math.sin(time * p.oscFreq + p.offset) * p.oscAmp,
                    p.pos.y,
                    p.pos.z + Math.cos(time * p.oscFreq + p.offset) * p.oscAmp
                );
                _dummy.rotation.set(time * p.rotSpeed, time * p.rotSpeed * 1.5, 0);
                const s = (count < 50) ? _scale * 2 : _scale;
                _dummy.scale.set(s, s, s);
                _dummy.updateMatrix();
                mesh.setMatrixAt(i, _dummy.matrix);
            }
            mesh.instanceMatrix.needsUpdate = true;
        });
    }
}
