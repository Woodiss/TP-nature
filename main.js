import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { GUI } from 'lil-gui';
import { createNoise2D } from 'simplex-noise';
import Stats from 'stats.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
const textureLoader = new THREE.TextureLoader();

var stats = new Stats();
stats.showPanel(0);
document.body.appendChild(stats.dom);

document.getElementById('ThreeJS').appendChild(renderer.domElement);

renderer.setSize(window.innerWidth, window.innerHeight);
// renderer.setPixelRatio(0.5);

// Mise en place de la Skybox (CubeTextureLoader)
const cubeTextureLoader = new THREE.CubeTextureLoader();
scene.background = cubeTextureLoader.load([
    'assets/sky_42_2k/sky_42_cubemap_2k/px.png', // droite
    'assets/sky_42_2k/sky_42_cubemap_2k/nx.png', // gauche
    'assets/sky_42_2k/sky_42_cubemap_2k/py.png', // haut
    'assets/sky_42_2k/sky_42_cubemap_2k/ny.png', // bas
    'assets/sky_42_2k/sky_42_cubemap_2k/pz.png', // devant
    'assets/sky_42_2k/sky_42_cubemap_2k/nz.png'  // derrière
]);

// On garde un léger brouillard pour cacher la coupure à l'horizon (coloré pour "matcher" avec le ciel)
scene.fog = new THREE.FogExp2(0x87ceeb, 0.002);

// Hemisphere Light : Simule l'éclairage ambiant naturel (ciel + rebond du sol) 
// (Couleur ciel: bleu clair, Couleur sol: vert sombre/terre, Intensité)
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
scene.add(hemiLight);

// Directional Light : Le Soleil ! (Couleur légèrement chaude, Intensité plus forte)
const sunLight = new THREE.DirectionalLight(0xfff5b6, 1.2);
sunLight.position.set(-50, 100, 50);
scene.add(sunLight);
const noise2D = createNoise2D();

camera.position.set(50, 50, 50);

const controls = new OrbitControls(camera, renderer.domElement);

// FLORE
const diffTextureFlore = textureLoader.load('assets/ground/rocky_terrain_02_diff_1k.png');
const normalTextureFlore = textureLoader.load('assets/ground/rocky_terrain_02_nor_dx_1k.png');
const armTextureFlore = textureLoader.load('assets/ground/rocky_terrain_02_arm_1k.png');

// GRASS
const diffTextureGrass = textureLoader.load('assets/grass/GrassColor.png');
const normalTextureGrass = textureLoader.load('assets/grass/GrassNormal.png');
// const armTextureGrass = textureLoader.load('assets/grass/GrassColor.png');

function setTextureRepeat(texture, repeatX, repeatY) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeatX, repeatY);
}

setTextureRepeat(diffTextureFlore, 10, 10);
setTextureRepeat(normalTextureFlore, 10, 10);
setTextureRepeat(armTextureFlore, 10, 10);

const material = new THREE.MeshStandardMaterial({
    map: diffTextureFlore,
    normalMap: normalTextureFlore,
    aoMap: armTextureFlore,           // canal R → Ambient Occlusion
    roughnessMap: armTextureFlore,    // canal G → Roughness
    metalnessMap: armTextureFlore,    // canal B → Metalness
    roughness: 1,                // mettre à 1 pour que la map contrôle entièrement
    metalness: 1,                // la roche n'est pas métallique
});
const geometrySol = new THREE.PlaneGeometry(256, 256, 200, 200);
geometrySol.setAttribute('uv2', geometrySol.attributes.uv); // requis pour aoMap

const terrain = new THREE.Mesh(geometrySol, material);
terrain.rotation.x = -Math.PI / 2; // mettre le plan à l'horizontale
scene.add(terrain);

const positions = geometrySol.attributes.position;
for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = noise2D(x * 0.02, y * 0.02) * 5;  // fréquence * amplitude
    positions.setZ(i, z);
}
positions.needsUpdate = true;
geometrySol.computeVertexNormals(); // Recalculer les normales pour l'éclairage

// ==================== GRASS INSTANCING ====================
const grassCount = 400000;
const dummy = new THREE.Object3D();
const _position = new THREE.Vector3();
const _normal = new THREE.Vector3();

// Créer une géométrie de brin d'herbe avec UVs pour un quadrant de l'atlas 2x2
function createGrassGeometry(quadrantX, quadrantY) {
    const geo = new THREE.PlaneGeometry(1, 1, 1, 1);
    geo.translate(0, 0.3, 0); // pivot en bas

    // Remapper les UVs vers le bon quadrant (2x2 atlas)
    const uvs = geo.attributes.uv;
    for (let i = 0; i < uvs.count; i++) {
        const u = uvs.getX(i) * 0.5 + quadrantX * 0.5; // 0 ou 0.5
        const v = uvs.getY(i) * 0.5 + quadrantY * 0.5; // 0 ou 0.5
        uvs.setXY(i, u, v);
    }
    return geo;
}

