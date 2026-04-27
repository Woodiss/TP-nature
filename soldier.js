import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { noise2D } from './src/utils/random.js';

export class Soldier {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;

    this.model = null;
    this.mixer = null;
    this.animations = [];
    this.currentAnimName = '';
    this.currentAction = null;

    this.keys = { w: false, a: false, s: false, d: false, shift: false };
    this._initListeners();

    this.playerGroup = new THREE.Group();
    this.scene.add(this.playerGroup);
  }

  _initListeners() {
    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      if (key === 'z' || key === 'arrowup')    this.keys.w = true;
      if (key === 's' || key === 'arrowdown')  this.keys.s = true;
      if (key === 'q' || key === 'arrowleft')  this.keys.a = true;
      if (key === 'd' || key === 'arrowright') this.keys.d = true;
      if (key === 'shift') this.keys.shift = true;
    });
    window.addEventListener('keyup', (e) => {
      const key = e.key.toLowerCase();
      if (key === 'z' || key === 'arrowup')    this.keys.w = false;
      if (key === 's' || key === 'arrowdown')  this.keys.s = false;
      if (key === 'q' || key === 'arrowleft')  this.keys.a = false;
      if (key === 'd' || key === 'arrowright') this.keys.d = false;
      if (key === 'shift') this.keys.shift = false;
    });
  }

  load(path) {
    const loader = new GLTFLoader();
    return new Promise((resolve) => {
      loader.load(path, (gltf) => {
        this.model = gltf.scene;
        this.model.scale.set(2.5, 2.5, 2.5);
        this.playerGroup.add(this.model);

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

  update(delta) {
    if (!this.model) return;

    this.mixer.update(delta);

    const walkSpeed = 10 * delta;
    const runSpeed  = 25 * delta;
    const rotSpeed  = 3  * delta;
    const moveSpeed = this.keys.shift ? runSpeed : walkSpeed;
    let isMoving = false;

    if (this.keys.a) this.playerGroup.rotation.y += rotSpeed;
    if (this.keys.d) this.playerGroup.rotation.y -= rotSpeed;
    if (this.keys.s) { this.playerGroup.translateZ( moveSpeed); isMoving = true; }
    if (this.keys.w) { this.playerGroup.translateZ(-moveSpeed); isMoving = true; }

    if (isMoving) {
      this.playAnimation(this.keys.shift ? 'Run' : 'Walk');
    } else {
      this.playAnimation('Idle');
    }

    // Hauteur du terrain via noise2D — O(1) au lieu de O(n_triangles) avec Raycaster.
    // Le terrain est une PlaneGeometry(128,128) en XY, rotée -PI/2 sur X.
    // Donc : world_height = noise2D(wx * 0.02, -wz * 0.02) * 5
    const wx = this.playerGroup.position.x;
    const wz = this.playerGroup.position.z;
    let groundY = noise2D(wx * 0.02, -wz * 0.02) * 5;
    if (groundY < -2.8) groundY = -2.8;
    this.playerGroup.position.y = THREE.MathUtils.lerp(this.playerGroup.position.y, groundY, 0.1);
  }
}
