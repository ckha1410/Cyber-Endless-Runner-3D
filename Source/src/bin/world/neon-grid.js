import * as THREE from 'three';

/**
 * [F3] Neon Grid Floor — Custom Vertex + Fragment Shader
 * Kỹ thuật: ShaderMaterial với uTime uniform được cập nhật mỗi frame.
 * - Grid lines phát sáng emissive màu cyan/purple hội tụ về chân trời
 * - Scanline pulse chạy từ xa về phía camera theo nhịp thời gian
 * - Glow intensity tăng khi tốc độ cao (uSpeed uniform)
 * [PERF] Tất cả tính toán nằm trong GPU (GLSL) — zero CPU per-frame math.
 */

const VERTEX_SHADER = `
    varying vec2 vUv;
    varying vec3 vWorldPos;

    void main() {
        vUv = uv;
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const FRAGMENT_SHADER = `
    uniform float uTime;
    uniform float uSpeed;   // normalised 0..1
    varying vec2 vUv;
    varying vec3 vWorldPos;

    float glow(float v, float sharpness) {
        return pow(clamp(v, 0.0, 1.0), sharpness);
    }

    void main() {
        // UV remapped so V=0 is near camera, V=1 is horizon
        vec2 uv = vUv;

        // ── Scanline pulse: bright wave travelling from far to near ──────────
        float wave = uv.y - mod(uTime * (0.18 + uSpeed * 0.22), 1.0);
        float pulse = glow(1.0 - abs(wave) * 12.0, 1.2) * 0.95;

        // ── Horizon fade: road fades to black at horizon (V near 1) ──────────
        float horizonFade = 1.0 - smoothstep(0.55, 1.0, uv.y);

        // ── Edge fade: fade at lane edges (U near 0 or 1) ────────────────────
        float edgeFade = smoothstep(0.0, 0.06, uv.x) * smoothstep(0.0, 0.06, 1.0 - uv.x);

        float totalFade = horizonFade * edgeFade;

        // ── Color mixing ─────────────────────────────────────────────────────
        vec3 cyanColor   = vec3(0.0, 0.98, 1.0);
        vec3 purpleColor = vec3(0.45, 0.0, 1.0);
        vec3 lineColor = mix(cyanColor, purpleColor, uv.x * 0.6 + uSpeed * 0.4);

        // Output only the pulse wave, fully transparent otherwise
        float alpha = pulse * totalFade * (1.2 + uSpeed * 0.6);
        gl_FragColor = vec4(lineColor, alpha);
    }
`;

export default class NeonGrid {
    constructor() {
        this.container = new THREE.Object3D();
        this.container.name = 'neon_grid';

        // Road: PlaneBufferGeometry(8.4, 220) at y=0, z=-42, rotX=-PI/2
        // Add NeonGrid plane slightly above (y=0.01) to overlay
        const geo = new THREE.PlaneBufferGeometry(8.4, 220, 1, 1);

        this.uniforms = {
            uTime: { value: 0 },
            uSpeed: { value: 0 }
        };

        this.material = new THREE.ShaderMaterial({
            uniforms: this.uniforms,
            vertexShader: VERTEX_SHADER,
            fragmentShader: FRAGMENT_SHADER,
            transparent: true,
            depthWrite: false
        });

        this.mesh = new THREE.Mesh(geo, this.material);
        this.mesh.position.set(0, 0.012, -42); // just above road surface
        this.mesh.rotation.x = -Math.PI / 2;
        this.mesh.receiveShadow = false;

        this.container.add(this.mesh);
    }

    /**
     * Called every frame from world/index.js update()
     * @param {number} elapsed - total seconds since game start
     * @param {number} speed   - current game speed
     */
    update(elapsed, speed) {
        this.uniforms.uTime.value = elapsed;
        // Normalise: baseSpeed=7.8, maxSpeed=29  →  0..1
        this.uniforms.uSpeed.value = Math.min(1, Math.max(0, (speed - 7.8) / 21.2));
    }
}
