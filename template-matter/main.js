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
    type: Phaser.WEBGL,
    width: 800,
    height: 600,
    parent: 'phaser-example',
    pixelArt: true,
    physics: {
        default: 'matter',
        matter: {
            gravity: {
                y: 0
            },
            debug: true
        }
    },
    scene: Example
};

const game = new Phaser.Game(config);
