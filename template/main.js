class Example extends Phaser.Scene
{
    preload ()
    {
        
    }
    create ()
    {
        
    }

    update ()
    {

    }
}

const config = {
    type: Phaser.AUTO,
    width: 1600,
    height: 900,
    backgroundColor: '#2d2d2d',
    parent: 'game-container',
    scene: Example
};

const game = new Phaser.Game(config);
