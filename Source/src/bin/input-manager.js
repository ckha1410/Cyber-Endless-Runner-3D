import EventEmitter from './utils/event-emitter';

export default class InputManager extends EventEmitter {
    constructor() {
        super();

        this.touchStart = null;
        this.keysDown = {};

        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);

        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);
        window.addEventListener('touchstart', this.handleTouchStart, {passive: true});
        window.addEventListener('touchend', this.handleTouchEnd, {passive: true});

        this.bindButton('touch-left', 'moveLeft');
        this.bindButton('touch-right', 'moveRight');
        this.bindButton('touch-jump', 'jump');
    }

    handleKeyDown(event) {
        if (this.isTyping(event.target)) return;

        const code = event.code;
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(code)) {
            event.preventDefault();
        }

        if (this.keysDown[code] && !['KeyC', 'BracketLeft', 'BracketRight', 'Tab'].includes(code)) {
            return;
        }

        this.keysDown[code] = true;

        switch (code) {
            case 'ArrowLeft':
            case 'KeyA':
                this.emit('moveLeft');
                break;
            case 'ArrowRight':
            case 'KeyD':
                this.emit('moveRight');
                break;
            case 'ArrowUp':
            case 'KeyW':
                this.emit('jump');
                break;
            case 'Space':
                this.emit('jump');
                break;
            case 'Enter':
                this.emit('start');
                break;
            case 'KeyP':
            case 'Escape':
                this.emit('pause');
                break;
            case 'KeyG':
                this.emit('gallery');
                break;
            case 'KeyH':
                this.emit('home');
                break;
            case 'KeyC':
                this.emit('cameraPreset');
                break;
            case 'KeyM':
                this.emit('toggleMarble');
                break;
            case 'BracketLeft':
                this.emit('selectPrevious');
                break;
            case 'BracketRight':
            case 'Tab':
                event.preventDefault();
                this.emit('selectNext');
                break;
        }
    }

    handleKeyUp(event) {
        this.keysDown[event.code] = false;
    }

    handleTouchStart(event) {
        const touch = event.changedTouches[0];
        this.touchStart = {
            x: touch.clientX,
            y: touch.clientY,
            time: performance.now()
        };
    }

    handleTouchEnd(event) {
        if (!this.touchStart) return;

        const touch = event.changedTouches[0];
        const dx = touch.clientX - this.touchStart.x;
        const dy = touch.clientY - this.touchStart.y;
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);

        if (Math.max(absX, absY) < 28) {
            this.emit('jump');
        } else if (absX > absY) {
            this.emit(dx > 0 ? 'moveRight' : 'moveLeft');
        } else if (dy < 0) {
            this.emit('jump');
        }

        this.touchStart = null;
    }

    isTyping(target) {
        if (!target) return false;
        return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
    }

    bindButton(id, eventName) {
        const button = document.getElementById(id);
        if (!button) return;
        button.addEventListener('click', () => this.emit(eventName));
    }

    destroy() {
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
        window.removeEventListener('touchstart', this.handleTouchStart);
        window.removeEventListener('touchend', this.handleTouchEnd);
    }
}
