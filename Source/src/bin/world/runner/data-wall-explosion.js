import * as THREE from 'three';

const PARTICLE_COUNT = 200;
const DURATION = 1.5; // seconds

const _dummy = new THREE.Object3D();

export default class DataWallExplosion {
    constructor() {
        this.container = new THREE.Object3D();
        this.container.name = 'data_wall_explosion';
        this._active = false;
        this._time = 0;

        this._px = new Float32Array(PARTICLE_COUNT);
        this._py = new Float32Array(PARTICLE_COUNT);
        this._pz = new Float32Array(PARTICLE_COUNT);
        this._vx = new Float32Array(PARTICLE_COUNT);
        this._vy = new Float32Array(PARTICLE_COUNT);
        this._vz = new Float32Array(PARTICLE_COUNT);
        this._rx = new Float32Array(PARTICLE_COUNT);
        this._ry = new Float32Array(PARTICLE_COUNT);
        this._rz = new Float32Array(PARTICLE_COUNT);
        this._rxS = new Float32Array(PARTICLE_COUNT);
        this._ryS = new Float32Array(PARTICLE_COUNT);
        this._rzS = new Float32Array(PARTICLE_COUNT);
        this._sz = new Float32Array(PARTICLE_COUNT);

        const geo = new THREE.BoxBufferGeometry(1, 1, 1);
        const wallTex = new THREE.TextureLoader().load('src/textures/brick_diffuse.jpg');
        const mat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            map: wallTex,
            transparent: true,
            opacity: 0.95
        });

        this.mesh = new THREE.InstancedMesh(geo, mat, PARTICLE_COUNT);
        this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.mesh.visible = false;
        this.mesh.frustumCulled = false;

        this.container.add(this.mesh);
    }

    explode(position) {
        this._active = true;
        this._time = 0;
        this.mesh.visible = true;

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            this._px[i] = position.x + (Math.random() - 0.5) * 1.6;
            this._py[i] = position.y + Math.random() * 2.0;
            this._pz[i] = position.z + (Math.random() - 0.5) * 0.2;

            const speed = 4 + Math.random() * 8;
            this._vx[i] = (Math.random() - 0.5) * 6;
            this._vy[i] = (Math.random() - 0.2) * 6;
            this._vz[i] = speed;

            this._rx[i] = this._ry[i] = this._rz[i] = 0;
            this._rxS[i] = (Math.random() - 0.5) * 10;
            this._ryS[i] = (Math.random() - 0.5) * 10;
            this._rzS[i] = (Math.random() - 0.5) * 10;

            this._sz[i] = 0.05 + Math.random() * 0.15;
        }
    }

    update(delta) {
        if (!this._active) return;
        this._time += delta;
        const t = this._time / DURATION;

        if (t >= 1) {
            this._active = false;
            this.mesh.visible = false;
            return;
        }

        const fade = 1 - t;

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            this._vy[i] -= 15 * delta;
            this._px[i] += this._vx[i] * delta;
            this._py[i] += this._vy[i] * delta;
            this._pz[i] += this._vz[i] * delta;

            this._rx[i] += this._rxS[i] * delta;
            this._ry[i] += this._ryS[i] * delta;
            this._rz[i] += this._rzS[i] * delta;

            _dummy.position.set(this._px[i], this._py[i], this._pz[i]);
            _dummy.rotation.set(this._rx[i], this._ry[i], this._rz[i]);
            _dummy.scale.setScalar(this._sz[i] * fade);
            _dummy.updateMatrix();
            this.mesh.setMatrixAt(i, _dummy.matrix);
        }
        this.mesh.instanceMatrix.needsUpdate = true;
    }
}
