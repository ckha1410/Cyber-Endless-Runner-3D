import * as THREE from "three";

// [D3] Module-level shared Vector3 — allocated ONCE for ALL coin instances
// NEVER use new THREE.Vector3() inside update()
const _lookTarget = new THREE.Vector3();

export default class Coin {
    constructor(props) {
        this.type = props.type || 'coin';
        this.laneX = props.laneX;
        this.z = props.z;
        this.collected = false;
        this.expired = false;

        // [D3] Camera reference for billboard lookAt
        this.camera = props.camera || null;

        this.container = new THREE.Object3D();
        this.container.name = "collectible";
        this.collider = new THREE.Box3();

        this.createMesh();
        this.reset(this.laneX, this.z, this.type);
    }

    createMesh() {
        this.materials = {
            coin: new THREE.MeshStandardMaterial({
                color: 0xffc72c,
                emissive: 0xd97706,
                emissiveIntensity: 0.78,
                metalness: 0.72,
                roughness: 0.24
            }),
            orb: new THREE.MeshStandardMaterial({
                color: 0x67e8f9,
                emissive: 0x22d3ee,
                emissiveIntensity: 1.45,
                metalness: 0.35,
                roughness: 0.16
            }),
            shield: new THREE.MeshStandardMaterial({
                color: 0xa78bfa,
                emissive: 0x7c3aed,
                emissiveIntensity: 1.35,
                metalness: 0.38,
                roughness: 0.2
            })
        };

        // [D3] Ring in XY plane (NO rotation.y = Math.PI/2 here).
        // With billboard (container.lookAt camera), the XY plane always faces camera → coin always visible as a circle.
        this.ring = new THREE.Mesh(new THREE.TorusBufferGeometry(0.34, 0.095, 18, 42), this.materials.coin);
        this.ring.castShadow = true;

        this.core = new THREE.Mesh(new THREE.SphereBufferGeometry(0.2, 22, 18), this.materials.coin.clone());
        this.core.scale.set(1, 1, 0.35);
        this.core.castShadow = true;

        this.halo = new THREE.Mesh(
            new THREE.TorusBufferGeometry(0.48, 0.025, 10, 48),
            new THREE.MeshBasicMaterial({color: 0xffffff, transparent: true, opacity: 0.42})
        );
        this.halo.rotation.x = Math.PI / 2;

        this.container.add(this.ring);
        this.container.add(this.core);
        this.container.add(this.halo);
    }

    /**
     * @param {number} delta
     * @param {number} speed
     * @param {object} camera - optional camera reference update (from obstacles.js)
     */
    update(delta, speed, camera) {
        if (this.collected) return;

        // Allow runtime camera reference update
        if (camera) this.camera = camera;

        this.container.position.z += speed * delta;

        // [D3] Spinning animation — spin slowly in place around Y axis
        this.container.rotation.y += delta * 2.5;
        this.ring.rotation.z += delta * 1.5;
        this.halo.rotation.z -= delta * 1.2;
        this.core.rotation.x += delta * 1.5;

        // Hover effect (performance.now() does not allocate)
        this.container.position.y = this.baseY + Math.sin(performance.now() * 0.006 + this.z) * 0.08;

        this.collider.setFromObject(this.container);
        this.expired = this.container.position.z > 10;
    }

    collect() {
        this.collected = true;
        this.expired = true;
    }

    applyTexture(texture) {
        const targetTypes = ['coin', 'orb', 'shield'];
        targetTypes.forEach(type => {
            if (!this.materials[type]) return;
            this.materials[type] = this.materials[type].clone();
            this.materials[type].map = this.cloneTexture(texture);
            this.materials[type].color.set(0xffffff);
            this.materials[type].roughness = Math.max(this.materials[type].roughness, 0.32);
            this.materials[type].needsUpdate = true;
        });

        const material = this.materials[this.type] || this.materials.coin;
        this.ring.material = material;
        this.core.material = material.clone();
    }

    cloneTexture(texture) {
        const clone = texture.clone();
        clone.needsUpdate = true;
        clone.wrapS = THREE.RepeatWrapping;
        clone.wrapT = THREE.RepeatWrapping;
        clone.repeat.set(1, 1);
        return clone;
    }

    reset(laneX, z, type = 'coin') {
        this.type = type;
        this.laneX = laneX;
        this.z = z;
        this.collected = false;
        this.expired = false;
        this.container.visible = true;
        // [D3] Reset ring rotation (no Y rotation — billboard handles facing)
        this.ring.rotation.set(0, 0, 0);
        this.collider.makeEmpty();

        const material = this.materials[this.type] || this.materials.coin;
        this.ring.material = material;
        this.core.material = material.clone();

        if (this.type === 'orb') {
            this.baseY = 1.38;
            this.ring.geometry = new THREE.TorusBufferGeometry(0.24, 0.04, 14, 36);
            this.core.geometry = new THREE.SphereBufferGeometry(0.28, 24, 18);
            this.core.scale.setScalar(1);
            this.halo.visible = true;
            this.halo.material.color.set(0x67e8f9);
            this.halo.material.opacity = 0.42;
        } else if (this.type === 'shield') {
            this.baseY = 1.5;
            this.ring.geometry = new THREE.TorusBufferGeometry(0.42, 0.045, 14, 48);
            this.core.geometry = new THREE.OctahedronBufferGeometry(0.32, 1);
            this.core.scale.set(1, 1.12, 1);
            this.halo.visible = true;
            this.halo.material.color.set(0xc4b5fd);
            this.halo.material.opacity = 0.42;
        } else {
            this.baseY = 1.25;
            this.ring.geometry = new THREE.TorusBufferGeometry(0.34, 0.095, 18, 42);
            this.core.geometry = new THREE.SphereBufferGeometry(0.2, 22, 18);
            this.core.scale.set(1, 1, 0.35);
            this.halo.visible = true;
            this.halo.material.color.set(0xfef3c7);
            this.halo.material.opacity = 0.22;
        }

        this.container.position.set(this.laneX, this.baseY, this.z);
    }
}
