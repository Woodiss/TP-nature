import * as THREE from 'three';
import { CONFIG } from '../config.js';

export function setupEnvironment(scene) {
    scene.fog = new THREE.FogExp2(0x87ceeb, 0.005);

    scene.background = new THREE.CubeTextureLoader().load([
        'assets/sky_42_2k/sky_42_cubemap_2k/px.png',
        'assets/sky_42_2k/sky_42_cubemap_2k/nx.png',
        'assets/sky_42_2k/sky_42_cubemap_2k/py.png',
        'assets/sky_42_2k/sky_42_cubemap_2k/ny.png',
        'assets/sky_42_2k/sky_42_cubemap_2k/pz.png',
        'assets/sky_42_2k/sky_42_cubemap_2k/nz.png',
    ]);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 0.2));

    const sunLight = new THREE.DirectionalLight(0xfff5b6, 1.2);
    sunLight.position.set(-50, 80, 50);

    if (CONFIG.shadows) {
        sunLight.castShadow = true;
        sunLight.shadow.camera.left   = -70;
        sunLight.shadow.camera.right  =  70;
        sunLight.shadow.camera.top    =  70;
        sunLight.shadow.camera.bottom = -70;
        sunLight.shadow.camera.near   = 0.5;
        sunLight.shadow.camera.far    = 500;
        sunLight.shadow.mapSize.width  = CONFIG.shadowMapSize;
        sunLight.shadow.mapSize.height = CONFIG.shadowMapSize;
    }

    scene.add(sunLight);
    return { sunLight };
}
