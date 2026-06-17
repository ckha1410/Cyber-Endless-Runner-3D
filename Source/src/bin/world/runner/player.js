import * as THREE from 'three';
import {Howl} from 'howler';

export default class Player {
    constructor(props) {
        this.input = props.input;
        this.manager = props.manager;

        this.container = new THREE.Object3D();
        this.container.name = 'player';

        this.lanes = props.lanes;
        this.laneIndex = 1;
        this.playerZ = 4.2;
        this.position = new THREE.Vector3(this.lanes[this.laneIndex], 0, this.playerZ);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.gravity = new THREE.Vector3(0, -23.5, 0);
        this.collider = new THREE.Box3();

        this.grounded = true;
        this.wasGrounded = true;
        this.runPhase = 0;
        this.landingPulse = 0;
        this.lastLaneDirection = 0;
        this.visualScale = 1.08;
        this.marbleMode = false;

        this.sfxJump = new Howl({
            src: ['sfx/jump_02.wav'],
            html5: true,
            volume: 0.28
        });

        this.createMascot();
        this.setControls();
        this.manager.on('reset', () => this.reset());
    }

    setControls() {
        this.input.on('moveLeft', () => this.changeLane(-1));
        this.input.on('moveRight', () => this.changeLane(1));
        this.input.on('jump', () => this.jump());
        this.input.on('toggleMarble', () => this.toggleMarble());
    }