// 4 géométries, une par quadrant : (col, row)
const grassGeometries = [
    createGrassGeometry(0, 1), // haut-gauche
    createGrassGeometry(1, 1), // haut-droite
    createGrassGeometry(0, 0), // bas-gauche
    createGrassGeometry(1, 0), // bas-droite
];

// Material partagé
const grassMaterial = new THREE.MeshStandardMaterial({
    map: diffTextureGrass,
    normalMap: normalTextureGrass,
    side: THREE.DoubleSide,
    alphaTest: 0.5,
});

// 4 InstancedMesh (un par variante), chacun reçoit ~1/4 des brins
const grassPerVariant = Math.floor(grassCount / 4);
const grassMeshes = grassGeometries.map(geo => {
    const mesh = new THREE.InstancedMesh(geo, grassMaterial, grassPerVariant);
    scene.add(mesh);
    return mesh;
});

// Sampler
const sampler = new MeshSurfaceSampler(terrain).build();
const _up = new THREE.Vector3(0, 1, 0);
const _quaternion = new THREE.Quaternion();
const _randomYaw = new THREE.Quaternion();

// Compteur par variante
const counters = [0, 0, 0, 0];

for (let i = 0; i < grassCount; i++) {
    sampler.sample(_position, _normal);

    terrain.localToWorld(_position);
    _normal.transformDirection(terrain.matrixWorld);

    // Tourne simplement l'herbe sur l'axe Y pour la variété, en ignorant la pente
    _quaternion.setFromAxisAngle(_up, Math.random() * Math.PI * 2);

    dummy.position.copy(_position);
    dummy.quaternion.copy(_quaternion);

    const scale = 0.5 + Math.random() * 1.5;
    dummy.scale.set(scale, scale, scale);
    dummy.updateMatrix();

    // Assigner aléatoirement à une des 4 variantes
    const variant = Math.floor(Math.random() * 4);
    if (counters[variant] < grassPerVariant) {
        grassMeshes[variant].setMatrixAt(counters[variant], dummy.matrix);
        counters[variant]++;
    }
}

grassMeshes.forEach(mesh => {
    mesh.instanceMatrix.needsUpdate = true;
});

// ==================== BUSH INSTANCING ====================
// Chargement des textures buisson
const diffTextureBush = textureLoader.load('assets/bush/BushBaseColor.png');
const ormTextureBush = textureLoader.load('assets/bush/BushOcclusionRoughnessMetallic.png');

// Créer le modèle en croix 4x pour le buisson
const planes = [];
for (let i = 0; i < 4; i++) {
    const plane = new THREE.PlaneGeometry(6, 6); // largeur 6, hauteur 6
    plane.translate(0, 3, 0); // pivot à la base
    // Tourner chaque plan de 45° par rapport au précédent
    plane.rotateY((Math.PI / 4) * i);
    planes.push(plane);
}
// Fusionner les 4 plans en une seule géométrie pour l'optimisation
const bushGeometry = BufferGeometryUtils.mergeGeometries(planes);

const bushMaterial = new THREE.MeshStandardMaterial({
    map: diffTextureBush,
    aoMap: ormTextureBush,
    roughnessMap: ormTextureBush,
    metalnessMap: ormTextureBush,
    side: THREE.DoubleSide,
    alphaTest: 0.5, // Très important pour découper les feuilles !
    roughness: 0.8,
});

const bushCount = 500;
const bushMesh = new THREE.InstancedMesh(bushGeometry, bushMaterial, bushCount);
scene.add(bushMesh);

for (let i = 0; i < bushCount; i++) {
    sampler.sample(_position, _normal);

    terrain.localToWorld(_position);
    _normal.transformDirection(terrain.matrixWorld);

    // Les buissons poussent verticalement
    _quaternion.setFromAxisAngle(_up, Math.random() * Math.PI * 2);

    dummy.position.copy(_position);
    dummy.quaternion.copy(_quaternion);

    // Varier la taille des buissons
    const bushScale = 0.5 + Math.random();
    dummy.scale.set(bushScale, bushScale, bushScale);

    // Parfois enfoncer un peu certains buissons dans le sol pour la variété
    dummy.position.y -= Math.random() * 0.5;

    dummy.updateMatrix();
    bushMesh.setMatrixAt(i, dummy.matrix);
}
bushMesh.instanceMatrix.needsUpdate = true;

// ===========================================================

function animate() {
    stats.begin();
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
    stats.end();
}
animate();