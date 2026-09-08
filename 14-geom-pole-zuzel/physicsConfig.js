/**
 * Konfiguracja fizyki i profili silników dla gry żużlowej.
 * Pozwala na łatwą zmianę parametrów fizycznych (przyspieszenie, prędkość maksymalna, skręt, tarcie).
 */

export const ENGINE_PROFILES = {
    DEFAULT: {
        id: 'DEFAULT',
        name: 'Standard',
        acceleration: 0.18,
        turnSpeed: 0.01,
        maxSpeed: 3.0,
        friction: 0.005, // Łagodne toczenie się po puszczeniu gazu
        offTrackFriction: 0.3,
        offTrackSpeedMultiplier: 0.95,
        description: 'Domyślne, zbalansowane parametry testowe'
    },
    JAWA: {
        id: 'JAWA',
        name: 'Jawa 500',
        acceleration: 0.01,
        turnSpeed: 0.01,
        maxSpeed: 3.5,
        friction: 0.004, // Bardzo płynne wytracanie prędkości
        offTrackFriction: 0.28,
        offTrackSpeedMultiplier: 0.95,
        description: 'Klasyczny czeski silnik: stabilny, bardzo dobra kontrola na łukach'
    },
    GM: {
        id: 'GM',
        name: 'GM (Marzotto)',
        acceleration: 0.025,
        turnSpeed: 0.01,
        maxSpeed: 3.8,
        friction: 0.005, // Płynne wytracanie prędkości
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
     * Oblicza nieliniowy przyrost prędkości w bieżącej klatce (Opcja 1: Krzywa potęgowa).
     * Przy małych prędkościach przyspieszenie jest znacznie większe (potężny start / odejście z łuku),
     * a w miarę zbliżania się do Vmax przyrost prędkości stopniowo maleje.
     * 
     * @param {number} currentSpeed - Aktualna prędkość motocykla
     * @param {number} effectiveMaxSpeed - Maksymalna prędkość (z uwzględnieniem gripu)
     * @param {number} [gripMultiplier=1.0] - Mnożnik przyczepności nawierzchni
     * @returns {number} Przyrost prędkości w bieżącej klatce
     */
    getAccelerationStep(currentSpeed, effectiveMaxSpeed, gripMultiplier = 1.0) {
        if (effectiveMaxSpeed <= 0) return 0;

        // Stosunek aktualnej prędkości do maksymalnej [0.0 - 1.0]
        const speedRatio = Math.max(0, Math.min(1, currentSpeed / effectiveMaxSpeed));

        // Krzywa potęgowa:
        // Przy speed = 0 -> ratio = 0 -> factor = 1.0 (maksymalny zryw)
        // Przy speed = Vmax -> ratio = 1 -> factor = 0.0
        const factor = Math.pow(1 - speedRatio, 3.5);

        // Mnożnik dynamiki:
        // Start (factor = 1.0) -> 2.0x bazowego przyspieszenia
        // 50% prędkości -> ok. 1.2x
        // 90% prędkości -> ok. 0.44x
        // Końcówka (99%) -> ok. 0.20x
        const dynamicMultiplier = 0.03 + 1.85 * factor;

        return this.acceleration * dynamicMultiplier * gripMultiplier;
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
