import * as THREE from 'three';

/**
 * [D2] SpeedFeedbackSystem
 * - FOV expansion theo tốc độ (lerp + threshold-based updateProjectionMatrix)
 * - Chromatic aberration value exposed via getAberration() → app.js cập nhật uniform
 * - Speed lines: CSS DOM overlay (zero WebGL cost)
 */
export default class SpeedFeedbackSystem {
    constructor(props) {
        this.camera = props.camera;
        this.baseSpeed = props.baseSpeed || 7.8;
        this.maxSpeed = props.maxSpeed || 29;

        this._speedNorm = 0;
        this._aberration = 0;

        // [PERF] Track last applied FOV to avoid redundant updateProjectionMatrix GPU calls
        this._prevFovApplied = this.camera ? this.camera.params.fov : 58;

        // [D2] Speed lines: pure DOM overlay — not a 3D mesh
        this._speedLinesEl = null;
        this._speedLinesOpacity = 0;
        this._createSpeedLines();
    }

    _createSpeedLines() {
        const el = document.createElement('div');
        el.id = 'speed-lines-overlay';
        el.style.cssText = [
            'position:fixed',
            'inset:0',
            'pointer-events:none',
            'z-index:50',
            'opacity:0',
            // Radial gradient tạo "tunnel vision" khi tăng tốc
            'background:radial-gradient(ellipse at 50% 50%, transparent 28%, rgba(160,215,255,0.06) 55%, rgba(120,185,255,0.16) 82%, transparent 100%)',
            'mix-blend-mode:screen',
            // CSS transition xử lý smooth — GPU composited, không dùng JS animation frame
            'transition:opacity 0.35s ease'
        ].join(';');
        document.body.appendChild(el);
        this._speedLinesEl = el;
    }

    /**
     * @param {number} delta - seconds
     * @param {number} speed - current game speed (m/s)
     */
    update(delta, speed) {
        // Normalize speed: 0 at baseSpeed, 1 at maxSpeed
        this._speedNorm = Math.min(1, Math.max(0,
            (speed - this.baseSpeed) / (this.maxSpeed - this.baseSpeed)
        ));

        // [D2] Chromatic aberration value: lerp toward target (cheap float math)
        const targetAberration = this._speedNorm * 8.0; // max 8 units
        this._aberration = THREE.MathUtils.lerp(this._aberration, targetAberration, delta * 2.5);

        // [D2] FOV expansion
        if (this.camera && this.camera.instance) {
            // Base FOV = current preset FOV, add speed bonus up to +18°
            const baseFov = this.camera.presets[this.camera.presetIndex].fov;
            const targetFov = baseFov + this._speedNorm * 18;
            this.camera.params.fov = THREE.MathUtils.lerp(
                this.camera.params.fov,
                targetFov,
                delta * 1.5
            );

            // [PERF] Only call updateProjectionMatrix when FOV changes > 0.4°
            const fovNow = Math.round(this.camera.params.fov * 10) / 10;
            if (Math.abs(fovNow - this._prevFovApplied) > 0.4) {
                this.camera.instance.fov = this.camera.params.fov;
                this.camera.instance.updateProjectionMatrix();
                this._prevFovApplied = fovNow;
            }
        }

        // [D2] Speed lines: update DOM opacity only when change is significant
        const targetOpacity = this._speedNorm * 0.7;
        if (Math.abs(targetOpacity - this._speedLinesOpacity) > 0.02) {
            this._speedLinesOpacity = targetOpacity;
            if (this._speedLinesEl) {
                this._speedLinesEl.style.opacity = targetOpacity.toFixed(2);
            }
        }
    }

    /** Chromatic aberration value — read by app.js to update ShaderPass uniform */
    getAberration() {
        return this._aberration;
    }

    destroy() {
        if (this._speedLinesEl && this._speedLinesEl.parentNode) {
            this._speedLinesEl.parentNode.removeChild(this._speedLinesEl);
        }
    }
}