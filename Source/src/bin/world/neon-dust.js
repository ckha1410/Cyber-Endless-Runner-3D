import * as THREE from 'three';

/**
 * [F7] GPU Instanced Neon Dust — Visual Density với 1 draw call
 * Kỹ thuật: THREE.InstancedMesh — vẽ 500 hạt bụi chỉ tốn 1 glDrawElements call.
 * Mỗi hạt trôi nổi theo sóng sin độc lập (pre-baked offsets) → sinh động mà không tốn CPU nhiều.
 * [PERF] Chỉ cập nhật instanceMatrix mỗi frame — ~500 matrix multiply per frame (< 0.5ms).
 */

const PARTICLE_COUNT = 500;
const _dummy = new THREE.Object3D();

// Pre-allocated cyberpunk palette
const _NEON_PALETTE = [
    new THREE.Color(0x00ffff), // cyan
    new THREE.Color(0xff00ff), // magenta
    new THREE.Color(0xfacc15), // yellow
    new THREE.Color(0x7c3aed), // purple
    new THREE.Color(0x34d399), // green
    new THREE.Color(0xfb7185)  // pink
];

export default class NeonDustParticles {
    constructor() {
        this.container = new THREE.Object3D();
        this.container.name = 'neon_dust';

        // Pre-allocated animation data (typed arrays = cache-friendly)
        this._baseX = new Float32Array(PARTICLE_COUNT);
        this._baseY = new Float32Array(PARTICLE_COUNT);
        this._baseZ = new Float32Array(PARTICLE_COUNT);
        this._phase = new Float32Array(PARTICLE_COUNT); // sin phase offset
        this._freq  = new Float32Array(PARTICLE_COUNT); // oscillation speed
        this._amp   = new Float32Array(PARTICLE_COUNT); // drift amplitude
        this._size  = new Float32Array(PARTICLE_COUNT); // base particle size

        // Initialise random positions and per-particle animation params
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            // Spread particles: wide in X, but avoid center 3 lanes ([-3.5, 3.5])
            let startX = (Math.random() - 0.5) * 36;
            if (Math.abs(startX) < 3.5) {
                startX = startX > 0 ? startX + 3.5 : startX - 3.5;
            }
            this._baseX[i] = startX;
            this._baseY[i] = 0.3 + Math.random() * 5.5;    // 0.3 to 5.8 high
            this._baseZ[i] = -5 - Math.random() * 75;      // 5..80 units ahead
            this._phase[i] = Math.random() * Math.PI * 2;
            this._freq[i]  = 0.4 + Math.random() * 1.2;    // 0.4..1.6 Hz
            this._amp[i]   = 0.12 + Math.random() * 0.35;  // drift amplitude
            this._size[i]  = 0.025 + Math.random() * 0.06; // 0.025..0.085
        }

        // Tiny octahedron shape — more interesting than sphere
        const geo = new THREE.OctahedronBufferGeometry(1, 0);
        const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });

        this.mesh = new THREE.InstancedMesh(geo, mat, PARTICLE_COUNT);
        this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.mesh.frustumCulled = false;

        // Set initial per-instance colors
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            this.mesh.setColorAt(i, _NEON_PALETTE[i % _NEON_PALETTE.length]);
        }
        if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;

        this.container.add(this.mesh);
    }

    /**
     * @param {number} elapsed - total elapsed seconds (monotonically increasing)
     * @param {number} speed   - current game speed (used to drift particles backward)
     */
    update(elapsed, speed) {
        // Speed drives Z drift: as game accelerates, particles rush past camera faster
        const zDrift = speed * 0.016; // small fractional drift each tick

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            // Drift particle slightly backward (toward player) with game speed
            this._baseZ[i] += zDrift;
            // Recycle particle when it passes behind camera
            if (this._baseZ[i] > 6) {
                this._baseZ[i] = -5 - Math.random() * 75;
                let nextX = (Math.random() - 0.5) * 36;
                if (Math.abs(nextX) < 3.5) {
                    nextX = nextX > 0 ? nextX + 3.5 : nextX - 3.5;
                }
                this._baseX[i] = nextX;
                this._baseY[i] = 0.3 + Math.random() * 5.5;
            }

            // Oscillating Y and X drift via pre-baked sin wave
            const t = elapsed * this._freq[i] + this._phase[i];
            const dx = Math.sin(t * 0.7) * this._amp[i];
            const dy = Math.sin(t) * this._amp[i];

            _dummy.position.set(
                this._baseX[i] + dx,
                this._baseY[i] + dy,
                this._baseZ[i]
            );
            // Slowly spinning particle for extra sparkle
            _dummy.rotation.set(elapsed * 0.5 + i, elapsed * 0.3 + i * 0.5, 0);
            _dummy.scale.setScalar(this._size[i]);
            _dummy.updateMatrix();
            this.mesh.setMatrixAt(i, _dummy.matrix);
        }

        this.mesh.instanceMatrix.needsUpdate = true;
    }
}
