import * as THREE from 'three';
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
import { Soldier } from './soldier.js';
// import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * BASE & INITIALISATION
 */
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const clock = new THREE.Clock();
let frameCount = 0;
let meshLOD0, meshLOD1, meshLOD2;

// fog
const fogColor = 0x87ceeb;
scene.fog = new THREE.FogExp2(fogColor, 0.005);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ReinhardToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('ThreeJS').appendChild(renderer.domElement);

// CONFIG
const CONFIG = {
    terrainSize: 128,
    terrainSegments: 250,
    treeCount: 150,
    bushCount: 100,
    flowersPerType: 100,
    grassCount: 100000,
    leafCount: 500,
};

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
    0.15,  // strength
    0.5,  // radius
    0.8   // threshold
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
    'assets/sky_42_2k/sky_42_cubemap_2k/px.png',
    'assets/sky_42_2k/sky_42_cubemap_2k/nx.png',
    'assets/sky_42_2k/sky_42_cubemap_2k/py.png',
    'assets/sky_42_2k/sky_42_cubemap_2k/ny.png',
    'assets/sky_42_2k/sky_42_cubemap_2k/pz.png',
    'assets/sky_42_2k/sky_42_cubemap_2k/nz.png'
]);

const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.2);
scene.add(hemiLight);

let soldier = new Soldier(scene, camera);
soldier.load('assets/soldier.glb').then(() => {
    console.log("Soldat prêt !");
});

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
// const controls = new OrbitControls(camera, renderer.domElement);
// controls.enableDamping = true;

/**
 * TERRAIN
 */
const geometrySol = new THREE.PlaneGeometry(CONFIG.terrainSize, CONFIG.terrainSize, CONFIG.terrainSegments, CONFIG.terrainSegments);
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
const treesData = [];
const treeColor = textureLoader.load('assets/tree/TreeColor2.png');
const treeNormal = textureLoader.load('assets/tree/TreeNormal-512.jpg');
const treeRmao = textureLoader.load('assets/tree/TreeRmao-512.jpg');
treeColor.flipY = treeNormal.flipY = treeRmao.flipY = false;
treeColor.colorSpace = THREE.SRGBColorSpace;

const matImpostor = new THREE.MeshStandardMaterial({
    map: textureLoader.load('assets/tree/TreeImpostor.png'),
    transparent: true,
    alphaTest: 0.5,
    side: THREE.DoubleSide
});

