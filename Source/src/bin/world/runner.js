import * as THREE from 'three';
import Player from "./runner/player";
import Obstacles from "./runner/obstacles";
import RunningTrail from "./runner/trail";
import DeathExplosion from "./runner/death-explosion";
import DataWallExplosion from "./runner/data-wall-explosion";

export default class RunnerGame {
    constructor(props) {
        this.loader = props.loader;
        this.time = props.time;
        this.camera = props.camera;
        this.manager = props.manager;
        this.input = props.input;
        this.lanes = [-2.25, 0, 2.25];

        this.container = new THREE.Object3D();
        this.container.name = 'runner_game';

        // [D4] Near-miss cooldown — prevents spam when many obstacles cluster
        this._nearMissCooldown = 0;

        this.initPlayer();
        this.initObstacles();
        this.initTrail();      // [E1a]
        this.initExplosion();  // [E1c]
        this.initCollisions();

        this.manager.on('gallery', visible => {
            this.container.visible = !visible;
        });
    }

    initPlayer() {
        this.player = new Player({
            loader: this.loader,
            input: this.input,
            manager: this.manager,
            lanes: this.lanes
        });
        this.container.add(this.player.container);
    }

    initObstacles() {
        this.obstacles = new Obstacles({
            loader: this.loader,
            manager: this.manager,
            lanes: this.lanes,
            // [D3] Pass camera so billboard coins can lookAt camera each frame
            camera: this.camera
        });
        this.container.add(this.obstacles.container);
    }

    // [E1a] Running Trail initialization
    initTrail() {
        this.trail = new RunningTrail();
        this.container.add(this.trail.container);

        // Reset trail when new game starts
        this.manager.on('reset', () => {
            this.trail.reset();
            if (this.player) this.player.container.visible = true; // Show player on reset
        });
    }

    // [E1c] Death Explosion initialization
    initExplosion() {
        this.explosion = new DeathExplosion();
        this.container.add(this.explosion.container);

        // Trigger explosion at player position on hit
        this.manager.on('state-change', state => {
            if (state === 'gameover' && this.player) {
                const pos = this.player.position;
                this.explosion.explode(new THREE.Vector3(pos.x, pos.y + 0.8, pos.z));
                this.player.container.visible = false; // Hide player when exploded
            }
        });

        // [G5] Data Wall Explosion initialization
        this.dataWallExplosion = new DataWallExplosion();
        this.container.add(this.dataWallExplosion.container);
    }

    initCollisions() {
        this.time.on('tick', time => {
            const delta = Math.min(time.delta / 1000, 0.06);

            this.player.update(delta);
            this.obstacles.update(delta);

            // [E1a] Update trail — slides buffer, updates colors by speed
            if (this.trail) this.trail.update(this.player.position, this.manager.speed);
            // [E1c] Update explosion particles (only active 1.8s after death)
            if (this.explosion) this.explosion.update(delta);
            // [G5] Update Data Wall explosion
            if (this.dataWallExplosion) this.dataWallExplosion.update(delta);

            if (!this.manager.isRunning()) return;

            // [D4] Decay near-miss cooldown
            this._nearMissCooldown = Math.max(0, this._nearMissCooldown - delta);

            const playerZ = this.player.position.z; // ~4.2

            for (const obstacle of this.obstacles.items) {
                // ── Existing hit detection ──
                if (!obstacle.hit && obstacle.collider.intersectsBox(this.player.collider)) {
                    obstacle.hit = true;
                    // [G5] Data Wall Portal Destruction
                    if (obstacle.type === 'data_wall') {
                        obstacle.container.visible = false;
                        if (this.dataWallExplosion) {
                            this.dataWallExplosion.explode(obstacle.container.position.clone());
                        }
                        if (this.manager.addScore) this.manager.addScore(500);
                        continue;
                    }
                    this.manager.hit();
                    return;
                }

                // [D4] Near-miss: obstacle just passed player without hitting
                if (!obstacle.hit && !obstacle._nearMissed && this._nearMissCooldown <= 0) {
                    const oz = obstacle.container.position.z;
                    if (oz > playerZ && oz < playerZ + 3.5) {
                        const dx = Math.abs(obstacle.container.position.x - this.player.position.x);
                        if (dx < 3.5) {
                            obstacle._nearMissed = true;
                            this._nearMissCooldown = 0.8;
                            this.manager.nearMiss();
                        }
                    }
                }
            }

            for (const coin of this.obstacles.coins) {
                if (!coin.collected && coin.collider.intersectsBox(this.player.collider)) {
                    const position = coin.container.position.clone();
                    coin.collect();
                    this.manager.collectCoin(position, coin.type);
                }
            }
        })
    }

    applyTextureFromDemo(targetName, texture) {
        if (targetName === 'Player GLB') {
            this.player.applyTexture(texture);
        }
        this.obstacles.applyTextureFromDemo(targetName, texture);
    }

    applyTexturePresetFromDemo(targetName, maps) {
        if (targetName === 'Player GLB') {
            if (this.player.applyTexturePreset) this.player.applyTexturePreset(maps);
        }
        if (maps && (maps.map || maps.reset)) {
            this.obstacles.applyTextureFromDemo(targetName, maps.reset ? null : maps.map);
        }
    }
}
