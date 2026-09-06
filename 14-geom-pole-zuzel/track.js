/**
 * Komponent toru żużlowego (Track).
 * Odpowiada za parametryzację geometrii, renderowanie toru oraz detekcję stref (tor, murawa wewnątrz, banda).
 */

export const TRACK_ZONES = {
    TRACK: 'TRACK',     // Nawierzchnia toru
    INFIELD: 'INFIELD', // Wnętrze toru (murawa / trawa)
    WALL: 'WALL'        // Zewnętrzna banda
};

export const TRACK_PRESETS = {
    STANDARD: {
        id: 'STANDARD',
        name: 'Klasyczny Owal',
        trackWidth: 1000,
        trackHeight: 450,
        laneWidth: 150,
        lineColor: 0x00ffff,
        lineWidth: 2,
        startPosition: { offsetX: -100, laneRatio: 0.5, angle: 0 }
    },
    SHORT_TRACK: {
        id: 'SHORT_TRACK',
        name: 'Krótki Owal Techniczny',
        trackWidth: 800,
        trackHeight: 400,
        laneWidth: 130,
        lineColor: 0xffaa00,
        lineWidth: 2,
        startPosition: { offsetX: -80, laneRatio: 0.5, angle: 0 }
    },
    LONG_TRACK: {
        id: 'LONG_TRACK',
        name: 'Długi Tor Szybki',
        trackWidth: 1150,
        trackHeight: 480,
        laneWidth: 160,
        lineColor: 0x00ff88,
        lineWidth: 2,
        startPosition: { offsetX: -120, laneRatio: 0.5, angle: 0 }
    }
};

export class Track {
    /**
     * @param {Phaser.Scene} scene - Scena Phaser, do której należy tor
     * @param {Object|string} [config='STANDARD'] - Konfiguracja toru lub klucz presetu
     */
    constructor(scene, config = 'STANDARD') {
        this.scene = scene;
        this.graphics = null;

        // Pobranie konfiguracji bazowej z presetu lub obiektu
        let baseConfig = TRACK_PRESETS.STANDARD;
        if (typeof config === 'string') {
            baseConfig = TRACK_PRESETS[config.toUpperCase()] || TRACK_PRESETS.STANDARD;
            this.config = { ...baseConfig };
        } else if (typeof config === 'object' && config !== null) {
            const preset = config.preset && TRACK_PRESETS[config.preset.toUpperCase()]
                ? TRACK_PRESETS[config.preset.toUpperCase()]
                : TRACK_PRESETS.STANDARD;
            this.config = { ...preset, ...config };
        } else {
            this.config = { ...baseConfig };
        }

        // Współrzędne środka ekranu / toru
        const defaultCenterX = scene.sys?.game?.config?.width ? scene.sys.game.config.width / 2 : 600;
        const defaultCenterY = scene.sys?.game?.config?.height ? scene.sys.game.config.height / 2 : 500;

        this.centerX = this.config.centerX ?? defaultCenterX;
        this.trackCenterY = this.config.centerY ?? defaultCenterY;
        this.trackWidth = this.config.trackWidth ?? 1000;
        this.trackHeight = this.config.trackHeight ?? 450;
        this.laneWidth = this.config.laneWidth ?? 150;
        this.id = this.config.id || 'CUSTOM';
        this.name = this.config.name || this.id;
        this.lineColor = this.config.lineColor ?? 0x00ffff;
        this.lineWidth = this.config.lineWidth ?? 2;

        this.computeGeometry();
    }

    /**
     * Przelicza geometrię toru na podstawie wymiarów
     */
    computeGeometry() {
        // Długość prostej (odjęcie od szerokości podwójnego promienia łuków = wysokości toru)
        this.straightLength = Math.max(0, this.trackWidth - this.trackHeight);

        // Środki lewego i prawego łuku
        this.leftArcCenterX = this.centerX - this.straightLength / 2;
        this.rightArcCenterX = this.centerX + this.straightLength / 2;

        // Promienie krawędzi
        this.outerRadius = this.trackHeight / 2;
        this.innerRadius = Math.max(10, this.outerRadius - this.laneWidth);
    }

