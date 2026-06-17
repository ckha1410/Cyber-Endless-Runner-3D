import EventEmitter from "../../utils/event-emitter";
import {Howl} from 'howler';
import ScreenShake from "../../utils/shaker";
import * as THREE from 'three';

export default class RunnerGameManager extends EventEmitter {
    constructor(props) {
        super(props);

        this.time = props.time;
        this.camera = props.camera;
        this.input = props.input;

        this.state = 'menu';
        this.previousState = 'menu';
        this.baseSpeed = 7.8;
        this.maxSpeed = 29;
        this.speed = this.baseSpeed;
        this.distance = 0;
        this.score = 0;
        this.coinScore = 0;
        this.coins = 0;
        this.combo = 1;
        this.shieldCount = 0;
        this.highScore = Number(localStorage.getItem('cyber-runner-high-score') || 0);

        this.shaker = ScreenShake();

        const sfxGameOver = new Howl({
            src: ['sfx/game_over.wav'],
            html5: true
        });
        this.sfxGameOver = sfxGameOver;
        this.sfxCoin = new Howl({
            src: ['sfx/jump_01.wav'],
            html5: true,
            volume: 0.12,
            rate: 1.55
        });

        this.time.on('tick', time => {
            this.shaker.update(this.camera.instance);
            this.update(time);
        })

        this.bindDom();
        this.bindInput();
        this.updateHud();
        this.showMenu();

        if (window.location.hash.includes('play')) {
            window.setTimeout(() => this.startGame(), 250);
        }
    }

