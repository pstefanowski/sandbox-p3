class Example extends Phaser.Scene
{
    graphics
    movementX = 0
    movementY = 0

    // Konfiguracja strefy sterowania
    zoneSize = 250;
    zoneX = 0;
    zoneY = 0;
    zoneCenterX = 0;
    zoneCenterY = 0;

    preload()
    {
        this.load.image('ship', 'assets/sprites/ship.png');
    }

    create ()
    {
        const { width } = this.sys.game.config;
        
        // Dynamiczne wyliczanie pozycji strefy (prawy górny róg)
        this.zoneX = width - this.zoneSize;
        this.zoneY = 0;
        this.zoneCenterX = this.zoneX + (this.zoneSize / 2);
        this.zoneCenterY = this.zoneY + (this.zoneSize / 2);

        this.graphics = this.add.graphics();
        this.graphics.lineStyle(2, 0x00ff00, 1); // Zielone obramowanie
        this.graphics.strokeRect(this.zoneX, this.zoneY, this.zoneSize, this.zoneSize);

        // Mały krzyżyk na środku obszaru
        this.graphics.lineStyle(1, 0xffffff, 0.8);
        this.graphics.lineBetween(this.zoneCenterX - 5, this.zoneCenterY, this.zoneCenterX + 5, this.zoneCenterY);
        this.graphics.lineBetween(this.zoneCenterX, this.zoneCenterY - 5, this.zoneCenterX, this.zoneCenterY + 5);

        this.sprite = this.add.sprite(this.zoneCenterX, this.zoneCenterY, 'ship');

        // When locked, you will have to use the movementX and movementY properties of the pointer
        // (since a locked cursor's xy position does not update)
        this.input.on('pointermove', function (pointer)
        {
            if (this.input.mouse.locked)
            {

                // Calculate new position
                let newX = this.sprite.x + pointer.movementX;
                let newY = this.sprite.y + pointer.movementY;
                this.movementX = pointer.movementX;
                this.movementY = pointer.movementY;

                const halfWidth = this.sprite.displayWidth / 2;
                const halfHeight = this.sprite.displayHeight / 2;

                // Ograniczenie ruchu do strefy z uwzględnieniem wymiarów statku
                newX = Phaser.Math.Clamp(newX, this.zoneX + halfWidth, this.zoneX + this.zoneSize - halfWidth);
                newY = Phaser.Math.Clamp(newY, this.zoneY + halfHeight, this.zoneY + this.zoneSize - halfHeight);

                // Update sprite position
                this.sprite.x = newX;
                this.sprite.y = newY;

                // Update rotation based on movement
                // Im bardziej statek jest odchylony od środka strefy w osi X, tym większa rotacja
                const maxOffset = this.zoneSize / 2;
                const currentOffset = this.sprite.x - this.zoneCenterX;
                //const maxTilt = 0.5; // Maksymalne wychylenie w radianach (ok. 28 stopni)
                const maxTilt = 1;

                this.sprite.setRotation((currentOffset / maxOffset) * maxTilt);

                this.updateLockText(true);
            }
        }, this);

        // Toggle qPointer Lock mode with 'Q'
        this.input.keyboard.on('keydown-Q', function (event)
        {
            if (this.input.mouse.locked)
            {
                this.input.mouse.releasePointerLock();
            }
            else
            {
                this.sprite.setPosition(this.zoneCenterX, this.zoneCenterY); // Reset to center of the active zone
                this.input.mouse.requestPointerLock();
            }
        }, this);

        // Optionally, you can subscribe to the game's pointer lock change event to know when the player
        // enters/exits pointer lock. This is useful if you need to update the UI, change to a custom
        // mouse cursor, etc.
        this.input.manager.events.on('pointerlockchange', event =>
        {
            this.updateLockText(event.isPointerLocked);
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
        const dx = Math.abs(Math.round(this.sprite.x - this.zoneCenterX));
        const dy = Math.abs(Math.round(this.sprite.y - this.zoneCenterY));
        const distance = Math.round(Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, this.zoneCenterX, this.zoneCenterY));

        this.lockText.setText([
            isLocked ? 'The pointer is now locked!' : 'The pointer is now unlocked.',
            `Sprite is at: (${this.sprite.x},${this.sprite.y})`,
            `movementXY: (${this.movementX},${this.movementY})`,
            `odchylenieOdSrodkaX: (${dx})`,
            `odchylenieOdSrodkaY: (${dy})`,
            `odchylenieOdSrodka: (${distance})`,
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
