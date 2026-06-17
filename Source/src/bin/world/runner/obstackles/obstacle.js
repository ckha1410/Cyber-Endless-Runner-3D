import * as THREE from "three";

export default class Obstacle {
    constructor(props) {
        this.loader = props.loader;
        this.laneX = props.laneX;
        this.z = props.z;
        this.type = props.type;

        this.container = new THREE.Object3D();
        this.container.name = "obstacle";

        this.collider = new THREE.Box3();
        this.expired = false;
        this.hit = false;

        this.init(props.materials);

        this.reset(this.laneX, this.z);
    }

    init(materials) {
        this.createLaneWarning();
        switch (this.type) {
            case 'crate':
                this.createCrate(materials);
                break;
            case 'spike':
                this.createSpikeCluster(materials);
                break;
            case 'pole':
                this.createEnergyPole(materials);
                break;
            case 'wheel':
                this.createWheel(materials.wheel);
                break;
            case 'drone':
                this.createDrone(materials);
                break;
            case 'glb':
                this.createLoadedObstacle(materials.metal);
                break;
            case 'orbital': // [E7] Orbital Debris
                this.createOrbitalDebris(materials);
                break;
            case 'data_wall': // [G5] Data Wall
                this.createDataWall(materials);
                break;
            default:
                this.createBarrier(materials);
        }
    }

    createLaneWarning() {
        const warningGroup = new THREE.Object3D();
        warningGroup.name = 'lane_warning';
        warningGroup.position.set(0, 0.105, 1.55);

        const stripMaterial = new THREE.MeshBasicMaterial({
            color: 0xff3b30,
            transparent: true,
            opacity: 0.34,
            depthWrite: false
        });
        const strip = new THREE.Mesh(new THREE.BoxBufferGeometry(1.62, 0.018, 2.2), stripMaterial);
        strip.position.z = 0.1;

        const chevronMaterial = new THREE.MeshBasicMaterial({
            color: 0xfacc15,
            transparent: true,
            opacity: 0.86,
            depthWrite: false
        });

        [-0.42, 0, 0.42].forEach((z, index) => {
            const left = new THREE.Mesh(new THREE.BoxBufferGeometry(0.52, 0.024, 0.08), chevronMaterial.clone());
            const right = left.clone();
            left.position.set(-0.18, 0.014, z);
            right.position.set(0.18, 0.014, z);
            left.rotation.y = -0.58;
            right.rotation.y = 0.58;
            left.material.opacity = 0.52 + index * 0.16;
            right.material.opacity = left.material.opacity;
            warningGroup.add(left, right);
        });

        warningGroup.add(strip);
        this.warningMarker = warningGroup;
        this.container.add(warningGroup);
    }

    createBarrier(materials) {
        const base = new THREE.Mesh(new THREE.BoxBufferGeometry(1.55, 0.86, 0.38), materials.box.clone());
        base.position.y = 0.48;
        this.applyShadows(base);

        const top = new THREE.Mesh(new THREE.BoxBufferGeometry(1.68, 0.16, 0.48), materials.warning.clone());
        top.position.y = 1.0;
        this.applyShadows(top);

        const stripeMaterial = new THREE.MeshStandardMaterial({
            color: 0x111827,
            emissive: 0x450a0a,
            emissiveIntensity: 0.18,
            roughness: 0.5,
            metalness: 0.05
        });
        [-0.45, 0, 0.45].forEach(x => {
            const stripe = new THREE.Mesh(new THREE.BoxBufferGeometry(0.18, 0.92, 0.035), stripeMaterial.clone());
            stripe.position.set(x, 0.5, -0.21);
            stripe.rotation.z = -0.58;
            this.container.add(stripe);
        });

        const leftPost = new THREE.Mesh(new THREE.CylinderBufferGeometry(0.08, 0.1, 1.14, 12), materials.metal.clone());
        leftPost.position.set(-0.72, 0.58, 0);
        const rightPost = leftPost.clone();
        rightPost.position.x = 0.72;
        this.applyShadows(leftPost);
        this.applyShadows(rightPost);

        this.container.add(base, top, leftPost, rightPost);
    }

    createCrate(materials) {
        const crate = new THREE.Mesh(new THREE.BoxBufferGeometry(1.22, 1.18, 1.2), materials.crate.clone());
        crate.position.y = 0.62;
        this.applyShadows(crate);
        this.container.add(crate);

        const panelPositions = [
            [0, 0.82, -0.62, 1.04, 0.08, 0.035],
            [0, 0.38, -0.62, 0.72, 0.08, 0.035],
            [-0.62, 0.6, 0, 0.035, 0.08, 0.72]
        ];
        panelPositions.forEach((pos, index) => {
            const panel = new THREE.Mesh(
                new THREE.BoxBufferGeometry(pos[3], pos[4], pos[5]),
                index === 2 ? materials.warning.clone() : materials.pink.clone()
            );
            panel.position.set(pos[0], pos[1], pos[2]);
            this.container.add(panel);
        });
    }