    createMascot() {
        this.rig = new THREE.Object3D();
        this.rig.name = 'neo_mascot_rig';
        this.rig.rotation.y = Math.PI;
        this.rig.scale.setScalar(this.visualScale);
        this.container.add(this.rig);

        this.materials = {
            suit: new THREE.MeshStandardMaterial({
                color: 0xc084fc,
                emissive: 0x4c1d95,
                emissiveIntensity: 0.08,
                roughness: 0.48,
                metalness: 0.08
            }),
            jacket: new THREE.MeshStandardMaterial({
                color: 0x5eead4,
                emissive: 0x0f766e,
                emissiveIntensity: 0.08,
                roughness: 0.52,
                metalness: 0.08
            }),
            helmet: new THREE.MeshStandardMaterial({
                color: 0xdbeafe,
                emissive: 0x1e3a8a,
                emissiveIntensity: 0.025,
                roughness: 0.46,
                metalness: 0.1
            }),
            visor: new THREE.MeshStandardMaterial({
                color: 0x22d3ee,
                emissive: 0x22d3ee,
                emissiveIntensity: 0.85,
                roughness: 0.12,
                metalness: 0.25
            }),
            glove: new THREE.MeshStandardMaterial({
                color: 0xfacc15,
                emissive: 0x854d0e,
                emissiveIntensity: 0.1,
                roughness: 0.48,
                metalness: 0.1
            }),
            shoe: new THREE.MeshStandardMaterial({
                color: 0x312e81,
                emissive: 0x4c1d95,
                emissiveIntensity: 0.18,
                roughness: 0.42,
                metalness: 0.28
            })
        };

        const body = new THREE.Mesh(new THREE.CylinderBufferGeometry(0.42, 0.5, 0.98, 28), this.materials.jacket);
        body.position.y = 0.98;
        body.scale.z = 0.78;

        const chestGlow = new THREE.Mesh(new THREE.BoxBufferGeometry(0.48, 0.12, 0.05), this.materials.visor);
        chestGlow.position.set(0, 1.12, -0.35);

        const belt = new THREE.Mesh(
            new THREE.TorusBufferGeometry(0.39, 0.025, 8, 28),
            new THREE.MeshStandardMaterial({
                color: 0xfacc15,
                emissive: 0x854d0e,
                emissiveIntensity: 0.12,
                roughness: 0.4,
                metalness: 0.16
            })
        );
        belt.position.y = 0.74;
        belt.rotation.x = Math.PI / 2;
        belt.scale.z = 0.72;

        const head = new THREE.Mesh(new THREE.SphereBufferGeometry(0.43, 32, 24), this.materials.helmet);
        head.position.y = 1.72;
        head.scale.set(1, 0.94, 1.04);
        
        [body, chestGlow, belt, head].forEach(mesh => {
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.rig.add(mesh);
        });

        const visor = new THREE.Mesh(new THREE.BoxBufferGeometry(0.54, 0.12, 0.06), this.materials.visor);
        visor.position.set(0, 1.76, -0.4);

        const antenna = new THREE.Mesh(new THREE.CylinderBufferGeometry(0.025, 0.025, 0.32, 10), this.materials.visor);
        antenna.position.set(0.25, 2.13, -0.02);
        antenna.rotation.z = -0.24;
        const antennaOrb = new THREE.Mesh(new THREE.SphereBufferGeometry(0.08, 14, 14), this.materials.glove);
        antennaOrb.position.set(0.31, 2.29, -0.02);

        const leftFin = this.createHeadFin(-0.34);
        const rightFin = this.createHeadFin(0.34);
        const backpack = new THREE.Mesh(
            new THREE.BoxBufferGeometry(0.42, 0.62, 0.18),
            new THREE.MeshStandardMaterial({
                color: 0x7c3aed,
                emissive: 0x6d28d9,
                emissiveIntensity: 0.16,
                roughness: 0.32,
                metalness: 0.18
            })
        );
        backpack.position.set(0, 1.06, 0.42);

        const jetLeft = new THREE.Mesh(new THREE.CylinderBufferGeometry(0.06, 0.08, 0.28, 12), this.materials.visor.clone());
        jetLeft.position.set(-0.15, 0.72, 0.52);
        jetLeft.rotation.x = Math.PI / 2;
        const jetRight = jetLeft.clone();
        jetRight.position.x = 0.15;

        this.trailLeft = this.createTrail(-0.15);
        this.trailRight = this.createTrail(0.32);
        this.rig.add(this.trailLeft);
        this.rig.add(this.trailRight);

        // [G1] Marble Mode Sphere
        const marbleTex = new THREE.TextureLoader().load('src/textures/space.jpg');
        this.marbleMesh = new THREE.Mesh(
            new THREE.SphereBufferGeometry(0.75, 24, 24),
            new THREE.MeshStandardMaterial({
                color: 0xffffff,
                map: marbleTex,
                roughness: 0.2
            })
        );
        this.marbleMesh.position.y = 0.75;
        this.marbleMesh.visible = false;
        this.marbleMesh.castShadow = true;
        this.container.add(this.marbleMesh);

        this.armLeft = this.createLimb(-0.52, 1.28, 'arm', this.materials.suit, this.materials.glove);
        this.armRight = this.createLimb(0.52, 1.28, 'arm', this.materials.suit, this.materials.glove);
        this.legLeft = this.createLimb(-0.24, 0.58, 'leg', this.materials.suit, this.materials.shoe);
        this.legRight = this.createLimb(0.24, 0.58, 'leg', this.materials.suit, this.materials.shoe);

        [body, chestGlow, belt, head, visor, antenna, antennaOrb, leftFin, rightFin, backpack, jetLeft, jetRight, this.trailLeft, this.trailRight].forEach(mesh => {
            if (typeof mesh.castShadow !== 'undefined') {
                mesh.castShadow = true;
                mesh.receiveShadow = true;
            }
            this.rig.add(mesh);
        });

        // [A3] Gắn trực tiếp PointLight màu Cyan (#00ffff) vào Player
        this.pointLight = new THREE.PointLight(0x00ffff, 1.5, 10, 1.5);
        this.pointLight.position.set(0, 1.5, 0);
        this.rig.add(this.pointLight);

        this.shadowBlob = new THREE.Mesh(
            new THREE.CircleBufferGeometry(0.64, 36),
            new THREE.MeshBasicMaterial({
                color: 0x020617,
                transparent: true,
                opacity: 0.28,
                depthWrite: false
            })
        );
        this.shadowBlob.rotation.x = -Math.PI / 2;
        this.shadowBlob.position.y = 0.012;
        this.container.add(this.shadowBlob);

        this.container.position.copy(this.position);
    }

    createHeadFin(x) {
        const fin = new THREE.Mesh(
            new THREE.ConeBufferGeometry(0.16, 0.42, 4),
            new THREE.MeshStandardMaterial({
                color: 0xfacc15,
                emissive: 0xeab308,
                emissiveIntensity: 0.16,
                roughness: 0.42
            })
        );
        fin.position.set(x, 2.02, 0.02);
        fin.rotation.z = x < 0 ? 0.5 : -0.5;
        fin.rotation.y = Math.PI / 4;
        return fin;
    }

