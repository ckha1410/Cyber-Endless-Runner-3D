import * as THREE from 'three';

/**
 * Scenery class manages dynamic roadside props: lampposts, cyber-trees, neon signs.
 * They move towards the camera based on game speed.
 * Uses Object Pooling to reuse elements.
 */

const NEON_PALETTE = [0x00ffff, 0xff00ff, 0xfacc15, 0x7c3aed, 0xff4400];

export default class Scenery {
    constructor() {
        this.container = new THREE.Object3D();
        this.container.name = 'scenery';
        this.items = [];
        this.pool = [];
        this.spawnTimer = 0;
        
        // Caching materials and geometries to save memory
        this.lamppostMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.8, metalness: 0.2 });
        this.treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 });
        
        // Spawn initial batch (giảm từ 15 xuống 6 để bớt lag)
        for(let i = 0; i < 6; i++) {
            this.spawnProp(-10 - i * 20);
        }
    }

    spawnProp(zOffset) {
        let prop = this.pool.pop();
        if (!prop) {
            prop = this.createRandomProp();
        }
        
        // Random side (-1 = left, 1 = right)
        const side = Math.random() > 0.5 ? 1 : -1;
        // Đặt ở 2 bên lề giống như các cây/cột đèn có sẵn
        const x = side * (5.35 + Math.random() * 0.8);
        
        prop.position.set(x, 0, zOffset);
        
        // If it's a lamppost on the left, flip it to face the road
        if (prop.userData.type === 'lamppost') {
            prop.rotation.y = side === 1 ? -Math.PI/2 : Math.PI/2;
        } else {
            prop.rotation.y = Math.random() * Math.PI;
        }
        
        prop.visible = true;
        this.container.add(prop);
        this.items.push(prop);
    }

    createRandomProp() {
        return this.createLamppost();
    }

    createLamppost() {
        const group = new THREE.Group();
        group.userData.type = 'lamppost';
        
        // Base pole
        const pole = new THREE.Mesh(new THREE.CylinderBufferGeometry(0.1, 0.15, 4, 8), this.lamppostMat);
        pole.position.y = 2;
        group.add(pole);

        // Arm
        const arm = new THREE.Mesh(new THREE.CylinderBufferGeometry(0.05, 0.05, 2, 8), this.lamppostMat);
        arm.position.set(-1, 3.8, 0);
        arm.rotation.z = Math.PI / 2;
        group.add(arm);

        // Light fixture (không dùng PointLight để tránh lag, chỉ dùng vật liệu phát sáng)
        const colorHex = Math.random() > 0.5 ? 0xfacc15 : 0x00ffff;
        const fixture = new THREE.Mesh(
            new THREE.BoxBufferGeometry(0.6, 0.1, 0.3),
            new THREE.MeshBasicMaterial({ color: colorHex })
        );
        fixture.position.set(-1.8, 3.75, 0);
        group.add(fixture);

        return group;
    }



    update(delta, speed) {
        // Move all props towards camera
        for (let i = this.items.length - 1; i >= 0; i--) {
            const prop = this.items[i];
            prop.position.z += speed * delta;
            
            // If prop passed the camera, remove and pool it
            if (prop.position.z > 10) {
                prop.visible = false;
                this.container.remove(prop);
                this.pool.push(prop);
                this.items.splice(i, 1);
            }
        }

        // Spawn new props (tăng thời gian chờ giữa các lần spawn để bớt rối mắt)
        this.spawnTimer -= delta;
        if (this.spawnTimer <= 0) {
            this.spawnTimer = 1.2 + Math.random() * 1.5; // Random interval
            this.spawnProp(-120); // Spawn far away
        }
    }
}