    createSpikeCluster(materials) {
        const base = new THREE.Mesh(new THREE.CylinderBufferGeometry(0.75, 0.82, 0.16, 6), materials.metal.clone());
        base.position.y = 0.08;
        this.applyShadows(base);
        this.container.add(base);

        [-0.38, 0, 0.38].forEach((x, index) => {
            const spike = new THREE.Mesh(new THREE.ConeBufferGeometry(0.24, 1.18 + index * 0.15, 20), materials.spike.clone());
            spike.position.set(x, 0.68 + index * 0.07, 0);
            spike.rotation.z = x * -0.12;
            this.applyShadows(spike);
            this.container.add(spike);
        });
    }

    createEnergyPole(materials) {
        const pole = new THREE.Mesh(new THREE.CylinderBufferGeometry(0.23, 0.32, 2.05, 28), materials.metal.clone());
        pole.position.y = 1.03;
        this.applyShadows(pole);
        this.container.add(pole);

        for (let i = 0; i < 3; i++) {
            const ring = new THREE.Mesh(new THREE.TorusBufferGeometry(0.42 + i * 0.08, 0.025, 10, 36), i % 2 ? materials.pink.clone() : materials.cyan.clone());
            ring.position.y = 0.48 + i * 0.48;
            ring.rotation.x = Math.PI / 2;
            this.container.add(ring);
        }
    }

    createWheel(material) {
        const wheel = new THREE.Mesh(new THREE.TorusBufferGeometry(0.58, 0.16, 18, 42), material.clone());
        wheel.rotation.y = Math.PI / 2;
        wheel.position.y = 0.66;
        this.applyShadows(wheel);

        const hub = new THREE.Mesh(
            new THREE.CylinderBufferGeometry(0.22, 0.22, 0.42, 24),
            new THREE.MeshStandardMaterial({
                color: 0xfacc15,
                emissive: 0xf97316,
                emissiveIntensity: 0.45,
                metalness: 0.62,
                roughness: 0.28
            })
        );
        hub.rotation.z = Math.PI / 2;
        hub.position.y = 0.66;
        this.applyShadows(hub);

        this.wheel = wheel;
        this.container.add(wheel);
        this.container.add(hub);
    }

    createDrone(materials) {
        const body = new THREE.Mesh(new THREE.SphereBufferGeometry(0.42, 24, 16), materials.drone.clone());
        body.position.y = 1.45;
        body.scale.set(1.25, 0.55, 0.75);
        this.applyShadows(body);
        this.container.add(body);

        const eye = new THREE.Mesh(new THREE.BoxBufferGeometry(0.42, 0.08, 0.04), materials.warning.clone());
        eye.position.set(0, 1.48, -0.34);
        this.container.add(eye);

        [-0.62, 0.62].forEach(x => {
            const wing = new THREE.Mesh(new THREE.BoxBufferGeometry(0.46, 0.08, 0.22), materials.cyan.clone());
            wing.position.set(x, 1.45, 0);
            const rotor = new THREE.Mesh(new THREE.TorusBufferGeometry(0.23, 0.025, 8, 28), materials.pink.clone());
            rotor.position.set(x, 1.45, 0);
            rotor.rotation.x = Math.PI / 2;
            this.container.add(wing, rotor);
        });
        this.isDrone = true;
    }

    createLoadedObstacle(material) {
        const fallback = new THREE.Mesh(new THREE.BoxBufferGeometry(1.15, 0.95, 1.15), material.clone());
        fallback.position.y = 0.54;
        this.applyShadows(fallback);
        this.container.add(fallback);
        this.loader.load('runner/obstacle_01/scene.glb', gltf => {
            const mesh = gltf.scene;
            mesh.position.set(0, 0, 0);
            mesh.scale.setScalar(1.4);
            mesh.traverse(child => {
                if (child.isMesh) {
                    child.material = material.clone();
                    this.applyShadows(child);
                }
            });

            const warning = this.warningMarker;
            this.container.clear();
            if (warning) this.container.add(warning);
            this.container.add(mesh);
        });
    }

