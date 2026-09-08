/**
 * Konfiguracja fizyki i profili silników dla gry żużlowej.
 * Pozwala na łatwą zmianę parametrów fizycznych (przyspieszenie, prędkość maksymalna, skręt, tarcie).
 */

export const ENGINE_PROFILES = {
    DEFAULT: {
        id: 'DEFAULT',
        name: 'Standard',
        acceleration: 0.02,
        turnSpeed: 0.015,
        maxSpeed: 4.0,
        friction: 0.02,
        offTrackFriction: 0.3,
        offTrackSpeedMultiplier: 0.95,
        description: 'Domyślne, zbalansowane parametry testowe'
    },
    JAWA: {
        id: 'JAWA',
        name: 'Jawa 500',
        acceleration: 0.022,
        turnSpeed: 0.018, // Bardziej zwrotna na łukach
        maxSpeed: 4.3,
        friction: 0.02,
        offTrackFriction: 0.28,
        offTrackSpeedMultiplier: 0.95,
        description: 'Klasyczny czeski silnik: stabilny, bardzo dobra kontrola na łukach'
    },
    GM: {
        id: 'GM',
        name: 'GM (Marzotto)',
        acceleration: 0.032, // Bardzo dynamiczne przyspieszenie
        turnSpeed: 0.014, // Trudniejszy w opanowaniu na łuku
        maxSpeed: 4.5,
        friction: 0.02,
        offTrackFriction: 0.32,
        offTrackSpeedMultiplier: 0.94,
        description: 'Wyczynowy silnik: potężna prędkość i przyspieszenie na prostych'
    }
};

// Alias GSM -> GM dla wygody (częsta potoczna nazwa / literówka dla silników GM)
ENGINE_PROFILES.GSM = {
    ...ENGINE_PROFILES.GM,
    id: 'GSM',
    name: 'GSM (GM)'
};

/**
 * Komponent zarządzający aktualnymi parametrami fizyki motocykla.
 */
export class BikePhysics {
    /**
     * @param {string|Object} initialEngine - Klucz profilu (np. 'JAWA', 'GM', 'GSM') lub obiekt parametrów
     */
    constructor(initialEngine = 'JAWA') {
        this.currentEngine = null;
        this.setEngine(initialEngine);
    }

    /**
     * Zmienia aktualny profil silnika.
     * @param {string|Object} engine - Klucz profilu lub własny obiekt parametrów
     */
    setEngine(engine) {
        if (typeof engine === 'string') {
            const key = engine.toUpperCase();
            if (ENGINE_PROFILES[key]) {
                this.currentEngine = { ...ENGINE_PROFILES[key] };
            } else {
                console.warn(`Profil silnika "${engine}" nie istnieje. Użyto domyślnego.`);
                this.currentEngine = { ...ENGINE_PROFILES.DEFAULT };
            }
        } else if (typeof engine === 'object' && engine !== null) {
            this.currentEngine = { ...ENGINE_PROFILES.DEFAULT, ...engine };
        } else {
            this.currentEngine = { ...ENGINE_PROFILES.DEFAULT };
        }
    }

    // Gettery dla wygody i czystości kodu fizyki
    get acceleration() {
        return this.currentEngine.acceleration;
    }

    get turnSpeed() {
        return this.currentEngine.turnSpeed;
    }

    get maxSpeed() {
        return this.currentEngine.maxSpeed;
    }

    get friction() {
        return this.currentEngine.friction;
    }

    get offTrackFriction() {
        return this.currentEngine.offTrackFriction;
    }

    get offTrackSpeedMultiplier() {
        return this.currentEngine.offTrackSpeedMultiplier;
    }

    get engineName() {
        return this.currentEngine.name || this.currentEngine.id;
    }

    /**
     * Zwraca listę dostępnych profili do wyboru np. dla menu/UI
     */
    static getAvailableEngines() {
        return [
            ENGINE_PROFILES.JAWA,
            ENGINE_PROFILES.GM,
            ENGINE_PROFILES.DEFAULT
        ];
    }
}
