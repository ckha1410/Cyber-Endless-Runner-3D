import * as THREE from 'three';
import Obstacle from "./obstackles/obstacle";
import Coin from "./coin";

export default class Obstacles {
    constructor(props) {
        this.loader = props.loader;
        this.manager = props.manager;
        // [D3] Camera reference for billboard coins
        this.camera = props.camera || null;

        this.container = new THREE.Object3D();
        this.container.name = "obstacles";
        this.lanes = props.lanes;
        this.spawnZ = -82;

        this.items = [];
        this.coins = [];
        this.obstaclePools = {};
        this.collectiblePools = {};
        this.customCoinTexture = null;
        this.customObstacleTextures = {};
        this.spawnTimer = 1.45;
        this.coinTimer = 1.2;
        this.materials = this.createMaterials();

        this.manager.on('reset', () => this.reset());
    }

    createMaterials() {
        const panelTexture = this.loadGameTexture('src/textures/uv_grid_opengl.jpg', 1.4, 1.4);
        const crateTexture = this.loadGameTexture('src/textures/hardwood2_diffuse.jpg', 1.1, 1.1);
        const metalTexture = this.loadGameTexture('src/textures/brick_diffuse.jpg', 0.8, 0.8);

        return {
            box: new THREE.MeshStandardMaterial({
                color: 0xef4444,
                map: panelTexture,
                roughnessMap: panelTexture,
                emissive: 0x7f1d1d,
                emissiveIntensity: 0.34,
                roughness: 0.46,
                metalness: 0.16
            }),
            crate: new THREE.MeshStandardMaterial({
                color: 0xf97316,
                map: crateTexture,
                emissive: 0x7c2d12,
                emissiveIntensity: 0.24,
                roughness: 0.58,
                metalness: 0.16
            }),
            spike: new THREE.MeshStandardMaterial({
                color: 0xff335f,
                emissive: 0xb91c1c,
                emissiveIntensity: 0.72,
                roughness: 0.34,
                metalness: 0.18
            }),
            metal: new THREE.MeshStandardMaterial({
                color: 0x64748b,
                map: metalTexture,
                roughnessMap: metalTexture,
                emissive: 0x0f172a,
                emissiveIntensity: 0.12,
                roughness: 0.34,
                metalness: 0.62
            }),
            wheel: new THREE.MeshStandardMaterial({
                color: 0x1f2937,
                map: panelTexture,
                emissive: 0xf97316,
                emissiveIntensity: 0.42,
                roughness: 0.46,
                metalness: 0.55
            }),
            drone: new THREE.MeshStandardMaterial({
                color: 0x475569,
                map: metalTexture,
                emissive: 0x7f1d1d,
                emissiveIntensity: 0.24,
                roughness: 0.28,
                metalness: 0.55
            }),
            cyan: new THREE.MeshStandardMaterial({
                color: 0x22d3ee,
                emissive: 0x22d3ee,
                emissiveIntensity: 1.2,
                roughness: 0.2
            }),
            pink: new THREE.MeshStandardMaterial({
                color: 0xfb7185,
                emissive: 0xfb7185,
                emissiveIntensity: 1.1,
                roughness: 0.22
            }),
            warning: new THREE.MeshStandardMaterial({
                color: 0xfacc15,
                emissive: 0xea580c,
                emissiveIntensity: 0.62,
                roughness: 0.28,
                metalness: 0.15
            })
        };
    }

    loadGameTexture(path, repeatX = 1, repeatY = 1) {
        const texture = new THREE.TextureLoader().load(path);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(repeatX, repeatY);
        texture.anisotropy = 8;
        texture.encoding = THREE.sRGBEncoding;
        return texture;
    }

    createPanelTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, 256, 256);
        ctx.strokeStyle = 'rgba(125, 211, 252, 0.38)';
        ctx.lineWidth = 3;
        for (let i = 0; i < 256; i += 32) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, 256);
            ctx.moveTo(0, i);
            ctx.lineTo(256, i);
            ctx.stroke();
        }
        ctx.fillStyle = 'rgba(251, 191, 36, 0.35)';
        for (let i = 0; i < 12; i++) {
            ctx.fillRect(Math.random() * 220, Math.random() * 220, 18 + Math.random() * 24, 4);
        }
        return new THREE.CanvasTexture(canvas);
    }

    reset() {
        this.items.forEach(item => this.container.remove(item.container));
        this.coins.forEach(coin => this.container.remove(coin.container));
        this.items.forEach(item => this.addObstacleToPool(item));
        this.coins.forEach(coin => this.addCollectibleToPool(coin));
        this.items = [];
        this.coins = [];
        this.spawnTimer = 1.55;
        this.coinTimer = 0.35;
        this.seedOpeningPattern();
    }

    update(delta) {
        if (!this.manager.isRunning()) return;

        this.spawnTimer -= delta;
        this.coinTimer -= delta;

        if (this.spawnTimer <= 0) {
            this.spawnObstacle();
            const difficulty = this.manager.getDifficulty();
            this.spawnTimer = Math.max(0.68, 1.65 - difficulty * 0.78 + Math.random() * (0.75 - difficulty * 0.25));
        }

        if (this.coinTimer <= 0) {
            this.spawnCoinLine();
            const difficulty = this.manager.getDifficulty();
            this.coinTimer = Math.max(0.78, 1.35 - difficulty * 0.32 + Math.random() * 0.9);
        }

        this.items.forEach(item => item.update(delta, this.manager.speed));
        // [D3] Pass camera reference to coin.update() for billboard lookAt
        this.coins.forEach(coin => coin.update(delta, this.manager.speed, this.camera));
        this.removeExpired();
    }

    spawnObstacle() {
        // [E7] 'orbital' added — Kepler orbit debris obstacle (rare, ~11% spawn rate)
        // [G5] 'data_wall' added — Special shatterable portal obstacle
        const types = ['barrier', 'crate', 'spike', 'pole', 'wheel', 'drone', 'glb', 'orbital', 'data_wall'];
        const laneX = this.lanes[Math.floor(Math.random() * this.lanes.length)];
        const type = types[Math.floor(Math.random() * types.length)];
        const z = this.spawnZ - Math.random() * 10;
        const obstacle = this.takeObstacleFromPool(type) || new Obstacle({
            loader: this.loader,
            laneX,
            z,
            type,
            materials: this.materials
        });
        obstacle.reset(laneX, z);
        this.applyStoredTextureToObstacle(obstacle);

        this.items.push(obstacle);
        this.container.add(obstacle.container);
    }

    spawnCoinLine() {
        const laneX = this.lanes[Math.floor(Math.random() * this.lanes.length)];
        const roll = Math.random();
        const type = roll > 0.94 ? 'shield' : roll > 0.72 ? 'orb' : 'coin';
        const count = type === 'shield' ? 1 : 5;

        for (let i = 0; i < count; i++) {
            const z = this.spawnZ - 4 - i * 2.35;
            // [D3] Pass camera to Coin constructor for billboard initialization
            const coin = this.takeCollectibleFromPool(type) || new Coin({laneX, z, type, camera: this.camera});
            coin.reset(laneX, z, type);
            this.applyStoredTextureToCoin(coin);
            this.coins.push(coin);
            this.container.add(coin.container);
        }
    }

    seedOpeningPattern() {
        const introObjects = [
            {type: 'coin', lane: 1, z: -20},
            {type: 'coin', lane: 1, z: -23},
            {type: 'coin', lane: 1, z: -26},
            {type: 'orb', lane: 0, z: -32},
            {type: 'shield', lane: 2, z: -38}
        ];
        introObjects.forEach(item => {
            // [D3] Pass camera for billboard in intro coins
            const collectible = this.takeCollectibleFromPool(item.type) || new Coin({
                laneX: this.lanes[item.lane],
                z: item.z,
                type: item.type,
                camera: this.camera
            });
            collectible.reset(this.lanes[item.lane], item.z, item.type);
            this.applyStoredTextureToCoin(collectible);
            this.coins.push(collectible);
            this.container.add(collectible.container);
        });

        ['barrier', 'spike', 'wheel'].forEach((type, index) => {
            const laneX = this.lanes[index];
            const z = -44 - index * 9;
            const obstacle = this.takeObstacleFromPool(type) || new Obstacle({
                loader: this.loader,
                laneX,
                z,
                type,
                materials: this.materials
            });
            obstacle.reset(laneX, z);
            this.applyStoredTextureToObstacle(obstacle);
            this.items.push(obstacle);
            this.container.add(obstacle.container);
        });
    }

    removeExpired() {
        for (let i = this.items.length - 1; i >= 0; i--) {
            if (this.items[i].expired) {
                this.container.remove(this.items[i].container);
                this.addObstacleToPool(this.items[i]);
                this.items.splice(i, 1);
            }
        }

        for (let i = this.coins.length - 1; i >= 0; i--) {
            if (this.coins[i].expired) {
                this.container.remove(this.coins[i].container);
                this.addCollectibleToPool(this.coins[i]);
                this.coins.splice(i, 1);
            }
        }
    }

    takeObstacleFromPool(type) {
        const pool = this.obstaclePools[type];
        return pool && pool.length ? pool.pop() : null;
    }

    addObstacleToPool(obstacle) {
        obstacle.container.visible = false;
        if (!this.obstaclePools[obstacle.type]) this.obstaclePools[obstacle.type] = [];
        if (this.obstaclePools[obstacle.type].length < 8) this.obstaclePools[obstacle.type].push(obstacle);
    }

    takeCollectibleFromPool(type) {
        const pool = this.collectiblePools[type];
        return pool && pool.length ? pool.pop() : null;
    }

    addCollectibleToPool(coin) {
        coin.container.visible = false;
        if (!this.collectiblePools[coin.type]) this.collectiblePools[coin.type] = [];
        if (this.collectiblePools[coin.type].length < 40) this.collectiblePools[coin.type].push(coin);
    }

    applyTextureFromDemo(targetName, texture) {
        const map = {
            Box: ['barrier', 'crate'],
            Cone: ['spike'],
            Cylinder: ['pole', 'drone'],
            Wheel: ['wheel'],
            'Teapot GLTF': ['glb'],
            'Player GLB': ['glb']
        };

        if (targetName === 'Sphere') {
            this.customCoinTexture = texture;
            [...this.coins, ...this.flattenPools(this.collectiblePools)].forEach(coin => {
                this.applyTextureToCoin(coin, texture);
            });
            return;
        }

        const types = map[targetName] || [];
        types.forEach(type => {
            this.customObstacleTextures[type] = texture;
        });

        const obstacles = [...this.items, ...this.flattenPools(this.obstaclePools)];
        obstacles
            .filter(obstacle => types.includes(obstacle.type))
            .forEach(obstacle => this.applyTextureToObstacle(obstacle, texture));

        this.applyTextureToFutureMaterials(types, texture);
    }

    applyTextureToFutureMaterials(types, texture) {
        const materialKeys = {
            barrier: ['box', 'warning'],
            crate: ['crate', 'warning', 'pink'],
            spike: ['spike'],
            pole: ['metal', 'cyan', 'pink'],
            drone: ['drone', 'warning'],
            wheel: ['wheel'],
            glb: ['metal']
        };

        types.forEach(type => {
            (materialKeys[type] || []).forEach(key => {
                if (!this.materials[key]) return;
                this.materials[key] = this.materials[key].clone();
                this.applyTextureToMaterial(this.materials[key], texture);
            });
        });
    }

    applyStoredTextureToObstacle(obstacle) {
        const texture = this.customObstacleTextures[obstacle.type];
        if (texture) this.applyTextureToObstacle(obstacle, texture);
    }

    applyStoredTextureToCoin(coin) {
        if (this.customCoinTexture) this.applyTextureToCoin(coin, this.customCoinTexture);
    }

    applyTextureToObstacle(obstacle, texture) {
        obstacle.container.traverse(child => {
            if (!child.isMesh || !child.material || !child.material.isMeshStandardMaterial) return;
            child.material = child.material.clone();
            this.applyTextureToMaterial(child.material, texture);
        });
    }

    applyTextureToCoin(coin, texture) {
        if (coin && coin.applyTexture) coin.applyTexture(texture);
    }

    applyTextureToMaterial(material, texture) {
        material.map = this.cloneTexture(texture);
        material.color.set(0xffffff);
        material.roughness = Math.max(material.roughness || 0.3, 0.38);
        material.needsUpdate = true;
    }

    cloneTexture(texture) {
        const clone = texture.clone();
        clone.needsUpdate = true;
        clone.wrapS = THREE.RepeatWrapping;
        clone.wrapT = THREE.RepeatWrapping;
        clone.repeat.set(1, 1);
        return clone;
    }

    flattenPools(pools) {
        return Object.values(pools).reduce((items, pool) => items.concat(pool), []);
    }
}
