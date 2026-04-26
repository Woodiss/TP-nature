import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { textureLoader } from '../core/Loaders.js';
import { myRandom } from '../utils/random.js';

export class GrassSystem {
    constructor(scene, sampler, terrainMesh) {
        const perVariant = Math.floor(CONFIG.grassCount / 4);

        const mat = new THREE.MeshStandardMaterial({
            map: textureLoader.load('assets/grass/GrassColor.png'),
            normalMap: textureLoader.load('assets/grass/GrassNormal.png'),
            alphaTest: 0.5,
            side: THREE.DoubleSide,
        });

        const meshes = [
            this._makeGeo(0, 1), this._makeGeo(1, 1),
            this._makeGeo(0, 0), this._makeGeo(1, 0),
        ].map(geo => {
            const m = new THREE.InstancedMesh(geo, mat, perVariant);
            scene.add(m);
            return m;
        });

        const dummy     = new THREE.Object3D();
        const _pos      = new THREE.Vector3();
        const _normal   = new THREE.Vector3();
        const _quat     = new THREE.Quaternion();
        const _upWorld  = new THREE.Vector3(0, 1, 0);
        const counters  = [0, 0, 0, 0];

        for (let i = 0; i < CONFIG.grassCount; i++) {
            sampler.sample(_pos, _normal);
            terrainMesh.localToWorld(_pos);
            if (_pos.y < 0.30) continue;

            dummy.position.copy(_pos);
            _quat.setFromAxisAngle(_upWorld, myRandom() * Math.PI * 2);
            dummy.quaternion.copy(_quat);
            const s = 0.5 + myRandom() * 3;
            dummy.scale.set(s, s, s);
            dummy.updateMatrix();

            const v = Math.floor(myRandom() * 4);
            if (counters[v] < perVariant) {
                meshes[v].setMatrixAt(counters[v]++, dummy.matrix);
            }
        }
        meshes.forEach(m => m.instanceMatrix.needsUpdate = true);
    }

    _makeGeo(qx, qy) {
        const geo = new THREE.PlaneGeometry(0.3, 0.3);
        geo.translate(0, 0.15, 0);
        const uvs = geo.attributes.uv;
        for (let i = 0; i < uvs.count; i++) {
            uvs.setXY(i, uvs.getX(i) * 0.5 + qx * 0.5, uvs.getY(i) * 0.5 + qy * 0.5);
        }
        return geo;
    }
}
