class Example extends Phaser.Scene
{
    graphics
    preload()
    {
        this.load.image('ship', 'assets/sprites/ship.png');
        this.load.image('hit', 'assets/sprites/block-ice.png');
    }

    create ()
    {
        this.sprite = this.add.sprite(900, 100, 'ship');

        // Pointer lock will only work after an 'engagement gesture', e.g. mousedown, keypress, etc.
        this.input.keyboard.on('keydown-Q', function (pointer)
        {
            this.sprite.x = 900;
            this.sprite.y = 100;
            this.input.mouse.requestPointerLock();
        }, this);

        // When locked, you will have to use the movementX and movementY properties of the pointer
        // (since a locked cursor's xy position does not update)
        this.input.on('pointermove', function (pointer)
        {
            if (this.input.mouse.locked)
            {

                // Calculate new position
                let newX = this.sprite.x + pointer.movementX;
                let newY = this.sprite.y + pointer.movementY;

                // Restrict movement to the defined rectangle
                if (newX < 800) {
                    newX = 800;
                } else if (newX > 1000) {
                    newX = 1000;
                }

                if (newY < 0) {
                    newY = 0;
                } else if (newY > 200) {
                    newY = 200;
                }

                // Update sprite position
                this.sprite.x = newX;
                this.sprite.y = newY;

                // Update rotation based on movement
                if (pointer.movementX > 0) { 
                    this.sprite.setRotation(0.1); 
                } else if (pointer.movementX < 0) { 
                    this.sprite.setRotation(-0.1);
                } else { 
                    this.sprite.setRotation(0);
                }

                this.updateLockText(true);
            }
        }, this);

        // Exit pointer lock when Q is pressed. Browsers will also exit pointer lock when escape is pressed.
        this.input.keyboard.on('keydown-Q', function (event)
        {
            if (this.input.mouse.locked)
            {
                this.input.mouse.releasePointerLock();
            }
        }, this);

        // Optionally, you can subscribe to the game's pointer lock change event to know when the player
        // enters/exits pointer lock. This is useful if you need to update the UI, change to a custom
        // mouse cursor, etc.
        this.input.manager.events.on('pointerlockchange', event =>
        {
            this.updateLockText(event.isPointerLocked, this.sprite.x, this.sprite.y);
        });

        this.lockText = this.add.text(16, 16, '', {
            fontSize: '20px',
            fill: '#ffffff'
        });

        this.updateLockText(false);
    }

    update ()
    {
    }

    updateLockText (isLocked)
    {
        this.lockText.setText([
            isLocked ? 'The pointer is now locked!' : 'The pointer is now unlocked.',
            `Sprite is at: (${this.sprite.x},${this.sprite.y})`,
            'Press Q to release pointer lock.'
        ]);
    }
}

const config = {
    type: Phaser.AUTO,
    width: 1024,
    height: 768,
    backgroundColor: '#2d2d2d',
    parent: 'game-container',
    scene: Example
};

const game = new Phaser.Game(config);
