class EnemyTank {
    constructor(index, scene, player, enemyBullets, speedMult = 1.0) {
        this.index = index;
        this.scene = scene;
        this.player = player;
        this.enemyBullets = enemyBullets;
        this.health = 3;
        this.fireRate = 1400;
        this.nextFire = 0;
        this.alive = true;
        this.moveSpeed = 80 * speedMult;

        const x = Phaser.Math.Between(-900, 900);
        const y = Phaser.Math.Between(-900, 900);

        this.shadow = scene.add.sprite(x, y, 'enemy', 'shadow').setOrigin(0.5);
        this.tank = scene.physics.add.sprite(x, y, 'enemy', 'tank1').setOrigin(0.5);
        this.turret = scene.add.sprite(x, y, 'enemy', 'turret').setOrigin(0.3, 0.5);

        this.shadow.setDepth(1);
        this.tank.setDepth(2);
        this.turret.setDepth(3);

        this.tank.setData('enemyInstance', this);
        this.tank.setData('index', index);

        this.tank.body.setCollideWorldBounds(true);
        this.tank.body.setBounce(1, 1);
        this.tank.setAngle(Phaser.Math.Between(0, 360));

        scene.physics.velocityFromRotation(this.tank.rotation, this.moveSpeed, this.tank.body.velocity);
    }

    damage() {
        this.health -= 1;
        if (this.health <= 0) {
            this.alive = false;
            if (this.shadow) this.shadow.destroy();
            if (this.turret) this.turret.destroy();
            if (this.tank) this.tank.destroy();
            return true;
        }
        return false;
    }

    update(time, delta) {
        if (!this.alive || !this.tank || !this.tank.active) return;

        this.shadow.setPosition(this.tank.x, this.tank.y);
        this.shadow.setRotation(this.tank.rotation);
        this.turret.setPosition(this.tank.x, this.tank.y);

        if (this.scene.isCountdown || this.scene.isGameOver) {
            if (this.tank.body) this.tank.body.setVelocity(0, 0);
            return;
        }

        if (this.tank.body && this.tank.body.velocity.x === 0 && this.tank.body.velocity.y === 0) {
            this.scene.physics.velocityFromRotation(this.tank.rotation, this.moveSpeed, this.tank.body.velocity);
        }

        if (!this.player || !this.player.active) return;

        const angleToPlayer = Phaser.Math.Angle.Between(this.tank.x, this.tank.y, this.player.x, this.player.y);
        this.turret.setRotation(angleToPlayer);

        const dist = Phaser.Math.Distance.Between(this.tank.x, this.tank.y, this.player.x, this.player.y);

        if (dist < 350 && time > this.nextFire && time > (this.scene.enemyShootingGraceUntil || 0)) {
            this.nextFire = time + this.fireRate;
            this.fireBullet(angleToPlayer);
        }
    }

    fireBullet(angle) {
        let bullet = this.enemyBullets.get(this.turret.x, this.turret.y, 'bullet');
        if (bullet) {
            bullet.setActive(true);
            bullet.setVisible(true);
            bullet.setPosition(this.turret.x, this.turret.y);
            bullet.setRotation(angle);
            bullet.setDepth(4);
            bullet.body.enable = true;
            const enemyBulletSpeed = 380 * (this.scene.speedMult || 1.0);
            this.scene.physics.velocityFromRotation(angle, enemyBulletSpeed, bullet.body.velocity);
        }
    }
}

