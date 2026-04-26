import * as THREE from 'three';

const _hidden = new THREE.Object3D();
_hidden.scale.set(0, 0, 0);
_hidden.updateMatrix();

export function initInvisible(mesh, count) {
    for (let i = 0; i < count; i++) {
        mesh.setMatrixAt(i, _hidden.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
}
