import * as THREE from 'three';

// [D1] Zone definitions — 2 Cyber Zones
const ZONES = [
    {
        id: 0,
        name: 'Neon City',
        scoreThreshold: 0,
        ambientColor: 0x0a1a3e   // dark cyan-blue
    },
    {
        id: 1,
        name: 'Corrupted Server Farm',
        scoreThreshold: 10000,
        ambientColor: 0x3a0800   // dark red-orange
    }
];

export default class ZoneManager {
    constructor(props) {
        this.lights = props.lights;
        this.floor = props.floor;
        this.onZoneChange = props.onZoneChange || null;

        this.currentZoneId = -1; // Force initial transition on first update
        this._transitioning = false;
        this._transitionT = 1.0;
        this._transitionDuration = 2.0;

        // [PERF] Pre-allocated Color objects — NO new THREE.Color() in update()
        this._colorFrom = new THREE.Color();
        this._colorTo = new THREE.Color();
    }

    /**
     * @param {number} score - current game score
     * @param {number} delta - real delta in seconds
     */
    update(score, delta) {
        // Determine target zone index
        let targetId = 0;
        for (let i = ZONES.length - 1; i >= 0; i--) {
            if (score >= ZONES[i].scoreThreshold) {
                targetId = i;
                break;
            }
        }

        // Zone changed → start transition
        if (targetId !== this.currentZoneId) {
            this._beginTransition(targetId);
        }

        // Drive lerp only while transitioning
        if (this._transitioning && this.lights && this.lights.ambient) {
            this._transitionT = Math.min(1.0, this._transitionT + delta / this._transitionDuration);

            // [PERF] lerpColors uses pre-allocated _colorFrom/_colorTo — zero allocation
            this.lights.ambient.color.lerpColors(this._colorFrom, this._colorTo, this._transitionT);

            if (this._transitionT >= 1.0) {
                this._transitioning = false;
                this._applyFloorTint(targetId); // One-time material update
                if (this.onZoneChange) this.onZoneChange(ZONES[targetId]);
            }
        }
    }

    _beginTransition(zoneId) {
        this.currentZoneId = zoneId;
        this._transitioning = true;
        this._transitionT = 0;

        // Snapshot current ambient color as interpolation start
        if (this.lights && this.lights.ambient) {
            this._colorFrom.copy(this.lights.ambient.color);
        } else {
            this._colorFrom.set(0x1a0a2e); // fallback: lights.js default
        }
        this._colorTo.set(ZONES[zoneId].ambientColor);
    }

    // [D1] One-time floor emissive tint when zone fully transitions
    _applyFloorTint(zoneId) {
        if (!this.floor || !this.floor.material) return;
        const mat = this.floor.material;
        if (!mat.emissive) return;

        if (zoneId === 1) {
            // Corrupted Server Farm — subtle red tint
            mat.emissive.set(0x200400);
            mat.emissiveIntensity = 0.06;
        } else {
            // Neon City — back to default
            mat.emissive.set(0x000a14);
            mat.emissiveIntensity = 0.03;
        }
        mat.needsUpdate = true;
    }

    getCurrentZoneName() {
        if (this.currentZoneId < 0) return ZONES[0].name;
        return ZONES[this.currentZoneId] ? ZONES[this.currentZoneId].name : ZONES[0].name;
    }
}