    createTrail(x) {
        const trail = new THREE.Mesh(
            new THREE.ConeBufferGeometry(0.08, 0.45, 16),
            new THREE.MeshBasicMaterial({
                color: 0x67e8f9,
                transparent: true,
                opacity: 0.32
            })
        );
        trail.position.set(x, 0.52, 0.67);
        trail.rotation.x = -Math.PI / 2;
        return trail;
    }

    createLimb(x, y, type, limbMaterial, endMaterial) {
        const pivot = new THREE.Object3D();
        pivot.position.set(x, y, type === 'arm' ? -0.02 : 0);

        const length = type === 'arm' ? 0.62 : 0.68;
        const radius = type === 'arm' ? 0.105 : 0.13;
        const limb = new THREE.Mesh(new THREE.CylinderBufferGeometry(radius, radius * 0.9, length, 16), limbMaterial.clone());
        limb.position.y = -length / 2;

        const end = type === 'arm'
            ? new THREE.Mesh(new THREE.SphereBufferGeometry(0.15, 16, 12), endMaterial.clone())
            : new THREE.Mesh(new THREE.BoxBufferGeometry(0.28, 0.16, 0.5), endMaterial.clone());

        end.position.y = -length - 0.04;
        if (type === 'leg') end.position.z = -0.08;

        this.applyShadow(limb);
        this.applyShadow(end);
        pivot.add(limb);
        pivot.add(end);
        this.rig.add(pivot);

        return pivot;
    }

    reset() {
        this.laneIndex = 1;
        this.position.set(this.lanes[this.laneIndex], 0, this.playerZ);
        this.velocity.set(0, 0, 0);
        this.grounded = true;
        this.wasGrounded = true;
        this.lastLaneDirection = 0;
        this.container.position.copy(this.position);
        this.container.rotation.set(0, 0, 0);
        this.rig.scale.setScalar(this.visualScale);
    }

    changeLane(direction) {
        if (!this.manager.isRunning()) return;
        const nextLane = THREE.MathUtils.clamp(this.laneIndex + direction, 0, this.lanes.length - 1);
        if (nextLane !== this.laneIndex) {
            this.lastLaneDirection = direction;
            this.laneIndex = nextLane;
        }
    }

    toggleMarble() {
        this.marbleMode = !this.marbleMode;
        this.rig.visible = !this.marbleMode;
        this.marbleMesh.visible = this.marbleMode;
    }

    jump() {
        if (!this.manager.isRunning() || !this.grounded) return;
        this.velocity.y = 9.6;
        this.grounded = false;
        this.sfxJump.play();
        // [D5] Emit jump event → reactive lighting flash (yellow)
        this.manager.emit('jump');
    }

    update(delta) {
        const targetX = this.lanes[this.laneIndex];
        const laneAlpha = 1 - Math.pow(0.00008, delta);
        this.position.x = THREE.MathUtils.lerp(this.position.x, targetX, laneAlpha);

        if (this.manager.isRunning()) {
            this.position.y += this.velocity.y * delta;
            this.velocity.y += this.gravity.y * delta;

            if (this.position.y <= 0) {
                this.position.y = 0;
                this.velocity.y = 0;
                this.grounded = true;
            }
        }

        if (!this.wasGrounded && this.grounded) {
            this.landingPulse = 1;
        }
        this.wasGrounded = this.grounded;

        this.container.position.copy(this.position);
        
        if (this.marbleMode) {
            // [G1] Marble physically rolls based on game speed and delta
            if (this.manager.isRunning()) {
                const rollSpeed = (this.manager.speed * delta) / 0.75; // speed = distance, dist/radius = angle
                this.marbleMesh.rotation.x -= rollSpeed;
                // Lean effect when switching lanes
                const laneOffset = targetX - this.position.x;
                this.marbleMesh.rotation.z = THREE.MathUtils.lerp(this.marbleMesh.rotation.z, laneOffset * -0.4, 0.15);
            }
        } else {
            this.animateMascot(delta, targetX);
        }
        
        this.checkCollisions();
    }

