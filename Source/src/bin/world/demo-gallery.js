import * as THREE from 'three';
import { TeapotGeometry } from 'three/examples/jsm/geometries/TeapotGeometry';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';

export default class DemoGallery {
    constructor(props) {
        this.loader = props.loader;
        this.input = props.input;
        this.debug = props.debug;
        this.renderer = props.renderer;
        this.camera = props.camera;
        this.visible = false;
        this.items = [];
        this.selectedIndex = 0;
        this.raycaster = new THREE.Raycaster();
        this.pointer = new THREE.Vector2();
        this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.14);
        this.dragPoint = new THREE.Vector3();
        this.dragOffset = new THREE.Vector3();
        this.dragStartPointer = new THREE.Vector2();
        this.dragStartPosition = new THREE.Vector3();
        this.dragging = false;
        this.dragMoved = false;
        this.transformParams = {
            positionX: 0,
            positionY: 0,
            positionZ: -8,
            rotationX: 0,
            rotationY: 0,
            rotationZ: 0,
            scaleX: 1,
            scaleY: 1,
            scaleZ: 1
        };
        this.transformControllers = [];

        this.container = new THREE.Object3D();
        this.container.name = 'demo_gallery';
        this.container.visible = false;

        // Task 4: Interactive Light & TransformControls
        this.interactiveLightCtrl = null;
        this.spawnedGeoItems = []; // Track user-spawned items to cancel them

