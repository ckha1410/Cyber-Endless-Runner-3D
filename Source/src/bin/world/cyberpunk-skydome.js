import * as THREE from 'three';

/**
 * [F6] Cyberpunk Skydome — Procedural Sky Shader
 * Kỹ thuật: ShaderMaterial trên SphereGeometry lớn (inverted normals).
 * - Gradient deep purple → dark teal ở horizon
 * - Procedural stars (noise từ sin/fract)
 * - Dải nebula màu tím mờ ảo (noise pattern)
 * - Silhouette tòa nhà 2D ở đường chân trời
 * [PERF] Hoàn toàn trong GPU. Không có per-frame CPU math.
 */

const SKY_VERT = `
    varying vec3 vWorldDir;
    void main() {
        // World direction from camera center — used to look up sky color
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldDir = normalize(worldPos.xyz);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position.z = gl_Position.w; // Force to far plane (always behind everything)
    }
`;

const SKY_FRAG = `
    uniform float uTime;
    varying vec3 vWorldDir;

    // ── noise helpers ────────────────────────────────────────────────────────
    float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    float smoothNoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
            mix(hash(i), hash(i + vec2(1,0)), f.x),
            mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x),
            f.y
        );
    }

    // ── silhouette building ──────────────────────────────────────────────────
    float building(float x, float baseY, float w, float h) {
        float inX = step(x - w * 0.5, 0.0) * step(0.0, x + w * 0.5);
        float inY = step(baseY - h, 0.0) * step(0.0, baseY);
        return inX * inY;
    }

    void main() {
        vec3 dir = normalize(vWorldDir);
        float yUp = dir.y; // -1..1, 0 = horizon

        // ── Sky gradient ─────────────────────────────────────────────────────
        // vibrant blue sky → bright teal at horizon → dark blue below horizon
        vec3 zenithColor  = vec3(0.12, 0.28, 0.55);   // vibrant sky blue
        vec3 horizonColor = vec3(0.05, 0.45, 0.65);   // teal
        vec3 belowColor   = vec3(0.02, 0.15, 0.25);   // dark blue below horizon

        float t = max(0.0, yUp);
        vec3 skyColor = mix(horizonColor, zenithColor, t * t);
        if (yUp < 0.0) skyColor = mix(belowColor, horizonColor, 1.0 + yUp * 3.0);

        // ── Stars ─────────────────────────────────────────────────────────────
        // Map spherical direction to 2D plane for star field
        float starX = atan(dir.z, dir.x) * 3.183; // -PI..PI → -1..1 (approx)
        float starY = yUp;
        vec2 starUv = vec2(starX * 80.0, starY * 80.0);
        vec2 starCell = floor(starUv);
        vec2 starFrac = fract(starUv);

        float stars = 0.0;
        if (yUp > 0.05) { // Only above horizon
            float h1 = hash(starCell + vec2(7.3, 2.1));
            float h2 = hash(starCell + vec2(1.7, 9.5));
            float starSize = 0.025 + h1 * 0.035;
            float starBrightness = step(0.82, h2); // sparse
            float dist = length(starFrac - vec2(h1, hash(starCell + vec2(3.1, 5.7))));
            stars = starBrightness * smoothstep(starSize, 0.0, dist);
            // Twinkling
            stars *= 0.7 + 0.3 * sin(uTime * (2.0 + h1 * 3.0) + h2 * 6.28);
        }

        // Star color: mostly white, some blue-white
        float starHue = hash(starCell + vec2(0.5, 0.5));
        vec3 starColor = mix(vec3(0.8, 0.9, 1.0), vec3(0.5, 0.7, 1.0), starHue);

        // ── Nebula (purple wisps) ─────────────────────────────────────────────
        float nebula = 0.0;
        if (yUp > 0.0) {
            float nx = atan(dir.z, dir.x) * 1.5 + uTime * 0.003;
            float ny = yUp * 2.5;
            float n1 = smoothNoise(vec2(nx * 2.5, ny * 1.8));
            float n2 = smoothNoise(vec2(nx * 5.0 + 1.3, ny * 3.6 + 0.7));
            nebula = (n1 * 0.5 + n2 * 0.3) * smoothstep(0.0, 0.25, yUp) * 0.4;
        }
        vec3 nebulaColor = vec3(0.4, 0.1, 0.6); // brighter magenta/purple

        // ── City silhouette at horizon ────────────────────────────────────────
        // Flatten world dir to horizon band
        float hBand = 1.0 - smoothstep(-0.02, 0.12, yUp); // near horizon = 1
        float dirAngle = atan(dir.z, dir.x);  // -PI..PI

        // Procedural buildings using hash of angle-cell
        float buildingMask = 0.0;
        for (int i = -4; i <= 4; i++) {
            float bx = float(i) * 0.52;
            float cellAngle = bx;
            float hb = hash(vec2(floor(cellAngle * 3.0), 1.0));
            float hb2 = hash(vec2(floor(cellAngle * 3.0), 2.0));
            float bW = 0.06 + hb * 0.12;
            float bH = 0.025 + hb2 * 0.065; // height in yUp units
            float bBase = 0.0;
            float dist = abs(dirAngle - cellAngle * 1.2);
            float inBuilding = step(dist, bW) * step(yUp - bBase, bH) * step(0.0, yUp - bBase);
            buildingMask = max(buildingMask, inBuilding);
        }
        vec3 buildingColor = vec3(0.04, 0.12, 0.22); // dark blue silhouette, not pitch black
        // Windows on silhouette buildings
        float winX = mod(dirAngle * 8.0, 1.0);
        float winY = mod(yUp * 60.0, 1.0);
        float window = step(0.75, winX) * step(0.65, winY) * step(0.75, hash(vec2(floor(dirAngle*8.0), floor(yUp*60.0))));
        float windowStrength = buildingMask * window * 0.85;

        // ── Composite ─────────────────────────────────────────────────────────
        vec3 color = skyColor;
        color += nebulaColor * nebula;
        color += starColor * stars;
        color = mix(color, buildingColor, buildingMask * hBand);
        color += vec3(0.0, 1.0, 1.0) * windowStrength * 0.7; // cyan windows

        // Subtle horizon glow (neon city light pollution)
        float horizonGlow = smoothstep(0.1, -0.04, abs(yUp)) * 0.18;
        color += vec3(0.1, 0.0, 0.35) * horizonGlow;

        gl_FragColor = vec4(color, 1.0);
    }
`;

export default class CyberpunkSkydome {
    constructor() {
        this.container = new THREE.Object3D();
        this.container.name = 'cyberpunk_skydome';

        this.uniforms = {
            uTime: { value: 0 }
        };

        const mat = new THREE.ShaderMaterial({
            uniforms: this.uniforms,
            vertexShader: SKY_VERT,
            fragmentShader: SKY_FRAG,
            side: THREE.BackSide, // render inside of sphere
            depthWrite: false,    // draw before scene, no depth conflicts
            fog: false            // DO NOT apply scene fog to the sky
        });

        // Large sphere — player is always inside
        const geo = new THREE.SphereBufferGeometry(490, 32, 16);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.renderOrder = -1; // Draw first (behind everything)

        this.container.add(mesh);
    }

    /**
     * @param {number} elapsed - total elapsed seconds
     */
    update(elapsed) {
        this.uniforms.uTime.value = elapsed;
    }
}
