const MenuScene = {
    key: 'MenuScene',
    preload: menuPreload,
    create: menuCreate
};

const WinScene = {
    key: 'WinScene',
    preload: menuPreload,
    create: winCreate
};

const GameScene = {
    key: 'GameScene',
    preload: preload,
    create: create,
    update: update
};

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    //pixelArt: true,
    scale: {
        mode: Phaser.Scale.FIT,
        //mode: Phaser.Scale.FIT, //ENVELOP
        //autoCenter: Phaser.Scale.CENTER_BOTH,
        parent: 'game-container',
        // other scale options...
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: [MenuScene, GameScene, WinScene],
    debug: true
};

const game = new Phaser.Game(config);
let player;
let items;
let map;
let backgroundLayer;
let collisionLayer;
let cursors;
let score = 0;
let bestScore = 0;
let scoreText;
let bestScoreText;
let scoreTimer;
let enemy;
let enemies;
let nextEnemyThreshold = 50;

function preload() {

    this.load.spritesheet('robot', 'assets/lego.png',
        { frameWidth: 37, frameHeight: 48 });

    this.load.spritesheet('items', 'assets/items.png',
        { frameWidth: 32, frameHeight: 32 });

    this.load.image('tiles', 'assets/map_tiles.png');
    this.load.tilemapTiledJSON('json_map', 'assets/json_map.json');

    this.load.image('enemy', 'assets/bomb.png');
    
    this.load.audio('death', 'assets/death.mp3');

}

function menuPreload() {
    this.load.image('menu_bg', 'assets/menu_bg.jpg');
}

function menuCreate() {
    this.add.image(400, 300, 'menu_bg');
    this.add.text(400, 200, 'Útěk z Ostrova', { fontSize: '48px', fill: '#fff' }).setOrigin(0.5);
    
    let best = localStorage.getItem('bestScore') || 0;
    this.add.text(400, 280, 'Best Score: ' + best, { fontSize: '24px', fill: '#fff' }).setOrigin(0.5);
    
    this.add.text(400, 380, 'Click to Start', { fontSize: '24px', fill: '#fff' }).setOrigin(0.5);

    this.input.setDefaultCursor('pointer');

    this.input.on('pointerdown', () => {
        this.scene.start('GameScene');
    });
}

function winCreate() {
    this.add.image(400, 300, 'menu_bg');
    this.add.text(400, 150, 'Utekl jsi z ostrova!', { fontSize: '48px', fill: '#0f0' }).setOrigin(0.5);
    this.add.text(400, 230, 'Score: ' + score, { fontSize: '28px', fill: '#fff' }).setOrigin(0.5);
    
    let best = localStorage.getItem('bestScore') || 0;
    this.add.text(400, 280, 'Best Score: ' + best, { fontSize: '24px', fill: '#fff' }).setOrigin(0.5);
    
    this.add.text(400, 380, 'Click to Play Again', { fontSize: '24px', fill: '#fff' }).setOrigin(0.5);

    this.input.setDefaultCursor('pointer');

    this.input.on('pointerdown', () => {
        score = 0;
        this.scene.start('GameScene');
    });
}

