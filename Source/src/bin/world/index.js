import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader';
import Floor from "./floor";
import Lights from "./misc/lights";
import RunnerGame from "./runner";
import RunnerGameManager from "./runner/manager";
import InputManager from "../input-manager";
import DemoGallery from "./demo-gallery";
import ParticleSystem from "./particles";
import ProceduralSkyline from "./skyline"; // [E3]
import NeonGrid from "./neon-grid";              // [F3]
import CyberpunkSkydome from "./cyberpunk-skydome"; // [F6]
import NeonDustParticles from "./neon-dust";    // [F7]
import Scenery from "./scenery";

export default class World {
    constructor(options) {
        this.config = options.config;
        this.time = options.time;
        this.renderer = options.renderer;
        this.camera = options.camera;
        this.debug = options.debug;

        this.container = new THREE.Object3D();
        this.container.name = 'world';

        this.loader = new GLTFLoader()
        this.textureLoader = new THREE.TextureLoader();
        this.loader.setPath('src/models/');

        this.setInput();
        this.setManager();
        this.setLights();   // [D5] Must be after setManager() — wire events here
        this.setGrid();
        this.setFloor();
        this.setRunnerGame();
        this.setParticles();
        this.setDemoGallery();
        this.setTextureUpload();
        this.setSkyline();          // [E3]
        this.setNeonGrid();         // [F3]
        this.setSkydome();          // [F6]
        this.setNeonDust();         // [F7]
        this.setScenery();

        this.time.on('tick', data => this.update(data));
    }

    getState() {
        return {
            config: this.config,
            camera: this.camera,
            renderer: this.renderer,
            time: this.time,
            debug: this.debug,
            loader: this.loader,
            input: this.input,
            manager: this.manager,
            textureLoader: this.textureLoader
        }
    }

    setInput() {
        this.input = new InputManager();
    }

    setManager() {
        this.manager = new RunnerGameManager({
            time: this.time,
            camera: this.camera,
            input: this.input
        });
    }

    setLights() {
        if (!this.config.lights) return;

        this.lights = new Lights({debug: this.debug});
        this.container.add(this.lights.container);

        // [D5] Wire gameplay events → reactive light flashes
        // All pre-allocated in lights._initFlash(), no allocation here
        this.manager.on('jump', () => {
            if (this.lights) this.lights.flash(0xffff00, 0.7, 0.22);
        });
        this.manager.on('coin-collected', () => {
            if (this.lights) this.lights.flash(0xffffff, 0.5, 0.15);
        });
        this.manager.on('near-miss', () => {
            if (this.lights) this.lights.flash(0xff2200, 0.9, 0.4);
        });
        this.manager.on('state-change', state => {
            if (state === 'gameover' && this.lights) this.lights.flash(0xff0000, 1.2, 1.5);
        });
    }

    setGrid() {
        if (!this.config.grid) return;
        this.container.add(new THREE.GridHelper(20, 20, 0x575757, 0x828282));
    }

    setFloor() {
        this.floor = new Floor(this.getState());
        this.container.add(this.floor.container);
    }

    setRunnerGame() {
        this.runnerGame = new RunnerGame(this.getState());
        this.container.add(this.runnerGame.container);
    }

    setDemoGallery() {
        this.demoGallery = new DemoGallery(this.getState());
        this.container.add(this.demoGallery.container);
        this.manager.on('gallery', visible => this.demoGallery.show(visible));
    }

    setParticles() {
        this.particles = new ParticleSystem(this.getState());
        this.container.add(this.particles.container);
    }

    // [D1] Zone Manager — smooth ambient light transitions per score milestone
    // [E3] Procedural Cybercity Skyline
    setSkyline() {
        this.skyline = new ProceduralSkyline();
        this.container.add(this.skyline.container);
    }

    // [F3] Neon Grid Floor — Custom Shader overlaid on road surface
    setNeonGrid() {
        this.neonGrid = new NeonGrid();
        this.container.add(this.neonGrid.container);
    }

    // [F6] Cyberpunk Skydome — Procedural Sky Shader
    setSkydome() {
        this.skydome = new CyberpunkSkydome();
        this.container.add(this.skydome.container);
    }

    // [F7] GPU Instanced Neon Dust Particles
    setNeonDust() {
        this.neonDust = new NeonDustParticles();
        this.container.add(this.neonDust.container);
    }

    setScenery() {
        this.scenery = new Scenery();
        this.container.add(this.scenery.container);
    }

