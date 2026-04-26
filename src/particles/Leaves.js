import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { textureLoader } from '../core/Loaders.js';
import { myRandom } from '../utils/random.js';

export class LeafSystem {
    constructor(scene) {
        const countShrek  = Math.floor(CONFIG.leafCount * 0.05);
        const countNormal = Math.floor((CONFIG.leafCount - countShrek) / 2);
        const counts = [countNormal, countNormal, countShrek];

        const textures = [
            textureLoader.load('assets/particles/leaf.png'),
            textureLoader.load('assets/particles/leaf2.png'),
            textureLoader.load('assets/particles/shrek.png'),
        ];

        const leafGeo = new THREE.PlaneGeometry(4, 4);
        this._systems = [];
        this._dummy   = new THREE.Object3D();

        textures.forEach((tex, index) => {
            const count = counts[index];
            const mesh  = new THREE.InstancedMesh(
                leafGeo,
                new THREE.MeshStandardMaterial({
                    map: tex, transparent: true, alphaTest: 0.5,
                    side: THREE.DoubleSide, fog: true,
                }),
                count
            );
            mesh.frustumCulled = false;
            scene.add(mesh);

            const data = Array.from({ length: count }, () => ({
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

            this._systems.push({ mesh, data, count });
        });
    }

    update(time) {
        const { _dummy } = this;
        this._systems.forEach(({ mesh, data, count }) => {
            for (let i = 0; i < count; i++) {
                const p = data[i];
                p.pos.y -= p.speed;

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
                const s = (count < 50) ? 0.4 : 0.2;
                _dummy.scale.set(s, s, s);
                _dummy.updateMatrix();
                mesh.setMatrixAt(i, _dummy.matrix);
            }
            mesh.instanceMatrix.needsUpdate = true;
        });
    }
}