    animateMascot(delta, targetX) {
        const isRunning = this.manager.isRunning();
        if (isRunning && this.grounded) {
            this.runPhase += delta * (9.5 + this.manager.speed * 0.18);
        } else {
            this.runPhase += delta * 2.2;
        }

        const stride = Math.sin(this.runPhase);
        const counterStride = Math.sin(this.runPhase + Math.PI);
        const laneOffset = targetX - this.position.x;
        const lean = THREE.MathUtils.clamp(laneOffset * -0.22, -0.36, 0.36);
        const bob = this.grounded && isRunning ? Math.abs(Math.sin(this.runPhase * 2)) * 0.045 : 0;

        this.container.rotation.z = THREE.MathUtils.lerp(this.container.rotation.z, lean, 0.22);
        this.container.rotation.x = THREE.MathUtils.lerp(this.container.rotation.x, this.grounded ? 0.04 : -0.14, 0.12);
        this.rig.position.y = bob;

        this.armLeft.rotation.x = 0.25 + stride * 0.88;
        this.armRight.rotation.x = 0.25 + counterStride * 0.88;
        this.legLeft.rotation.x = -0.08 + counterStride * 0.82;
        this.legRight.rotation.x = -0.08 + stride * 0.82;

        this.armLeft.rotation.z = -0.18;
        this.armRight.rotation.z = 0.18;
        this.legLeft.rotation.z = -0.05;
        this.legRight.rotation.z = 0.05;

        this.landingPulse = Math.max(0, this.landingPulse - delta * 5.2);
        const squash = this.landingPulse * 0.12;
        const airStretch = this.grounded ? 0 : THREE.MathUtils.clamp(this.velocity.y / 38, -0.08, 0.13);
        this.rig.scale.set(
            this.visualScale * (1 + squash * 0.7),
            this.visualScale * (1 - squash + airStretch),
            this.visualScale * (1 + squash * 0.45)
        );

        const shadowScale = THREE.MathUtils.clamp(1.05 - this.position.y * 0.12, 0.56, 1.05);
        this.shadowBlob.scale.set(shadowScale, shadowScale * 0.68, 1);
        this.shadowBlob.material.opacity = THREE.MathUtils.clamp(0.34 - this.position.y * 0.055, 0.1, 0.34);

        const trailScale = this.grounded ? 0.65 + Math.abs(stride) * 0.35 : 1.2;
        this.trailLeft.scale.set(1, trailScale, 1);
        this.trailRight.scale.set(1, trailScale, 1);
        this.trailLeft.material.opacity = this.grounded ? 0.28 : 0.58;
        this.trailRight.material.opacity = this.trailLeft.material.opacity;
    }

    checkCollisions() {
        const center = new THREE.Vector3(this.position.x, this.position.y + 0.98, this.playerZ - 0.02);
        const size = new THREE.Vector3(0.78, 1.72, 0.72);
        this.collider.setFromCenterAndSize(center, size);
    }

    applyTexture(texture) {
        this.rig.traverse(child => {
            if (!child.isMesh || !child.material || !child.material.isMeshStandardMaterial) return;
            child.material = child.material.clone();
            child.material.map = this.cloneTexture(texture);
            child.material.color.lerp(new THREE.Color(0xffffff), 0.65);
            child.material.needsUpdate = true;
        });
    }

    applyTexturePreset(maps) {
        this.rig.traverse(child => {
            if (!child.isMesh || !child.material || !child.material.isMeshStandardMaterial) return;
            child.material = child.material.clone();
            if (maps.reset) {
                child.material.map = null;
                child.material.normalMap = null;
                child.material.roughnessMap = null;
            } else {
                if (maps.map) child.material.map = this.cloneTexture(maps.map);
                if (maps.normalMap) child.material.normalMap = this.cloneTexture(maps.normalMap);
                if (maps.roughnessMap) child.material.roughnessMap = this.cloneTexture(maps.roughnessMap);
                child.material.color.lerp(new THREE.Color(0xffffff), 0.65);
            }
            child.material.needsUpdate = true;
        });
    }

    cloneTexture(texture) {
        const clone = texture.clone();
        clone.needsUpdate = true;
        clone.wrapS = THREE.RepeatWrapping;
        clone.wrapT = THREE.RepeatWrapping;
        clone.repeat.set(1, 1);
        return clone;
    }

    applyShadow(mesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
    }
}
