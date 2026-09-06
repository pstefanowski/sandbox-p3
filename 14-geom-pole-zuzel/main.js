import { BikePhysics, ENGINE_PROFILES } from './physicsConfig.js';

class UIScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UIScene', active: true });
        this.speedText = null;
        this.engineText = null;
    }

    create() {
        this.speedText = this.add.text(10, 10, 'Speed: 0.00', { fontSize: '16px', fill: '#ffffff' });
        this.engineText = this.add.text(10, 32, 'Silnik: -', { fontSize: '14px', fill: '#00ffff' });
        this.add.text(10, 52, 'Zmień silnik: [1] Jawa  [2] GM / GSM  [3] Standard', { fontSize: '12px', fill: '#aaaaaa' });

        // Nasłuchuj na zdarzenie wysyłane ze sceny gry
        const gameScene = this.scene.get('Example');
        gameScene.events.on('updateSpeed', (speed) => {
            this.speedText.setText('Speed: ' + speed.toFixed(2));
        });

        gameScene.events.on('engineChanged', (engine) => {
            this.engineText.setText(`Silnik: ${engine.name} (Vmax: ${engine.maxSpeed}, Acc: ${engine.acceleration}, Skręt: ${engine.turnSpeed})`);
        });

        if (gameScene.physics) {
            const engine = gameScene.physics.currentEngine;
            this.engineText.setText(`Silnik: ${engine.name} (Vmax: ${engine.maxSpeed}, Acc: ${engine.acceleration}, Skręt: ${engine.turnSpeed})`);
        }
    }
}

class Example extends Phaser.Scene {
    constructor() {
        super({ key: 'Example' });
    }
    trackGraphics;
    playerGraphics;
    cursors;
    leftArcCenterX;
    rightArcCenterX;
    trackCenterY;
    outerRadius;
    innerRadius;
    speed;
    angle;
    player;
    spaceKey;
    physics;

    create() {
        // Inicjalizacja fizyki i silnika (np. 'JAWA', 'GM' lub 'DEFAULT')
        this.physics = new BikePhysics('JAWA');

        // Grafika dla statycznego toru
        this.trackGraphics = this.add.graphics({
            lineStyle: { width: 2, color: 0x00ffff },
            fillStyle: { color: 0xff0000 }
        });

        const trackWidth = 1000; // Całkowita szerokość toru
        const trackHeight = 450; // Całkowita wysokość toru
        const laneWidth = 150; // Szerokość pasa toru
        const centerX = this.sys.game.config.width / 2;
        this.trackCenterY = this.sys.game.config.height / 2;

        // Długość prostej części toru. Wynika z odjęcia od całkowitej szerokości
        // podwójnego promienia łuków (który jest równy wysokości toru).
        const straightLength = trackWidth - trackHeight;

        // Współrzędne X środków lewego i prawego łuku.
        this.leftArcCenterX = centerX - straightLength / 2;
        this.rightArcCenterX = centerX + straightLength / 2;

        // --- Rysowanie zewnętrznej krawędzi ---
        this.outerRadius = trackHeight / 2;

        // Zamiast rysować każdy element osobno, tworzymy kompletną ścieżkę i ją rysujemy.
        // Jest to bardziej kompatybilne i tworzy spójną figurę.
        this.trackGraphics.beginPath();
        this.trackGraphics.moveTo(this.rightArcCenterX, this.trackCenterY - this.outerRadius); // Zaczynamy w prawym górnym rogu toru
        this.trackGraphics.arc(this.rightArcCenterX, this.trackCenterY, this.outerRadius, Phaser.Math.DegToRad(-90), Phaser.Math.DegToRad(90), false); // Prawy łuk
        this.trackGraphics.lineTo(this.leftArcCenterX, this.trackCenterY + this.outerRadius); // Dolna prosta
        this.trackGraphics.arc(this.leftArcCenterX, this.trackCenterY, this.outerRadius, Phaser.Math.DegToRad(90), Phaser.Math.DegToRad(270), false); // Lewy łuk
        this.trackGraphics.closePath(); // Łączy z punktem startowym, tworząc górną prostą
        this.trackGraphics.strokePath();

        // --- Rysowanie wewnętrznej krawędzi ---
        this.innerRadius = this.outerRadius - laneWidth;

        this.trackGraphics.beginPath();
        this.trackGraphics.arc(this.rightArcCenterX, this.trackCenterY, this.innerRadius, Phaser.Math.DegToRad(-90), Phaser.Math.DegToRad(90), false);
        this.trackGraphics.arc(this.leftArcCenterX, this.trackCenterY, this.innerRadius, Phaser.Math.DegToRad(90), Phaser.Math.DegToRad(270), false);
        this.trackGraphics.closePath();
        this.trackGraphics.strokePath();

        // --- Inicjalizacja obiektu gracza (prostokąt) ---
        this.player = this.add.rectangle(500, 600, 8, 2, 0xff0000); // x, y, szerokość, wysokość, kolor
        this.speed = 0;
        this.angle = 0; // Kąt początkowy (skierowany w prawo)

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

        // Sprawdzenie, czy punkt jest wewnątrz zewnętrznej granicy toru
        let isInsideOuter = false;
        if (py >= this.trackCenterY - this.outerRadius && py <= this.trackCenterY + this.outerRadius) {
            if (px >= this.leftArcCenterX && px <= this.rightArcCenterX) {
                isInsideOuter = true; // Wewnątrz prostokątnej części
            } else if (px < this.leftArcCenterX) {
                isInsideOuter = Phaser.Math.Distance.Between(px, py, this.leftArcCenterX, this.trackCenterY) <= this.outerRadius;
            } else { // px > this.rightArcCenterX
                isInsideOuter = Phaser.Math.Distance.Between(px, py, this.rightArcCenterX, this.trackCenterY) <= this.outerRadius;
            }
        }

        // Sprawdzenie, czy punkt jest wewnątrz wewnętrznej granicy (na "trawie")
        let isInsideInner = false;
        if (py >= this.trackCenterY - this.innerRadius && py <= this.trackCenterY + this.innerRadius) {
            if (px >= this.leftArcCenterX && px <= this.rightArcCenterX) {
                isInsideInner = true; // Wewnątrz prostokątnej części
            } else if (px < this.leftArcCenterX) {
                isInsideInner = Phaser.Math.Distance.Between(px, py, this.leftArcCenterX, this.trackCenterY) <= this.innerRadius;
            } else { // px > this.rightArcCenterX
                isInsideInner = Phaser.Math.Distance.Between(px, py, this.rightArcCenterX, this.trackCenterY) <= this.innerRadius;
            }
        }

        const onTrack = isInsideOuter && !isInsideInner;

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
    width: 1200,
    height: 1000,
    parent: 'game-container',
    scene: [Example, UIScene]
};

const game = new Phaser.Game(config);
