import * as THREE from 'three';

export default class ParticleSystem {
    constructor(props) {
        this.manager = props.manager;
        this.time = props.time;
        this.pool = [];
        this.active = [];
        this.container = new THREE.Object3D();
        this.container.name = 'particles';

        this.materials = {
            coin: new THREE.MeshStandardMaterial({
                color: 0xfacc15,
                emissive: 0xfacc15,
                emissiveIntensity: 1.4,
                roughness: 0.22
            }),
            hit: new THREE.MeshStandardMaterial({
                color: 0xfb7185,
                emissive: 0xe11d48,
                emissiveIntensity: 1.2,
                roughness: 0.28
            })
        };

        this.geometry = new THREE.SphereBufferGeometry(0.055, 10, 8);
        this.createPool(90);
        this.bindEvents();

        this.time.on('tick', data => this.update(Math.min(data.delta / 1000, 0.06)));
    }

    createPool(count) {
        for (let i = 0; i < count; i++) {
            const mesh = new THREE.Mesh(this.geometry, this.materials.coin.clone());
            mesh.visible = false;
            mesh.castShadow = false;
            mesh.userData.velocity = new THREE.Vector3();
            mesh.userData.life = 0;
            mesh.userData.maxLife = 1;
            this.pool.push(mesh);
            this.container.add(mesh);
        }
    }

    bindEvents() {
        this.manager.on('coin-collected', position => {
            this.burst(position, 'coin', 16, 2.8);
        });
        this.manager.on('player-hit', position => {
            this.burst(position || new THREE.Vector3(0, 1.2, 4), 'hit', 28, 4.2);
        });
    }

    burst(position, materialKey, count, speed) {
        for (let i = 0; i < count; i++) {
            const particle = this.pool.pop();
            if (!particle) return;

            particle.visible = true;
            particle.material = this.materials[materialKey].clone();
            particle.position.copy(position);
            particle.position.y += 0.15;
            particle.scale.setScalar(0.7 + Math.random() * 1.35);
            particle.userData.life = 0;
            particle.userData.maxLife = 0.45 + Math.random() * 0.45;
            particle.userData.velocity.set(
                (Math.random() - 0.5) * speed,
                1.4 + Math.random() * speed,
                (Math.random() - 0.5) * speed
            );
            this.active.push(particle);
        }
    }

    update(delta) {
        for (let i = this.active.length - 1; i >= 0; i--) {
            const particle = this.active[i];
            particle.userData.life += delta;
            particle.userData.velocity.y -= 4.8 * delta;
            particle.position.addScaledVector(particle.userData.velocity, delta);
            particle.rotation.y += delta * 4;

            const t = particle.userData.life / particle.userData.maxLife;
            const scale = Math.max(0.01, 1 - t);
            particle.scale.setScalar(scale);

            if (t >= 1) {
                particle.visible = false;
                this.active.splice(i, 1);
                this.pool.push(particle);
            }
        }
    }
}
