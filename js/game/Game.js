// var game = new Phaser.Game(window.innerWidth, window.innerHeight, Phaser.AUTO, 'space-shooter', {preload: preload, create: create, update: update, render: render});
var game = new Phaser.Game(800, 600, Phaser.AUTO, 'space-shooter', {preload: preload, create: create, update: update, render: render});


var player;
// enemies
var greenEnemies;

var starfield;
var cursors;
var bank;
var shipTrail;
var explosions;
var bullets;
var fireButton;
// to limit fire rate - remember
var bulletTimer = 0;

// shields
var shields;

var score = 0;
var scoreText;

var greenEnemyLaunchTimer;
var gameOver;

var ACCELERATION = 600;
var DRAG = 400;
var MAXSPEED = 400

function preload() {
	game.load.image('starfield', 'assets/starfield.png');
	game.load.image('ship', 'assets/player.png');
	game.load.image('bullet', 'assets/bullet.png');
	game.load.image('enemy-green', 'assets/enemy-green.png');
	game.load.spritesheet('explosion', 'assets/explode.png', 128, 128);
	game.load.bitmapFont('spacefont', 'assets/spacefont/spacefont.png', 'assets/spacefont/spacefont.xml');
}

function create() {
	// the scrolling starfield background	
	starfield = game.add.tileSprite(0, 0, 800, 600, 'starfield');
	
	// Our bullet group
	bullets = game.add.group();
	bullets.enableBody = true;
	bullets.physicsBodyType = Phaser.Physics.ARCADE;
	bullets.createMultiple(30, 'bullet');
	bullets.setAll('anchor.x', 0.5);
	bullets.setAll('anchor.y', 1);
	bullets.setAll('outOfBoundsKill', true);
	bullets.setAll('checkWorldBounds', true);
	
	// the hero
	player = game.add.sprite(400, 500, 'ship');
	player.health = 100;
	player.anchor.setTo(0.5, 0.5);
	game.physics.enable(player, Phaser.Physics.ARCADE);
	
	// we give the physics engine more info about our player
	player.body.maxVelocity.setTo(MAXSPEED, MAXSPEED);
	player.body.drag.setTo(DRAG, DRAG);
	player.events.onKilled.add(function(){
		shipTrail.kill();
	});
	player.events.onRevived.add(function() {
		shipTrail.start(false, 5000, 10);
	});
	
	// The Baddies
	greenEnemies = game.add.group();
	greenEnemies.enableBody = true;
	greenEnemies.physicsBodyType = Phaser.Physics.ARCADE;
	greenEnemies.createMultiple(5, 'enemy-green');
	greenEnemies.setAll('anchor.x', 0.5);
	greenEnemies.setAll('anchor.y', 0.5);
	greenEnemies.setAll('scale.x', 0.5);
	greenEnemies.setAll('scale.y', 0.5);
	greenEnemies.setAll('angle', 180);
	// greenEnemies.setAll('outOfBoundsKill', true);
	// greenEnemies.setAll('checkWorldBounds', true);
	greenEnemies.forEach(function(enemy){
		addEnemyEmitterTrail(enemy);
		enemy.body.setSize(enemy.width * 3 /4, enemy.height * 3 / 4);
		enemy.damageAmount = 20;
		enemy.events.onKilled.add(function(){
			enemy.trail.kill();
		});
	});
	
	game.time.events.add(1000, launchGreenEnemy);
	
	// and some controls to play the game with
	cursors = game.input.keyboard.createCursorKeys();
	fireButton = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
	
	// Add an emitter for the ship's tail - plasma trail - juiciness
	shipTrail = game.add.emitter(player.x, player.y + 10, 400);
	shipTrail.width = 10;
	shipTrail.makeParticles('bullet');
	shipTrail.setXSpeed(30, -30);
	shipTrail.setYSpeed(200, 180);
	shipTrail.setRotation(50, -50);
	shipTrail.setAlpha(1, 0.01, 800);
	shipTrail.setScale(0.05, 0.4, 0.05, 0.4, 2000, Phaser.Easing.Quintic.Out);
	shipTrail.start(false, 5000, 10);
	
	// An explosion pool
	explosions = game.add.group();
	explosions.enableBody = true;
	explosions.physicsBodyType = Phaser.Physics.ARCADE;
	explosions.createMultiple(30, 'explosion');
	explosions.setAll('anchor.x', 0.5);
	explosions.setAll('anchor.y', 0.5);
	explosions.forEach(function(explosion) {
		explosion.animations.add('explosion');
	});
	
	// Shield Stat
	// shields = game.add.text(game.world.width - 150, 10, 'Shields: ' + player.health +'%', { font: '20px Arial', fill: '#fff' });
	shields = game.add.bitmapText(game.world.width - 250, 10, 'spacefont', '' + player.health +'%', 50);
	shields.render = function() {
		shields.text = 'Shields: ' + Math.max(player.health, 0) +'%';
	};
	shields.render();
	
	// Score
	// scoreText = game.add.text(10, 10, '', { font: '20px Arial', fill: '#fff' });
	scoreText = game.add.bitmapText(10, 10, 'spacefont', '', 50);
	scoreText.render = function() {
		scoreText.text = 'Score; ' + score;
	};
	scoreText.render();
	
	// Game Over Text
	// gameOver = game.add.text(game.world.centerX, game.world.centerY, 'GAME OVER!', { font: '84px Arial', fill: '#fff' });
	// gameOver.anchor.setTo(0.5, 0.5);
	gameOver = game.add.bitmapText(game.world.centerX, game.world.centerY, 'spacefont', 'GAME OVER!', 110);
	gameOver.x = gameOver.x - gameOver.textWidth / 2;
	gameOver.y = gameOver.y - gameOver.textHeight / 3;
	gameOver.visible = false;
}

