import * as THREE from 'three';

export default class Lights {
    constructor(options) {
        this.debug = options && options.debug;
        this.container = new THREE.Object3D();
        this.container.name = 'lights';

        this.createLights();
        this._initFlash(); // [D5] Must be called AFTER createLights()
        this.setDebug();
    }

    createLights() {
        // [A3] Ambient Light (Ánh sáng môi trường)
        // Dựa theo Phong Lighting Model, Ambient giả lập ánh sáng tán xạ từ môi trường,
        // lấp đầy không gian tối, không có hướng hay vị trí cụ thể.
        // Màu tím/xanh Cyberpunk (#1a0a2e) với cường độ 0.5
        this.ambient = new THREE.AmbientLight(0x1a0a2e, 0.5);

        // [A3] Directional Light (Ánh sáng định hướng)
        // Mô phỏng nguồn sáng từ khoảng cách vô cực (như Mặt trời).
        // Tia sáng song song, dùng để tính toán thành phần Diffuse và Specular trong Phong Model.
        this.directional = new THREE.DirectionalLight(0xfff1c2, 1.22);
        this.directional.position.set(-5, 12, 9);

        // [A4] Shadow Mapping
        // Thuật toán: Tạo ra một Depth Map (Shadow Map) từ góc nhìn của đèn Directional.
        // Khi render pixel, tính xem khoảng cách từ pixel tới đèn có lớn hơn khoảng cách
        // nhỏ nhất được lưu trong Depth Map hay không. Nếu có, pixel đó nằm trong bóng râm (fragment bị che khuất).
        this.directional.castShadow = true;
        this.directional.shadow.mapSize.set(2048, 2048);
        this.directional.shadow.camera.near = 1;
        this.directional.shadow.camera.far = 42;
        this.directional.shadow.camera.left = -18;
        this.directional.shadow.camera.right = 18;
        this.directional.shadow.camera.top = 18;
        this.directional.shadow.camera.bottom = -18;
        this.directional.shadow.bias = -0.0002;

        // [A3] Point Light (Ánh sáng điểm)
        // Nguồn sáng phát ra từ một điểm ra mọi hướng, có distance và decay (tắt dần).
        // Tính toán Diffuse theo khoảng cách bình phương nghịch đảo.
        this.pointCyan = new THREE.PointLight(0x00ffff, 1.28, 19, 1.8);
        this.pointCyan.position.set(-3.8, 2.4, -6);

        this.pointPink = new THREE.PointLight(0xff00ff, 1.05, 19, 1.8);
        this.pointPink.position.set(3.8, 2.2, -14);

        this.sunFill = new THREE.PointLight(0xfbbf24, 0.38, 34, 2.2);
        this.sunFill.position.set(0, 5.2, -26);

        this.container.add(this.ambient);
        this.container.add(this.directional);
        this.container.add(this.pointCyan);
        this.container.add(this.pointPink);
        this.container.add(this.sunFill);
    }

    /**
     * [D5] Initialize reactive flash system.
     * Pre-allocate all Color objects here — NEVER in update() or flash().
     */
    _initFlash() {
        this._flashColor = new THREE.Color();
        // Snapshot base colors for restore after flash
        this._baseCyanColor = this.pointCyan.color.clone(); // 0x00ffff
        this._basePinkColor = this.pointPink.color.clone(); // 0xff00ff

        this._flashT = 0;           // 1.0 = peak, 0 = done
        this._flashBoost = 0;       // intensity boost at peak
        this._flashDecayRate = 5;   // 1/duration (per second)
        this._wasFlashing = false;  // track to restore colors exactly once
    }

    /**
     * [D5] Trigger a reactive lighting flash.
     * Called on gameplay events — NOT in render loop.
     * @param {number} colorHex
     * @param {number} intensityBoost - added to both point lights at peak
     * @param {number} duration - seconds
     */
    flash(colorHex, intensityBoost, duration) {
        this._flashColor.set(colorHex);
        this._flashBoost = intensityBoost;
        this._flashDecayRate = 1 / Math.max(duration, 0.05);
        this._flashT = 1.0; // Restart flash from peak
    }

    update(time, playerPosition) {
        const delta = Math.min(time.delta / 1000, 0.06);
        const elapsed = time.elapsed;

        // [A3] Pulse animation on point lights
        const pulse = 0.75 + Math.sin(elapsed * 3.2) * 0.25;
        let cyanIntensity = 1.35 + pulse * 0.45;
        let pinkIntensity = 1.15 + (1 - pulse) * 0.35;

        // [D5] Apply reactive flash overlay on top of pulse
        if (this._flashT > 0) {
            this._flashT = Math.max(0, this._flashT - delta * this._flashDecayRate);
            const ft = this._flashT;
            // Lerp point light colors: base → flashColor (at ft=1), flash → base (ft→0)
            this.pointCyan.color.copy(this._baseCyanColor).lerp(this._flashColor, ft);
            this.pointPink.color.copy(this._basePinkColor).lerp(this._flashColor, ft * 0.6);
            // Boost intensity
            cyanIntensity += this._flashBoost * ft;
            pinkIntensity += this._flashBoost * 0.45 * ft;
            this._wasFlashing = true;
        } else if (this._wasFlashing) {
            // Flash just ended: restore base colors exactly once
            this.pointCyan.color.copy(this._baseCyanColor);
            this.pointPink.color.copy(this._basePinkColor);
            this._wasFlashing = false;
        }

        this.pointCyan.intensity = cyanIntensity;
        this.pointPink.intensity = pinkIntensity;

        // [A4] Dynamic shadow frustum update theo player position
        // Trượt vùng chiếu bóng đổ (Shadow Camera Frustum) theo toạ độ người chơi
        // để tiết kiệm tài nguyên kết xuất bóng đổ diện rộng.
        if (playerPosition) {
            this.directional.shadow.camera.left = playerPosition.x - 18;
            this.directional.shadow.camera.right = playerPosition.x + 18;
            this.directional.shadow.camera.top = playerPosition.z + 18;
            this.directional.shadow.camera.bottom = playerPosition.z - 18;
            this.directional.position.x = playerPosition.x - 5;
            this.directional.target.position.x = playerPosition.x;
            this.directional.shadow.camera.updateProjectionMatrix();
        }
    }

    setDebug() {
        if (!this.debug) return;

        const folder = this.debug.addFolder('World Lighting & Shadows');

        folder.add(this.ambient, 'visible').name('Ambient on');
        folder.add(this.ambient, 'intensity', 0, 2, 0.01).name('Ambient intensity');

        folder.add(this.directional, 'visible').name('Directional (Sun) on');
        folder.add(this.directional, 'intensity', 0, 3, 0.01).name('Sun intensity');

        folder.add({ shadow: true }, 'shadow').name('Shadow Mapping').onChange((val) => {
            this.directional.castShadow = val;
            // Ép Threejs update lại materials để bỏ/thêm shadow compile shader
            this.container.parent.traverse((child) => {
                if (child.isMesh && child.material) child.material.needsUpdate = true;
            });
        });

        folder.add(this.pointCyan, 'visible').name('Point Light Cyan');
        folder.add(this.pointCyan, 'intensity', 0, 4, 0.01).name('Point cyan intensity');

        folder.add(this.pointPink, 'visible').name('Point Light Pink');
        folder.add(this.pointPink, 'intensity', 0, 4, 0.01).name('Point pink intensity');
    }
}