    /**
     * Rysuje tor w scenie Phaser
     */
    draw() {
        if (!this.graphics) {
            this.graphics = this.scene.add.graphics();
        } else {
            this.graphics.clear();
        }

        this.graphics.lineStyle(this.lineWidth, this.lineColor);

        // --- Rysowanie zewnętrznej krawędzi toru ---
        this.graphics.beginPath();
        this.graphics.moveTo(this.rightArcCenterX, this.trackCenterY - this.outerRadius);
        this.graphics.arc(
            this.rightArcCenterX,
            this.trackCenterY,
            this.outerRadius,
            Phaser.Math.DegToRad(-90),
            Phaser.Math.DegToRad(90),
            false
        );
        this.graphics.lineTo(this.leftArcCenterX, this.trackCenterY + this.outerRadius);
        this.graphics.arc(
            this.leftArcCenterX,
            this.trackCenterY,
            this.outerRadius,
            Phaser.Math.DegToRad(90),
            Phaser.Math.DegToRad(270),
            false
        );
        this.graphics.closePath();
        this.graphics.strokePath();

        // --- Rysowanie wewnętrznej krawędzi toru ---
        this.graphics.beginPath();
        this.graphics.arc(
            this.rightArcCenterX,
            this.trackCenterY,
            this.innerRadius,
            Phaser.Math.DegToRad(-90),
            Phaser.Math.DegToRad(90),
            false
        );
        this.graphics.arc(
            this.leftArcCenterX,
            this.trackCenterY,
            this.innerRadius,
            Phaser.Math.DegToRad(90),
            Phaser.Math.DegToRad(270),
            false
        );
        this.graphics.closePath();
        this.graphics.strokePath();

        return this;
    }

    /**
     * Sprawdza, w jakiej strefie toru znajduje się dany punkt (px, py)
     * @param {number} px - współrzędna X
     * @param {number} py - współrzędna Y
     * @returns {{ onTrack: boolean, isInsideInner: boolean, isOutside: boolean, zone: string }}
     */
    checkPosition(px, py) {
        // Sprawdzenie zewnętrznej granicy toru
        let isInsideOuter = false;
        if (py >= this.trackCenterY - this.outerRadius && py <= this.trackCenterY + this.outerRadius) {
            if (px >= this.leftArcCenterX && px <= this.rightArcCenterX) {
                isInsideOuter = true; // Wewnątrz prostej
            } else if (px < this.leftArcCenterX) {
                isInsideOuter = Phaser.Math.Distance.Between(px, py, this.leftArcCenterX, this.trackCenterY) <= this.outerRadius;
            } else {
                isInsideOuter = Phaser.Math.Distance.Between(px, py, this.rightArcCenterX, this.trackCenterY) <= this.outerRadius;
            }
        }

        // Sprawdzenie wewnętrznej granicy (murawa / infield)
        let isInsideInner = false;
        if (py >= this.trackCenterY - this.innerRadius && py <= this.trackCenterY + this.innerRadius) {
            if (px >= this.leftArcCenterX && px <= this.rightArcCenterX) {
                isInsideInner = true; // Wewnątrz prostej
            } else if (px < this.leftArcCenterX) {
                isInsideInner = Phaser.Math.Distance.Between(px, py, this.leftArcCenterX, this.trackCenterY) <= this.innerRadius;
            } else {
                isInsideInner = Phaser.Math.Distance.Between(px, py, this.rightArcCenterX, this.trackCenterY) <= this.innerRadius;
            }
        }

        const onTrack = isInsideOuter && !isInsideInner;
        const zone = onTrack ? TRACK_ZONES.TRACK : (isInsideInner ? TRACK_ZONES.INFIELD : TRACK_ZONES.WALL);

        return {
            onTrack,
            isInsideInner,
            isOutside: !isInsideOuter,
            zone
        };
    }

    /**
     * Zwraca pozycję startową dla motocykla na tym torze.
     * Wyliczana dynamicznie względem środka toru i szerokości torowiska na dolnej prostej.
     * @returns {{ x: number, y: number, angle: number }}
     */
    getStartPosition() {
        const custom = this.config.startPosition || {};

        // Jeśli podano jawne, sztywne współrzędne x i y
        if (custom.x !== undefined && custom.y !== undefined) {
            return {
                x: custom.x,
                y: custom.y,
                angle: custom.angle ?? 0
            };
        }

        const laneRatio = custom.laneRatio ?? 0.5; // 0.5 = idealny środek torowiska
        const offsetX = custom.offsetX ?? -100;    // Domyślnie lekko przed środkiem prostej
        const angle = custom.angle ?? 0;

        // Środek pasa na dolnej prostej:
        const startY = this.trackCenterY + this.innerRadius + (this.laneWidth * laneRatio);
        const startX = this.centerX + offsetX;

        return {
            x: startX,
            y: startY,
            angle
        };
    }

    /**
     * Zwalnia zasoby graficzne
     */
    destroy() {
        if (this.graphics) {
            this.graphics.destroy();
            this.graphics = null;
        }
    }
}