function update() {
	// scroll the background
	starfield.tilePosition.y += 2;
	
	// Reset the player, then check for movement keys
	// binded to velocity
	// player.body.velocity.setTo(0, 0);
	// bided to acceleration`
	player.body.acceleration.x = 0;
	
	if(cursors.left.isDown) {
		// player.body.velocity.x = -200;
		player.body.acceleration.x = -ACCELERATION;
	} else if(cursors.right.isDown) {
		// player.body.velocity.x = 200;
		player.body.acceleration.x = ACCELERATION;
	}
	
	// to prevent player from moving off screen
	if ( player.x > game.width - 50) {
		player.x = game.width - 50;
		player.body.acceleration.x = 0;
	}
	if (player.x < 50) {
		player.x = 50;
		player.body.acceleration.x = 0;
	}
	
	// Fire Bullet
	if (player.alive && (fireButton.isDown || game.input.activePointer.isDown)) {
		fireBullet();
	}
	
	// Move ship towards mouse pointer
	// Add mouse input to control to ship
	if (game.input.x < game.width - 20 &&
	    game.input.x > 20 &&
		game.input.y > 20 &&
		game.input.y < game.height - 20) {
			var minDist = 200;
			var dist = game.input.x - player.x;
			player.body.velocity.x = MAXSPEED * game.math.clamp(dist / minDist, -1, 1);
		}
	
	// squish and rotate the ship for illusion of "banking" - juiciness
	bank = player.body.velocity.x / MAXSPEED;
	player.scale.x = 1 - Math.abs(bank) / 2;
	// player.angle = bank * 10;
	player.angle = bank * 30;
	
	// Keep the shipTrail lined up with the ship
	shipTrail.x = player.x;
	
	// Check Collisions
	game.physics.arcade.overlap(player, greenEnemies, shipCollide, null, this);
	game.physics.arcade.overlap(greenEnemies,bullets, hitEnemy, null, this);
	
	// Game Over?
	if (! player.alive && gameOver.visible === false) {
		gameOver.visible = true;
		gameOver.alpha = 0;
		var fadeInGameOver = game.add.tween(gameOver);
		fadeInGameOver.to({alpha: 1}, 1000, Phaser.Easing.Quintic.Out);
		fadeInGameOver.onComplete.add(setResetHandlers);
		fadeInGameOver.start();
		function setResetHandlers() {
			// The "Click to restart" handler
			tapRestart = game.input.onTap.addOnce(_restart,this);
			spaceRestart = fireButton.onDown.addOnce(_restart,this);
			function _restart() {
				tapRestart.detach();
				spaceRestart.detach();
				restart();
			}
		}
	}
	
}

