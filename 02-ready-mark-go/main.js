class Example extends Phaser.Scene {
    info
    light
    timer
    game_over
    start_time
    end_time
    delay_waiting

    constructor() {
        super()
    }

    preload() {
        this.load.image('light_green', './assets/green_ball.png')
        this.load.image('light_red', './assets/red_ball.png')
    }

    create() {
        this.info = this.add.text(10, 10, 'Nicisnij s aby zacząc', { font: '30px Arial', fill: '#000000' })

        this.input.keyboard.on('keydown-S', () => {
            this.mark_set()
        })

        this.input.keyboard.on('keydown-SPACE', () => {
            if (this.gameOver) return

            if (this.light.texture.key === 'light_red') {
                this.game_over = true
                this.info.setText('Game Over!. Wcisnij r')
                this.timer.remove()
            } else if (this.light.texture.key === 'light_green') {
                this.end_time = this.time.now
                const reaction_time = parseFloat(this.end_time - this.start_time).toFixed(2)
                this.info.setText(`Reaction Time: ${reaction_time} ms\nNacisnij r aby zresetować`)
            }
        })

        this.input.keyboard.on('keydown-R', () => {
            this.mark_set_reset()
        })
    }

    mark_set(){
        this.light = this.add.image(550, 50, 'light_red')
        this.delay_waiting = Phaser.Math.Between(1000, 5000)
        this.info.setText('Czekaj na zielone światło...') 
        this.timer = this.time.addEvent({
            delay: this.delay_waiting,
            callback: this.mark_set_go,
            callbackScope: this
        })
    }

    mark_set_go(){
        this.light = this.add.image(550, 50, 'light_green')
        this.start_time = this.time.now
    }

    mark_set_reset() {
        this.game_over = false

        this.info.setText('Resetowanie...')
        this.time.delayedCall(1000, () => {
            this.light.setTexture('light_red')
            this.timer.remove()
            this.mark_set()
        }, [], this)
    }
}

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#2d2d2d',
    parent: 'game-container',
    scene: Example
}

const game = new Phaser.Game(config)

