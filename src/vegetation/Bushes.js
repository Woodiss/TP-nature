import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CONFIG } from '../config.js';
import { textureLoader } from '../core/Loaders.js';
import { myRandom } from '../utils/random.js';
import { initInvisible } from '../utils/instancing.js';

export class BushSystem {
    constructor(scene, sampler, terrainMesh) {
        this._scene       = scene;
        this._sampler     = sampler;
        this._terrainMesh = terrainMesh;
        this._mesh        = null;

        const planes = Array.from({ length: 4 }, (_, i) => {
            const p = new THREE.PlaneGeometry(1.5, 1.5);
            p.translate(0, 0.75, 0);
            p.rotateY((Math.PI / 4) * i);
            return p;
        });
        this._geo = BufferGeometryUtils.mergeGeometries(planes);
        this._material = new THREE.MeshStandardMaterial({
            map:     textureLoader.load('assets/bush/BushBaseColor.png'),
            aoMap:   textureLoader.load('assets/bush/BushOcclusionRoughnessMetallic.png'),
            alphaTest: 0.5,
            side:    THREE.DoubleSide,
        });

        this._place({ count: CONFIG.bushCount, scaleMin: 0.5, scaleMax: 1.5 });
    }

    _place({ count, scaleMin, scaleMax }) {
        this._mesh = new THREE.InstancedMesh(this._geo, this._material, count);
        initInvisible(this._mesh, count);
        this._scene.add(this._mesh);

        const dummy    = new THREE.Object3D();
        const _pos     = new THREE.Vector3();
        const _normal  = new THREE.Vector3();
        const _quat    = new THREE.Quaternion();
        const _upWorld = new THREE.Vector3(0, 1, 0);

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
            this._mesh.setMatrixAt(i, dummy.matrix);
        }
        this._mesh.instanceMatrix.needsUpdate = true;
    }

    updateSampler(sampler, terrainMesh) {
        this._sampler     = sampler;
        this._terrainMesh = terrainMesh;
    }

    dispose() {
        if (this._mesh) {
            this._scene.remove(this._mesh);
            this._mesh = null;
        }
    }

    regenerate(config) {
        this.dispose();
        this._place(config);
    }
}
