import * as THREE from 'three';

const PARTICLE_COUNT = 160;
const DURATION = 1.8; // seconds

/**
 * [E1c] Death Explosion — Nhân vật "nổ" thành mảnh vụn khi chết
 * Kỹ thuật: THREE.InstancedMesh vẽ 160 mảnh trong 1 draw call (1 glDrawElements).
 * Physics: Verlet-style integration dùng typed arrays (Float32Array) — zero Vector3 allocation per frame.
 * [PERF] Chỉ update khi đang active (1.8s sau death), sau đó mesh.visible = false → zero overhead.
 */

// [PERF] Module-level dummy Object3D — shared across all 160 particles per frame
const _dummy = new THREE.Object3D();

// [PERF] Pre-allocated palette — no new THREE.Color() in explode() or update()
const _PALETTE = [
    new THREE.Color(0x00ffff), // cyan
    new THREE.Color(0xff00ff), // magenta
    new THREE.Color(0xffffff), // white
    new THREE.Color(0xffff00), // yellow
    new THREE.Color(0xff4400), // orange
    new THREE.Color(0x7c3aed)  // purple
];

export default class DeathExplosion {
    constructor() {
        this.container = new THREE.Object3D();
        this.container.name = 'death_explosion';
        this._active = false;
        this._time = 0;

        // [PERF] Pre-allocate all particle state as typed arrays (cache-friendly)
        this._px = new Float32Array(PARTICLE_COUNT);
        this._py = new Float32Array(PARTICLE_COUNT);
        this._pz = new Float32Array(PARTICLE_COUNT);
        this._vx = new Float32Array(PARTICLE_COUNT);
        this._vy = new Float32Array(PARTICLE_COUNT);
        this._vz = new Float32Array(PARTICLE_COUNT);
        this._rx = new Float32Array(PARTICLE_COUNT);
        this._ry = new Float32Array(PARTICLE_COUNT);
        this._rz = new Float32Array(PARTICLE_COUNT);
        this._rxS = new Float32Array(PARTICLE_COUNT); // rotation speeds
        this._ryS = new Float32Array(PARTICLE_COUNT);
        this._rzS = new Float32Array(PARTICLE_COUNT);
        this._sz = new Float32Array(PARTICLE_COUNT); // sizes

        // Use Icosahedron for jagged, irregular shard shapes
        const geo = new THREE.IcosahedronBufferGeometry(1, 0);
        // Remove vertexColors: true so instanceColor overrides the base white color
        const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });

        this.mesh = new THREE.InstancedMesh(geo, mat, PARTICLE_COUNT);
        this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.mesh.visible = false;
        this.mesh.frustumCulled = false;

        // Pre-seed colors (will be overwritten on explode)
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            this.mesh.setColorAt(i, _PALETTE[i % _PALETTE.length]);
        }
        if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;

        this.container.add(this.mesh);
    }

    /**
     * Trigger explosion — called ONCE on player-hit event (not in render loop).
     * Allocation allowed here since it's event-driven.
     * @param {THREE.Vector3} position - world position of explosion center
     */
    explode(position) {
        this._active = true;
        this._time = 0;
        this.mesh.visible = true;

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            // Randomize spawn point (spread from player center)
            this._px[i] = position.x + (Math.random() - 0.5) * 0.9;
            this._py[i] = position.y + Math.random() * 0.6;
            this._pz[i] = position.z + (Math.random() - 0.5) * 0.4;

            // Burst velocity — biased upward for dramatic arc
            const speed = 3.5 + Math.random() * 9;
            const phi = Math.random() * Math.PI * 2;
            const theta = Math.random() * Math.PI;
            this._vx[i] = speed * Math.sin(theta) * Math.cos(phi);
            this._vy[i] = speed * Math.abs(Math.cos(theta)) * 0.8 + 3;
            this._vz[i] = speed * Math.sin(theta) * Math.sin(phi) * 0.25; // compressed in Z

            // Pre-bake rotation speeds (random per particle, constant per explosion)
            this._rx[i] = this._ry[i] = this._rz[i] = 0;
            this._rxS[i] = (Math.random() - 0.5) * 14;
            this._ryS[i] = (Math.random() - 0.5) * 11;
            this._rzS[i] = (Math.random() - 0.5) * 9;

            // Random debris size (Bigger as requested)
            this._sz[i] = 0.12 + Math.random() * 0.25;

            // Assign random color from palette
            this.mesh.setColorAt(i, _PALETTE[Math.floor(Math.random() * _PALETTE.length)]);
        }
        if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    }

    /**
     * @param {number} delta - seconds
     */
    update(delta) {
        if (!this._active) return;

        this._time += delta;
        const t = this._time / DURATION;

        if (t >= 1) {
            this._active = false;
            this.mesh.visible = false;
            return;
        }

        const fade = 1 - t;

        // [PERF] Loop over typed arrays — no Vector3, no new objects per iteration
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            // Verlet-style gravity integration
            this._vy[i] -= 13 * delta;
            this._px[i] += this._vx[i] * delta;
            this._py[i] += this._vy[i] * delta;
            this._pz[i] += this._vz[i] * delta;

            // Tumble rotation
            this._rx[i] += this._rxS[i] * delta;
            this._ry[i] += this._ryS[i] * delta;
            this._rz[i] += this._rzS[i] * delta;

            // Build instance matrix via shared _dummy Object3D
            _dummy.position.set(this._px[i], this._py[i], this._pz[i]);
            _dummy.rotation.set(this._rx[i], this._ry[i], this._rz[i]);
            _dummy.scale.setScalar(this._sz[i] * fade);
            _dummy.updateMatrix();
            this.mesh.setMatrixAt(i, _dummy.matrix);
        }

        this.mesh.instanceMatrix.needsUpdate = true;
    }
}
