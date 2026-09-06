import { BikePhysics, ENGINE_PROFILES } from './physicsConfig.js';
import { Track, TRACK_PRESETS } from './track.js';

class UIScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UIScene', active: true });
        this.speedText = null;
        this.engineText = null;
    }

    create() {
        this.speedText = this.add.text(10, 10, 'Speed: 0.00', { fontSize: '16px', fill: '#ffffff' });
        this.engineText = this.add.text(10, 32, 'Silnik: -', { fontSize: '14px', fill: '#00ffff' });
        this.trackText = this.add.text(10, 72, 'Tor: -', { fontSize: '14px', fill: '#00ffff' });
        this.add.text(10, 52, 'Zmień silnik: [1] Jawa  [2] GM / GSM  [3] Standard', { fontSize: '12px', fill: '#aaaaaa' });

        // Nasłuchuj na zdarzenie wysyłane ze sceny gry
        const gameScene = this.scene.get('Example');
        gameScene.events.on('updateSpeed', (speed) => {
            this.speedText.setText('Speed: ' + speed.toFixed(2));
        });

        gameScene.events.on('engineChanged', (engine) => {
            this.engineText.setText(`Silnik: ${engine.name} (Vmax: ${engine.maxSpeed}, Acc: ${engine.acceleration}, Skręt: ${engine.turnSpeed})`);
        });

        gameScene.events.on('trackChanged', (track) => {
            this.trackText.setText(`Tor: ${track.name}`);
        });

        if (gameScene.physics) {
            const engine = gameScene.physics.currentEngine;
            this.engineText.setText(`Silnik: ${engine.name} (Vmax: ${engine.maxSpeed}, Acc: ${engine.acceleration}, Skręt: ${engine.turnSpeed})`);
        }

        if (gameScene.track) {
            this.trackText.setText(`Tor: ${gameScene.track.name}`);
        }
    }
}

class Example extends Phaser.Scene {
    constructor() {
        super({ key: 'Example' });
    }
    track;
    cursors;
    speed;
    angle;
    player;
    spaceKey;
    physics;

    create() {
        // Inicjalizacja fizyki i silnika (np. 'JAWA', 'GM' lub 'DEFAULT')
        this.physics = new BikePhysics('JAWA');

        // Inicjalizacja i narysowanie toru (np. 'STANDARD', 'SHORT_TRACK', 'LONG_TRACK' lub własny obiekt konfiguracji)
        this.track = new Track(this, 'LONG_TRACK');
        this.track.draw();
        this.events.emit('trackChanged', this.track);

        // --- Inicjalizacja obiektu gracza (prostokąt) ---
        const startPos = this.track.getStartPosition();
        this.player = this.add.rectangle(startPos.x, startPos.y, 8, 2, 0xff0000); // x, y, szerokość, wysokość, kolor
        this.speed = 0;
        this.angle = startPos.angle ?? 0; // Kąt początkowy (skierowany w prawo)

        // --- Inicjalizacja sterowania ---
        this.cursors = this.input.keyboard.createCursorKeys();
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        // Klawisze szybkiej zmiany silnika (1: Jawa, 2: GM/GSM, 3: Standard)
        this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE).on('down', () => this.setEngine('JAWA'));
        this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO).on('down', () => this.setEngine('GM'));
        this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE).on('down', () => this.setEngine('DEFAULT'));

        // --- Ustawienia kamery ---
        this.cameras.main.startFollow(this.player);
        this.cameras.main.setZoom(3);
        this.cameras.main.setBackgroundColor(0x333333); // Ustawia tło na ciemnoszary

        this.scene.launch('UIScene');
    }

    /**
     * Zmienia profil silnika i powiadamia sceny
     * @param {string} engineName 
     */
    setEngine(engineName) {
        this.physics.setEngine(engineName);
        this.events.emit('engineChanged', this.physics.currentEngine);
    }

    /**
     * Zmienia konfigurację toru i powiadamia sceny
     * @param {string|Object} trackConfig 
     */
    setTrack(trackConfig) {
        if (this.track) {
            this.track.destroy();
        }
        this.track = new Track(this, trackConfig);
        this.track.draw();
        this.events.emit('trackChanged', this.track);
    }

    update() {
        // --- Parametry fizyki pobrane z aktywnego profilu silnika ---
        const {
            acceleration,
            turnSpeed,
            maxSpeed,
            friction: baseFriction,
            offTrackFriction,
            offTrackSpeedMultiplier
        } = this.physics;

        let friction = baseFriction;
        const px = this.player.x;
        const py = this.player.y;

        // Sprawdzenie pozycji gracza w strefach toru
        const { onTrack, isInsideInner } = this.track.checkPosition(px, py);

        if (onTrack) {
            this.player.fillColor = 0xFF0000; // Czerwony
            friction = baseFriction; // Normalne tarcie na torze
        } else if (isInsideInner) {
            // na trawie
            this.player.fillColor = 0x00FF00; // Zielony
            friction = offTrackFriction; // Zwiększone tarcie na trawie
            this.speed *= offTrackSpeedMultiplier;
        } else {
            // banda
            this.player.fillColor = 0x994db3; // Fioletowy
            friction = offTrackFriction; // Bardzo duże tarcie na bandzie
            this.speed *= offTrackSpeedMultiplier;
        }

        // --- Sterowanie (zmiana kąta) ---
        if (this.cursors.left.isDown) {
            this.angle -= turnSpeed;
        } else if (this.cursors.right.isDown) {
            this.angle += turnSpeed;
        }

        // --- Przyspieszanie i zwalnianie ---
        if (this.spaceKey.isDown) {
            this.speed += acceleration;
            if (this.speed > maxSpeed) this.speed = maxSpeed;
        } else {
            if (this.speed > 0) this.speed -= friction;
            if (this.speed < 0) this.speed = 0;
        }

        // --- Aktualizacja pozycji na podstawie prędkości i kąta ---
        this.player.x += this.speed * Math.cos(this.angle);
        this.player.y += this.speed * Math.sin(this.angle);
        // Aktualizacja rotacji wizualnej obiektu gracza
        this.player.rotation = this.angle;

        // Wyślij zdarzenie z aktualną prędkością do sceny UI
        this.events.emit('updateSpeed', this.speed);
    }
}

const config = {
    type: Phaser.AUTO,
    width: 1600,
    height: 1200,
    parent: 'game-container',
    scene: [Example, UIScene]
};

const game = new Phaser.Game(config);
