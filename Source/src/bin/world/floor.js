import * as THREE from 'three';

export default class Floor {
    constructor(options) {
        this.manager = options.manager;
        this.container = new THREE.Object3D();
        this.container.name = 'floor';
        this.buildings = [];
        this.props = [];
        this.roadSegments = [];
        this.holograms = [];
        this.palette = [0x22d3ee, 0xfb7185, 0xfacc15, 0xa78bfa, 0x34d399];
        this.textureLoader = new THREE.TextureLoader();
        this.surfaceTextures = this.createSurfaceTextures();

        this.createFloor();
        this.createCity();
    }

    createSurfaceTextures() {
        return {
            roadBump: this.loadSurfaceTexture('src/textures/grasslight-big.jpg', 3, 22, false),
            sidewalk: this.createSidewalkTexture(),
            sidewalkNormal: this.loadSurfaceTexture('src/textures/floor_checker_normal.jpg', 1.3, 20, false),
            building: this.createBuildingTexture(),
            billboard: this.loadSurfaceTexture('src/textures/uv_grid_opengl.jpg', 1, 1)
        };
    }

    createBuildingTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        const gradient = ctx.createLinearGradient(0, 0, 512, 512);
        gradient.addColorStop(0, '#19304f');
        gradient.addColorStop(0.55, '#243b63');
        gradient.addColorStop(1, '#14213f');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 512, 512);

        ctx.strokeStyle = 'rgba(125, 211, 252, 0.22)';
        ctx.lineWidth = 2;
        for (let x = 0; x <= 512; x += 64) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, 512);
            ctx.stroke();
        }
        for (let y = 0; y <= 512; y += 48) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(512, y);
            ctx.stroke();
        }

        const windowColors = ['#fef3c7', '#67e8f9', '#f9a8d4', '#a7f3d0'];
        for (let y = 32; y < 500; y += 54) {
            for (let x = 24; x < 480; x += 72) {
                const lit = Math.random() > 0.35;
                ctx.fillStyle = lit ? windowColors[(x + y) % windowColors.length] : 'rgba(15, 23, 42, 0.9)';
                ctx.globalAlpha = lit ? 0.78 : 0.45;
                ctx.fillRect(x, y, 30 + Math.random() * 14, 8 + Math.random() * 8);
            }
        }
        ctx.globalAlpha = 1;

        ctx.fillStyle = 'rgba(251, 191, 36, 0.32)';
        ctx.fillRect(0, 92, 512, 8);
        ctx.fillStyle = 'rgba(34, 211, 238, 0.28)';
        ctx.fillRect(0, 330, 512, 6);

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(1, 2.3);
        texture.anisotropy = 8;
        texture.encoding = THREE.sRGBEncoding;
        return texture;
    }

    createSidewalkTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#33415f';
        ctx.fillRect(0, 0, 512, 512);

        for (let y = 0; y < 512; y += 64) {
            for (let x = 0; x < 512; x += 128) {
                const offset = (y / 64) % 2 ? 64 : 0;
                ctx.fillStyle = (x + y) % 256 === 0 ? '#425675' : '#2b3854';
                ctx.fillRect((x + offset) % 512, y, 126, 62);
            }
        }

        ctx.strokeStyle = 'rgba(148, 163, 184, 0.42)';
        ctx.lineWidth = 2;
        for (let y = 0; y <= 512; y += 64) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(512, y);
            ctx.stroke();
        }
        for (let x = 0; x <= 512; x += 128) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, 512);
            ctx.stroke();
        }

        ctx.strokeStyle = 'rgba(34, 211, 238, 0.55)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(22, 0);
        ctx.lineTo(22, 512);
        ctx.moveTo(490, 0);
        ctx.lineTo(490, 512);
        ctx.stroke();

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(1.15, 16);
        texture.anisotropy = 8;
        texture.encoding = THREE.sRGBEncoding;
        return texture;
    }

    loadSurfaceTexture(path, repeatX = 1, repeatY = 1, isColorMap = true) {
        const texture = this.textureLoader.load(path);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(repeatX, repeatY);
        texture.anisotropy = 8;
        if (isColorMap) texture.encoding = THREE.sRGBEncoding;
        return texture;
    }

    createFloor() {
        this.roadTexture = this.createRoadTexture();
        this.roadTexture.wrapS = THREE.RepeatWrapping;
        this.roadTexture.wrapT = THREE.RepeatWrapping;
        this.roadTexture.repeat.set(1, 16);
        this.roadTexture.anisotropy = 8;

        this.geometry = new THREE.PlaneBufferGeometry(8.4, 220);
        this.material = new THREE.MeshStandardMaterial({
            map: this.roadTexture,
            bumpMap: this.surfaceTextures.roadBump,
            bumpScale: 0.012,
            roughnessMap: this.surfaceTextures.roadBump,
            roughness: 0.9,
            metalness: 0.025,
            color: 0xffffff
        });
        this.mesh = new THREE.Mesh(this.geometry, this.material);

        this.mesh.position.set(0, 0, -42);
        this.mesh.rotation.x = -Math.PI / 2;
        this.mesh.receiveShadow = true;

        this.container.add(this.mesh);

        this.createRail(-4.55, 0x22d3ee);
        this.createRail(4.55, 0xfb7185);
        this.createSidewalk(-6.2);
        this.createSidewalk(6.2);
        this.createLaneGlow(-1.12, 0x93c5fd);
        this.createLaneGlow(1.12, 0xf9a8d4);
        this.createRoadSegments();
    }

    createRoadTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        const gradient = ctx.createLinearGradient(0, 0, 512, 512);
        gradient.addColorStop(0, '#192945');
        gradient.addColorStop(0.5, '#243b63');
        gradient.addColorStop(1, '#18243d');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        for (let i = 0; i < 1200; i++) {
            const shade = 38 + Math.floor(Math.random() * 55);
            ctx.fillStyle = `rgba(${shade}, ${shade + 16}, ${shade + 34}, 0.28)`;
            ctx.fillRect(Math.random() * 512, Math.random() * 512, 1 + Math.random() * 3, 1 + Math.random() * 3);
        }

        ctx.strokeStyle = 'rgba(125, 211, 252, 0.5)';
        ctx.lineWidth = 5;
        ctx.setLineDash([34, 32]);
        ctx.beginPath();
        ctx.moveTo(170, 0);
        ctx.lineTo(170, 512);
        ctx.moveTo(342, 0);
        ctx.lineTo(342, 512);
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.strokeStyle = 'rgba(251, 113, 133, 0.72)';
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(26, 0);
        ctx.lineTo(26, 512);
        ctx.moveTo(486, 0);
        ctx.lineTo(486, 512);
        ctx.stroke();

        for (let y = 40; y < 512; y += 128) {
            this.drawRoadChevron(ctx, 256, y, 0xfacc15);
        }

        return new THREE.CanvasTexture(canvas);
    }

    drawRoadChevron(ctx, x, y) {
        ctx.save();
        ctx.translate(x, y);
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.78)';
        ctx.lineWidth = 10;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(-54, 34);
        ctx.lineTo(0, -18);
        ctx.lineTo(54, 34);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-34, 30);
        ctx.lineTo(0, -2);
        ctx.lineTo(34, 30);
        ctx.stroke();
        ctx.restore();
    }

    createRail(x, color) {
        const geometry = new THREE.BoxBufferGeometry(0.08, 0.08, 220);
        const material = new THREE.MeshStandardMaterial({
            color,
            emissive: color,
            emissiveIntensity: 1.4,
            roughness: 0.35
        });
        const rail = new THREE.Mesh(geometry, material);
        rail.position.set(x, 0.08, -42);
        rail.receiveShadow = true;
        this.container.add(rail);
    }

    createSidewalk(x) {
        const geometry = new THREE.BoxBufferGeometry(2.6, 0.18, 220);
        const material = new THREE.MeshStandardMaterial({
            color: x < 0 ? 0x3b82a0 : 0x6d6aa4,
            map: this.surfaceTextures.sidewalk,
            normalMap: this.surfaceTextures.sidewalkNormal,
            normalScale: new THREE.Vector2(0.18, 0.18),
            roughnessMap: this.surfaceTextures.sidewalk,
            emissive: x < 0 ? 0x064e5d : 0x312e81,
            emissiveIntensity: 0.08,
            roughness: 0.62,
            metalness: 0.08
        });
        const sidewalk = new THREE.Mesh(geometry, material);
        sidewalk.position.set(x, -0.05, -42);
        sidewalk.receiveShadow = true;
        this.container.add(sidewalk);
    }

    createLaneGlow(x, color) {
        const geometry = new THREE.BoxBufferGeometry(0.035, 0.045, 220);
        const material = new THREE.MeshStandardMaterial({
            color,
            emissive: color,
            emissiveIntensity: 1.25,
            roughness: 0.28
        });
        const strip = new THREE.Mesh(geometry, material);
        strip.position.set(x, 0.07, -42);
        this.container.add(strip);
    }

    createRoadSegments() {
        const material = new THREE.MeshStandardMaterial({
            color: 0x60a5fa,
            emissive: 0x0ea5e9,
            emissiveIntensity: 0.12,
            transparent: true,
            opacity: 0.24,
            roughness: 0.5
        });

        for (let i = 0; i < 12; i++) {
            const segment = new THREE.Mesh(new THREE.BoxBufferGeometry(7.7, 0.018, 0.08), material.clone());
            segment.position.set(0, 0.082, 20 - i * 12);
            segment.receiveShadow = true;
            this.roadSegments.push(segment);
            this.container.add(segment);
        }
    }

    createCity() {
        this.createSkyGradient();
        this.createSkyline();

        for (let z = -118; z < 34; z += 7.5) {
            [-1, 1].forEach(side => {
                const group = this.createBuilding(side);
                this.configureBuilding(group, side, z + Math.random() * 4);
                this.buildings.push(group);
                this.container.add(group);
            });
        }

        for (let z = -112; z < 30; z += 9) {
            [-1, 1].forEach(side => {
                const prop = this.createStreetProp(side, z + Math.random() * 3);
                this.props.push(prop);
                this.container.add(prop);
            });
        }

        for (let z = -96; z < 18; z += 18) {
            [-1, 1].forEach(side => {
                const board = this.createHologramBoard(side, z + Math.random() * 5);
                this.holograms.push(board);
                this.container.add(board);
            });
        }
    }

    createSkyGradient() {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#ffb86b');
        gradient.addColorStop(0.36, '#55d6f6');
        gradient.addColorStop(0.72, '#2367a0');
        gradient.addColorStop(1, '#16264e');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const texture = new THREE.CanvasTexture(canvas);
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearFilter;
        const material = new THREE.MeshBasicMaterial({map: texture, depthWrite: false, fog: false});
        const sky = new THREE.Mesh(new THREE.PlaneBufferGeometry(260, 120), material);
        sky.position.set(0, 36, -150);
        this.container.add(sky);
    }

    createSkyline() {
        const material = new THREE.MeshStandardMaterial({
            color: 0x29456d,
            map: this.surfaceTextures.building,
            roughnessMap: this.surfaceTextures.building,
            emissive: 0x0f172a,
            emissiveIntensity: 0.25,
            roughness: 0.7
        });

        for (let i = 0; i < 34; i++) {
            const side = i % 2 === 0 ? -1 : 1;
            const width = 2 + Math.random() * 3;
            const height = 3 + Math.random() * 12;
            const tower = new THREE.Mesh(new THREE.BoxBufferGeometry(width, height, 1.4), material.clone());
            tower.position.set(side * (18 + Math.random() * 14), height / 2 - 0.08, -128 + Math.random() * 42);
            tower.receiveShadow = true;
            this.container.add(tower);
        }
    }

    createBuilding(side) {
        const group = new THREE.Object3D();
        group.userData.side = side;
        group.userData.body = new THREE.Mesh(
            new THREE.BoxBufferGeometry(1, 1, 1),
            new THREE.MeshStandardMaterial({
                color: 0x315a83,
                map: this.surfaceTextures.building,
                roughnessMap: this.surfaceTextures.building,
                bumpMap: this.surfaceTextures.building,
                bumpScale: 0.004,
                emissive: 0x0f2746,
                emissiveIntensity: 0.16,
                roughness: 0.58,
                metalness: 0.12
            })
        );
        group.userData.body.castShadow = true;
        group.userData.body.receiveShadow = true;
        group.add(group.userData.body);

        group.userData.windows = [];
        for (let i = 0; i < 18; i++) {
            const color = this.palette[i % this.palette.length];
            const windowMesh = new THREE.Mesh(
                new THREE.BoxBufferGeometry(0.055, 0.11, 0.28),
                new THREE.MeshStandardMaterial({
                    color,
                    emissive: color,
                    emissiveIntensity: 0.8 + Math.random() * 0.8,
                    roughness: 0.2
                })
            );
            group.userData.windows.push(windowMesh);
            group.add(windowMesh);
        }

        group.userData.billboard = new THREE.Mesh(
            new THREE.BoxBufferGeometry(0.07, 0.82, 1.65),
            new THREE.MeshStandardMaterial({
                color: 0xfacc15,
                map: this.surfaceTextures.billboard,
                emissive: 0xf97316,
                emissiveIntensity: 1.2,
                roughness: 0.24
            })
        );
        group.add(group.userData.billboard);

        group.userData.roof = new THREE.Mesh(
            new THREE.BoxBufferGeometry(1.18, 0.12, 1.18),
            new THREE.MeshStandardMaterial({
                color: 0x111827,
                emissive: 0x0f172a,
                emissiveIntensity: 0.18,
                roughness: 0.42,
                metalness: 0.24
            })
        );
        group.userData.roof.castShadow = true;
        group.add(group.userData.roof);

        group.userData.trim = new THREE.Mesh(
            new THREE.BoxBufferGeometry(0.09, 1, 0.075),
            new THREE.MeshStandardMaterial({
                color: 0xa78bfa,
                emissive: 0xa78bfa,
                emissiveIntensity: 1.1,
                roughness: 0.18
            })
        );
        group.add(group.userData.trim);

        group.userData.storefront = new THREE.Mesh(
            new THREE.BoxBufferGeometry(0.1, 0.46, 1.35),
            new THREE.MeshStandardMaterial({
                color: 0xf9a8d4,
                emissive: 0xfb7185,
                emissiveIntensity: 0.9,
                roughness: 0.28,
                transparent: true,
                opacity: 0.86
            })
        );
        group.add(group.userData.storefront);

        group.userData.sign = new THREE.Mesh(
            new THREE.BoxBufferGeometry(0.08, 0.18, 1.1),
            new THREE.MeshStandardMaterial({
                color: 0x22d3ee,
                emissive: 0x22d3ee,
                emissiveIntensity: 1.45,
                roughness: 0.18
            })
        );
        group.add(group.userData.sign);

        return group;
    }

    configureBuilding(group, side, z) {
        const width = 1.5 + Math.random() * 2.9;
        const height = 2.8 + Math.random() * 9.5;
        const depth = 1.8 + Math.random() * 4.8;
        const x = side * (8.5 + Math.random() * 5.6);

        group.position.set(x, height / 2 - 0.06, z);
        group.userData.body.scale.set(width, height, depth);
        group.userData.body.material.color.set(this.pickBuildingColor());
        group.userData.roof.position.set(0, height / 2 + 0.08, 0);
        group.userData.roof.scale.set(width * 1.12, 1, depth * 1.08);

        const faceX = -side * (width / 2 + 0.035);
        group.userData.windows.forEach((windowMesh, index) => {
            const row = Math.floor(index / 3);
            const col = index % 3;
            const maxRows = Math.max(2, Math.floor(height / 1.1));
            windowMesh.visible = row < maxRows && col < Math.max(2, Math.floor(depth / 1.2));
            windowMesh.position.set(
                faceX,
                -height / 2 + 0.9 + row * 0.78,
                -depth / 2 + 0.55 + col * Math.max(0.55, depth / 3.6)
            );
        });

        group.userData.billboard.position.set(faceX - side * 0.02, height * 0.05, 0);
        group.userData.billboard.visible = height > 4.2;
        group.userData.trim.position.set(faceX - side * 0.035, 0, -depth * 0.18);
        group.userData.trim.scale.set(1, Math.max(1.2, height * 0.58), 1);
        group.userData.storefront.position.set(faceX - side * 0.04, -height / 2 + 0.42, 0);
        group.userData.storefront.visible = depth > 2.6;
        group.userData.sign.position.set(faceX - side * 0.03, -height * 0.26, 0);
    }

    pickBuildingColor() {
        const colors = [0x315a83, 0x2f6f91, 0x4f5d95, 0x22656d, 0x5b6689, 0x7c2d12, 0x4c1d95];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    createStreetProp(side, z) {
        const group = new THREE.Object3D();
        group.userData.side = side;
        group.userData.phase = Math.random() * Math.PI * 2;
        group.position.set(side * (5.35 + Math.random() * 0.8), 0, z);

        const slot = Math.floor(Math.abs(z) / 9) + (side < 0 ? 0 : 1);
        if (slot % 3 === 0) {
            this.populateCyberTree(group, side);
        } else {
            this.populateStreetLamp(group, side);
        }

        return group;
    }

    populateStreetLamp(group, side) {
        group.userData.kind = 'lamp';
        const lampColor = side < 0 ? 0x22d3ee : 0xfb7185;
        const metal = new THREE.MeshStandardMaterial({
            color: 0x5f7486,
            metalness: 0.78,
            roughness: 0.24
        });
        const darkMetal = new THREE.MeshStandardMaterial({
            color: 0x233447,
            metalness: 0.82,
            roughness: 0.3
        });
        const neon = new THREE.MeshStandardMaterial({
            color: lampColor,
            emissive: lampColor,
            emissiveIntensity: 1.85,
            roughness: 0.18
        });
        const glow = new THREE.MeshBasicMaterial({
            color: lampColor,
            transparent: true,
            opacity: 0.18,
            depthWrite: false
        });

        const base = new THREE.Mesh(new THREE.CylinderBufferGeometry(0.22, 0.28, 0.1, 18), darkMetal);
        base.position.y = 0.05;
        const pole = new THREE.Mesh(new THREE.CylinderBufferGeometry(0.045, 0.07, 1.75, 18), metal);
        pole.position.y = 0.93;
        const collar = new THREE.Mesh(new THREE.TorusBufferGeometry(0.075, 0.012, 8, 20), neon);
        collar.position.y = 1.48;
        collar.rotation.x = Math.PI / 2;

        const arm = new THREE.Mesh(new THREE.BoxBufferGeometry(0.62, 0.055, 0.075), metal);
        arm.position.set(-side * 0.3, 1.78, 0);
        arm.rotation.z = side * 0.08;
        const brace = new THREE.Mesh(new THREE.BoxBufferGeometry(0.42, 0.035, 0.045), darkMetal);
        brace.position.set(-side * 0.18, 1.62, 0);
        brace.rotation.z = side * 0.55;

        const head = new THREE.Mesh(new THREE.BoxBufferGeometry(0.46, 0.18, 0.26), darkMetal);
        head.position.set(-side * 0.62, 1.78, 0);
        head.rotation.y = -side * 0.14;
        const lampFace = new THREE.Mesh(new THREE.BoxBufferGeometry(0.36, 0.075, 0.285), neon);
        lampFace.position.set(-side * 0.62, 1.69, 0);
        lampFace.rotation.y = -side * 0.14;
        const aura = new THREE.Mesh(new THREE.SphereBufferGeometry(0.42, 18, 12), glow);
        aura.position.set(-side * 0.62, 1.66, 0);
        aura.scale.set(1.25, 0.42, 0.72);

        [base, pole, collar, arm, brace, head, lampFace].forEach(mesh => {
            mesh.castShadow = true;
            mesh.receiveShadow = true;
        });
        group.add(base, pole, collar, arm, brace, head, lampFace, aura);
    }

    populateCyberTree(group, side) {
        group.userData.kind = 'tree';
        const trunkMaterial = new THREE.MeshStandardMaterial({
            color: 0x516071,
            metalness: 0.36,
            roughness: 0.38
        });
        const leafMaterial = new THREE.MeshStandardMaterial({
            color: 0x34d399,
            emissive: 0x064e3b,
            emissiveIntensity: 0.08,
            roughness: 0.62
        });
        const accentMaterial = new THREE.MeshStandardMaterial({
            color: 0xa7f3d0,
            emissive: 0x5eead4,
            emissiveIntensity: 1.05,
            roughness: 0.22
        });
        const planterMaterial = new THREE.MeshStandardMaterial({
            color: 0x334155,
            metalness: 0.55,
            roughness: 0.32
        });

        const swayRoot = new THREE.Object3D();
        group.userData.swayTarget = swayRoot;

        const planter = new THREE.Mesh(new THREE.CylinderBufferGeometry(0.36, 0.44, 0.26, 8), planterMaterial);
        planter.position.y = 0.13;
        const trunk = new THREE.Mesh(new THREE.CylinderBufferGeometry(0.06, 0.1, 1.05, 10), trunkMaterial);
        trunk.position.y = 0.74;
        trunk.rotation.z = side * 0.05;
        const branchLeft = new THREE.Mesh(new THREE.CylinderBufferGeometry(0.022, 0.035, 0.48, 8), trunkMaterial.clone());
        branchLeft.position.set(-side * 0.15, 1.18, 0.02);
        branchLeft.rotation.z = side * 0.72;
        const branchRight = branchLeft.clone();
        branchRight.position.set(side * 0.16, 1.26, -0.02);
        branchRight.rotation.z = -side * 0.62;

        const lowerRing = new THREE.Mesh(new THREE.TorusBufferGeometry(0.18, 0.012, 8, 24), accentMaterial);
        lowerRing.position.y = 0.48;
        lowerRing.rotation.x = Math.PI / 2;
        const upperRing = lowerRing.clone();
        upperRing.position.y = 1.0;

        const crownSpecs = [
            {pos: [0, 1.42, 0], scale: [0.9, 0.62, 0.78], rot: [0.2, 0.35, -0.08]},
            {pos: [-side * 0.22, 1.68, 0.04], scale: [0.62, 0.5, 0.56], rot: [0.1, -0.35, 0.15]},
            {pos: [side * 0.2, 1.76, -0.08], scale: [0.55, 0.45, 0.5], rot: [-0.25, 0.45, -0.12]}
        ];

        crownSpecs.forEach((spec, index) => {
            const crownMaterial = leafMaterial.clone();
            crownMaterial.color.set(index % 2 ? 0x5eead4 : 0x34d399);
            const crown = new THREE.Mesh(new THREE.IcosahedronBufferGeometry(0.48, 0), crownMaterial);
            crown.position.set(...spec.pos);
            crown.scale.set(...spec.scale);
            crown.rotation.set(...spec.rot);
            crown.castShadow = true;
            swayRoot.add(crown);
        });

        [-0.24, 0.24].forEach((x, index) => {
            const vein = new THREE.Mesh(new THREE.BoxBufferGeometry(0.34, 0.035, 0.025), accentMaterial.clone());
            vein.position.set(x, 1.54 + index * 0.17, -0.28);
            vein.rotation.z = x * 0.85;
            swayRoot.add(vein);
        });

        [planter, trunk, branchLeft, branchRight, lowerRing, upperRing].forEach(mesh => {
            mesh.castShadow = true;
            mesh.receiveShadow = true;
        });
        swayRoot.add(trunk, branchLeft, branchRight, lowerRing, upperRing);
        group.add(planter, swayRoot);
    }

    createHologramBoard(side, z) {
        const group = new THREE.Object3D();
        group.userData.side = side;
        group.position.set(side * (6.4 + Math.random() * 1.6), 2.8 + Math.random() * 1.4, z);
        group.rotation.y = side < 0 ? Math.PI * 0.08 : -Math.PI * 0.08;

        const color = side < 0 ? 0x22d3ee : 0xfb7185;
        const frame = new THREE.Mesh(
            new THREE.BoxBufferGeometry(1.85, 1.05, 0.08),
            new THREE.MeshStandardMaterial({
                color,
                emissive: color,
                emissiveIntensity: 1.1,
                roughness: 0.18,
                transparent: true,
                opacity: 0.72
            })
        );
        const scan = new THREE.Mesh(
            new THREE.BoxBufferGeometry(1.55, 0.08, 0.09),
            new THREE.MeshBasicMaterial({color: 0xffffff, transparent: true, opacity: 0.55})
        );
        scan.position.y = 0.18;
        const icon = new THREE.Mesh(
            new THREE.RingBufferGeometry(0.18, 0.28, 5),
            new THREE.MeshBasicMaterial({color: 0xfacc15, transparent: true, opacity: 0.72, side: THREE.DoubleSide})
        );
        icon.position.set(-0.48, -0.14, 0.055);
        icon.rotation.z = Math.PI * 0.1;
        group.userData.scan = scan;
        group.userData.pulse = icon;
        group.add(frame);
        group.add(scan);
        group.add(icon);
        return group;
    }

    update(delta, speed) {
        if (this.manager && this.manager.state === 'gallery') return;

        const flow = this.manager && this.manager.isRunning() ? speed * delta : 0.8 * delta;
        this.roadTexture.offset.y -= flow * 0.035;
        this.surfaceTextures.roadBump.offset.y -= flow * 0.018;
        this.surfaceTextures.sidewalk.offset.y -= flow * 0.018;

        this.buildings.forEach(building => {
            building.position.z += flow;
            if (building.position.z > 32) {
                const side = building.position.x < 0 ? -1 : 1;
                this.configureBuilding(building, side, -118 - Math.random() * 18);
            }
        });

        this.props.forEach(prop => {
            prop.position.z += flow;
            if (prop.userData.swayTarget) {
                const sway = Math.sin(performance.now() * 0.0018 + prop.userData.phase) * 0.035;
                prop.userData.swayTarget.rotation.z = sway * prop.userData.side;
                prop.userData.swayTarget.rotation.x = sway * 0.35;
            }
            if (prop.position.z > 32) {
                prop.position.z = -116 - Math.random() * 18;
                prop.position.x = prop.userData.side * (5.35 + Math.random() * 0.8);
            }
        });

        this.roadSegments.forEach(segment => {
            segment.position.z += flow;
            if (segment.position.z > 30) segment.position.z -= 144;
        });

        this.holograms.forEach(board => {
            board.position.z += flow;
            board.userData.scan.position.y = Math.sin(performance.now() * 0.006 + board.position.z) * 0.32;
            board.userData.pulse.scale.setScalar(1 + Math.sin(performance.now() * 0.004 + board.position.z) * 0.04);
            if (board.position.z > 32) {
                board.position.z = -112 - Math.random() * 20;
                board.position.x = board.userData.side * (6.4 + Math.random() * 1.6);
            }
        });
    }
}
