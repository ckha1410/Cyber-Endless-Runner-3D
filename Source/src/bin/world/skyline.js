import * as THREE from 'three';

/**
 * [E3] Procedural Cybercity Skyline
 * Kỹ thuật: Procedural Geometry Generation — sinh ngẫu nhiên skyline khi khởi động.
 * Mỗi lần tải trang là một thành phố khác nhau.
 * - Canvas textures cho cửa sổ (5 variant, tạo 1 lần ở constructor)
 * - Rooftop variety: flat / antenna / pyramid
 * - Buildings dùng emissiveMap = window texture → glow qua bloom pass
 * [PERF] Hoàn toàn tĩnh sau khi generate — KHÔNG có logic per-frame.
 */

const NEON_PALETTE = [0x00ffff, 0xff00ff, 0xfacc15, 0x7c3aed, 0xff4400];

/**
 * Create a canvas texture simulating lit windows on a dark building face.
 * @param {number} accentHex - accent color for windows
 * @param {number} density - fraction of windows that are lit (0-1)
 */
function createWindowTexture(accentHex, density = 0.75) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Dark building face base
    ctx.fillStyle = '#060812';
    ctx.fillRect(0, 0, 64, 128);

    const r = (accentHex >> 16) & 0xff;
    const g = (accentHex >> 8) & 0xff;
    const b = accentHex & 0xff;

    // Window grid — randomized lit/unlit state with "curtain" effects
    for (let row = 0; row < 12; row++) {
        for (let col = 0; col < 5; col++) {
            if (Math.random() > density) continue;
            const alpha = 0.6 + Math.random() * 0.4; // Brighter
            ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
            
            // Add slight "curtain" or "shadow" effect to window
            const winWidth = 8;
            const winHeight = 6;
            ctx.fillRect(col * 12 + 2, row * 10 + 2, winWidth, winHeight);
            
            // Half drawn curtain
            if (Math.random() > 0.7) {
                ctx.fillStyle = '#0a0a0a';
                ctx.fillRect(col * 12 + 2, row * 10 + 2, winWidth, winHeight / 2);
            }
        }
    }

    // Occasional bright stripe (floor indicator / ledge light)
    if (Math.random() > 0.3) {
        ctx.fillStyle = `rgba(${r},${g},${b},0.6)`;
        ctx.fillRect(0, Math.floor(Math.random() * 11) * 10 + 9, 64, 1);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

export default class ProceduralSkyline {
    constructor() {
        this.container = new THREE.Object3D();
        this.container.name = 'procedural_skyline';

        // [PERF] Generate 5 window texture variants ONCE at startup
        this._textures = NEON_PALETTE.map(hex => createWindowTexture(hex));
        this._generateBase();
        this._generate();
    }

    _generateBase() {
        // Tạo mặt nền tối khổng lồ dưới thành phố để các tòa nhà không bị lơ lửng
        const baseMat = new THREE.MeshBasicMaterial({ color: 0x03050a });
        const leftBase = new THREE.Mesh(new THREE.PlaneBufferGeometry(60, 100), baseMat);
        leftBase.rotation.x = -Math.PI / 2;
        leftBase.position.set(-45, -0.1, -50);
        
        const rightBase = new THREE.Mesh(new THREE.PlaneBufferGeometry(60, 100), baseMat);
        rightBase.rotation.x = -Math.PI / 2;
        rightBase.position.set(45, -0.1, -50);

        this.container.add(leftBase);
        this.container.add(rightBase);
    }

    _generate() {
        const BUILDINGS_PER_SIDE = 12; // Giảm xuống để tránh lag và rối mắt

        // Left side (negative X) and right side (positive X)
        [-1, 1].forEach(side => {
            for (let i = 0; i < BUILDINGS_PER_SIDE; i++) {
                // X: pushed much further out (22 to 50) to NEVER overlap with game track/gates
                const x = side * (24.0 + Math.random() * 36);
                // Z: spread from -10 (near) to -120 (far)
                const z = -10 - i * 4.5 + (Math.random() - 0.5) * 6;

                const w = 1.4 + Math.random() * 3.0;   // building width
                const d = 1.4 + Math.random() * 3.0;   // building depth
                const floors = 4 + Math.floor(Math.random() * 46); // 4–50 floors
                const height = floors * 0.28;

                // Each building picks one of the 5 texture variants
                const texIndex = Math.floor(Math.random() * this._textures.length);
                this._buildBuilding(x, z, w, d, height, texIndex);
            }
        });
    }

    _buildBuilding(x, z, w, d, height, texIndex) {
        const tex = this._textures[texIndex];
        const accentHex = NEON_PALETTE[texIndex];

        // Building material: window texture as both color map and emissive map.
        // This means lit windows glow → enhanced by Bloom post-processing pass.
        const mat = new THREE.MeshStandardMaterial({
            color: 0x080c18,          // Dark face base color
            map: tex,
            emissiveMap: tex,         // Same texture drives emissive → window glow
            emissive: new THREE.Color(accentHex),
            emissiveIntensity: 1.2, // increased for bloom
            roughness: 0.88,
            metalness: 0.08
        });

        const body = new THREE.Mesh(new THREE.BoxBufferGeometry(w, height, d), mat);
        body.position.set(x, height / 2, z);
        // [PERF] Background buildings: disable shadow cast/receive (outside shadow frustum)
        body.castShadow = false;
        body.receiveShadow = false;
        this.container.add(body);

        // --- Ledges / Details ---
        // Thêm gờ ban công ngẫu nhiên ở giữa tòa nhà (Giảm tỷ lệ xuống 20%)
        if (Math.random() > 0.8 && height > 4.0) {
            const ledgeHeight = 1.0 + Math.floor(Math.random() * (height - 3));
            const ledge = new THREE.Mesh(
                new THREE.BoxBufferGeometry(w + 0.3, 0.2, d + 0.3),
                new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.8 })
            );
            ledge.position.set(x, ledgeHeight, z);
            this.container.add(ledge);
            
            // Viền sáng cho gờ
            if (Math.random() > 0.5) {
                const neonLedge = new THREE.Mesh(
                    new THREE.BoxBufferGeometry(w + 0.35, 0.05, d + 0.35),
                    new THREE.MeshBasicMaterial({ color: new THREE.Color(accentHex) })
                );
                neonLedge.position.set(x, ledgeHeight + 0.1, z);
                this.container.add(neonLedge);
            }
        }

        // --- Hologram Billboards ---
        // Giảm tỷ lệ xuống 15% để bớt rối mắt
        if (Math.random() > 0.85 && height > 5.0) {
            const bbWidth = w * 0.8 + Math.random() * 1.5;
            const bbHeight = 1.0 + Math.random() * 2.0;
            const bbColor = NEON_PALETTE[Math.floor(Math.random() * NEON_PALETTE.length)];
            
            // Canvas for Hologram Text/Pattern
            const canvas = document.createElement('canvas');
            canvas.width = 128; canvas.height = 64;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, 128, 64);
            // Draw random "cyber" text/bars
            ctx.fillStyle = '#' + bbColor.toString(16).padStart(6, '0');
            for(let i = 0; i < 5; i++) {
                ctx.fillRect(10 + Math.random() * 100, 10 + Math.random() * 40, 5 + Math.random() * 20, 4 + Math.random() * 10);
            }
            ctx.font = '20px monospace';
            ctx.fillText("CORP", 20, 40);
            
            const bbTex = new THREE.CanvasTexture(canvas);
            
            const billboard = new THREE.Mesh(
                new THREE.PlaneBufferGeometry(bbWidth, bbHeight),
                new THREE.MeshBasicMaterial({
                    map: bbTex,
                    color: bbColor,
                    transparent: true,
                    opacity: 0.85,
                    blending: THREE.AdditiveBlending,
                    side: THREE.DoubleSide
                })
            );
            // Lơ lửng bên hông tòa nhà
            billboard.position.set(x + (Math.random() > 0.5 ? w/2 + 0.5 : -w/2 - 0.5), height * (0.3 + Math.random() * 0.5), z + d/2 + 0.1);
            // Hướng mặt ra đường (Z hướng về camera)
            if (billboard.position.x > x) {
                billboard.rotation.y = -Math.PI/6;
            } else {
                billboard.rotation.y = Math.PI/6;
            }
            this.container.add(billboard);
        }

        // --- Rooftop variety ---
        const roofRoll = Math.random();

        if (roofRoll > 0.75) {
            // Complex Antenna System
            const antBaseHeight = 0.4 + Math.random() * 0.8;
            const antBase = new THREE.Mesh(
                new THREE.BoxBufferGeometry(w * 0.4, antBaseHeight, d * 0.4),
                new THREE.MeshStandardMaterial({ color: 0x1f2937 })
            );
            antBase.position.set(x, height + antBaseHeight/2, z);
            this.container.add(antBase);

            const antHeight = 1.0 + Math.random() * 2.5;
            const antenna = new THREE.Mesh(
                new THREE.CylinderBufferGeometry(0.01, 0.05, antHeight, 6),
                new THREE.MeshStandardMaterial({ color: 0x4b5563 })
            );
            antenna.position.set(x, height + antBaseHeight + antHeight / 2, z);
            this.container.add(antenna);

            // Blinking red orb at antenna tip
            const orb = new THREE.Mesh(
                new THREE.SphereBufferGeometry(0.08, 8, 6),
                new THREE.MeshBasicMaterial({ color: 0xff1111 })
            );
            orb.position.set(x, height + antBaseHeight + antHeight + 0.06, z);
            this.container.add(orb);

        } else if (roofRoll > 0.45) {
            // Pyramid / stepped top
            const pyramid = new THREE.Mesh(
                new THREE.ConeBufferGeometry(w * 0.45, 0.8 + Math.random() * 1.2, 4),
                new THREE.MeshStandardMaterial({
                    color: 0x111827,
                    emissive: new THREE.Color(accentHex),
                    emissiveIntensity: 0.5,
                    roughness: 0.6,
                    metalness: 0.2
                })
            );
            pyramid.position.set(x, height + 0.4, z);
            pyramid.rotation.y = Math.PI / 4; 
            this.container.add(pyramid);
        } else {
            // Flat roof with glowing neon border
            const border = new THREE.Mesh(
                new THREE.BoxBufferGeometry(w * 1.05, 0.15, d * 1.05),
                new THREE.MeshBasicMaterial({ color: new THREE.Color(accentHex) })
            );
            border.position.set(x, height + 0.075, z);
            this.container.add(border);
        }
    }
}