// Fonction pour extraire la géométrie d'un GLTF
function getMergedGeometry(gltf) {
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

// Chargement synchronisé des modèles 3D
Promise.all([
    gltfLoader.loadAsync('assets/tree/tree.glb'),
    gltfLoader.loadAsync('assets/tree/treeLOD1.glb')
]).then(([gltfHigh, gltfLow]) => {

    const geomHigh = getMergedGeometry(gltfHigh);
    const geomLow = getMergedGeometry(gltfLow);

    // Géo Imposteur (Plan vertical)
    const geomImpostor = new THREE.PlaneGeometry(4, 7);
    geomImpostor.translate(0, 3.5, 0);

    // Création des 3 InstancedMeshes
    const treeMat = new THREE.MeshStandardMaterial({
        map: treeColor,
        normalMap: treeNormal,
        aoMap: treeRmao,
        alphaTest: 0.5,
        transparent: true,
        side: THREE.DoubleSide
    });

    const treeMatLow = new THREE.MeshStandardMaterial({
        map: treeColor, // On garde la couleur
        alphaTest: 0.5,
        transparent: true,
        side: THREE.DoubleSide
        // On retire normalMap et aoMap pour soulager le GPU
    });

    meshLOD0 = new THREE.InstancedMesh(geomHigh, treeMat, CONFIG.treeCount);
    meshLOD1 = new THREE.InstancedMesh(geomLow, treeMatLow, CONFIG.treeCount);
    meshLOD2 = new THREE.InstancedMesh(geomImpostor, matImpostor, CONFIG.treeCount);

    meshLOD0.castShadow = true;
    scene.add(meshLOD0, meshLOD1, meshLOD2);
    meshLOD0.frustumCulled = false;
    meshLOD1.frustumCulled = false;
    meshLOD2.frustumCulled = false;

    // Remplissage des données et placement initial
    for (let i = 0; i < CONFIG.treeCount; i++) {
        sampler.sample(_position, _normal);
        terrain.localToWorld(_position);

        // pas placer dans l'eau
        if (_position.y < 0.25) {
            i--;
            continue;
        }

        const pos = _position.clone();
        pos.y -= 0.7;
        const quat = new THREE.Quaternion().setFromAxisAngle(_upWorld, myRandom() * Math.PI * 2);
        const s = 2 + myRandom() * 1.5;

        treesData.push({ position: pos, quaternion: quat, s: s });

        // On initialise tout à scale 0 (updateLODs gèrera l'affichage)
        dummy.scale.set(0, 0, 0);
        dummy.updateMatrix();
        meshLOD0.setMatrixAt(i, dummy.matrix);
        meshLOD1.setMatrixAt(i, dummy.matrix);
        meshLOD2.setMatrixAt(i, dummy.matrix);
    }

    meshLOD0.instanceMatrix.needsUpdate = true;
    meshLOD1.instanceMatrix.needsUpdate = true;
    meshLOD2.instanceMatrix.needsUpdate = true;
});

/**
 * HERBE (Atlas 2x2)
 */
const grassPerVariant = Math.floor(CONFIG.grassCount / 4);
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
for (let i = 0; i < CONFIG.grassCount; i++) {
    sampler.sample(_position, _normal);
    terrain.localToWorld(_position);
    if (_position.y < 0.30) continue;
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

const bushMesh = new THREE.InstancedMesh(bushGeo, bushMat, CONFIG.bushCount);
initInvisible(bushMesh, CONFIG.bushCount);
scene.add(bushMesh);

for (let i = 0; i < CONFIG.bushCount; i++) {
    sampler.sample(_position, _normal);
    terrain.localToWorld(_position);
    dummy.position.copy(_position);
    // pas placer dans l'eau
    if (_position.y < 0.30) continue;
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

            // OVER CAPE DES COULEURS POUR QUE LE BLOOM FONCTIONNE :D
            diffuseColor.rgb = finalColor * 15.0;
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


flowerAlphas.forEach((tex, i) => {
    const config = flowerConfigs[i];

    const mat = createFlowerMaterial(
        tex,
        flowerColors[i],
        config.threshold,
        config.mode
    );

    const mesh = new THREE.InstancedMesh(crossedGeo, mat, CONFIG.flowersPerType);
    initInvisible(mesh, CONFIG.flowersPerType)

    for (let j = 0; j < CONFIG.flowersPerType; j++) {
        sampler.sample(_position, _normal);
        terrain.localToWorld(_position);
        if (_position.y < 0.25) {
            continue;
        }

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


// GESTION LOD + IMPOSTER
const _v = new THREE.Vector3();
function updateLODs() {
    if (!meshLOD0 || !meshLOD1 || !meshLOD2) return;

    // --- FIX : Récupérer la vraie position mondiale de la caméra ---
    const camWorldPos = new THREE.Vector3();
    camera.getWorldPosition(camWorldPos);

    for (let i = 0; i < CONFIG.treeCount; i++) {
        const tree = treesData[i];
        if (!tree) continue;

        const dist = camWorldPos.distanceTo(tree.position);

        dummy.position.copy(tree.position);
        dummy.position.y -= 0.7;

        if (dist < 40) {
            // LOD0
            dummy.quaternion.copy(tree.quaternion);
            setInstanceScale(i, tree.s, meshLOD0, meshLOD1, meshLOD2);
        } else if (dist < 90) {
            // LOD1
            dummy.quaternion.copy(tree.quaternion);
            setInstanceScale(i, tree.s, meshLOD1, meshLOD0, meshLOD2);
        } else {
            // Imposteur (LOD2)
            dummy.lookAt(camWorldPos.x, dummy.position.y, camWorldPos.z);
            setInstanceScale(i, tree.s, meshLOD2, meshLOD0, meshLOD1);
        }
    }

    meshLOD0.instanceMatrix.needsUpdate = true;
    meshLOD1.instanceMatrix.needsUpdate = true;
    meshLOD2.instanceMatrix.needsUpdate = true;
}

function setInstanceScale(index, scaleVal, activeMesh, hide1, hide2) {
    dummy.scale.set(scaleVal, scaleVal, scaleVal);
    dummy.updateMatrix();
    activeMesh.setMatrixAt(index, dummy.matrix);

    // On le cache sur les autres (scale à 0)
    dummy.scale.set(0, 0, 0);
    dummy.updateMatrix();
    hide1.setMatrixAt(index, dummy.matrix);
    hide2.setMatrixAt(index, dummy.matrix);
}


// WATER + SHADER
// Création du plan d'eau
const waterGeometry = new THREE.PlaneGeometry(CONFIG.terrainSize, CONFIG.terrainSize); // Plus grand que le terrain
const waterMaterial = createWaterMaterial();
const water = new THREE.Mesh(waterGeometry, waterMaterial);

water.rotation.x = -Math.PI / 2; // À plat
water.position.y = 0.25;
scene.add(water);

function createWaterMaterial() {
    return new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uResolution: { value: new THREE.Vector2(CONFIG.terrainSize, CONFIG.terrainSize) }
        },
        transparent: true,
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                // On garde un plan plat pour ce shader (ou ajoute des vagues si tu veux)
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float uTime;
            uniform vec2 uResolution;
            varying vec2 vUv;

            #define TAU 6.28318530718
            #define MAX_ITER 5

            void main() {
                float time = uTime * 0.2;
                
                // On utilise vUv au lieu de fragCoord car c'est un plan
                vec2 uv = vUv;
                
                // Calcul de la turbulence (ton code adapté)
                vec2 p = mod(uv * TAU * 5.0, TAU) - 250.0;
                vec2 i = vec2(p);
                float c = 1.0;
                float inten = .005;

                for (int n = 0; n < MAX_ITER; n++) {
                    float t = time * (1.0 - (3.5 / float(n + 1)));
                    i = p + vec2(cos(t - i.x) + sin(t + i.y), sin(t - i.y) + cos(t + i.x));
                    c += 1.0 / length(vec2(p.x / (sin(i.x + t) / inten), p.y / (cos(i.y + t) / inten)));
                }
                
                c /= float(MAX_ITER);
                c = 1.17 - pow(c, 1.4);
                
                vec3 colour = vec3(pow(abs(c), 8.0));
                // Couleur de l'eau stylisée (bleu profond + caustiques)
                colour = clamp(colour + vec3(0.0, 0.35, 0.5), 0.0, 1.0);

                gl_FragColor = vec4(colour, 0.3); // opacité
            }
        `
    });
}

function initInvisible(mesh, count) {
    for (let i = 0; i < count; i++) {
        dummy.scale.set(0, 0, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
}

// PARTICLES
const countShrek = Math.floor(CONFIG.leafCount * 0.05); // 5%
const countNormal = Math.floor((CONFIG.leafCount - countShrek) / 2);

const counts = [countNormal, countNormal, countShrek];
const textures = [
    textureLoader.load('assets/particles/leaf.png'),
    textureLoader.load('assets/particles/leaf2.png'),
    textureLoader.load('assets/particles/shrek.png')
];
const leafSystems = [];
const leafGeo = new THREE.PlaneGeometry(4, 4);

textures.forEach((tex, index) => {
    // On crée un matériau par texture
    const mat = new THREE.MeshStandardMaterial({
        map: tex,
        transparent: true,
        alphaTest: 0.5,
        side: THREE.DoubleSide,
        fog: true
    });

    const count = counts[index];
    const mesh = new THREE.InstancedMesh(leafGeo, mat, count);
    mesh.frustumCulled = false;

    const particles = [];
    for (let i = 0; i < count; i++) {
        particles.push({
            pos: new THREE.Vector3(
                (myRandom() - 0.5) * CONFIG.terrainSize,
                myRandom() * 13 + 5,
                (myRandom() - 0.5) * CONFIG.terrainSize
            ),
            speed: 0.02 + myRandom() * 0.05,
            rotSpeed: myRandom() * 0.02,
            oscFreq: 0.5 + myRandom() * 2,
            oscAmp: 0.2 + myRandom() * 0.5,
            offset: myRandom() * Math.PI * 2
        });
    }

    leafSystems.push({ mesh, data: particles, count });
    scene.add(mesh);
});

function updateLeaves(time) {
    leafSystems.forEach(system => {
        for (let i = 0; i < system.count; i++) {
            const p = system.data[i];

            // Logique de mouvement (identique à ton idée)
            p.pos.y -= p.speed;
            const currentX = p.pos.x + Math.sin(time * p.oscFreq + p.offset) * p.oscAmp;
            const currentZ = p.pos.z + Math.cos(time * p.oscFreq + p.offset) * p.oscAmp;

            if (p.pos.y < 0) {
                p.pos.y = 13;
                p.pos.x = (myRandom() - 0.5) * CONFIG.terrainSize;
                p.pos.z = (myRandom() - 0.5) * CONFIG.terrainSize;
            }

            dummy.position.set(currentX, p.pos.y, currentZ);
            dummy.rotation.set(time * p.rotSpeed, time * p.rotSpeed * 1.5, 0);

            // Si c'est Shrek, on peut le faire un peu plus gros pour la blague
            const s = (system.count < 50) ? 0.4 : 0.2;
            dummy.scale.set(s, s, s);

            dummy.updateMatrix();
            system.mesh.setMatrixAt(i, dummy.matrix);
        }
        system.mesh.instanceMatrix.needsUpdate = true;
    });
}

// ANIMATIONS
function animate() {
    stats.begin();
    const delta = clock.getDelta();
    const time = performance.now() / 1000;
    frameCount++;
    if (soldier) {
        // On passe 'terrain' pour le raycast de hauteur
        soldier.update(delta, terrain);
    }
    // controls.update();
    if (frameCount % 10 === 0) updateLODs();
    if (water && water.material.uniforms) {
        water.material.uniforms.uTime.value = performance.now() / 1000;
    }
    updateLeaves(time);
    composer.render();
    stats.end();
    requestAnimationFrame(animate);
    // console.log(frameCount);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});