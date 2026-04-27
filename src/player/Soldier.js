import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { noise2D } from '../utils/random.js';

export class Soldier {
    constructor(scene, camera) {
        this.scene   = scene;
        this.camera  = camera;
        this.joystick = null; // injecté depuis main.js après création

        this.model           = null;
        this.mixer           = null;
        this.animations      = [];
        this.currentAnimName = '';
        this.currentAction   = null;

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

                this.mixer     = new THREE.AnimationMixer(this.model);
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
            this.currentAction   = action;
            this.currentAnimName = name;
        }
    }

    update(delta) {
        if (!this.model) return;
        this.mixer.update(delta);

        const walkSpeed = 10 * delta;
        const runSpeed  = 25 * delta;
        const rotSpeed  =  3 * delta;

        // Joystick touch input
        const jx = this.joystick ? this.joystick.dx : 0;
        const jy = this.joystick ? this.joystick.dy : 0;

        const goFwd   = this.keys.w || jy < -0.2;
        const goBack  = this.keys.s || jy >  0.2;
        const goLeft  = this.keys.a || jx < -0.2;
        const goRight = this.keys.d || jx >  0.2;
        const sprint  = this.keys.shift || (this.joystick?.active && Math.hypot(jx, jy) > 0.7);

        const moveSpeed = sprint ? runSpeed : walkSpeed;
        let isMoving = false;

        if (goLeft)  this.playerGroup.rotation.y += rotSpeed;
        if (goRight) this.playerGroup.rotation.y -= rotSpeed;
        if (goBack)  { this.playerGroup.translateZ( moveSpeed); isMoving = true; }
        if (goFwd)   { this.playerGroup.translateZ(-moveSpeed); isMoving = true; }

        if (isMoving) {
            this.playAnimation(sprint ? 'Run' : 'Walk');
        } else {
            this.playAnimation('Idle');
        }

        // O(1) — formule directe depuis la géométrie du terrain (PlaneGeometry rotée -PI/2 sur X)
        const wx = this.playerGroup.position.x;
        const wz = this.playerGroup.position.z;
        let groundY = noise2D(wx * 0.02, -wz * 0.02) * 5;
        if (groundY < -2.8) groundY = -2.8;
        this.playerGroup.position.y = THREE.MathUtils.lerp(this.playerGroup.position.y, groundY, 0.1);
    }
}
