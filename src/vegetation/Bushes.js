import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CONFIG } from '../config.js';
import { textureLoader } from '../core/Loaders.js';
import { myRandom } from '../utils/random.js';
import { initInvisible } from '../utils/instancing.js';

export class BushSystem {
    constructor(scene, sampler, terrainMesh) {
        const planes = Array.from({ length: 4 }, (_, i) => {
            const p = new THREE.PlaneGeometry(1.5, 1.5);
            p.translate(0, 0.75, 0);
            p.rotateY((Math.PI / 4) * i);
            return p;
        });

        const mesh = new THREE.InstancedMesh(
            BufferGeometryUtils.mergeGeometries(planes),
            new THREE.MeshStandardMaterial({
                map: textureLoader.load('assets/bush/BushBaseColor.png'),
                aoMap: textureLoader.load('assets/bush/BushOcclusionRoughnessMetallic.png'),
                alphaTest: 0.5,
                side: THREE.DoubleSide,
            }),
            CONFIG.bushCount
        );
        initInvisible(mesh, CONFIG.bushCount);
        scene.add(mesh);

        const dummy    = new THREE.Object3D();
        const _pos     = new THREE.Vector3();
        const _normal  = new THREE.Vector3();
        const _quat    = new THREE.Quaternion();
        const _upWorld = new THREE.Vector3(0, 1, 0);

        for (let i = 0; i < CONFIG.bushCount; i++) {
            sampler.sample(_pos, _normal);
            terrainMesh.localToWorld(_pos);
            if (_pos.y < 0.30) continue;

            dummy.position.copy(_pos);
            _quat.setFromAxisAngle(_upWorld, myRandom() * Math.PI * 2);
            dummy.quaternion.copy(_quat);
            const s = 0.5 + myRandom();
            dummy.scale.set(s, s, s);
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
        }
        mesh.instanceMatrix.needsUpdate = true;
    }
}