        this.createPlatform();
        this.createObjects();
        this.bindInput();
        this.bindMouse();
        this.setDebug();
    }

    createPlatform() {
        const platform = new THREE.Mesh(
            new THREE.BoxBufferGeometry(15, 0.18, 6),
            new THREE.MeshStandardMaterial({
                color: 0x0a0a2e,
                roughness: 0.8,
                metalness: 0.2
            })
        );
        platform.position.set(0, 0.02, -6);
        platform.receiveShadow = true;
        this.container.add(platform);

        const gridHelper = new THREE.GridHelper(15, 15, 0x00ffff, 0xff00ff);
        gridHelper.position.set(0, 0.12, -6);
        this.container.add(gridHelper);

        this.selector = new THREE.Mesh(
            new THREE.TorusBufferGeometry(0.72, 0.035, 10, 42),
            new THREE.MeshStandardMaterial({
                color: 0xfacc15,
                emissive: 0xfacc15,
                emissiveIntensity: 1.1
            })
        );
        this.selector.rotation.x = Math.PI / 2;
        this.selector.position.y = 0.18;
        this.container.add(this.selector);
    }

    createObjects() {
        const positions = [-5.4, -3.6, -1.8, 0, 1.8, 3.6, 5.4];

        this.descriptions = {
            'Box': 'Khối hộp (BoxGeometry) là khối cơ bản nhất có 6 mặt phẳng.',
            'Sphere': 'Khối cầu (SphereGeometry) được tạo từ lưới đa giác đều.',
            'Cone': 'Khối nón (ConeGeometry) chóp nhọn, đáy hình tròn.',
            'Cylinder': 'Khối trụ (CylinderGeometry) có 2 đáy tròn và mặt xung quanh.',
            'Wheel': 'Khối Torus (TorusGeometry) còn gọi là hình xuyến/bánh xe.',
            'Teapot Primitive': 'Teapot (TeapotGeometry) là model hàn lâm kinh điển (Utah Teapot).',
            'Player GLB': 'Model nhân vật chính tải từ file GLB (GLTFLoader), sử dụng xương (Armature).',
            'Torus Knot': 'Nút thắt Torus (TorusKnotGeometry) là một hình học dạng xoắn phức tạp.',
            'Tetrahedron': 'Khối 4 mặt (TetrahedronGeometry) với 4 tam giác đều.',
            'Octahedron': 'Khối 8 mặt (OctahedronGeometry) với 8 tam giác đều.',
            'Icosahedron': 'Khối 20 mặt (IcosahedronGeometry) với 20 tam giác đều.',
            'Heart': 'Trái tim (ExtrudeGeometry) tạo từ hình 2D rồi kéo giãn 3D.'
        };

        this.addItem('Box', this.createBox(), positions[0]);
        this.addItem('Sphere', this.createSphere(), positions[1]);
        this.addItem('Cone', this.createCone(), positions[2]);
        this.addItem('Cylinder', this.createCylinder(), positions[3]);
        this.addItem('Wheel', this.createWheel(), positions[4]);
        this.addItem('Teapot Primitive', this.createTeapot(), positions[5]);
        this.addItem('Player GLB', this.createLoadingStand(0x34d399), positions[6]);

        this.loadPlayerModel(this.items[6].object);
        this.select(0);
        this.setupUI();
    }

    addItem(name, object, x) {
        const group = new THREE.Object3D();
        group.name = name;
        group.position.set(x, 0.14, -6); // Mang lại gần camera hơn
        group.add(object);
        group.add(this.createLabel(name));

        // A1: PointLight nhỏ gắn bên cạnh (Bỏ màu neon sáng)
        const pLight = new THREE.PointLight(0xffffff, 0.5, 5);
        pLight.position.set(1, 1, 1);
        group.add(pLight);

        this.container.add(group);
        this.items.push({ name, object: group });
    }

    setupUI() {
        const select = document.getElementById('object-select');
        if (!select) return;

        select.innerHTML = '';
        this.items.forEach((item, idx) => {
            const opt = document.createElement('option');
            opt.value = idx;
            opt.innerText = item.name;
            select.appendChild(opt);
        });

        select.addEventListener('change', (e) => {
            this.select(parseInt(e.target.value));
        });

        const resetBtn = document.getElementById('reset-transform-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                const item = this.items[this.selectedIndex].object;
                item.rotation.set(0, 0, 0);
                item.scale.set(1, 1, 1);
                const basePositions = [-5.4, -3.6, -1.8, 0, 1.8, 3.6, 5.4];
                if (this.selectedIndex < basePositions.length) {
                    item.position.set(basePositions[this.selectedIndex], 0.14, -6);
                } else {
                    item.position.set(0, 0.6, 0.5);
                }
                if (this.selector) {
                    this.selector.position.x = item.position.x;
                    this.selector.position.z = item.position.z;
                }
                this.updateMatrixDisplay();
                this.syncDebugFromSelection();
            });
        }

        const transformBtns = document.querySelectorAll('.transform-btn');
        transformBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const axis = e.target.getAttribute('data-axis');
                if (axis) {
                    this.rotate({ axis: axis, amount: Math.PI / 14 });
                }
            });
        });

        // ── TASK 3 & 4: Listen to Gallery Top Bar Events ──

        document.addEventListener('gallery-spawn-geo', (e) => {
            if (!this.visible) return;
            const geoName = e.detail;
            let geo = null;
            switch (geoName) {
                case 'Box': geo = new THREE.BoxBufferGeometry(1, 1, 1); break;
                case 'Sphere': geo = new THREE.SphereBufferGeometry(0.6, 32, 32); break;
                case 'Cone': geo = new THREE.ConeBufferGeometry(0.55, 1.2, 32); break;
                case 'Cylinder': geo = new THREE.CylinderBufferGeometry(0.45, 0.45, 1.2, 32); break;
                case 'Torus': geo = new THREE.TorusBufferGeometry(0.5, 0.18, 18, 42); break;
                case 'Torus Knot': geo = new THREE.TorusKnotBufferGeometry(0.4, 0.12, 100, 16); break;
                case 'Tetrahedron': geo = new THREE.TetrahedronBufferGeometry(0.6); break;
                case 'Octahedron': geo = new THREE.OctahedronBufferGeometry(0.6); break;
                case 'Dodecahedron': geo = new THREE.DodecahedronBufferGeometry(0.6); break;
                case 'Icosahedron': geo = new THREE.IcosahedronBufferGeometry(0.6); break;
                case 'Heart': {
                    const shape = new THREE.Shape();
                    const x = 0, y = 0;
                    shape.moveTo(x + 5, y + 5);
                    shape.bezierCurveTo(x + 5, y + 5, x + 4, y, x, y);
                    shape.bezierCurveTo(x - 6, y, x - 6, y + 7, x - 6, y + 7);
                    shape.bezierCurveTo(x - 6, y + 11, x - 3, y + 15.4, x + 5, y + 19);
                    shape.bezierCurveTo(x + 12, y + 15.4, x + 16, y + 11, x + 16, y + 7);
                    shape.bezierCurveTo(x + 16, y + 7, x + 16, y, x + 10, y);
                    shape.bezierCurveTo(x + 7, y, x + 5, y + 5, x + 5, y + 5);
                    geo = new THREE.ExtrudeBufferGeometry(shape, { depth: 2, bevelEnabled: true, bevelSegments: 2, steps: 2, bevelSize: 1, bevelThickness: 1 });
                    break;
                }
            }
            if (!geo) return;

            const mesh = this.shadowed(new THREE.Mesh(geo, this.material(0x10b981, 0x059669)), 0.6);
            if (geoName === 'Heart') {
                mesh.scale.set(0.04, 0.04, 0.04);
                mesh.rotation.x = Math.PI;
            }

            // Xóa spawned cũ trước (đảm bảo chỉ 1 khối tại 1 lúc)
            if (this.spawnedGeoItems.length > 0) {
                const old = this.spawnedGeoItems.pop();
                this.container.remove(old.object);
                const idx = this.items.indexOf(old);
                if (idx > -1) this.items.splice(idx, 1);
                const sel = document.getElementById('object-select');
                if (sel && sel.lastChild && sel.options.length > 7) sel.removeChild(sel.lastChild);
            }

            this.addItem(geoName, mesh, 0);
            const newIndex = this.items.length - 1;
            const newItem = this.items[newIndex];
            // Đưa vật thể gần camera hơn, nhưng chưa vượt lưới nền
            newItem.object.position.set(0, 0.6, 0.5);
            this.spawnedGeoItems.push(newItem);

            const sel = document.getElementById('object-select');
            if (sel) {
                const opt = document.createElement('option');
                opt.value = newIndex;
                opt.innerText = geoName;
                sel.appendChild(opt);
            }
            this.select(newIndex);
        });

        document.addEventListener('gallery-cancel-geo', () => {
            if (!this.visible || this.spawnedGeoItems.length === 0) return;
            const itemToRemove = this.spawnedGeoItems.pop();
            this.container.remove(itemToRemove.object);
            const index = this.items.indexOf(itemToRemove);
            if (index > -1) {
                this.items.splice(index, 1);
                const sel = document.getElementById('object-select');
                if (sel && sel.options.length > 7) sel.removeChild(sel.lastChild);
            }
            this.select(0);
        });

        document.addEventListener('gallery-reset-all', () => {
            if (!this.visible) return;

            // 1. Remove spawned geometries
            while (this.spawnedGeoItems.length > 0) {
                const itemToRemove = this.spawnedGeoItems.pop();
                this.container.remove(itemToRemove.object);
                const index = this.items.indexOf(itemToRemove);
                if (index > -1) {
                    this.items.splice(index, 1);
                    const sel = document.getElementById('object-select');
                    if (sel && sel.options.length > 7) sel.removeChild(sel.lastChild);
                }
            }

            // 2. Remove spawned lights
            this._removeSpawnedLight();

            // 3. Reset all items transforms & animation
            const basePositions = [-5.4, -3.6, -1.8, 0, 1.8, 3.6, 5.4];
            this.items.forEach((item, index) => {
                if (item.userData) item.userData.animation = 'none';
                item.object.scale.set(1, 1, 1);
                item.object.rotation.set(0, 0, 0);
                if (index < basePositions.length) {
                    item.object.position.set(basePositions[index], 0.14, -6);
                }
            });

            // 4. Reset camera
            if (this.camera) {
                this.camera.presetIndex = 1;
                this.camera.applyPreset(1);
                this.camera.params.demoOrbit = true;
                if (this.camera.debugControllers) {
                    this.camera.debugControllers.forEach(c => c.updateDisplay());
                }
            }

            // 5. Reset material UI
            document.dispatchEvent(new CustomEvent('gallery-set-texture-preset', { detail: 'reset' }));
            const matSelect = document.getElementById('gtb-material');
            if (matSelect) matSelect.value = 'solid';

            // 6. Reset animation UI
            const animSelect = document.getElementById('gtb-animation');
            if (animSelect) animSelect.value = 'none';

            // 7. Reset Selection
            this.select(0);
        });

        document.addEventListener('gallery-animation', (e) => {
            if (!this.visible || !this.items[this.selectedIndex]) return;
            const anim = e.detail; // 'none', 'bounce', 'pulse', 'reset'
            const item = this.items[this.selectedIndex];
            item.userData = item.userData || {};
            if (anim === 'reset') {
                item.userData.animation = 'none';
                item.object.scale.set(1, 1, 1);
                const basePositions = [-5.4, -3.6, -1.8, 0, 1.8, 3.6, 5.4];
                if (this.selectedIndex < basePositions.length) {
                    item.object.position.set(basePositions[this.selectedIndex], 0.14, -6);
                } else {
                    item.object.position.set(0, 0.6, 0.5);
                }
                item.object.rotation.set(0, 0, 0);
                
                if (this.selector) {
                    this.selector.position.x = item.object.position.x;
                    this.selector.position.z = item.object.position.z;
                }
                
                this.updateMatrixDisplay();
                this.syncDebugFromSelection();
            } else {
                item.userData.animation = anim;
                if (anim !== 'pulse') item.object.scale.set(1, 1, 1);
            }
        });

        document.addEventListener('gallery-material', (e) => {
            if (!this.visible || !this.items[this.selectedIndex]) return;
            const matType = e.detail;
            const item = this.items[this.selectedIndex].object;
            item.traverse(child => {
                if (child.isMesh && child.material) {
                    if (matType === 'solid') {
                        child.material.wireframe = false;
                        child.material.needsUpdate = true;
                    }
                }
            });
        });

        // ── TASK 4: Spawn interactive light in front of selected object ──
        document.addEventListener('gallery-spawn-light', (e) => {
            if (!this.visible) return;
            const { type } = e.detail;
            this._removeSpawnedLight(); // Xóa đèn cũ trước

            const selObj = this.items[this.selectedIndex]?.object;
            const targetPos = selObj
                ? new THREE.Vector3(selObj.position.x, selObj.position.y + 1.5, selObj.position.z + 1.5)
                : new THREE.Vector3(0, 2, -3);

            let light, helper;
            if (type === 'point') {
                light = new THREE.PointLight(0x00ffee, 2.5, 12);
                light.castShadow = true;
                light.shadow.mapSize.set(512, 512);
                helper = new THREE.PointLightHelper(light, 0.4);
            } else if (type === 'directional') {
                light = new THREE.DirectionalLight(0xffeedd, 2.0);
                light.castShadow = true;
                light.shadow.mapSize.set(512, 512);
                helper = new THREE.DirectionalLightHelper(light, 1.0);
            } else {
                light = new THREE.AmbientLight(0x8866ff, 1.5);
                helper = null;
            }

            light.position.copy(targetPos);
            this.container.add(light);

            if (helper) {
                this.container.add(helper);
            }

            // TransformControls để kéo đèn
            if (!this.interactiveLightCtrl) {
                this.interactiveLightCtrl = new TransformControls(this.camera.instance, this.renderer.domElement);
                this.interactiveLightCtrl.mode = 'translate';
                this.interactiveLightCtrl.addEventListener('dragging-changed', (ev) => {
                    this._lightDragging = ev.value;
                });
                this.container.add(this.interactiveLightCtrl);
            }
            if (type !== 'ambient') {
                this.interactiveLightCtrl.attach(light);
                this.interactiveLightCtrl.visible = true;
            } else {
                this.interactiveLightCtrl.detach();
                this.interactiveLightCtrl.visible = false;
            }

            this._spawnedLight = light;
            this._spawnedLightHelper = helper;
            this._lightHelperVisible = false; // helper mặc định tắt
            if (helper) helper.visible = false;
        });

        document.addEventListener('gallery-light-helper', () => {
            if (!this._spawnedLightHelper) return;
            this._lightHelperVisible = !this._lightHelperVisible;
            this._spawnedLightHelper.visible = this._lightHelperVisible;
        });

        document.addEventListener('gallery-remove-light', () => {
            if (!this.visible) return;
            this._removeSpawnedLight();
        });


        document.addEventListener('gallery-camera-orbit', () => {
            if (this.camera && this.camera.params) {
                this.camera.params.demoOrbit = !this.camera.params.demoOrbit;
                if (this.camera.debugControllers) {
                    this.camera.debugControllers.forEach(c => c.updateDisplay());
                }
            }
        });

        document.addEventListener('gallery-camera-reset', () => {
            if (this.camera) {
                this.camera.presetIndex = 1;
                this.camera.applyPreset(1);
                this.camera.params.demoOrbit = true;
                if (this.camera.debugControllers) {
                    this.camera.debugControllers.forEach(c => c.updateDisplay());
                }
            }
        });
    }

    _removeSpawnedLight() {
        if (this._spawnedLight) {
            this.container.remove(this._spawnedLight);
            this._spawnedLight = null;
        }
        if (this._spawnedLightHelper) {
            this.container.remove(this._spawnedLightHelper);
            this._spawnedLightHelper = null;
        }
        if (this.interactiveLightCtrl) {
            this.interactiveLightCtrl.detach();
            this.interactiveLightCtrl.visible = false;
        }
        this._lightDragging = false;
    }

    material(color, emissive) {
        return new THREE.MeshStandardMaterial({
            color: color,
            emissive: emissive,
            emissiveIntensity: 0.6,
            roughness: 0.3,
            metalness: 0.8
        });
    }

    createBox() {
        return this.shadowed(new THREE.Mesh(
            new THREE.BoxBufferGeometry(1, 1, 1),
            this.material(0x38bdf8, 0x0ea5e9)
        ), 0.58);
    }

    createSphere() {
        return this.shadowed(new THREE.Mesh(
            new THREE.SphereBufferGeometry(0.58, 32, 32),
            this.material(0xa78bfa, 0x7c3aed)
        ), 0.68);
    }

    createCone() {
        return this.shadowed(new THREE.Mesh(
            new THREE.ConeBufferGeometry(0.55, 1.25, 32),
            this.material(0xfb7185, 0xe11d48)
        ), 0.75);
    }

    createCylinder() {
        return this.shadowed(new THREE.Mesh(
            new THREE.CylinderBufferGeometry(0.45, 0.45, 1.22, 32),
            this.material(0x5eead4, 0x0f766e)
        ), 0.72);
    }

    createWheel() {
        const group = new THREE.Object3D();
        const tire = new THREE.Mesh(
            new THREE.TorusBufferGeometry(0.5, 0.13, 18, 42),
            this.material(0x111827, 0x7c3aed)
        );
        tire.rotation.y = Math.PI / 2;
        tire.position.y = 0.58;
        this.applyShadow(tire);

        const hub = new THREE.Mesh(
            new THREE.CylinderBufferGeometry(0.18, 0.18, 0.45, 24),
            this.material(0xe2e8f0, 0x38bdf8)
        );
        hub.rotation.z = Math.PI / 2;
        hub.position.y = 0.58;
        this.applyShadow(hub);

        group.add(tire);
        group.add(hub);
        return group;
    }

    createTeapot() {
        return this.shadowed(new THREE.Mesh(
            new TeapotGeometry(0.4, 15, true, true, true, true, true),
            this.material(0xfbbf24, 0xd97706)
        ), 0.5);
    }

    createLoadingStand(color) {
        return this.shadowed(new THREE.Mesh(
            new THREE.BoxBufferGeometry(0.82, 0.82, 0.82),
            this.material(color, color)
        ), 0.5);
    }

    loadPlayerModel(target) {
        this.loader.load('runner/player/scene.glb', gltf => {
            const label = target.children.find(child => child.isSprite);
            const model = gltf.scene;
            this.fitModel(model, 1.45);
            model.rotation.y = Math.PI;
            model.traverse(child => {
                if (child.isMesh) {
                    child.material = this.material(0x34d399, 0x047857);
                    this.applyShadow(child);
                }
            });
            target.clear();
            target.add(model);
            if (label) target.add(label);
        });
    }

    fitModel(model, targetSize) {
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const scale = targetSize / Math.max(size.x || 1, size.y || 1, size.z || 1);
        model.scale.multiplyScalar(scale);

        const fittedBox = new THREE.Box3().setFromObject(model);
        const center = fittedBox.getCenter(new THREE.Vector3());
        model.position.x -= center.x;
        model.position.z -= center.z;
        model.position.y -= fittedBox.min.y;
    }

    createLabel(text) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(3, 7, 18, 0.72)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = 'rgba(125, 211, 252, 0.75)';
        ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
        ctx.fillStyle = '#e0f2fe';
        ctx.font = '22px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
        sprite.position.set(0, 1.85, 0);
        sprite.scale.set(1.35, 0.34, 1);
        return sprite;
    }

    bindInput() {
        this.input.on('selectNext', () => this.select(this.selectedIndex + 1));
        this.input.on('selectPrevious', () => this.select(this.selectedIndex - 1));
        this.input.on('transform', data => this.transform(data));
        this.input.on('rotate', data => this.rotate(data));
        this.input.on('scale', data => this.scale(data));
    }

    bindMouse() {
        if (!this.renderer || !this.renderer.domElement) return;

        this.handlePointerDown = event => this.onPointerDown(event);
        this.handlePointerMove = event => this.onPointerMove(event);
        this.handlePointerUp = event => this.onPointerUp(event);
        this.handleWheel = event => this.onWheel(event);

        const canvas = this.renderer.domElement;
        canvas.addEventListener('pointerdown', this.handlePointerDown);
        window.addEventListener('pointermove', this.handlePointerMove);
        window.addEventListener('pointerup', this.handlePointerUp);
        canvas.addEventListener('wheel', this.handleWheel, { passive: false });
    }

    onPointerDown(event) {
        if (!this.visible || event.button !== 0) return;

        const picked = this.pickItem(event);
        if (!picked) return;

        event.preventDefault();
        this.select(picked.index);
        this.dragging = true;
        this.dragMoved = false;
        this.dragStartPointer.set(event.clientX, event.clientY);
        this.dragStartPosition.copy(picked.item.object.position);

        if (this.intersectDragPlane(event, this.dragPoint)) {
            this.dragOffset.copy(picked.item.object.position).sub(this.dragPoint);
        } else {
            this.dragOffset.set(0, 0, 0);
        }

        if (this.renderer.domElement.setPointerCapture) {
            this.renderer.domElement.setPointerCapture(event.pointerId);
        }
    }

    onPointerMove(event) {
        if (!this.visible || !this.dragging) return;

        const item = this.items[this.selectedIndex].object;
        const dx = event.clientX - this.dragStartPointer.x;
        const dy = event.clientY - this.dragStartPointer.y;
        this.dragMoved = this.dragMoved || Math.abs(dx) + Math.abs(dy) > 3;

        if (event.shiftKey) {
            item.position.y = THREE.MathUtils.clamp(this.dragStartPosition.y - dy * 0.012, -0.2, 5.2);
        } else if (this.intersectDragPlane(event, this.dragPoint)) {
            item.position.x = THREE.MathUtils.clamp(this.dragPoint.x + this.dragOffset.x, -7.5, 7.5);
            item.position.z = THREE.MathUtils.clamp(this.dragPoint.z + this.dragOffset.z, -13.5, 1.5);
        }

        this.selector.position.x = item.position.x;
        this.selector.position.z = item.position.z;
        this.syncDebugFromSelection();
        this.updateMatrixDisplay();
    }

    onPointerUp(event) {
        if (!this.dragging) return;
        this.dragging = false;
        if (this.renderer && this.renderer.domElement.releasePointerCapture) {
            try {
                this.renderer.domElement.releasePointerCapture(event.pointerId);
            } catch (error) {
                // Pointer capture can already be released by the browser.
            }
        }
    }

    onWheel(event) {
        if (!this.visible) return;
        event.preventDefault();
        const factor = event.deltaY < 0 ? 1.06 : 0.94;
        this.scale({ amount: factor });
    }

    pickItem(event) {
        this.updatePointer(event);
        this.raycaster.setFromCamera(this.pointer, this.camera.instance);

        const pickables = [];
        this.items.forEach(item => {
            item.object.traverse(child => {
                if (child.isMesh || child.isSprite) pickables.push(child);
            });
        });

        const hits = this.raycaster.intersectObjects(pickables, true);
        for (const hit of hits) {
            const index = this.findItemIndex(hit.object);
            if (index !== -1) return { index, item: this.items[index], hit };
        }

        return null;
    }

    findItemIndex(object) {
        return this.items.findIndex(item => {
            let current = object;
            while (current) {
                if (current === item.object) return true;
                current = current.parent;
            }
            return false;
        });
    }

    intersectDragPlane(event, target) {
        this.updatePointer(event);
        this.raycaster.setFromCamera(this.pointer, this.camera.instance);
        return this.raycaster.ray.intersectPlane(this.dragPlane, target);
    }

    updatePointer(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    select(index) {
        if (this.items.length === 0) return;
        this.selectedIndex = (index + this.items.length) % this.items.length;
        const item = this.items[this.selectedIndex].object;
        this.selector.position.x = item.position.x;
        this.selector.position.z = item.position.z;

        // Overlay Sync
        const htmlSelect = document.getElementById('object-select');
        if (htmlSelect) htmlSelect.value = this.selectedIndex;

        const desc = document.getElementById('showcase-desc');
        if (desc && this.descriptions) desc.innerText = this.descriptions[this.items[this.selectedIndex].name];

        this.syncDebugFromSelection();
        this.updateMatrixDisplay();
    }

    updateMatrixDisplay() {
        if (!this.visible) return;
        const item = this.items[this.selectedIndex].object;
        const matrixDiv = document.getElementById('matrix-display');
        if (matrixDiv) {
            item.updateMatrixWorld(true);
            const e = item.matrixWorld.elements;
            matrixDiv.innerText = `[${e[0].toFixed(2)}, ${e[4].toFixed(2)}, ${e[8].toFixed(2)}, ${e[12].toFixed(2)}]\n[${e[1].toFixed(2)}, ${e[5].toFixed(2)}, ${e[9].toFixed(2)}, ${e[13].toFixed(2)}]\n[${e[2].toFixed(2)}, ${e[6].toFixed(2)}, ${e[10].toFixed(2)}, ${e[14].toFixed(2)}]\n[${e[3].toFixed(2)}, ${e[7].toFixed(2)}, ${e[11].toFixed(2)}, ${e[15].toFixed(2)}]`;
        }
    }

    transform(data) {
        if (!this.visible) return;
        const item = this.items[this.selectedIndex].object;
        item.position[data.axis] += data.amount;

        // Clamp position to match new grid bounds
        item.position.x = THREE.MathUtils.clamp(item.position.x, -7.5, 7.5);
        item.position.y = THREE.MathUtils.clamp(item.position.y, -0.2, 5.2);
        item.position.z = THREE.MathUtils.clamp(item.position.z, -13.5, 1.5);

        this.select(this.selectedIndex);
        this.syncDebugFromSelection();
    }

    rotate(data) {
        if (!this.visible) return;
        const item = this.items[this.selectedIndex].object;
        item.rotation[data.axis] += data.amount;
        this.syncDebugFromSelection();
        this.updateMatrixDisplay();
    }

    scale(data) {
        if (!this.visible) return;
        const item = this.items[this.selectedIndex].object;
        item.scale.multiplyScalar(data.amount);
        this.syncDebugFromSelection();
        this.updateMatrixDisplay();
    }

    applyTexture(texture) {
        if (!this.visible) return;

        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(1, 1);

        const item = this.items[this.selectedIndex].object;
        item.traverse(child => {
            if (child.isMesh && child.material) {
                child.material = child.material.clone();
                child.material.map = texture;
                child.material.color.set(0xffffff);
                child.material.needsUpdate = true;
            }
        });
    }

    applyTexturePreset(maps) {
        if (!this.visible) return;

        const item = this.items[this.selectedIndex].object;
        item.traverse(child => {
            if (child.isMesh && child.material) {
                child.material = child.material.clone();
                // Nếu tryền maps={reset: true}, clear maps
                if (maps.reset) {
                    child.material.map = null;
                    child.material.normalMap = null;
                    child.material.roughnessMap = null;
                    child.material.emissive = new THREE.Color(0x000000);
                    child.material.color.set(child.userData.originalColor || 0xffffff);
                } else {
                    if (!child.userData.originalColor) {
                        child.userData.originalColor = child.material.color.getHex();
                    }
                    if (maps.map !== undefined) child.material.map = maps.map;
                    if (maps.normalMap !== undefined) child.material.normalMap = maps.normalMap;
                    if (maps.roughnessMap !== undefined) child.material.roughnessMap = maps.roughnessMap;

                    // Nếu là hologram, cho nó tự phát sáng
                    if (maps.map && maps.map.image && maps.map.image.getContext) {
                        child.material.emissive = new THREE.Color(0x000000);
                        child.material.emissiveMap = null;
                    }
                    child.material.color.set(0xffffff);
                }
                child.material.needsUpdate = true;
            }
        });
    }

    getSelectedItemName() {
        return this.items[this.selectedIndex] ? this.items[this.selectedIndex].name : 'Box';
    }

    show(visible) {
        this.visible = visible;
        this.container.visible = visible;

        const panel = document.getElementById('showcase-panel');
        if (panel) panel.style.display = visible ? 'block' : 'none';

        if (visible) this.select(this.selectedIndex);
    }

    update(delta) {
        if (!this.visible) return;

        const speed = 4.0 * delta;
        const rotSpeed = 2.0 * delta;
        const scaleAmount = 1.0 + (1.5 * delta);

        let needsMatrixUpdate = false;

        // Xử lý giữ phím liên tục
        if (this.input.keysDown['ArrowLeft'] || this.input.keysDown['KeyA']) { this.transform({ axis: 'x', amount: -speed }); needsMatrixUpdate = true; }
        if (this.input.keysDown['ArrowRight'] || this.input.keysDown['KeyD']) { this.transform({ axis: 'x', amount: speed }); needsMatrixUpdate = true; }
        if (this.input.keysDown['ArrowUp'] || this.input.keysDown['KeyW']) { this.transform({ axis: 'z', amount: -speed }); needsMatrixUpdate = true; }
        if (this.input.keysDown['ArrowDown'] || this.input.keysDown['KeyS']) { this.transform({ axis: 'z', amount: speed }); needsMatrixUpdate = true; }
        if (this.input.keysDown['PageUp']) { this.transform({ axis: 'y', amount: speed }); needsMatrixUpdate = true; }
        if (this.input.keysDown['PageDown']) { this.transform({ axis: 'y', amount: -speed }); needsMatrixUpdate = true; }

        if (this.input.keysDown['Equal'] || this.input.keysDown['NumpadAdd']) { this.scale({ amount: scaleAmount }); needsMatrixUpdate = true; }
        if (this.input.keysDown['Minus'] || this.input.keysDown['NumpadSubtract']) { this.scale({ amount: 1.0 / scaleAmount }); needsMatrixUpdate = true; }

        if (this.input.keysDown['KeyR']) {
            if (this.input.keysDown['KeyX']) { this.rotate({ axis: 'x', amount: rotSpeed }); needsMatrixUpdate = true; }
            if (this.input.keysDown['KeyY']) { this.rotate({ axis: 'y', amount: rotSpeed }); needsMatrixUpdate = true; }
            if (this.input.keysDown['KeyZ']) { this.rotate({ axis: 'z', amount: rotSpeed }); needsMatrixUpdate = true; }
        }

        this.items.forEach((item, index) => {
            if (index !== this.selectedIndex) {
                item.object.rotation.y += delta * (0.25 + index * 0.03);
            } else {
                // TASK 3: Apply active animation
                const anim = item.userData?.animation || 'none';
                if (anim === 'bounce') {
                    item.object.position.y = 0.14 + Math.abs(Math.sin(performance.now() * 0.003)) * 1.5;
                } else if (anim === 'pulse') {
                    const s = 1.0 + Math.sin(performance.now() * 0.005) * 0.3;
                    item.object.scale.set(s, s, s);
                }
                // 'none' means Rotate Slow, which is handled manually by user or just slowly rotating
                if (anim === 'none' && !this.dragging && !this.interactiveLightCtrl?.dragging) {
                    item.object.rotation.y += delta * 0.25;
                }
            }
        });

        if (needsMatrixUpdate) this.updateMatrixDisplay();
    }

    setDebug() {
        if (!this.debug) return;
        const folder = this.debug.addFolder('Affine Transform Demo');
        folder.add({ next: () => this.select(this.selectedIndex + 1) }, 'next').name('Select next object');

        const positionFolder = folder.addFolder('Translate x/y/z');
        this.addTransformController(positionFolder, 'positionX', -7, 7, 0.01, 'Position X');
        this.addTransformController(positionFolder, 'positionY', -0.2, 3.2, 0.01, 'Position Y');
        this.addTransformController(positionFolder, 'positionZ', -12, -4, 0.01, 'Position Z');

        const rotationFolder = folder.addFolder('Rotate x/y/z');
        this.addTransformController(rotationFolder, 'rotationX', -Math.PI, Math.PI, 0.01, 'Rotation X');
        this.addTransformController(rotationFolder, 'rotationY', -Math.PI, Math.PI, 0.01, 'Rotation Y');
        this.addTransformController(rotationFolder, 'rotationZ', -Math.PI, Math.PI, 0.01, 'Rotation Z');

        const scaleFolder = folder.addFolder('Scale');
        scaleFolder.add({ scaleUp: () => this.scale({ amount: 1.08 }) }, 'scaleUp').name('Scale +');
        scaleFolder.add({ scaleDown: () => this.scale({ amount: 0.92 }) }, 'scaleDown').name('Scale -');
        this.addTransformController(scaleFolder, 'scaleX', 0.25, 2.5, 0.01, 'Scale X');
        this.addTransformController(scaleFolder, 'scaleY', 0.25, 2.5, 0.01, 'Scale Y');
        this.addTransformController(scaleFolder, 'scaleZ', 0.25, 2.5, 0.01, 'Scale Z');
        this.syncDebugFromSelection();
    }

    addTransformController(folder, key, min, max, step, label) {
        const controller = folder
            .add(this.transformParams, key, min, max, step)
            .name(label)
            .onChange(() => this.applyDebugTransform());
        this.transformControllers.push(controller);
    }

    applyDebugTransform() {
        if (!this.items.length) return;
        const item = this.items[this.selectedIndex].object;
        item.position.set(this.transformParams.positionX, this.transformParams.positionY, this.transformParams.positionZ);
        item.rotation.set(this.transformParams.rotationX, this.transformParams.rotationY, this.transformParams.rotationZ);
        item.scale.set(this.transformParams.scaleX, this.transformParams.scaleY, this.transformParams.scaleZ);
        this.selector.position.x = item.position.x;
        this.selector.position.z = item.position.z;
        this.updateMatrixDisplay();
    }

    syncDebugFromSelection() {
        if (!this.items.length) return;
        const item = this.items[this.selectedIndex].object;
        this.transformParams.positionX = item.position.x;
        this.transformParams.positionY = item.position.y;
        this.transformParams.positionZ = item.position.z;
        this.transformParams.rotationX = item.rotation.x;
        this.transformParams.rotationY = item.rotation.y;
        this.transformParams.rotationZ = item.rotation.z;
        this.transformParams.scaleX = item.scale.x;
        this.transformParams.scaleY = item.scale.y;
        this.transformParams.scaleZ = item.scale.z;
        this.transformControllers.forEach(controller => controller.updateDisplay());
    }

    material(color, emissive) {
        return new THREE.MeshStandardMaterial({
            color,
            emissive,
            emissiveIntensity: 0.35,
            roughness: 0.32,
            metalness: 0.28
        });
    }

    shadowed(mesh, y) {
        mesh.position.y = y;
        this.applyShadow(mesh);
        return mesh;
    }

    applyShadow(mesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
    }
}
