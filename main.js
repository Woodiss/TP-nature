import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createNoise2D } from 'simplex-noise';
import Stats from 'stats.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

/**
 * BASE & INITIALISATION
 */
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ReinhardToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('ThreeJS').appendChild(renderer.domElement);

/**
 * INITIALISATION DU COMPOSER
 */
const composer = new EffectComposer(renderer);
composer.setSize(window.innerWidth, window.innerHeight);
composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.0,  // strength
    0.4,  // radius
    0.90  // threshold
);
composer.addPass(bloomPass);

const outputPass = new OutputPass();
composer.addPass(outputPass);

const stats = new Stats();
document.body.appendChild(stats.dom);

const textureLoader = new THREE.TextureLoader();
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

// PRNG pour la répétabilité
function mulberry32(a) {
    return function () {
        let t = a += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}
const myRandom = mulberry32(42);
const noise2D = createNoise2D(myRandom);

/**
 * ENVIRONNEMENT (Ciel & Lumières)
 */
const cubeTextureLoader = new THREE.CubeTextureLoader();
scene.background = cubeTextureLoader.load([
    'assets/sky_42_2k/sky_42_cubemap_2k/px.png', 'assets/sky_42_2k/sky_42_cubemap_2k/nx.png',
    'assets/sky_42_2k/sky_42_cubemap_2k/py.png', 'assets/sky_42_2k/sky_42_cubemap_2k/ny.png',
    'assets/sky_42_2k/sky_42_cubemap_2k/pz.png', 'assets/sky_42_2k/sky_42_cubemap_2k/nz.png'
]);
scene.fog = new THREE.FogExp2(0x87ceeb, 0.002);

const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.2);
scene.add(hemiLight);

const sunLight = new THREE.DirectionalLight(0xfff5b6, 1.2);
sunLight.position.set(-50, 80, 50);
sunLight.castShadow = true;

// Configuration de la portée des ombres (très important !)
sunLight.shadow.camera.left = -70;
sunLight.shadow.camera.right = 70;
sunLight.shadow.camera.top = 70;
sunLight.shadow.camera.bottom = -70;
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 500;
// Pour que les ombres soient nettes sur le sol
// sunLight.shadow.bias = -1;

// Résolution de l'ombre (plus c'est haut, plus c'est net)
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;

scene.add(sunLight);

camera.position.set(15, 10, 15);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

/**
 * TERRAIN
 */
const geometrySol = new THREE.PlaneGeometry(128, 128, 250, 250);
const posAttr = geometrySol.attributes.position;
for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const y = posAttr.getY(i);
    const z = noise2D(x * 0.02, y * 0.02) * 5;
    posAttr.setZ(i, z);
}
posAttr.needsUpdate = true;
geometrySol.computeVertexNormals();

const diffTex = textureLoader.load('assets/ground/rocky_terrain_02_diff_1k.png');
const normTex = textureLoader.load('assets/ground/rocky_terrain_02_nor_dx_1k.png');
const armTex = textureLoader.load('assets/ground/rocky_terrain_02_arm_1k.png');

[diffTex, normTex, armTex].forEach(t => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(10, 10);
});

const materialSol = new THREE.MeshStandardMaterial({
    map: diffTex,
    normalMap: normTex,
    aoMap: armTex,
    roughnessMap: armTex,
    metalnessMap: armTex,
    roughness: 1,
    metalness: 0
});

const terrain = new THREE.Mesh(geometrySol, materialSol);
terrain.rotation.x = -Math.PI / 2;
terrain.receiveShadow = true;
scene.add(terrain);

const sampler = new MeshSurfaceSampler(terrain);
sampler.setRandomGenerator(myRandom);
sampler.build();

/**
 * TOOLS POUR INSTANCING
 */
const dummy = new THREE.Object3D();
const _position = new THREE.Vector3();
const _normal = new THREE.Vector3();
const _quaternion = new THREE.Quaternion();
const _upWorld = new THREE.Vector3(0, 1, 0);

/**
 * ARBRES (Modèle centré Blender)
 */
const treeColor = textureLoader.load('assets/tree/TreeColor2.png');
const treeNormal = textureLoader.load('assets/tree/TreeNormal-512.jpg');
const treeRmao = textureLoader.load('assets/tree/TreeRmao-512.jpg');
treeColor.flipY = treeNormal.flipY = treeRmao.flipY = false;
treeColor.colorSpace = THREE.SRGBColorSpace;

