class Example extends Phaser.Scene
{
    preload ()
    {
        this.load.image('car', '../assets/sprites/x2kship.png'); // Załaduj obraz samochodu
    }

    create ()
    {
        
        // Dodanie samochodu do sceny
        this.maxSpeed = 250; // Maximum speed
        this.car = this.physics.add.sprite(400, 300, 'car');
        this.car.setDamping(true); // Włącz tłumienie prędkości
        this.car.setDrag(0.95); // Ustaw opór ruchu
        this.car.setMaxVelocity(this.maxSpeed); // Maksymalna prędkość

        // Tworzenie klawiszy sterowania
        this.cursors = this.input.keyboard.createCursorKeys();

        // Zmienna do śledzenia czasu wciśnięcia klawisza UP
        this.acceleration = 0; // Początkowe przyspieszenie


        // Variables for acceleration and speed
        this.acceleration = 0; // Initial acceleration
        this.maxAcceleration = 200; // Maximum acceleration
        this.deaccelerationRate = 1; // Rate of deceleration
        this.reverseAcceleration = 50; // Reverse acceleration
        this.turnSpeed = 150; // Turning speed
        

        // Dictionary for speed levels and acceleration rates
        this.accelerationLevels = {
            30: 0.6,
            40: 0.55,
            50: 0.5,
            60: 0.45,
            70: 0.43,
            80: 0.40,
            90: 0.38,
            100: 0.36,
            110: 0.34,
            120: 0.32,
            130: 0.30,
            140: 0.26,
            150: 0.22,
            160: 0.18,
            170: 0.12,
            180: 0.08,
            250: 0.05
        };
        this.multiplerAccelerationRate = 1.3;

        this.isAccelerating = false;


        //this.accelerationRate = 2; // Szybkość wzrostu przyspieszenia
        this.deaccelerationRate = 1; // Szybkość spadku przyspieszenia
        this.reverseAcceleration = 50;
        this.turnSpeed = 50; // Prędkość skręcania
        this.brakeForce = 10; // Siła hamowania
        this.maxSpeed = 250;

        this.speedText = this.add.text(10, 10, 'Speed: 0', { font: '20px Arial', fill: '#ffffff' });

        // Obsługa klawisza SPACE
        this.input.keyboard.on('keydown-SPACE', () => {
            //this.isAccelerating = !this.isAccelerating; // Przełącz stan przyspieszenia
            this.isAccelerating = true
        });

        this.input.keyboard.on('keyup-SPACE', () => {
            this.isAccelerating = false
        });
    }

    update ()
    {

        // Oblicz aktualną prędkość
        const speed = this.get_speed(this.car);

        // FORWARD - UP
        if (this.isAccelerating)
        {
            // Zwiększaj przyspieszenie, aż osiągnie maksymalną wartość
            if (this.acceleration < this.maxAcceleration) {
                this.acceleration += this.get_acceleration_rate(speed);
            }

            // Oblicz prędkość na podstawie aktualnego przyspieszenia
            this.physics.velocityFromRotation(this.car.rotation, this.acceleration, this.car.body.velocity);
        }
        else
        {
            // Stopniowo zmniejszaj przyspieszenie, gdy klawisz UP nie jest wciśnięty
            if (this.acceleration > 0) {
                this.acceleration -= this.deaccelerationRate;
                if (this.acceleration < 0) this.acceleration = 0; // Upewnij się, że przyspieszenie nie jest ujemne
            }

            // Aktualizuj prędkość zgodnie z aktualnym kątem obrotu
            this.physics.velocityFromRotation(this.car.rotation, this.acceleration, this.car.body.velocity);
        }

        // Hamowanie i cofanie - DOWN
        if (this.cursors.down.isDown)
        {
            if (speed > 0) {
                // Hamowanie, jeśli samochód się porusza
                const brakeX = -this.car.body.velocity.x * this.brakeForce / this.maxSpeed;
                const brakeY = -this.car.body.velocity.y * this.brakeForce / this.maxSpeed;
                this.car.setVelocity(this.car.body.velocity.x + brakeX, this.car.body.velocity.y + brakeY);
            } else {
                // Cofanie, jeśli samochód się zatrzymał
                const reverseX = Math.cos(this.car.rotation) * -this.reverseAcceleration;
                const reverseY = Math.sin(this.car.rotation) * -this.reverseAcceleration;
                this.car.setVelocity(reverseX, reverseY);
            }
        }

        // Hamowanie,cofanie - Down
        if (this.cursors.left.isDown)
        {
            this.car.setAngularVelocity(-this.turnSpeed);
        }
        else if (this.cursors.right.isDown)
        {
            this.car.setAngularVelocity(this.turnSpeed);
        }
        else
        {
            this.car.setAngularVelocity(0); // Zatrzymaj obrót, jeśli nie naciskasz klawiszy
        }

        this.speedText.setText(`Speed: ${speed.toFixed(2)}, accelerationRate: ${this.get_acceleration_rate()}, this.acceleration: ${this.acceleration.toFixed(2)}`);
    }

    get_speed(object)
    {
        const velocity = object.body.velocity; // Pobierz aktualną prędkość
        return Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y); // Oblicz prędkość
    }

    get_acceleration_rate()
    {
        //return this.baseAccelerationRateLevel1

        // if (this.get_speed(this.car) <= this.accelerationSpeedLevel1) {
        //     return this.accelerationRateLevel1
        // } else if
        const speed = this.get_speed(this.car)

        // Iterate through the dictionary to find the appropriate acceleration rate
        for (const [level, rate] of Object.entries(this.accelerationLevels)) {
            if (speed <= level) {
                return rate * this.multiplerAccelerationRate;
            }
        }

        return this.accelerationLevels[250];

        // Oblicz liniowe zmniejszenie accelerationRate
        // const rate = (this.accelerationRateLevel1 - 
        //     (this.get_speed(this.car) - this.accelerationSpeedLevel1) / 
        //     (this.maxSpeed - this.accelerationSpeedLevel1)) * (this.accelerationRateLevel1);

        // Upewnij się, że accelerationRate nie spada poniżej minimalnej wartości
        //return Math.max(rate, this.minAccelerationRate);
    }
}

const config = {
    type: Phaser.AUTO,
    width: 1400,
    height: 900,
    parent: 'phaser-example',
    pixelArt: true,
    physics: {
        default: 'arcade',
        arcade: {
            debug: true
        }
    },
    scene: Example
};

const game = new Phaser.Game(config);