class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });
    }

    preload() {
        this.load.atlas('tank', 'assets/tanks.png', 'assets/tanks.json');
        this.load.atlas('enemy', 'assets/enemy-tanks.png', 'assets/tanks.json');
        this.load.image('logo', 'assets/logo.png');
        this.load.image('bullet', 'assets/bullet.png');
        this.load.image('earth', 'assets/scorched_earth.png');
        this.load.spritesheet('kaboom', 'assets/explosion.png', { frameWidth: 64, frameHeight: 64, endFrame: 23 });
    }

    create() {
        this.speedMult = window.currentSpeedMultiplier || 1.0;
        this.maxPlayerSpeed = 160 * this.speedMult;
        this.maxReverseSpeed = -80 * this.speedMult;
        this.turnRate = 2.5 * this.speedMult;
        this.bulletSpeed = 550 * this.speedMult;

        this.physics.world.setBounds(-1000, -1000, 2000, 2000);
        this.cameras.main.setBounds(-1000, -1000, 2000, 2000);

        if (!this.anims.exists('move')) {
            this.anims.create({
                key: 'move',
                frames: [
                    { key: 'tank', frame: 'tank1' },
                    { key: 'tank', frame: 'tank2' },
                    { key: 'tank', frame: 'tank3' },
                    { key: 'tank', frame: 'tank4' },
                    { key: 'tank', frame: 'tank5' },
                    { key: 'tank', frame: 'tank6' }
                ],
                frameRate: 15,
                repeat: -1
            });
        }

        if (!this.anims.exists('kaboom')) {
            this.anims.create({
                key: 'kaboom',
                frames: this.anims.generateFrameNumbers('kaboom', { start: 0, end: 22 }),
                frameRate: 30,
                repeat: 0
            });
        }

        this.land = this.add.tileSprite(0, 0, 800, 600, 'earth').setOrigin(0, 0).setScrollFactor(0);

        this.shadow = this.add.sprite(0, 0, 'tank', 'shadow').setOrigin(0.5).setDepth(1);
        this.tank = this.physics.add.sprite(0, 0, 'tank', 'tank1').setOrigin(0.5).setDepth(2);
        this.tank.body.setCollideWorldBounds(true);

        this.turret = this.add.sprite(0, 0, 'tank', 'turret').setOrigin(0.3, 0.5).setDepth(3);

        this.playerHealth = 5;
        this.playerMaxHealth = 5;
        this.isGameOver = false;

        this.bullets = this.physics.add.group({
            defaultKey: 'bullet',
            maxSize: 30
        });

        this.enemyBullets = this.physics.add.group({
            defaultKey: 'bullet',
            maxSize: 100
        });

        this.enemies = [];
        this.enemiesTotal = 20;
        this.enemiesAlive = 20;

        for (let i = 0; i < this.enemiesTotal; i++) {
            const enemy = new EnemyTank(i, this, this.tank, this.enemyBullets, this.speedMult);
            this.enemies.push(enemy);
        }

        this.physics.add.overlap(this.enemyBullets, this.tank, this.bulletHitPlayer, null, this);

        for (let i = 0; i < this.enemies.length; i++) {
            this.physics.add.collider(this.tank, this.enemies[i].tank);
            this.physics.add.overlap(this.bullets, this.enemies[i].tank, this.bulletHitEnemy, null, this);
            for (let j = i + 1; j < this.enemies.length; j++) {
                this.physics.add.collider(this.enemies[i].tank, this.enemies[j].tank);
            }
        }

        this.cameras.main.startFollow(this.tank, true, 0.08, 0.08);
        this.cameras.main.setDeadzone(150, 150);

        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys({
            W: Phaser.Input.Keyboard.KeyCodes.W,
            A: Phaser.Input.Keyboard.KeyCodes.A,
            S: Phaser.Input.Keyboard.KeyCodes.S,
            D: Phaser.Input.Keyboard.KeyCodes.D
        });

        this.currentSpeed = 0;
        this.fireRate = 250;
        this.nextFire = 0;

        this.logo = this.add.image(400, 200, 'logo').setScrollFactor(0).setDepth(100);
        this.startHint = this.add.text(400, 360, 'KLIKNIJ ABY ROZPOCZĄĆ', {
            fontSize: '20px',
            fontFamily: 'Segoe UI, sans-serif',
            fontStyle: 'bold',
            color: '#ffffff',
            backgroundColor: '#2563eb',
            padding: { x: 16, y: 8 }
        }).setOrigin(0.5).setScrollFactor(0).setDepth(101);

        this.isCountdown = true;

        this.input.once('pointerdown', () => {
            if (this.startHint) {
                this.startHint.destroy();
                this.startHint = null;
            }
            if (this.logo) {
                this.tweens.add({
                    targets: this.logo,
                    alpha: 0,
                    duration: 300,
                    onComplete: () => {
                        if (this.logo) {
                            this.logo.destroy();
                            this.logo = null;
                        }
                        this.startCountdown();
                    }
                });
            } else {
                this.startCountdown();
            }
        });

        this.createHUD();
    }

    startCountdown() {
        this.isCountdown = true;

        const overlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.4)
            .setScrollFactor(0)
            .setDepth(190);

        const countText = this.add.text(400, 260, '3', {
            fontSize: '96px',
            fontFamily: 'Segoe UI, Outfit, sans-serif',
            fontStyle: 'bold',
            color: '#f59e0b',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5).setScrollFactor(0).setDepth(200);

        let count = 3;

        countText.setScale(1.5);
        this.tweens.add({
            targets: countText,
            scale: 1.0,
            duration: 400,
            ease: 'Power2'
        });

        this.time.addEvent({
            delay: 1000,
            repeat: 3,
            callback: () => {
                count--;
                if (count > 0) {
                    countText.setText(count.toString());
                    countText.setScale(1.4);
                    countText.setColor(count === 2 ? '#3b82f6' : '#10b981');
                    this.tweens.add({
                        targets: countText,
                        scale: 1.0,
                        duration: 400,
                        ease: 'Power2'
                    });
                } else if (count === 0) {
                    countText.setText('DO BOJU!');
                    countText.setColor('#ef4444');
                    countText.setScale(1.3);
                    this.tweens.add({
                        targets: [countText, overlay],
                        alpha: 0,
                        scale: 1.6,
                        duration: 600,
                        ease: 'Power2',
                        onComplete: () => {
                            countText.destroy();
                            overlay.destroy();
                            this.isCountdown = false;
                            this.enemyShootingGraceUntil = this.time.now + 2000;
                        }
                    });
                }
            }
        });
    }

    applySpeedMultiplier(mult) {
        this.speedMult = mult;
        this.maxPlayerSpeed = 160 * mult;
        this.maxReverseSpeed = -80 * mult;
        this.turnRate = 2.5 * mult;
        this.bulletSpeed = 550 * mult;

        if (this.enemies) {
            for (let enemy of this.enemies) {
                if (enemy.alive && enemy.tank && enemy.tank.body) {
                    enemy.moveSpeed = 80 * mult;
                    if (!this.isCountdown) {
                        this.physics.velocityFromRotation(enemy.tank.rotation, enemy.moveSpeed, enemy.tank.body.velocity);
                    }
                }
            }
        }
    }

    createHUD() {
        this.add.rectangle(400, 30, 760, 44, 0x0f172a, 0.85)
            .setScrollFactor(0)
            .setDepth(150)
            .setStrokeStyle(1, 0x334155);

        this.hpText = this.add.text(40, 30, `❤️ ZDROWIE: ${this.playerHealth}/${this.playerMaxHealth}`, {
            fontSize: '16px',
            fontFamily: 'Segoe UI, sans-serif',
            fontStyle: 'bold',
            color: '#ef4444'
        }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(151);

        this.enemyText = this.add.text(300, 30, `🎯 WRODZY: ${this.enemiesAlive} / ${this.enemiesTotal}`, {
            fontSize: '16px',
            fontFamily: 'Segoe UI, sans-serif',
            fontStyle: 'bold',
            color: '#38bdf8'
        }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(151);

        this.add.text(760, 30, `WASD / Myszka`, {
            fontSize: '14px',
            fontFamily: 'Segoe UI, sans-serif',
            color: '#94a3b8'
        }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(151);
    }

    updateHUD() {
        if (this.hpText) {
            this.hpText.setText(`❤️ ZDROWIE: ${Math.max(0, this.playerHealth)}/${this.playerMaxHealth}`);
        }
        if (this.enemyText) {
            this.enemyText.setText(`🎯 WRODZY: ${this.enemiesAlive} / ${this.enemiesTotal}`);
        }
    }

    bulletHitPlayer(arg1, arg2) {
        if (this.isCountdown || this.isGameOver) return;

        let bullet = arg1;
        if (arg1 === this.tank) bullet = arg2;

        if (!bullet || !bullet.active) return;
        bullet.setActive(false);
        bullet.setVisible(false);
        if (bullet.body) bullet.body.stop();

        this.playerHealth -= 1;
        this.cameras.main.flash(150, 255, 0, 0);
        this.tank.setTint(0xff6666);
        this.time.delayedCall(150, () => {
            if (this.tank && this.tank.active) this.tank.clearTint();
        });

        this.updateHUD();

        if (this.playerHealth <= 0) {
            this.triggerGameOver(false);
        }
    }

    bulletHitEnemy(arg1, arg2) {
        if (this.isCountdown || this.isGameOver) return;

        let bullet = arg1;
        let enemySprite = arg2;

        if (arg1 && arg1.getData && arg1.getData('enemyInstance')) {
            enemySprite = arg1;
            bullet = arg2;
        }

        if (!bullet || !bullet.active) return;
        bullet.setActive(false);
        bullet.setVisible(false);
        if (bullet.body) bullet.body.stop();

        if (!enemySprite) return;
        const enemy = enemySprite.getData('enemyInstance');
        if (!enemy || !enemy.alive) return;

        const destroyed = enemy.damage();
        if (destroyed) {
            const exp = this.add.sprite(enemySprite.x, enemySprite.y, 'kaboom').setOrigin(0.5).setDepth(20);
            exp.play('kaboom');
            exp.once('animationcomplete', () => exp.destroy());
        } else {
            enemySprite.setTint(0xff9999);
            this.time.delayedCall(100, () => {
                if (enemySprite && enemySprite.active) enemySprite.clearTint();
            });
        }
    }

    fire(time) {
        if (time > this.nextFire && !this.isGameOver && !this.isCountdown) {
            this.nextFire = time + this.fireRate;

            const worldPointer = this.cameras.main.getWorldPoint(this.input.activePointer.x, this.input.activePointer.y);
            const angle = Phaser.Math.Angle.Between(this.turret.x, this.turret.y, worldPointer.x, worldPointer.y);

            let bullet = this.bullets.get(this.turret.x, this.turret.y, 'bullet');
            if (bullet) {
                bullet.setActive(true);
                bullet.setVisible(true);
                bullet.setPosition(this.turret.x, this.turret.y);
                bullet.setRotation(angle);
                bullet.setDepth(5);
                bullet.body.enable = true;
                this.physics.velocityFromRotation(angle, this.bulletSpeed, bullet.body.velocity);
            }
        }
    }

    triggerGameOver(isWin) {
        this.isGameOver = true;

        if (!isWin) {
            const exp = this.add.sprite(this.tank.x, this.tank.y, 'kaboom').setOrigin(0.5).setDepth(20);
            exp.play('kaboom');
            exp.once('animationcomplete', () => exp.destroy());

            this.tank.setVisible(false);
            this.shadow.setVisible(false);
            this.turret.setVisible(false);
            this.tank.body.enable = false;
        }

        const titleText = isWin ? 'MISJA ZAKOŃCZONA SUKCESEM!' : 'KONIEC GRY!';
        const subText = isWin ? `Zniszczyłeś wszystkie ${this.enemiesTotal} czołgów wroga!` : `Twój czołg został zniszczony. Zniszczono: ${this.enemiesTotal - this.enemiesAlive}/${this.enemiesTotal}`;
        const titleColor = isWin ? '#4caf50' : '#f44336';

        this.add.rectangle(400, 300, 500, 260, 0x111827, 0.95)
            .setScrollFactor(0)
            .setDepth(200)
            .setStrokeStyle(2, isWin ? 0x4caf50 : 0xf44336);

        this.add.text(400, 220, titleText, {
            fontSize: '24px',
            fontFamily: 'Segoe UI, sans-serif',
            fontStyle: 'bold',
            color: titleColor
        }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

        this.add.text(400, 270, subText, {
            fontSize: '16px',
            fontFamily: 'Segoe UI, sans-serif',
            color: '#e5e7eb'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

        const restartBtn = this.add.text(400, 340, 'ZAGRAJ PONOWNIE', {
            fontSize: '18px',
            fontFamily: 'Segoe UI, sans-serif',
            fontStyle: 'bold',
            color: '#ffffff',
            backgroundColor: isWin ? '#2e7d32' : '#c62828',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setScrollFactor(0).setDepth(201).setInteractive({ useHandCursor: true });

        restartBtn.on('pointerover', () => restartBtn.setStyle({ color: '#ffeb3b' }));
        restartBtn.on('pointerout', () => restartBtn.setStyle({ color: '#ffffff' }));
        restartBtn.on('pointerdown', () => {
            this.scene.restart();
        });
    }

    update(time, delta) {
        if (this.isGameOver) return;

        this.land.tilePositionX = this.cameras.main.scrollX;
        this.land.tilePositionY = this.cameras.main.scrollY;

        let aliveCount = 0;
        for (let i = 0; i < this.enemies.length; i++) {
            if (this.enemies[i].alive) {
                aliveCount++;
                this.enemies[i].update(time, delta);
            }
        }

        if (this.enemiesAlive !== aliveCount) {
            this.enemiesAlive = aliveCount;
            this.updateHUD();

            if (this.enemiesAlive <= 0 && !this.isGameOver) {
                this.triggerGameOver(true);
            }
        }

        if (this.isCountdown) {
            if (this.tank && this.tank.body) this.tank.body.setVelocity(0, 0);
            return;
        }

        const left = this.cursors.left.isDown || this.wasd.A.isDown;
        const right = this.cursors.right.isDown || this.wasd.D.isDown;
        const up = this.cursors.up.isDown || this.wasd.W.isDown;
        const down = this.cursors.down.isDown || this.wasd.S.isDown;

        if (left) {
            this.tank.angle -= this.turnRate;
        } else if (right) {
            this.tank.angle += this.turnRate;
        }

        if (up) {
            this.currentSpeed = Math.min(this.maxPlayerSpeed, this.currentSpeed + 6 * this.speedMult);
        } else if (down) {
            this.currentSpeed = Math.max(this.maxReverseSpeed, this.currentSpeed - 6 * this.speedMult);
        } else {
            if (this.currentSpeed > 0) {
                this.currentSpeed = Math.max(0, this.currentSpeed - 4 * this.speedMult);
            } else if (this.currentSpeed < 0) {
                this.currentSpeed = Math.min(0, this.currentSpeed + 4 * this.speedMult);
            }
        }

        if (this.currentSpeed !== 0) {
            this.physics.velocityFromRotation(this.tank.rotation, this.currentSpeed, this.tank.body.velocity);
            if (!this.tank.anims.isPlaying) {
                this.tank.play('move');
            }
        } else {
            this.tank.body.setVelocity(0, 0);
            this.tank.stop();
            this.tank.setFrame('tank1');
        }

        this.shadow.setPosition(this.tank.x, this.tank.y);
        this.shadow.setRotation(this.tank.rotation);

        this.turret.setPosition(this.tank.x, this.tank.y);

        const worldPointer = this.cameras.main.getWorldPoint(this.input.activePointer.x, this.input.activePointer.y);
        this.turret.rotation = Phaser.Math.Angle.Between(this.turret.x, this.turret.y, worldPointer.x, worldPointer.y);

        if (this.input.activePointer.isDown) {
            this.fire(time);
        }

        this.bullets.children.each((bullet) => {
            if (bullet.active && (bullet.x < -1000 || bullet.x > 1000 || bullet.y < -1000 || bullet.y > 1000)) {
                bullet.setActive(false);
                bullet.setVisible(false);
                bullet.body.stop();
            }
        });

        this.enemyBullets.children.each((bullet) => {
            if (bullet.active && (bullet.x < -1000 || bullet.x > 1000 || bullet.y < -1000 || bullet.y > 1000)) {
                bullet.setActive(false);
                bullet.setVisible(false);
                bullet.body.stop();
            }
        });
    }
}

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: MainScene
};

const game = new Phaser.Game(config);
window.phaserGame = game;