gltfLoader.load('assets/tree/tree.glb', (gltf) => {
    const geometries = [];
    gltf.scene.updateMatrixWorld(true);
    gltf.scene.traverse((child) => {
        if (child.isMesh) {
            const geom = child.geometry.clone();
            geom.applyMatrix4(child.matrixWorld);
            geometries.push(geom);
        }
    });

    const mergedGeom = BufferGeometryUtils.mergeGeometries(geometries);
    const treeMat = new THREE.MeshStandardMaterial({
        map: treeColor,
        normalMap: treeNormal,
        aoMap: treeRmao,
        roughnessMap: treeRmao,
        metalnessMap: treeRmao,
        alphaTest: 0.5,
        transparent: true,
        side: THREE.DoubleSide
    });

    const treeCount = 150;
    const treeMesh = new THREE.InstancedMesh(mergedGeom, treeMat, treeCount);
    treeMesh.castShadow = true;
    scene.add(treeMesh);

    for (let i = 0; i < treeCount; i++) {
        sampler.sample(_position, _normal);
        const upLocal = new THREE.Vector3(0, 0, 1);

        terrain.localToWorld(_position);
        dummy.position.copy(_position);
        dummy.position.y -= 0.7;
        _quaternion.setFromAxisAngle(_upWorld, myRandom() * Math.PI * 2);
        dummy.quaternion.copy(_quaternion);
        const s = 2 + myRandom() * 1.5;
        dummy.scale.set(s, s, s);
        dummy.updateMatrix();
        treeMesh.setMatrixAt(i, dummy.matrix);
    }
    treeMesh.instanceMatrix.needsUpdate = true;
});

/**
 * HERBE (Atlas 2x2)
 */
const grassCount = 100000;
const grassPerVariant = Math.floor(grassCount / 4);
const grassColor = textureLoader.load('assets/grass/GrassColor.png');
const grassNormal = textureLoader.load('assets/grass/GrassNormal.png');

function createGrassGeo(qx, qy) {
    const geo = new THREE.PlaneGeometry(0.3, 0.3);
    geo.translate(0, 0.15, 0);
    const uvs = geo.attributes.uv;
    for (let i = 0; i < uvs.count; i++) {
        uvs.setXY(i, uvs.getX(i) * 0.5 + qx * 0.5, uvs.getY(i) * 0.5 + qy * 0.5);
    }
    return geo;
}

const grassGeos = [
    createGrassGeo(0, 1),
    createGrassGeo(1, 1),
    createGrassGeo(0, 0),
    createGrassGeo(1, 0)
];

const grassMat = new THREE.MeshStandardMaterial({
    map: grassColor,
    normalMap: grassNormal,
    alphaTest: 0.5,
    side: THREE.DoubleSide
});
const grassMeshes = grassGeos.map(geo => {
    const m = new THREE.InstancedMesh(geo, grassMat, grassPerVariant);
    scene.add(m);
    return m;
});

const counters = [0, 0, 0, 0];
for (let i = 0; i < grassCount; i++) {
    sampler.sample(_position, _normal);
    terrain.localToWorld(_position);
    dummy.position.copy(_position);
    _quaternion.setFromAxisAngle(_upWorld, myRandom() * Math.PI * 2);
    dummy.quaternion.copy(_quaternion);
    const s = 0.5 + myRandom() * 3;
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();

    const variant = Math.floor(myRandom() * 4);
    if (counters[variant] < grassPerVariant) {
        grassMeshes[variant].setMatrixAt(counters[variant], dummy.matrix);
        counters[variant]++;
    }
}
grassMeshes.forEach(m => m.instanceMatrix.needsUpdate = true);

/**
 * BUISSONS (Crossed Planes)
 */
const bushPlanes = [];
for (let i = 0; i < 4; i++) {
    const p = new THREE.PlaneGeometry(1.5, 1.5);
    p.translate(0, 0.75, 0);
    p.rotateY((Math.PI / 4) * i);
    bushPlanes.push(p);
}
const bushGeo = BufferGeometryUtils.mergeGeometries(bushPlanes);
const bushMat = new THREE.MeshStandardMaterial({
    map: textureLoader.load('assets/bush/BushBaseColor.png'),
    aoMap: textureLoader.load('assets/bush/BushOcclusionRoughnessMetallic.png'),
    alphaTest: 0.5, side: THREE.DoubleSide
});

const bushCount = 300;
const bushMesh = new THREE.InstancedMesh(bushGeo, bushMat, bushCount);
scene.add(bushMesh);

