import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { textureLoader } from '../core/Loaders.js';
import { myRandom } from '../utils/random.js';

export class GrassSystem {
    constructor(scene, sampler, terrainMesh) {
        this._scene = scene;
        this._sampler = sampler;
        this._terrainMesh = terrainMesh;
        this._meshes = [];

        this._geos = [
            this._makeGeo(0, 1), this._makeGeo(1, 1),
            this._makeGeo(0, 0), this._makeGeo(1, 0),
        ];
        this._material = new THREE.MeshStandardMaterial({
            map: textureLoader.load('assets/grass/GrassColor.png'),
            normalMap: textureLoader.load('assets/grass/GrassNormal.png'),
            alphaTest: 0.5,
            side: THREE.DoubleSide,
        });

        this._place({ count: CONFIG.grassCount, scaleMin: 0.5, scaleMax: 3.5 });
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

    _place({ count, scaleMin, scaleMax }) {
        const perVariant = Math.floor(count / 4);

        this._meshes = this._geos.map(geo => {
            const m = new THREE.InstancedMesh(geo, this._material, perVariant);
            this._scene.add(m);
            return m;
        });

        const dummy = new THREE.Object3D();
        const _pos = new THREE.Vector3();
        const _normal = new THREE.Vector3();
        const _quat = new THREE.Quaternion();
        const _upWorld = new THREE.Vector3(0, 1, 0);
        const counters = [0, 0, 0, 0];

        for (let i = 0; i < count; i++) {
            this._sampler.sample(_pos, _normal);
            this._terrainMesh.localToWorld(_pos);
            if (_pos.y < 0.30) continue;

            dummy.position.copy(_pos);
            _quat.setFromAxisAngle(_upWorld, myRandom() * Math.PI * 2);
            dummy.quaternion.copy(_quat);
            const s = scaleMin + myRandom() * (scaleMax - scaleMin);
            dummy.scale.set(s, s, s);
            dummy.updateMatrix();

            const v = Math.floor(myRandom() * 4);
            if (counters[v] < perVariant) {
                this._meshes[v].setMatrixAt(counters[v]++, dummy.matrix);
            }
        }
        this._meshes.forEach(m => m.instanceMatrix.needsUpdate = true);
    }

    updateSampler(sampler, terrainMesh) {
        this._sampler = sampler;
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
