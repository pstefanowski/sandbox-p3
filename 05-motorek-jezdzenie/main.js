class Example extends Phaser.Scene
{
    cursors;
    ship;

    preload ()
    {
        this.load.image('ship', '../assets/sprites/x2kship.png');
    }

    create ()
    {
        this.ship = this.matter.add.image(400, 300, 'ship');
        this.ship.setFrictionAir(0.005);
        this.ship.setMass(25);
        this.ship.setFixedRotation();

        this.cursors = this.input.keyboard.createCursorKeys();
        this.matter.world.setBounds(0, 0, 1200, 900);
    }

    update ()
    {
        if (this.cursors.left.isDown)
        {
            this.ship.setAngularVelocity(-0.008);
        }
        else if (this.cursors.right.isDown)
        {
            this.ship.setAngularVelocity(0.008);
        }
        else
        {
            this.ship.setAngularVelocity(0);
        }

        // Przyspieszanie statku w kierunku, w którym jest zwrócony
        if (this.cursors.up.isDown)
        {
            const angle = this.ship.rotation; // Pobierz aktualny kąt obrotu statku
            const forceX = Math.cos(angle) * 0.001; // Oblicz składową X wektora ruchu
            const forceY = Math.sin(angle) * 0.001; // Oblicz składową Y wektora ruchu
            const velocity = this.ship.body.velocity; // Pobierz aktualną prędkość
            console.log(`velocity.x: ${Math.abs(velocity.x)}, velocity.y: ${Math.abs(velocity.y)}`); // Debug
            const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y); // Oblicz prędkość

            if (speed < 2) {
                this.ship.applyForce({ x: forceX, y: forceY }); // Zastosuj siłę w kierunku obrotu
            }
            
        }
        // Aktualizacja prędkości w kierunku obrotu
        const velocity = this.ship.body.velocity; // Pobierz aktualną prędkość
        const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y); // Oblicz prędkość
        if (speed > 0) {
            const angle = this.ship.rotation; // Pobierz aktualny kąt obrotu statku
            const directionX = Math.cos(angle); // Kierunek X na podstawie obrotu
            const directionY = Math.sin(angle); // Kierunek Y na podstawie obrotu
            const alignedVelocityX = directionX * speed; // Dopasuj prędkość do kierunku
            const alignedVelocityY = directionY * speed; // Dopasuj prędkość do kierunku
            this.ship.setVelocity(alignedVelocityX, alignedVelocityY); // Ustaw nową prędkość
        }
    }

    get_speed(object)
    {
        const velocity = this.ship.body.velocity; // Pobierz aktualną prędkość
        const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y); // Oblicz prędkość
        return speed;
    }
}

const config = {
    type: Phaser.WEBGL,
    width: 1200,
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