function create() {
    console.log(this.cache.tilemap.get('json_map'));
    map = this.make.tilemap({ key: 'json_map' });
    //'map_tiles' - name of the tilesets in json_map.json
    //'tiles' - name of the image in load.images()
    const tiles = map.addTilesetImage('map_tiles', 'tiles');

    backgroundLayer = map.createLayer('background', tiles, 0, 0);
    collisionLayer = map.createLayer('collision', tiles, 0, 0);

    // https://docs.phaser.io/api-documentation/class/tilemaps-tilemap#setcollisionbyexclusion
    collisionLayer.setCollisionByExclusion([-1]);


    player = this.physics.add.sprite(100, 100, 'robot');
    items = this.physics.add.sprite(200, 100, 'items', 0);

    cursors = this.input.keyboard.createCursorKeys();

    this.physics.add.collider(player, collisionLayer);

    this.physics.add.overlap(player, backgroundLayer);
    this.physics.add.overlap(player, items, collisionHandler);

    // https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera#startfollow	

    this.anims.create({
        key: 'run',
        frames: this.anims.generateFrameNumbers('robot', { start: 0, end: 15 }),
        frameRate: 20,
        repeat: -1
    });

    player.body.setSize(20, 30);
    player.body.setOffset(8, 10);

    player.setCollideWorldBounds(true);
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.startFollow(player);
    
    // skupina nepřátel
    enemies = this.physics.add.group();
    window.gameScene = this;
    nextEnemyThreshold = 50;
    
    // spawn prvního enemy
    spawnEnemy(this);
    
    // kazdy dve sekundy random pohyb vsech enemies
    this.time.addEvent({
        delay: 2000,
        callback: () => {
            enemies.children.iterate((e) => {
                if (e) {
                    e.setVelocity(
                        Phaser.Math.Between(-100, 100),
                        Phaser.Math.Between(-100, 100)
                    );
                }
            });
        },
        loop: true
    });
    
    // kdyz se srazi s hracem tak reset skore
    this.physics.add.overlap(player, enemies, enemyHit);

    // narazy do zdi
    this.physics.add.collider(enemies, collisionLayer);

    bestScore = localStorage.getItem('bestScore') || 0;

    // texty na obrazovce
    scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '20px', fill: '#fff' });
    bestScoreText = this.add.text(16, 40, 'Best: ' + bestScore, { fontSize: '20px', fill: '#fff' });

    // text s kamerou pohyb
    scoreText.setScrollFactor(0);
    bestScoreText.setScrollFactor(0);
    scoreTimer = this.time.addEvent({
        delay: 3000,
        callback: () => {
            if (score > 0) {
                score--;
                updateText();
            }
        },
        loop: true
    });

    this.input.on('pointermove', (pointer) => {
        if (pointer.isDown) {
            let angle = Phaser.Math.Angle.Between(player.x, player.y, pointer.worldX, pointer.worldY);
            player.angle = Phaser.Math.RadToDeg(angle) - 90;
            player.anims.play('run', true);
            this.physics.moveTo(player, pointer.worldX, pointer.worldY, 150);
        }
    });

    this.input.on('pointerup', () => {
        player.body.setVelocity(0);
    });

    this.input.keyboard.on('keydown-ESC', () => {
        score = 0;
        this.scene.start('MenuScene');
    });

    this.input.setDefaultCursor('default');
}

function update() {
    if (cursors.left.isDown || cursors.right.isDown || cursors.up.isDown || cursors.down.isDown) {
        player.body.setVelocity(0);

        if (cursors.left.isDown) {
            player.body.setVelocityX(-150);
            player.angle = 90;
        } else if (cursors.right.isDown) {
            player.body.setVelocityX(150);
            player.angle = 270;
        }

        if (cursors.up.isDown) {
            player.body.setVelocityY(-150);
            player.angle = 180;
        } else if (cursors.down.isDown) {
            player.body.setVelocityY(150);
            player.angle = 0;
        }

        player.anims.play('run', true);
    } else if (!this.input.activePointer.isDown) {
        player.body.setVelocity(0);
        player.anims.stop();
    }
}

function enemyHit(player, enemy) {
    gameScene.sound.play('death');
    score = 0;
    nextEnemyThreshold = 50;
    updateText();
    
    // odstranit vsechny enemy krome jednoho
    let first = true;
    enemies.children.iterate((e) => {
        if (first) {
            first = false;
            // prvniho presuneme
            let pos = getFreePosition();
            e.setPosition(pos.x, pos.y);
        } else if (e) {
            e.destroy();
        }
    });
}

function getFreePosition() {
    let x, y, tile;
    do {
        x = Phaser.Math.Between(50, map.widthInPixels - 50);
        y = Phaser.Math.Between(50, map.heightInPixels - 50);
        tile = collisionLayer.getTileAtWorldXY(x, y);
    } while (tile); // opakuj dokud je na pozici kolizni tile
    return { x, y };
}

function spawnEnemy(scene) {
    let pos = getFreePosition();
    let e = enemies.create(pos.x, pos.y, 'enemy');
    e.setCollideWorldBounds(true);
    e.setBounce(1);
    e.setVelocity(
        Phaser.Math.Between(-100, 100),
        Phaser.Math.Between(-100, 100)
    );
}

function updateText() {
    scoreText.setText('Score: ' + score);
    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('bestScore', bestScore);
    }
    bestScoreText.setText('Best: ' + bestScore);
}

function collisionHandler(player, item) {
    item.disableBody(true, true);

    score += 10;
    updateText();

    // vyhra pri 250 bodech
    if (score >= 250) {
        gameScene.scene.start('WinScene');
        return;
    }

    // spawn noveho enemy kazdy 50 bodu
    if (score >= nextEnemyThreshold) {
        spawnEnemy(gameScene);
        nextEnemyThreshold += 50;
    }

    if (item.body.enable == false) {
        let pos = getFreePosition();
        item.enableBody(true, pos.x, pos.y, true, true);
    }
}