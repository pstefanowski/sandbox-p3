class Example extends Phaser.Scene
{

    preload()
    {
        this.load.image('ship', 'assets/sprites/ship.png');
    }


    create ()
    {
        this.sprite = this.add.sprite(400, 300, 'ship');
    }

    update ()
    {

    }
}

const config = {
    type: Phaser.AUTO,
    width: 1024,
    height: 768
    ,
    backgroundColor: '#2d2d2d',
    parent: 'game-container',
    scene: Example
};

const game = new Phaser.Game(config);