function fireBullet() {
	
	// to avoid the being allowed to fire too fast we set a time limit
	// TIP: set higher rates of fire as bonus
	if (game.time.now > bulletTimer) {
	
		var BULLET_SPEED = 400;
		var BULLET_SPACING = 250;
		// Grab the first bullet we can from the pool
		var bullet = bullets.getFirstExists(false);
		
		if(bullet) {
			
			// And Fire it
			// Make bullet come out of tip of ship with right angle
			var bulletOffset = 20 * Math.sin(game.math.degToRad(player.angle));
			bullet.reset(player.x + bulletOffset, player.y);
			bullet.angle = player.angle;
			game.physics.arcade.velocityFromAngle(bullet.angle - 90, BULLET_SPEED, bullet.body.velocity);
			
			bulletTimer = game.time.now + BULLET_SPACING;
			
		}
	}
}

function launchGreenEnemy() {
	var MIN_ENEMY_SPACING = 300;
	var MAX_ENEMY_SPACING = 3000;
	var ENEMY_SPEED = 300;
	
	var enemy = greenEnemies.getFirstExists(false);
	if(enemy) {
		
		enemy.reset(game.rnd.integerInRange(0, game.width), -20);
		enemy.body.velocity.x = game.rnd.integerInRange(-300, 300);
		enemy.body.velocity.y = ENEMY_SPEED;
		enemy.body.drag.x = 100;
		
		enemy.trail.start(false, 800, 1);
		
		
		// update function of each enemy ship to update rotation etc
		enemy.update = function() {
			
			enemy.angle = 180 - game.math.radToDeg(Math.atan2(enemy.body.velocity.x, enemy.body.velocity.y));
			
			enemy.trail.x = enemy.x;
			enemy.trail.y = enemy.y - 10;
			
			// Kill enemies once they go off screen
			if(enemy.y > game.height + 200) {
				enemy.kill();
			}
		}
	}
	
	// send another enemy soon
	greenEnemyLaunchTimer = game.time.events.add(game.rnd.integerInRange(MIN_ENEMY_SPACING, MAX_ENEMY_SPACING), launchGreenEnemy);
}

function addEnemyEmitterTrail(enemy) {
	
	var enemyTrail = game.add.emitter(enemy.x, player.y - 10, 100);
	enemyTrail.width = 10;
	enemyTrail.makeParticles('explosion', [1,2,3,4,5]);
	enemyTrail.setXSpeed(20, -20);
	enemyTrail.setRotation(50,-50);
	enemyTrail.setAlpha(0.4, 0, 800);
	enemyTrail.setScale(0.01, 0.1, 0.01, 0.1, 1000, Phaser.Easing.Quintic.Out);
	enemy.trail = enemyTrail;
}

function shipCollide(player, enemy) {
	var explosion = explosions.getFirstExists(false);
	explosion.reset(enemy.body.x + enemy.body.halfWidth, enemy.body.y + enemy.body.halfHeight);
	explosion.body.velocity.y = enemy.body.velocity.y;
	explosion.alpha = 0.7;
	explosion.play('explosion', 30, false, true);
	enemy.kill();
	
	player.damage(enemy.damageAmount)
	shields.render();
}

function hitEnemy(enemy, bullet) {
	var explosion = explosions.getFirstExists(false);
	explosion.reset(bullet.body.x + bullet.body.halfWidth, bullet.body.y + bullet.body.halfHeight);
	explosion.body.velocity.y = enemy.body.velocity.y;
	explosion.alpha = 0.7;
	explosion.play('explosion', 30, false, true);
	enemy.kill();
	bullet.kill();
	
	// Increase score
	score += enemy.damageAmount * 10;
	scoreText.render();
}

function restart() {
	// Reset the enemies
	greenEnemies.callAll('kill');
	game.time.events.remove(greenEnemyLaunchTimer);
	game.time.events.add(1000, launchGreenEnemy);
	
	// Revive the player
	player.revive();
	player.health = 100;
	shields.render();
	score = 0;
	scoreText.render();
	
	// Hide the text
	gameOver.visible = false;
}

function render() {
	//for (var i = 0; i < greenEnemies.length; i++) {
	//	game.debug.body(greenEnemies.children[i]);
	//}
	//game.debug.body(player);
}