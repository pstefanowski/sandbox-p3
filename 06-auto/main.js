class Example extends Phaser.Scene
{
    preload ()
    {
        this.load.image('car', '../assets/sprites/x2kship.png');
    }
    create ()
    {
        // Dodanie samochodu do sceny
        this.car = this.matter.add.image(400, 300, 'car');
        this.car.setFrictionAir(0.05); // Tarcie powietrza dla płynnego ruchu
        this.car.setMass(10); // Masa samochodu
        this.car.setFixedRotation(); // Wyłącz automatyczne obracanie przez fizykę

        // Tworzenie klawiszy sterowania
        this.cursors = this.input.keyboard.createCursorKeys();
    }

    update ()
    {
        const maxSpeed = 5; // Maksymalna prędkość samochodu
        const acceleration = 0.02; // Przyspieszenie
        const reverseAcceleration = 0.5; // Przyspieszenie wsteczne
        const turnSpeed = 0.025; // Prędkość skręcania
        const brakeForce = 0.01; // Siła hamowania
        const stopRotate = 0.9;

        // Aktualna prędkość samochodu - SPEED
        const velocity = this.car.body.velocity;
        const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);

        // Przyspieszanie - UP
        if (this.cursors.up.isDown)
        {
            const angle = this.car.rotation; // Pobierz aktualny kąt obrotu samochodu
            const forceX = Math.cos(angle) * acceleration; // Oblicz składową X siły
            const forceY = Math.sin(angle) * acceleration; // Oblicz składową Y siły

            if (speed < maxSpeed) {
                this.car.applyForce({ x: forceX, y: forceY }); // Zastosuj siłę w kierunku obrotu
            }
        }

        // Hamowanie i cofanie - DOWN
        if (this.cursors.down.isDown)
            {
                if (speed > 0.1) {
                    // Hamowanie, jeśli samochód się porusza
                    const brakeX = -velocity.x * brakeForce; // Zmniejsz prędkość w osi X
                    const brakeY = -velocity.y * brakeForce; // Zmniejsz prędkość w osi Y
                    console.log(`brakeX: ${brakeX}, brakeY: ${brakeY}`);
                    this.car.applyForce({ x: brakeX, y: brakeY }); // Zastosuj siłę hamowania
                } else {
                    // Cofanie, jeśli samochód się zatrzymał
                    const angle = this.car.rotation; // Pobierz aktualny kąt obrotu samochodu
                    const reverseX = Math.cos(angle) * -reverseAcceleration; // Oblicz składową X siły wstecznej
                    const reverseY = Math.sin(angle) * -reverseAcceleration; // Oblicz składową Y siły wstecznej
                    console.log(`reverseX: ${reverseX}, reverseY: ${reverseY}`);
                    this.car.setVelocity(reverseX, reverseY); // Ustaw prędkość wsteczną
                }
            }

        // Skręcanie - LEFT, RIGHT
        if (this.cursors.left.isDown)
        {
            this.car.setAngularVelocity(-turnSpeed); // Obrót w lewo
        }
        else if (this.cursors.right.isDown)
        {
            this.car.setAngularVelocity(turnSpeed); // Obrót w prawo
        }
        else
        {
            // Stopniowe zmniejszanie prędkości obrotowej, aby samochód przestał się obracać
            this.car.setAngularVelocity(this.car.body.angularVelocity * stopRotate);
        }

        // Dopasowanie prędkości do kierunku obrotu, jeśli samochód się porusza
        if (!this.cursors.up.isDown && speed > 0)
        {
            const angle = this.car.rotation; // Pobierz aktualny kąt obrotu samochodu
            const alignedVelocityX = Math.cos(angle) * speed; // Dopasuj prędkość w osi X
            const alignedVelocityY = Math.sin(angle) * speed; // Dopasuj prędkość w osi Y
            this.car.setVelocity(alignedVelocityX, alignedVelocityY); // Ustaw nową prędkość zgodną z kierunkiem obrotu
        }
    }
}

const config = {
    type: Phaser.WEBGL,
    width: 1400,
    height: 900,
    parent: 'phaser-example',
    pixelArt: true,
    physics: {
        default: 'matter',
        matter: {
            gravity: {
                y: 0,
                x: 0
            },
            debug: true
        }
    },
    scene: Example
};

const game = new Phaser.Game(config);