    bindDom() {
        this.dom = {
            score: document.getElementById('runner-score'),
            coins: document.getElementById('coin-count'),
            combo: document.getElementById('combo-count'),
            speed: document.getElementById('speed-count'),
            cameraMode: document.getElementById('camera-mode'),
            shield: document.getElementById('shield-count'),
            highScore: document.getElementById('high-score'),
            status: document.getElementById('game-status'),
            overlay: document.getElementById('start-overlay'),
            overlayTitle: document.getElementById('overlay-title'),
            overlayText: document.getElementById('overlay-text'),
            startButton: document.getElementById('start-button'),
            restartButton: document.getElementById('restart-button'),
            resumeButton: document.getElementById('resume-button'),
            homeButton: document.getElementById('home-button'),
            pauseButton: document.getElementById('pause-button'),
            cameraButton: document.getElementById('camera-button'),
            galleryButton: document.getElementById('gallery-button'),
            galleryOverlayButton: document.getElementById('gallery-button-overlay'),
            backGameButton: document.getElementById('back-game-button'),
            textureInput: document.getElementById('texture-input'),
            feedbackLayer: document.getElementById('feedback-layer')
        };

        if (this.dom.startButton) this.dom.startButton.addEventListener('click', () => this.startGame());
        if (this.dom.restartButton) this.dom.restartButton.addEventListener('click', () => this.startGame());
        if (this.dom.resumeButton) this.dom.resumeButton.addEventListener('click', () => this.resume());
        if (this.dom.homeButton) this.dom.homeButton.addEventListener('click', () => this.goHome());
        if (this.dom.pauseButton) this.dom.pauseButton.addEventListener('click', () => this.togglePause());
        if (this.dom.cameraButton) this.dom.cameraButton.addEventListener('click', () => this.cycleCameraPreset());
        if (this.dom.galleryButton) this.dom.galleryButton.addEventListener('click', () => this.openGallery());
        if (this.dom.galleryOverlayButton) this.dom.galleryOverlayButton.addEventListener('click', () => this.openGallery());
        if (this.dom.backGameButton) this.dom.backGameButton.addEventListener('click', () => this.closeGallery());
        if (this.dom.textureInput) {
            this.dom.textureInput.addEventListener('change', event => {
                const file = event.target.files && event.target.files[0];
                if (file) this.emit('texture-file', file);
            });
        }
        document.querySelectorAll('.texture-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.emit('texture-preset', e.target.getAttribute('data-tex'));
            });
        });
        document.addEventListener('gallery-set-texture-preset', (e) => {
            this.emit('texture-preset', e.detail);
        });
    }

    bindInput() {
        this.input.on('start', () => {
            if (this.state === 'menu' || this.state === 'gameover') this.startGame();
            else if (this.state === 'paused') this.resume();
        });
        this.input.on('pause', () => this.togglePause());
        this.input.on('gallery', () => {
            if (this.state === 'gallery') this.closeGallery();
            else this.openGallery();
        });
        this.input.on('home', () => this.goHome());
        this.input.on('cameraPreset', () => this.cycleCameraPreset());
    }

    cycleCameraPreset() {
        if (!this.camera || !this.camera.cyclePreset) return;
        const name = this.camera.cyclePreset();
        this.showFloatingText(`CAM ${name.toUpperCase()}`, 'shield-pop');
        this.updateHud();
    }

    update(time) {
        if (this.state !== 'running') return;

        const delta = Math.min(time.delta / 1000, 0.06);
        this.distance += this.speed * delta;
        const distanceRamp = Math.pow(this.distance, 0.72) * 0.034;
        const coinRamp = Math.min(2.2, this.coins * 0.01);
        this.speed = Math.min(this.maxSpeed, this.baseSpeed + distanceRamp + coinRamp);
        this.score = Math.floor(this.distance * 8) + this.coinScore;
        this.updateHud();
    }

    startGame() {
        this.state = 'running';
        this.distance = 0;
        this.score = 0;
        this.coinScore = 0;
        this.coins = 0;
        this.combo = 1;
        this.shieldCount = 0;
        this.speed = this.baseSpeed;

        document.body.classList.remove('gallery-mode', 'paused-mode', 'gameover-mode', 'lobby-mode');
        this.hideOverlay();
        this.emit('reset');
        this.emit('state-change', this.state);
        this.updateHud();
    }

    showMenu() {
        this.state = 'menu';
        document.body.classList.add('lobby-mode');
        document.body.classList.remove('paused-mode', 'gameover-mode');
        this.showOverlay(
            'Cyber Endless Runner 3D',
            'Pick a camera, warm up your robot mascot, then run through a neon cyber city to dodge obstacles and collect energy coins.'
        );
        this.setButtonState({start: true, restart: false, resume: false, home: false});
        this.emit('state-change', this.state);
        this.updateHud();
    }

    goHome() {
        if (this.state === 'menu') return;

        document.body.classList.remove('gallery-mode', 'paused-mode', 'gameover-mode');
        if (this.state === 'gallery') this.emit('gallery', false);

        this.previousState = 'menu';
        this.distance = 0;
        this.score = 0;
        this.coinScore = 0;
        this.coins = 0;
        this.combo = 1;
        this.shieldCount = 0;
        this.speed = this.baseSpeed;
        this.emit('reset');
        this.showMenu();
    }

    pause() {
        if (this.state !== 'running') return;

        this.state = 'paused';
        document.body.classList.add('paused-mode');
        document.body.classList.remove('lobby-mode');
        this.showOverlay('Paused', 'Resume the runner or open the demo gallery for the graphics checklist.');
        this.setButtonState({start: false, restart: true, resume: true, home: true});
        this.emit('state-change', this.state);
        this.updateHud();
    }

    resume() {
        if (this.state !== 'paused') return;

        this.state = 'running';
        document.body.classList.remove('paused-mode');
        this.hideOverlay();
        this.emit('state-change', this.state);
        this.updateHud();
    }

    togglePause() {
        if (this.state === 'running') this.pause();
        else if (this.state === 'paused') this.resume();
    }

    openGallery() {
        this.previousState = this.state === 'gallery' ? this.previousState : this.state;
        this.state = 'gallery';
        document.body.classList.add('gallery-mode');
        this.hideOverlay();
        this.emit('gallery', true);
        this.emit('state-change', this.state);
        this.updateHud();
        const gui = document.querySelector('.dg.ac');
        if (gui) gui.style.display = 'block';
    }

    closeGallery() {
        const targetState = this.previousState;
        document.body.classList.remove('gallery-mode');
        this.emit('gallery', false);
        const gui = document.querySelector('.dg.ac');
        if (gui) gui.style.display = 'none';
        this.emit('gallery', false);

        if (targetState === 'running' || targetState === 'paused') {
            this.state = 'running';
            this.pause();
        } else if (targetState === 'gameover') {
            this.state = 'gameover';
            this.showOverlay('Run ended', `Score ${this.format(this.score)} - Coins ${this.coins}. Press Enter or Restart to try again.`);
            this.setButtonState({start: false, restart: true, resume: false, home: true});
            this.emit('state-change', this.state);
            this.updateHud();
        } else {
            this.showMenu();
        }
    }

    collectCoin(position, type = 'coin') {
        if (this.state !== 'running') return;

        if (type === 'shield') {
            this.shieldCount += 1;
            this.coinScore += 220;
            this.showFloatingText('SHIELD +1', 'shield-pop');
        } else if (type === 'orb') {
            this.coins += 3;
            this.combo = Math.min(9, this.combo + 2);
            this.coinScore += 180 + this.combo * 30;
            this.showFloatingText('+ORB', 'orb-pop');
        } else {
            this.coins += 1;
            this.combo = Math.min(9, this.combo + 1);
            this.coinScore += 80 + this.combo * 20;
            this.showFloatingText(`+${this.combo}`, 'coin-pop');
        }

        this.sfxCoin.play();
        this.emit('coin-collected', position || new THREE.Vector3(0, 1.2, 4));
        this.updateHud();
    }

    addScore(points) {
        if (this.state !== 'running') return;
        this.coinScore += points;
        this.showFloatingText(`+${points} WALL`, 'orb-pop');
        this.updateHud();
    }

    hit() {
        if (this.state !== 'running') return;

        if (this.shieldCount > 0) {
            this.shieldCount -= 1;
            this.combo = 1;
            this.emit('player-hit', new THREE.Vector3(0, 1.1, 4.1));
            this.showFloatingText('BLOCKED', 'shield-pop');
            this.updateHud();
            return;
        }

        this.combo = 1;
        this.emit('player-hit', new THREE.Vector3(0, 1.1, 4.1));
        this.gameOver();
    }

    gameOver() {
        if (this.state === 'gameover') return;

        this.state = 'gameover';
        document.body.classList.add('gameover-mode');
        document.body.classList.remove('lobby-mode');
        this.sfxGameOver.play();
        this.shaker.shake(this.camera.instance, new THREE.Vector3(0.16, 0.08, 0), 420);

        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('cyber-runner-high-score', String(this.highScore));
        }

        this.showOverlay('Run ended', `Score ${this.format(this.score)} - Coins ${this.coins}. Press Enter or Restart to try again.`);
        this.setButtonState({start: false, restart: true, resume: false, home: true});
        this.emit('state-change', this.state);
        this.updateHud();
    }

    isRunning() {
        return this.state === 'running';
    }

    // [D4] Near-miss camera shake — called by runner.js when obstacle narrowly passes player
    nearMiss() {
        if (this.state !== 'running') return;
        // Small shake (0.04 vs 0.16 for game-over) — feels like wind from a near obstacle
        this.shaker.shake(this.camera.instance, new THREE.Vector3(0.04, 0.02, 0), 160);
        // [D5] Emit event → triggers red light flash in lights.js
        this.emit('near-miss');
    }

    getDifficulty() {
        const speedProgress = (this.speed - this.baseSpeed) / (this.maxSpeed - this.baseSpeed);
        const distanceProgress = this.distance / 2600;
        return THREE.MathUtils.clamp(Math.max(speedProgress, distanceProgress), 0, 1);
    }

    updateHud() {
        this.setText('score', this.format(this.score).padStart(5, '0'));
        this.setText('coins', String(this.coins).padStart(2, '0'));
        this.setText('combo', `x${this.combo}`);
        this.setText('speed', `${this.speed.toFixed(1)} m/s`);
        this.setText('cameraMode', this.camera && this.camera.getPresetName ? this.camera.getPresetName().toUpperCase() : 'NORMAL');
        this.setText('shield', this.shieldCount > 0 ? String(this.shieldCount) : '0');
        this.setText('highScore', this.format(this.highScore));
        this.setText('status', this.state.toUpperCase());
    }

    showOverlay(title, text) {
        if (!this.dom.overlay) return;
        this.dom.overlay.classList.remove('is-hidden');
        this.setText('overlayTitle', title);
        this.setText('overlayText', text);
    }

    hideOverlay() {
        if (this.dom.overlay) this.dom.overlay.classList.add('is-hidden');
    }

    setButtonState(state) {
        if (this.dom.startButton) this.dom.startButton.hidden = !state.start;
        if (this.dom.restartButton) this.dom.restartButton.hidden = !state.restart;
        if (this.dom.resumeButton) this.dom.resumeButton.hidden = !state.resume;
        if (this.dom.homeButton) this.dom.homeButton.hidden = !state.home;
        if (this.dom.galleryOverlayButton) this.dom.galleryOverlayButton.hidden = false;
    }

    setText(key, value) {
        if (this.dom && this.dom[key]) this.dom[key].innerText = value;
    }

    showFloatingText(text, className) {
        if (!this.dom.feedbackLayer) return;

        const pop = document.createElement('div');
        pop.className = `feedback-pop ${className || ''}`;
        pop.innerText = text;
        pop.style.left = `${48 + (Math.random() - 0.5) * 16}%`;
        pop.style.top = `${54 + (Math.random() - 0.5) * 12}%`;
        this.dom.feedbackLayer.appendChild(pop);
        window.setTimeout(() => pop.remove(), 820);
    }

    format(value) {
        return Math.round(value).toLocaleString('en-US', {useGrouping: false});
    }
}