    setTextureUpload() {
        this.manager.on('texture-file', file => {
            const url = URL.createObjectURL(file);
            this.textureLoader.load(url, texture => {
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
                texture.repeat.set(1, 1);
                texture.encoding = THREE.sRGBEncoding;
                this.demoGallery.applyTexture(texture);
                this.runnerGame.applyTextureFromDemo(this.demoGallery.getSelectedItemName(), texture);
                URL.revokeObjectURL(url);
            });
        });

        // Texture Mapping presets (Circuit, Carbon, Hologram)
        this.manager.on('texture-preset', type => {
            if (type === 'reset') {
                const maps = { reset: true };
                this.demoGallery.applyTexturePreset(maps);
                this.runnerGame.applyTexturePresetFromDemo(this.demoGallery.getSelectedItemName(), maps);
                return;
            }
            const maps = this.generateProceduralMaps(type);
            this.demoGallery.applyTexturePreset(maps);
            this.runnerGame.applyTexturePresetFromDemo(this.demoGallery.getSelectedItemName(), maps);
        });
    }

    generateProceduralMaps(type) {
        const createTex = (drawMap) => {
            const cvs = document.createElement('canvas');
            cvs.width = 512; cvs.height = 512;
            const ctx = cvs.getContext('2d');
            drawMap(ctx, cvs.width, cvs.height);
            const tex = new THREE.CanvasTexture(cvs);
            tex.wrapS = THREE.RepeatWrapping;
            tex.wrapT = THREE.RepeatWrapping;
            tex.encoding = THREE.sRGBEncoding;
            return tex;
        };

        const maps = { map: null, normalMap: null, roughnessMap: null };

        if (type === 'circuit') {
            maps.map = createTex((ctx, w, h) => {
                ctx.fillStyle = '#0a1a15'; ctx.fillRect(0, 0, w, h);
                ctx.strokeStyle = '#00ff66'; ctx.lineWidth = 4;
                for(let i=0; i<30; i++) {
                    ctx.beginPath();
                    ctx.moveTo(Math.random()*w, Math.random()*h);
                    ctx.lineTo(Math.random()*w, Math.random()*h);
                    ctx.stroke();
                    ctx.fillStyle = '#00ff66';
                    ctx.beginPath(); ctx.arc(Math.random()*w, Math.random()*h, 6, 0, Math.PI*2); ctx.fill();
                }
            });
            maps.normalMap = createTex((ctx, w, h) => {
                ctx.fillStyle = '#8080ff'; ctx.fillRect(0, 0, w, h);
            }); // Phẳng
        } else if (type === 'carbon') {
            maps.map = createTex((ctx, w, h) => {
                ctx.fillStyle = '#222'; ctx.fillRect(0, 0, w, h);
                ctx.fillStyle = '#111';
                for(let x=0; x<w; x+=16) for(let y=0; y<h; y+=16) {
                    if((x/16+y/16)%2===0) ctx.fillRect(x, y, 16, 16);
                }
            });
            maps.roughnessMap = createTex((ctx, w, h) => {
                ctx.fillStyle = '#888'; ctx.fillRect(0, 0, w, h); // Hơi nhám
                ctx.fillStyle = '#bbb';
                for(let x=0; x<w; x+=16) for(let y=0; y<h; y+=16) {
                    if((x/16+y/16)%2===0) ctx.fillRect(x, y, 16, 16);
                }
            });
        } else if (type === 'hologram') {
            maps.map = createTex((ctx, w, h) => {
                ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, w, h);
                ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 2;
                for(let x=0; x<=w; x+=32) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke(); }
                for(let y=0; y<=h; y+=32) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); }
            });
        }
        return maps;
    }

    update(data) {
        const delta = Math.min(data.delta / 1000, 0.06);
        const playerX = this.runnerGame && this.runnerGame.player ? this.runnerGame.player.position.x : 0;

        if (this.floor) this.floor.update(delta, this.manager.speed);
        if (this.lights) {
            const playerPos = this.runnerGame && this.runnerGame.player ? this.runnerGame.player.position : null;
            this.lights.update(data, playerPos);
        }
        if (this.demoGallery) this.demoGallery.update(delta);

        // [D1] Zone ambient lerp (only runs during transition, ~2 seconds)
        if (this.zoneManager && this.manager) {
            this.zoneManager.update(this.manager.score, delta);
        }

        // [D2] Speed visual feedback: FOV + aberration value + CSS speed lines
        if (this.speedFeedback && this.manager) {
            this.speedFeedback.update(delta, this.manager.speed);
        }

        // Cập nhật Showcase quay chậm
        if (this.geometryShowcaseItems) {
            this.geometryShowcaseItems.forEach(item => {
                item.rotation.x += delta * 0.8;
                item.rotation.y += delta * 0.6;
            });
        }

        this.camera.update(delta, playerX, this.manager.state, data.elapsed);

        // [F3] Neon Grid — update uTime + uSpeed
        if (this.neonGrid) this.neonGrid.update(data.elapsed, this.manager.speed);
        // [F6] Skydome — update uTime (slow nebula drift)
        if (this.skydome) this.skydome.update(data.elapsed);
        // [F7] Neon Dust — animate 500 instanced particles
        if (this.neonDust) this.neonDust.update(data.elapsed, this.manager.speed);
        // Scenery updates
        if (this.scenery && this.manager && this.manager.state !== 'gallery') this.scenery.update(delta, this.manager.speed);
    }
}
