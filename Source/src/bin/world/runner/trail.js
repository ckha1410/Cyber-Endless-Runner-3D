import * as THREE from 'three';

const TRAIL_LENGTH = 50;

/**
 * [E1a] Running Trail — Vệt sáng phía sau nhân vật
 * Kỹ thuật: THREE.Points với pre-allocated Float32Array (sliding window buffer).
 * Màu gradient theo tốc độ: hồng (chậm) → xanh cyan (nhanh).
 * AdditiveBlending: tạo hiệu ứng phát sáng mà không cần thêm light.
 * [PERF] Không tạo object mới trong update(). Chỉ ghi vào buffer sẵn có.
 */
export default class RunningTrail {
    constructor() {
        // [PERF] Pre-allocate — NEVER create Float32Array inside update()
        this._positions = new Float32Array(TRAIL_LENGTH * 3);
        this._colors = new Float32Array(TRAIL_LENGTH * 3);

        const geo = new THREE.BufferGeometry();
        const posAttr = new THREE.BufferAttribute(this._positions, 3);
        const colAttr = new THREE.BufferAttribute(this._colors, 3);

        // DynamicDrawUsage: hints GPU to expect frequent updates → faster buffer upload
        posAttr.setUsage(THREE.DynamicDrawUsage);
        colAttr.setUsage(THREE.DynamicDrawUsage);

        geo.setAttribute('position', posAttr);
        geo.setAttribute('color', colAttr);

        const mat = new THREE.PointsMaterial({
            size: 0.12,
            vertexColors: true,
            transparent: true,
            opacity: 0.88,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            sizeAttenuation: true
        });

        this.points = new THREE.Points(geo, mat);
        // Never cull — trail is always near the player (in camera view)
        this.points.frustumCulled = false;

        this.container = new THREE.Object3D();
        this.container.name = 'running_trail';
        this.container.add(this.points);
    }

    /**
     * @param {THREE.Vector3} playerPos
     * @param {number} speed - current game speed
     */
    update(playerPos, speed) {
        const n = TRAIL_LENGTH;
        const pos = this._positions;
        const col = this._colors;

        // Slide all existing points one slot toward tail (O(n) typed-array copy — very fast)
        for (let i = n - 1; i > 0; i--) {
            const a = i * 3, b = (i - 1) * 3;
            pos[a]     = pos[b];
            pos[a + 1] = pos[b + 1];
            pos[a + 2] = pos[b + 2];
        }

        // Insert current player position as new head
        pos[0] = playerPos.x;
        pos[1] = playerPos.y + 0.55; // Slightly above feet
        pos[2] = playerPos.z;

        // Color gradient: head = bright, tail = dark. Hue shifts with speed.
        // speedNorm: 0 = walking speed (7.8), 1 = max speed (29)
        const speedNorm = Math.min(1, Math.max(0, (speed - 7.8) / 21.2));
        for (let i = 0; i < n; i++) {
            const t = 1 - i / n; // 1 at head, 0 at tail
            const ci = i * 3;
            // Slow → magenta (#ff00ff), Fast → cyan (#00ffff)
            col[ci]     = t * (1 - speedNorm);   // R: high when slow
            col[ci + 1] = t * speedNorm * 0.65;  // G: increases with speed
            col[ci + 2] = t;                      // B: always present
        }

        this.points.geometry.attributes.position.needsUpdate = true;
        this.points.geometry.attributes.color.needsUpdate = true;
    }

    reset() {
        // Clear trail on game reset to avoid ghost path
        this._positions.fill(0);
        this._colors.fill(0);
        this.points.geometry.attributes.position.needsUpdate = true;
        this.points.geometry.attributes.color.needsUpdate = true;
    }
}
