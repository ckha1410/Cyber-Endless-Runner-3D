import * as THREE from 'three';
import * as dat from 'dat.gui'
import {EffectComposer} from "three/examples/jsm/postprocessing/EffectComposer";
import {RenderPass} from "three/examples/jsm/postprocessing/RenderPass";
import {UnrealBloomPass} from "three/examples/jsm/postprocessing/UnrealBloomPass";
import Camera from "./world/misc/camera";
import World from "./world";
import Time from "./utils/time";
import Resizer from "./utils/resizer";
import TWEEN from "@tweenjs/tween.js";

export default class App {
    constructor(options) {
        this.canvas = options.canvas;
        this.background = new THREE.Color(0x102448);

        this.time = new Time();
        this.resizer = new Resizer();

        this.setConfig();
        this.setDebug();
        this.setRenderer();
        this.setCamera();
        this.setWorld();
        this.setComposer();

        this.animate = this.animate.bind(this);
        this.animate();
    }

    getState() {
        return {
            config: this.config,
            camera: this.camera,
            renderer: this.renderer,
            time: this.time,
            debug: this.debug
        }
    }

    animate() {
        requestAnimationFrame(this.animate);

        // [G2] Synesthetic Score Multiplier Effect
        if (this.world && this.world.manager) {
            const speed = this.world.manager.speed || 0;
            
            // Bloom intensity increases slightly with speed
            if (this.bloomPass) {
                const targetBloom = 0.20 + (speed / 80.0) * 0.25;
                this.bloomPass.strength = THREE.MathUtils.lerp(this.bloomPass.strength, targetBloom, 0.05);
            }
            
            // FOV increases with speed to give a sense of momentum/warp
            if (this.camera && this.camera.instance && this.camera.params) {
                const baseFov = this.camera.params.fov;
                // Base speed is 7.8, max speed is 29. 
                // Formula: add 1.5 degrees of FOV for every 1.0 increase in speed
                const targetFov = baseFov + Math.max(0, (speed - 7.8) * 1.5);
                this.camera.instance.fov = THREE.MathUtils.lerp(this.camera.instance.fov, targetFov, 0.05);
                this.camera.instance.updateProjectionMatrix();
            }
        }

        if (this.composer && this.config.bloom) {
            this.composer.render();
        } else {
            this.renderer.render(this.scene, this.camera.instance);
        }
        TWEEN.update();
    }

    setConfig() {
        this.config = {};
        // Enable debug GUI unconditionally to show toggles to professor
        this.config.debug = true;
        this.config.lights = true;
        this.config.grid = false;
        this.config.bloom = true;
        // Giảm mặc định pixelRatio về 1 để tránh lag trên màn hình lớn
        this.config.pixelRatio = 1;
    }

    setDebug() {
        if (!this.config.debug) return;

        this.debug = new dat.GUI({width: 300});
        // Bật mở GUI mặch định để giảng viên dễ thao tác theo yêu cầu A3, A6
        // this.debug.close();

        // Lắng nghe sự kiện để mở thư mục cụ thể từ UI Gallery
        document.addEventListener('gallery-open-gui-folder', (e) => {
            if (!this.debug || !this.debug.__folders) return;
            const targetName = e.detail;
            for (const name in this.debug.__folders) {
                if (name === targetName) {
                    this.debug.__folders[name].open();
                    if (targetName === 'Affine Transform Demo') {
                        const affineFolder = this.debug.__folders[name];
                        if (affineFolder.__folders) {
                            for (const subName in affineFolder.__folders) {
                                if (subName === 'Translate x/y/z' || subName === 'Rotate x/y/z' || subName === 'Scale') {
                                    affineFolder.__folders[subName].open();
                                }
                            }
                        }
                    }
                } else {
                    this.debug.__folders[name].close();
                }
            }
        });
    }

    setRenderer() {
        this.scene = new THREE.Scene();
        // [F6] No scene background — CyberpunkSkydome shader replaces it
        this.scene.background = null;
        // [F6] Fog tinted teal/blue to match skydome horizon (0.05, 0.45, 0.65) -> roughly #0c73a6
        this.scene.fog = new THREE.FogExp2(0x0c73a6, 0.0055);
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance'
        });

        this.renderer.setClearColor(this.background, 1);
        this.renderer.setPixelRatio(this.config.pixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 0.76;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.canvas.append(this.renderer.domElement);

        this.resizer.on('resize', () => {
            this.renderer.setPixelRatio(this.config.pixelRatio);
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            if (this.composer) {
                this.composer.setSize(window.innerWidth, window.innerHeight);
            }
        })
    }

    setCamera() {
        this.camera = new Camera({
            renderer: this.renderer,
            resizer: this.resizer,
            debug: this.debug
        });

        this.scene.add(this.camera.container);
    }

    setWorld() {
        this.world = new World(this.getState());

        this.scene.add(this.world.container);
    }

    setComposer() {
        if (!this.config.bloom) return;

        this.composer = new EffectComposer(this.renderer);
        this.composer.setPixelRatio(this.config.pixelRatio);
        this.composer.setSize(window.innerWidth, window.innerHeight);

        this.renderPass = new RenderPass(this.scene, this.camera.instance);
        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            0.20,
            0.30,
            0.70
        );

        this.composer.addPass(this.renderPass);
        this.composer.addPass(this.bloomPass);

        if (this.debug) {
            const folder = this.debug.addFolder('Post Processing');
            folder.add(this.config, 'bloom').name('Bloom enabled');
            folder.add(this.bloomPass, 'strength', 0, 2, 0.01).name('Bloom strength');
            folder.add(this.bloomPass, 'radius', 0, 1, 0.01).name('Bloom radius');
            folder.add(this.bloomPass, 'threshold', 0, 1, 0.01).name('Bloom threshold');
        }
    }

    destroy() {
        this.renderer.dispose();
        if (this.debug) this.debug.destroy();
        if (this.camera.orbitControls) this.camera.orbitControls.dispose();
        if (this.world && this.world.input) this.world.input.destroy();

        this.time.off('tick');
        this.resizer.off('resize');
    }
}
