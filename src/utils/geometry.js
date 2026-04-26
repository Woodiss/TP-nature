import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export function getMergedGeometry(gltf) {
    const geometries = [];
    gltf.scene.updateMatrixWorld(true);
    gltf.scene.traverse((child) => {
        if (child.isMesh) {
            const geom = child.geometry.clone();
            geom.applyMatrix4(child.matrixWorld);
            geometries.push(geom);
        }
    });
    return BufferGeometryUtils.mergeGeometries(geometries);
}
