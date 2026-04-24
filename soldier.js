import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class Soldier {
  constructor(scene, camera, terrain) {
    this.scene = scene;
    this.camera = camera;
    this.terrain = terrain;

    this.model = null;
    this.mixer = null;
    this.animations = [];
    this.currentAnimName = '';
    this.currentAction = null;

    this.keys = { w: false, a: false, s: false, d: false, shift: false };
    this._initListeners();

    // Groupe pour lier le perso et la caméra
    this.playerGroup = new THREE.Group();
    this.scene.add(this.playerGroup);
  }

  _initListeners() {
    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      if (key === 'z' || key === 'arrowup') this.keys.w = true;
      if (key === 's' || key === 'arrowdown') this.keys.s = true;
      if (key === 'q' || key === 'arrowleft') this.keys.a = true;
      if (key === 'd' || key === 'arrowright') this.keys.d = true;
      if (key === 'shift') this.keys.shift = true;
    });
    window.addEventListener('keyup', (e) => {
      const key = e.key.toLowerCase();
      if (key === 'z' || key === 'arrowup') this.keys.w = false;
      if (key === 's' || key === 'arrowdown') this.keys.s = false;
      if (key === 'q' || key === 'arrowleft') this.keys.a = false;
      if (key === 'd' || key === 'arrowright') this.keys.d = false;
      if (key === 'shift') this.keys.shift = false;
    });
  }

  load(path) {
    const loader = new GLTFLoader();
    return new Promise((resolve) => {
      loader.load(path, (gltf) => {
        this.model = gltf.scene;

        // --- AJUSTEMENT DU SCALE ---
        // Si 0.5 était trop petit ou trop grand, ajuste ici (ex: 1.0 ou 2.0)
        this.model.scale.set(2.5, 2.5, 2.5);

        this.playerGroup.add(this.model);

        // Ajustement de la caméra pour suivre le nouveau scale
        this.camera.position.set(0, 8, 10);
        this.camera.lookAt(new THREE.Vector3(0, 5, 5));
        this.playerGroup.add(this.camera);

        this.mixer = new THREE.AnimationMixer(this.model);
        this.animations = gltf.animations;
        this.playAnimation('Idle');

        resolve();
      });
    });
  }

  playAnimation(name) {
    if (this.currentAnimName === name) return;
    const clip = this.animations.find(a => a.name === name);
    if (clip) {
      const action = this.mixer.clipAction(clip);
      if (this.currentAction) this.currentAction.fadeOut(0.2);
      action.reset().fadeIn(0.2).play();
      this.currentAction = action;
      this.currentAnimName = name;
    }
  }

  update(delta, terrain) {
    if (!this.model) return;

    this.mixer.update(delta);

    const walkSpeed = 10 * delta;
    const runSpeed = 25 * delta;
    const rotSpeed = 3 * delta;

    let currentMoveSpeed = this.keys.shift ? runSpeed : walkSpeed;
    let isMoving = false

    // Rotation (A et D)
    if (this.keys.a) this.playerGroup.rotation.y += rotSpeed;
    if (this.keys.d) this.playerGroup.rotation.y -= rotSpeed;

    if (this.keys.s) {
      this.playerGroup.translateZ(currentMoveSpeed);
      isMoving = true;
    }
    if (this.keys.w) {
      this.playerGroup.translateZ(-currentMoveSpeed);
      isMoving = true;
    }

    // Gestion des animations
    if (isMoving) {
      if (this.keys.shift) {
        this.playAnimation('Run'); // Assure-toi que 'Run' existe dans ton GLB
      } else {
        this.playAnimation('Walk');
      }
    } else {
      this.playAnimation('Idle');
    }

    // --- thx Dany pour le raycast ---
    const rayOrigin = new THREE.Vector3(this.playerGroup.position.x, 20, this.playerGroup.position.z);
    const raycaster = new THREE.Raycaster(rayOrigin, new THREE.Vector3(0, -1, 0));
    const intersects = raycaster.intersectObject(terrain);

    if (intersects.length > 0) {
      let groundY = intersects[0].point.y; // 0.25 = niveau de ton eau
      if (groundY < -2.8) groundY = -2.8;
      this.playerGroup.position.y = THREE.MathUtils.lerp(this.playerGroup.position.y, groundY, 0.1);
    }
  }
}