import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { gltfLoader, textureLoader } from '../core/Loaders.js';
import { myRandom } from '../utils/random.js';
import { getMergedGeometry } from '../utils/geometry.js';

export class TreeSystem {
    constructor(scene, sampler, terrainMesh) {
        this._scene = scene;
        this._sampler = sampler;
        this._terrainMesh = terrainMesh;
        this._treesData = [];
        this._meshLOD0 = null;
        this._meshLOD1 = null;
        this._meshLOD2 = null;
        this._dummy   = new THREE.Object3D();
        this._pos     = new THREE.Vector3();
        this._normal  = new THREE.Vector3();
        this._upWorld = new THREE.Vector3(0, 1, 0);
    }

    async load() {
        const treeColor  = textureLoader.load('assets/tree/TreeColor2.png');
        const treeNormal = textureLoader.load('assets/tree/TreeNormal-512.jpg');
        const treeRmao   = textureLoader.load('assets/tree/TreeRmao-512.jpg');
        treeColor.flipY = treeNormal.flipY = treeRmao.flipY = false;
        treeColor.colorSpace = THREE.SRGBColorSpace;

        const [gltfHigh, gltfLow] = await Promise.all([
            gltfLoader.loadAsync('assets/tree/tree.glb'),
            gltfLoader.loadAsync('assets/tree/treeLOD1.glb'),
        ]);

        const geomImpostor = new THREE.PlaneGeometry(4, 7);
        geomImpostor.translate(0, 3.5, 0);

        this._meshLOD0 = new THREE.InstancedMesh(getMergedGeometry(gltfHigh), new THREE.MeshStandardMaterial({
            map: treeColor, normalMap: treeNormal, aoMap: treeRmao,
            alphaTest: 0.5, transparent: true, side: THREE.DoubleSide,
        }), CONFIG.treeCount);

        this._meshLOD1 = new THREE.InstancedMesh(getMergedGeometry(gltfLow), new THREE.MeshStandardMaterial({
            map: treeColor,
            alphaTest: 0.5, transparent: true, side: THREE.DoubleSide,
        }), CONFIG.treeCount);

        this._meshLOD2 = new THREE.InstancedMesh(geomImpostor, new THREE.MeshStandardMaterial({
            map: textureLoader.load('assets/tree/TreeImpostor.png'),
            transparent: true, alphaTest: 0.5, side: THREE.DoubleSide,
        }), CONFIG.treeCount);

        this._meshLOD0.castShadow = true;
        this._meshLOD0.frustumCulled = false;
        this._meshLOD1.frustumCulled = false;
        this._meshLOD2.frustumCulled = false;
        this._scene.add(this._meshLOD0, this._meshLOD1, this._meshLOD2);

        this._placeTrees();
    }

    _placeTrees() {
        const { _dummy, _pos, _normal, _upWorld } = this;

        for (let i = 0; i < CONFIG.treeCount; i++) {
            this._sampler.sample(_pos, _normal);
            this._terrainMesh.localToWorld(_pos);

            if (_pos.y < 0.25) { i--; continue; }

            const pos  = _pos.clone();
            pos.y -= 0.7;
            const quat = new THREE.Quaternion().setFromAxisAngle(_upWorld, myRandom() * Math.PI * 2);
            const s    = 2 + myRandom() * 1.5;
            this._treesData.push({ position: pos, quaternion: quat, s });

            _dummy.scale.set(0, 0, 0);
            _dummy.updateMatrix();
            this._meshLOD0.setMatrixAt(i, _dummy.matrix);
            this._meshLOD1.setMatrixAt(i, _dummy.matrix);
            this._meshLOD2.setMatrixAt(i, _dummy.matrix);
        }

        this._meshLOD0.instanceMatrix.needsUpdate = true;
        this._meshLOD1.instanceMatrix.needsUpdate = true;
        this._meshLOD2.instanceMatrix.needsUpdate = true;
    }

    update(camera) {
        if (!this._meshLOD0) return;

        const camPos = new THREE.Vector3();
        camera.getWorldPosition(camPos);
        const { _dummy } = this;

        for (let i = 0; i < CONFIG.treeCount; i++) {
            const tree = this._treesData[i];
            if (!tree) continue;

            const dist = camPos.distanceTo(tree.position);
            _dummy.position.copy(tree.position);
            _dummy.position.y -= 0.7;

            if (dist < 40) {
                _dummy.quaternion.copy(tree.quaternion);
                this._setLOD(i, tree.s, this._meshLOD0, this._meshLOD1, this._meshLOD2);
            } else if (dist < 90) {
                _dummy.quaternion.copy(tree.quaternion);
                this._setLOD(i, tree.s, this._meshLOD1, this._meshLOD0, this._meshLOD2);
            } else {
                _dummy.lookAt(camPos.x, _dummy.position.y, camPos.z);
                this._setLOD(i, tree.s, this._meshLOD2, this._meshLOD0, this._meshLOD1);
            }
        }

        this._meshLOD0.instanceMatrix.needsUpdate = true;
        this._meshLOD1.instanceMatrix.needsUpdate = true;
        this._meshLOD2.instanceMatrix.needsUpdate = true;
    }

    _setLOD(index, scaleVal, active, hide1, hide2) {
        const { _dummy } = this;
        _dummy.scale.set(scaleVal, scaleVal, scaleVal);
        _dummy.updateMatrix();
        active.setMatrixAt(index, _dummy.matrix);

        _dummy.scale.set(0, 0, 0);
        _dummy.updateMatrix();
        hide1.setMatrixAt(index, _dummy.matrix);
        hide2.setMatrixAt(index, _dummy.matrix);
    }
}
