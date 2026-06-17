import * as THREE from 'three';
import {PerspectiveCamera} from "three";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";

export default class Camera {
    constructor(options) {
        this.renderer = options.renderer;
        this.resizer = options.resizer;
        this.debug = options.debug;

        this.container = new THREE.Object3D();
        this.container.name = 'camera';

        this.params = {
            followPlayer: true,
            x: 0,
            y: 3.65,
            z: 8.6,
            lookAtY: 1.18,
            demoOrbit: true,
            fov: 58,
            near: 0.1,
            far: 1000
        };
        this.lookAtTarget = new THREE.Vector3();
        this.desiredPosition = new THREE.Vector3();
        this.presetIndex = 1;
        this.presets = [
            {name: 'Close', x: 0, y: 1.5, z: -1.0, lookAtY: 0.5, fov: 60},
            {name: 'Normal', x: 0, y: 3.65, z: 8.6, lookAtY: 1.18, fov: 58},
            {name: 'Far', x: 0, y: 5.2, z: 13.4, lookAtY: 1.62, fov: 50}
        ];

        this.setInstance();
        this.setDebug();
    }

    setInstance() {
        this.instance = new PerspectiveCamera(
            this.params.fov,
            window.innerWidth / window.innerHeight,
            this.params.near,
            this.params.far,
        );

        this.instance.position.set(this.params.x, this.params.y, this.params.z);
        this.instance.lookAt(0, this.params.lookAtY, -8);

        this.container.add(this.instance);

        this.resizer.on('resize', () => {
            this.instance.aspect = window.innerWidth / window.innerHeight;
            this.instance.updateProjectionMatrix();
        })
    }

    update(delta, targetX = 0, mode = 'running', elapsed = 0) {
        const followX = this.params.followPlayer && mode !== 'gallery' ? targetX * 0.28 : 0;

        if (mode === 'gallery') {
            const angle = this.params.demoOrbit ? elapsed * 0.22 : 0;
            // Cho phép GUI điều khiển x, y, z + Orbit
            this.desiredPosition.set(
                this.params.x + Math.sin(angle) * 4.2,
                this.params.y,
                this.params.z + Math.cos(angle) * 1.6
            );
            this.lookAtTarget.set(0, this.params.lookAtY, -8.2);
        } else {
            this.desiredPosition.set(
                this.params.x + followX,
                this.params.y,
                this.params.z
            );
            this.lookAtTarget.set(targetX * 0.18, this.params.lookAtY, -7.2);
        }

        const alpha = 1 - Math.pow(0.0005, Math.min(delta, 0.08));
        this.instance.position.lerp(this.desiredPosition, alpha);
        // Force lookAt immediate logic since lerp affects target tracking
        this.instance.lookAt(this.lookAtTarget);
    }

    cyclePreset() {
        this.presetIndex = (this.presetIndex + 1) % this.presets.length;
        this.applyPreset(this.presetIndex);
        return this.presets[this.presetIndex].name;
    }

    applyPreset(index) {
        const preset = this.presets[index];
        if (!preset) return;
        this.params.x = preset.x;
        this.params.y = preset.y;
        this.params.z = preset.z;
        this.params.lookAtY = preset.lookAtY;
        this.params.fov = preset.fov;
        this.instance.fov = this.params.fov;
        this.instance.updateProjectionMatrix();
        if (this.debugControllers) this.debugControllers.forEach(controller => controller.updateDisplay());
    }

    getPresetName() {
        return this.presets[this.presetIndex].name;
    }

    setDebug() {
        if (!this.debug) return;

        const folder = this.debug.addFolder('Perspective Camera');
        this.debugControllers = [];
        this.debugControllers.push(folder.add(this.params, 'followPlayer').name('Follow player'));
        this.debugControllers.push(folder.add(this.params, 'demoOrbit').name('Demo orbit'));
        this.debugControllers.push(folder.add(this.params, 'x', -8, 8, 0.1).name('position.x'));
        this.debugControllers.push(folder.add(this.params, 'y', 1, 12, 0.1).name('position.y'));
        this.debugControllers.push(folder.add(this.params, 'z', 4, 24, 0.1).name('position.z'));
        this.debugControllers.push(folder.add(this.params, 'lookAtY', 0, 4, 0.05).name('lookAt.y'));
        this.debugControllers.push(folder.add(this.params, 'fov', 30, 120, 1).name('fov').onChange(() => {
            this.instance.fov = this.params.fov;
            this.instance.updateProjectionMatrix();
        }));
        this.debugControllers.push(folder.add(this.params, 'near', 0.01, 10, 0.01).name('near').onChange(() => {
            this.instance.near = this.params.near;
            this.instance.updateProjectionMatrix();
        }));
        this.debugControllers.push(folder.add(this.params, 'far', 100, 2000, 1).name('far').onChange(() => {
            this.instance.far = this.params.far;
            this.instance.updateProjectionMatrix();
        }));
        folder.add({nextPreset: () => this.cyclePreset()}, 'nextPreset').name('Cycle Close/Normal/Far');
    }

    setOrbitControls() {
        this.orbitControls = new OrbitControls(this.instance, this.renderer.domElement);
        this.orbitControls.enabled = true;
        this.orbitControls.enableKeys = false;
        this.orbitControls.zoomSpeed = 0.5;
    }
}