    /**
     * [E7] Orbital Debris — Mảnh vệ tinh quỹ đạo Kepler đơn giản
     * Phương trình: x(t) = a·cos(ωt + φ),  y(t) = cy + b·sin(ωt + φ)
     * 3 mảnh vụn trên mỗi obstacle, mỗi mảnh lệch pha 2π/3 (đều nhau).
     * [PERF] Chỉ 3 sin/cos calls mỗi frame — cực kỳ rẻ.
     */
    createOrbitalDebris(materials) {
        // Orbit center indicator (small glowing sphere)
        const centerMat = new THREE.MeshStandardMaterial({
            color: 0x7c3aed,
            emissive: 0x7c3aed,
            emissiveIntensity: 1.8,
            roughness: 0.2
        });
        const center = new THREE.Mesh(new THREE.SphereBufferGeometry(0.1, 8, 6), centerMat);
        center.position.y = 1.0;
        this.container.add(center);

        // Orbital parameters
        this.orbitalA = 1.35;   // semi-axis horizontal
        this.orbitalB = 0.55;   // semi-axis vertical
        this.orbitalCy = 1.0;   // orbit center height
        this.orbitalOmega = 1.6 + Math.random() * 0.9; // angular speed (rad/s)

        // Orbit ring guide (visual only)
        const ringGeo = new THREE.TorusBufferGeometry(this.orbitalA, 0.018, 4, 36);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x4c1d95,
            transparent: true,
            opacity: 0.3
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = this.orbitalCy;
        this.container.add(ring);

        // 3 debris pieces evenly spaced in phase (0, 2π/3, 4π/3)
        this.debrisMeshes = [];
        this.orbitalPhases = [];
        const debrisMats = [materials.cyan, materials.pink, materials.warning];

        for (let i = 0; i < 3; i++) {
            const phase = (i / 3) * Math.PI * 2;
            this.orbitalPhases.push(phase);

            const mesh = new THREE.Mesh(
                new THREE.OctahedronBufferGeometry(0.14 + Math.random() * 0.1, 0),
                debrisMats[i % debrisMats.length].clone()
            );
            mesh.position.set(
                this.orbitalA * Math.cos(phase),
                this.orbitalCy + this.orbitalB * Math.sin(phase),
                0
            );
            this.container.add(mesh);
            this.debrisMeshes.push(mesh);
        }
        this.isDrone = false; // prevent drone animation branch
    }

    update(delta, speed) {
        this.container.position.z += speed * delta;
        this.container.rotation.y += ['barrier', 'crate'].includes(this.type) ? delta * 0.35 : 0;
        if (this.wheel) this.wheel.rotation.z -= speed * delta * 1.6;
        if (this.isDrone) {
            this.container.position.y = Math.sin(performance.now() * 0.006 + this.z) * 0.12;
            this.container.rotation.z = Math.sin(performance.now() * 0.007 + this.z) * 0.12;
        }
        if (this.warningMarker) {
            const pulse = 0.72 + Math.sin(performance.now() * 0.012 + this.z) * 0.22;
            this.warningMarker.children.forEach(child => {
                if (child.material) child.material.opacity = child.geometry.parameters.depth > 1 ? 0.24 + pulse * 0.16 : 0.42 + pulse * 0.38;
            });
        }

        // [E7] Orbital Debris — Kepler ellipse position update
        // x(t) = a·cos(ωt + φ_i),  y(t) = cy + b·sin(ωt + φ_i)
        if (this.debrisMeshes) {
            const t = performance.now() * 0.001;
            for (let i = 0; i < this.debrisMeshes.length; i++) {
                const phase = this.orbitalPhases[i];
                const angle = this.orbitalOmega * t + phase;
                this.debrisMeshes[i].position.set(
                    this.orbitalA * Math.cos(angle),
                    this.orbitalCy + this.orbitalB * Math.sin(angle),
                    0
                );
                this.debrisMeshes[i].rotation.x += delta * 1.8;
                this.debrisMeshes[i].rotation.y += delta * 1.3;
            }
        }

        this.collider.setFromObject(this.container);
        this.expired = this.container.position.z > 10;
    }

    reset(laneX, z) {
        this.laneX = laneX;
        this.z = z;
        this.expired = false;
        this.hit = false;
        // [D4] Reset near-miss flag so each obstacle pass can trigger once
        this._nearMissed = false;
        this.container.visible = true;
        this.container.position.set(this.laneX, 0, this.z);
        this.container.rotation.set(0, 0, 0);
        this.collider.makeEmpty();
    }

    applyShadows(mesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
    }

    createDataWall(materials) {
        // [G5] Data Wall Portal - highly emissive grid
        const wallTex = new THREE.TextureLoader().load('src/textures/brick_diffuse.jpg');
        wallTex.wrapS = THREE.RepeatWrapping;
        wallTex.wrapT = THREE.RepeatWrapping;
        wallTex.repeat.set(2, 3);

        const wall = new THREE.Mesh(
            new THREE.BoxBufferGeometry(1.6, 2.5, 0.2),
            new THREE.MeshStandardMaterial({
                color: 0xffffff,
                map: wallTex,
                transparent: true,
                opacity: 0.95
            })
        );
        wall.position.y = 1.25;
        this.applyShadows(wall);
        this.container.add(wall);
    }
}
