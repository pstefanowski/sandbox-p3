class Example extends Phaser.Scene
{
    constructor() {
        super({ key: 'Example' });
        this.player = null;
        this.cursors = null;
        this.platform = null;
        this.platform2 = null;
        this.platform3 = null;
        this.isFlying = true;
        this.isFalling = true;
        this.flightTimer = 0;
        //this.maxFlightTime = 100; // Czas w milisekundach (np. 100ms = 0.1s latania)
        this.flightPower = 0.02; // Siła ciągu w górę
        this.frictionAir = 0.1; // Opór powietrza, aby gracz nie leciał w nieskończoność
        this.density = 0.01; // Gęstość, wpływa na masę
        this.sideMovePower = 0.015;
        this.currentVerticalVelocity;
        this.worldBottom = null;
        this.fallTime = 0;

    }

    preload ()
    {
        // Ładowanie grafiki, jeśli masz (tutaj używamy prostych kształtów)
        // this.load.image('player', 'assets/player.png');
        // this.load.image('platform', 'assets/platform.png');
    }
    create ()
    {
        this.matter.world.setBounds(0, 0, this.game.config.width, this.game.config.height);
        this.worldBottom = this.matter.world.walls.bottom;

        this.player = this.matter.add.rectangle(100, 300, 32, 32, {
            frictionAir: this.frictionAir, // Opór powietrza, aby nie leciał w nieskończoność
            density: this.density // Gęstość, wpływa na masę
        });

        const playerGraphic = this.add.rectangle(100, 300, 32, 32, 0xff0000).setOrigin(0.5, 0.5);
        this.player.gameObject = playerGraphic;
        playerGraphic.body = this.player;

        this.platform = this.matter.add.rectangle(400, 500, 200, 32, {
            isStatic: true,
            render: {
                fillStyle: 0x00ff00
            }
        });

        const platformGraphic = this.add.rectangle(400, 500, 200, 32, 0x00ff00).setOrigin(0.5, 0.5);
        this.platform.gameObject = platformGraphic;
        platformGraphic.body = this.platform;

        this.cursors = this.input.keyboard.createCursorKeys();


        this.matter.world.on('collisionstart', (event) => {
            event.pairs.forEach(pair => {
                const { bodyA, bodyB } = pair;
                // Sprawdź czy gracz dotyka dolnej ściany świata
                if (
                    (bodyA === this.player && bodyB === this.worldBottom) || 
                    (bodyB === this.player && bodyA === this.worldBottom)) {
                    this.isFlying = false;
                    this.isFalling = false;
                }

                if (
                    (bodyA === this.player && bodyB === this.platform) || 
                    (bodyB === this.player && bodyA === this.platform)) {
                    this.isFlying = false;
                    this.isFalling = false;
                }
            });
        });
        
    }

    update ()
    {
        if (this.player && this.player.gameObject) {
            this.player.gameObject.setPosition(this.player.position.x, this.player.position.y);
            this.player.gameObject.setRotation(this.player.angle);
        }
        
        if (this.platform && this.platform.gameObject) {
            this.platform.gameObject.setPosition(this.platform.position.x, this.platform.position.y);
            this.platform.gameObject.setRotation(this.platform.angle);
        }

        if (this.cursors.space.isDown || this.cursors.up.isDown) {
            this.matter.body.applyForce(this.player, 
                { 
                    x: this.player.position.x, 
                    y: this.player.position.y 
                },
                { 
                    x: 0, 
                    y: -this.flightPower 
                }
            );
            this.isFlying = true;
        }
        
        if (this.cursors.left.isDown && this.isFlying) {
            this.matter.body.applyForce(this.player, 
                { 
                    x: this.player.position.x, 
                    y: this.player.position.y 
                },
                { 
                    x: -this.sideMovePower, 
                    y: 0 
                }
            );
        } else if (this.cursors.right.isDown && this.isFlying) {
            this.matter.body.applyForce(this.player, 
                { 
                    x: this.player.position.x, 
                    y: this.player.position.y 
                }, 
                { 
                    x: this.sideMovePower, 
                    y: 0 
                }
            );
        }

        const qKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
        const wKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);

        
        if (qKey.isDown && this.isFlying) {
            this.matter.body.setAngle(this.player, this.player.angle - 0.015);
        }
        if (wKey.isDown && this.isFlying) {
            this.matter.body.setAngle(this.player, this.player.angle + 0.015);
        }
        const myValue = 0.3;

        if (this.isFalling){
            this.player.gameObject.setFillStyle(0x0000ff);
            this.fallTime += this.game.loop.delta; // inkrementuj czas opadania (ms)
            let extraGravity = Math.min(myValue + this.fallTime * 0.0025, 1.0);
            this.matter.world.engine.gravity.y = extraGravity;
        } else {
            this.player.gameObject.setFillStyle(0x00ff00);
            this.fallTime = 0;
            this.matter.world.engine.gravity.y = myValue; // domyślna grawitacja
        }

        console.log(this.isFalling);
    }
}

const config = {
    type: Phaser.WEBGL,
    width: 800,
    height: 600,
    parent: 'phaser-example',
    pixelArt: true,
    physics: {
        default: 'matter',
        matter: {
            gravity: {
                gravity: { y: 0.1 }, // Grawitacja w dół
            },
            debug: true
        }
    },
    scene: Example
};

const game = new Phaser.Game(config);