for (let i = 0; i < bushCount; i++) {
    sampler.sample(_position, _normal);
    terrain.localToWorld(_position);
    dummy.position.copy(_position);
    _quaternion.setFromAxisAngle(_upWorld, myRandom() * Math.PI * 2);
    dummy.quaternion.copy(_quaternion);
    const s = 0.5 + myRandom();
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();
    bushMesh.setMatrixAt(i, dummy.matrix);
}
bushMesh.instanceMatrix.needsUpdate = true;

// FLOWERS
const flowerColors = [
    new THREE.Color("#FF0055"), // Rose néon
    new THREE.Color("#c37b10"), // Orange vif
    new THREE.Color("#AA00FF"), // Violet profond
    new THREE.Color("#19cfab"), // Turquoise
    new THREE.Color("#FFD700"), // Or / Jaune tournesol
];
const flowerConfigs = [
    { threshold: 0.55, mode: 0.0 },
    { threshold: 0.00, mode: 1.0 },
    { threshold: 0.15, mode: 1.0 },
    { threshold: 0.00, mode: 1.0 },
    { threshold: 0.10, mode: 1.0 },
];

function createFlowerMaterial(alphaTex, flowerColor, threshold, mode) {
    const material = new THREE.MeshStandardMaterial({
        map: alphaTex,
        transparent: true,
        alphaTest: 0.5,
        side: THREE.DoubleSide,
    });

    material.onBeforeCompile = (shader) => {
        // On passe les valeurs reçues en arguments aux uniforms du shader
        shader.uniforms.uFlowerColor = { value: flowerColor };
        shader.uniforms.uStemColor = { value: new THREE.Color("#2e4a1e") };
        shader.uniforms.uThreshold = { value: threshold };
        shader.uniforms.uMode = { value: mode }; // <--- Utilise l'argument 'mode'

        shader.vertexShader = `varying vec2 vUv;\n` + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace(
            '#include <uv_vertex>',
            `#include <uv_vertex>\nvUv = uv;`
        );

        shader.fragmentShader = `
            uniform vec3 uFlowerColor;
            uniform vec3 uStemColor;
            uniform float uThreshold;
            uniform float uMode;
            varying vec2 vUv;
        ` + shader.fragmentShader;

        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <color_fragment>',
            `
            vec4 texElement = texture2D(map, vUv);
            float mask = texElement.r;

            float factor;
            if (uMode > 0.5) {
                // MODE HORIZONTAL (Axe central vers bords)
                // abs(vUv.x - 0.5) donne 0 au centre et 0.5 sur les bords.
                // On multiplie par 2.0 pour avoir une plage de 0.0 à 1.0.
                factor = abs(vUv.x - 0.5) * 2.0;
            } else {
                // MODE VERTICAL (Bas vers Haut)
                factor = vUv.y;
            }

            // On applique le seuil sur ce nouveau facteur
            float mixStrength = smoothstep(uThreshold - 0.1, uThreshold + 0.1, factor);
            vec3 finalColor = mix(uStemColor, uFlowerColor, mixStrength);

            diffuseColor.rgb = finalColor;
            diffuseColor.a = mask;
            `
        );
    };

    return material;
}

const flowerAlphas = [
    textureLoader.load('assets/flower/FlowerAlpha1.png'),
    textureLoader.load('assets/flower/FlowerAlpha2.png'),
    textureLoader.load('assets/flower/FlowerAlpha3.png'),
    textureLoader.load('assets/flower/FlowerAlpha4.png'),
    textureLoader.load('assets/flower/FlowerAlpha5.png'),
];

// Géométrie en croix (Billboards)
const flowerGeo = new THREE.PlaneGeometry(1, 1);
flowerGeo.translate(0, 0.5, 0);
const crossedGeo = BufferGeometryUtils.mergeGeometries([
    flowerGeo.clone(),
    flowerGeo.clone().rotateY(Math.PI / 2)
]);

const flowersPerType = 100;

flowerAlphas.forEach((tex, i) => {
    const config = flowerConfigs[i];

    const mat = createFlowerMaterial(
        tex,
        flowerColors[i],
        config.threshold,
        config.mode
    );

    const mesh = new THREE.InstancedMesh(crossedGeo, mat, flowersPerType);

    for (let j = 0; j < flowersPerType; j++) {
        sampler.sample(_position, _normal);
        terrain.localToWorld(_position);

        dummy.position.copy(_position);
        dummy.rotation.y = myRandom() * Math.PI;
        const s = 1.5 + myRandom() * 1.0;
        dummy.scale.set(s, s, s);
        dummy.updateMatrix();

        mesh.setMatrixAt(j, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    scene.add(mesh);
});

// ANIMATIONS
function animate() {
    stats.begin();
    controls.update();
    composer.render();
    stats.end();
    requestAnimationFrame(animate);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});