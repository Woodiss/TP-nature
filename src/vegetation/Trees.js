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

        this._dummy = new THREE.Object3D();
        this._pos = new THREE.Vector3();
        this._normal = new THREE.Vector3();
        this._upWorld = new THREE.Vector3(0, 1, 0);
        this._camPos = new THREE.Vector3();

        this._geomHigh = null;
        this._geomLow = null;
        this._geomImpostor = null;
        this._matHigh = null;
        this._matLow = null;
        this._matImpostor = null;

        this.lod0Dist = 40;
        this.lod1Dist = 90;
    }

    async load() {
        const treeColor = textureLoader.load('assets/tree/TreeColor2.png');
        const treeNormal = textureLoader.load('assets/tree/TreeNormal-512.jpg');
        const treeRmao = textureLoader.load('assets/tree/TreeRmao-512.jpg');
        treeColor.flipY = treeNormal.flipY = treeRmao.flipY = false;
        treeColor.colorSpace = THREE.SRGBColorSpace;

        const [gltfHigh, gltfLow] = await Promise.all([
            gltfLoader.loadAsync('assets/tree/tree.glb'),
            gltfLoader.loadAsync('assets/tree/treeLOD1.glb'),
        ]);

        this._geomHigh = getMergedGeometry(gltfHigh);
        this._geomLow = getMergedGeometry(gltfLow);

        this._geomImpostor = new THREE.PlaneGeometry(4, 7);
        this._geomImpostor.translate(0, 3.5, 0);

        this._matHigh = new THREE.MeshStandardMaterial({
            map: treeColor, normalMap: treeNormal, aoMap: treeRmao,
            alphaTest: 0.5, transparent: true, side: THREE.DoubleSide,
        });
        this._matLow = new THREE.MeshStandardMaterial({
            map: treeColor, alphaTest: 0.5, transparent: true, side: THREE.DoubleSide,
        });
        this._matImpostor = new THREE.MeshStandardMaterial({
            map: textureLoader.load('assets/tree/TreeImpostor.png'),
            transparent: true, alphaTest: 0.5, side: THREE.DoubleSide,
        });

        this._setupMeshes(CONFIG.treeCount);
        this._placeTrees({ count: CONFIG.treeCount, scaleMin: 2, scaleMax: 3.5 });
    }

    _setupMeshes(count) {
        if (this._meshLOD0) {
            this._scene.remove(this._meshLOD0, this._meshLOD1, this._meshLOD2);
        }
        this._meshLOD0 = new THREE.InstancedMesh(this._geomHigh, this._matHigh, count);
        this._meshLOD1 = new THREE.InstancedMesh(this._geomLow, this._matLow, count);
        this._meshLOD2 = new THREE.InstancedMesh(this._geomImpostor, this._matImpostor, count);

        this._meshLOD0.castShadow = true;
        this._meshLOD0.frustumCulled = false;
        this._meshLOD1.frustumCulled = false;
        this._meshLOD2.frustumCulled = false;
        this._scene.add(this._meshLOD0, this._meshLOD1, this._meshLOD2);
    }

    _placeTrees({ count, scaleMin, scaleMax }) {
        this._treesData = [];
        const { _dummy, _pos, _normal, _upWorld } = this;

        for (let i = 0; i < count; i++) {
            this._sampler.sample(_pos, _normal);
            this._terrainMesh.localToWorld(_pos);
            if (_pos.y < 0.25) { i--; continue; }

            const pos = _pos.clone();
            pos.y -= 0.7;
            const quat = new THREE.Quaternion().setFromAxisAngle(_upWorld, myRandom() * Math.PI * 2);
            const s = scaleMin + myRandom() * (scaleMax - scaleMin);
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

    updateSampler(sampler, terrainMesh) {
        this._sampler = sampler;
        this._terrainMesh = terrainMesh;
    }

    regeneratePlacement(config) {
        if (!this._geomHigh) return;
        this.lod0Dist = config.lod0Dist;
        this.lod1Dist = config.lod1Dist;
        this._setupMeshes(config.count);
        this._placeTrees(config);
    }

    update(camera) {
        if (!this._meshLOD0) return;

        const camPos = this._camPos;
        camera.getWorldPosition(camPos);
        const { _dummy } = this;

        for (let i = 0; i < this._treesData.length; i++) {
            const tree = this._treesData[i];
            if (!tree) continue;

            const dist = camPos.distanceTo(tree.position);
            _dummy.position.copy(tree.position);
            _dummy.position.y -= 0.7;

            if (dist < this.lod0Dist) {
                _dummy.quaternion.copy(tree.quaternion);
                this._setLOD(i, tree.s, this._meshLOD0, this._meshLOD1, this._meshLOD2);
            } else if (dist < this.lod1Dist) {
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
