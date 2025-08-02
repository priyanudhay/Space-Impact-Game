// Game variables
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const livesElement = document.getElementById('lives');
const gameOverElement = document.getElementById('gameOver');
const finalScoreElement = document.getElementById('finalScore');

// Game state
let gameRunning = true;
let score = 0;
let lives = 3;
let keys = {};

// Player object
const player = {
    x: 50,
    y: canvas.height / 2,
    width: 40,
    height: 20,
    speed: 5,
    color: '#00ff00'
};

// Arrays for game objects
let bullets = [];
let enemies = [];
let particles = [];

// Enemy spawn timer
let enemySpawnTimer = 0;
let enemySpawnRate = 120; // frames between spawns

// Bullet class
class Bullet {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 8;
        this.height = 3;
        this.speed = 8;
        this.color = '#ffff00';
    }
    
    update() {
        this.x += this.speed;
    }
    
    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Add glow effect
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.shadowBlur = 0;
    }
}

// Enemy class
class Enemy {
    constructor() {
        this.x = canvas.width;
        this.y = Math.random() * (canvas.height - 30);
        this.width = 30;
        this.height = 20;
        this.speed = 2 + Math.random() * 3;
        this.color = '#ff0000';
        this.health = 1;
    }
    
    update() {
        this.x -= this.speed;
        
        // Simple AI movement pattern
        this.y += Math.sin(this.x * 0.01) * 0.5;
        
        // Keep enemy within bounds
        if (this.y < 0) this.y = 0;
        if (this.y > canvas.height - this.height) this.y = canvas.height - this.height;
    }
    
    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Add glow effect
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 8;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.shadowBlur = 0;
        
        // Draw simple enemy design
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(this.x + 5, this.y + 5, 4, 4);
        ctx.fillRect(this.x + 5, this.y + 11, 4, 4);
    }
}

// Particle class for explosions
class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 10;
        this.vy = (Math.random() - 0.5) * 10;
        this.life = 30;
        this.maxLife = 30;
        this.color = `hsl(${Math.random() * 60 + 15}, 100%, 50%)`;
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.98;
        this.vy *= 0.98;
        this.life--;
    }
    
    draw() {
        const alpha = this.life / this.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, 3, 3);
        ctx.globalAlpha = 1;
    }
}

// Event listeners
document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    
    if (e.code === 'Space') {
        e.preventDefault();
        if (gameRunning) {
            shoot();
        }
    }
    
    if (e.code === 'KeyR' && !gameRunning) {
        restartGame();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

// Shooting function
function shoot() {
    bullets.push(new Bullet(player.x + player.width, player.y + player.height / 2));
}

// Create explosion particles
function createExplosion(x, y) {
    for (let i = 0; i < 15; i++) {
        particles.push(new Particle(x, y));
    }
}

// Collision detection
function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// Update player
function updatePlayer() {
    if (keys['ArrowUp'] && player.y > 0) {
        player.y -= player.speed;
    }
    if (keys['ArrowDown'] && player.y < canvas.height - player.height) {
        player.y += player.speed;
    }
    if (keys['ArrowLeft'] && player.x > 0) {
        player.x -= player.speed;
    }
    if (keys['ArrowRight'] && player.x < canvas.width / 3) {
        player.x += player.speed;
    }
}

// Draw player
function drawPlayer() {
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);
    
    // Add glow effect
    ctx.shadowColor = player.color;
    ctx.shadowBlur = 10;
    ctx.fillRect(player.x, player.y, player.width, player.height);
    ctx.shadowBlur = 0;
    
    // Draw player ship details
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(player.x + 35, player.y + 8, 8, 4);
    ctx.fillStyle = '#0088ff';
    ctx.fillRect(player.x + 5, player.y + 5, 6, 3);
    ctx.fillRect(player.x + 5, player.y + 12, 6, 3);
}

// Update game objects
function update() {
    if (!gameRunning) return;
    
    updatePlayer();
    
    // Update bullets
    bullets = bullets.filter(bullet => {
        bullet.update();
        return bullet.x < canvas.width;
    });
    
    // Spawn enemies
    enemySpawnTimer++;
    if (enemySpawnTimer >= enemySpawnRate) {
        enemies.push(new Enemy());
        enemySpawnTimer = 0;
        
        // Increase difficulty over time
        if (enemySpawnRate > 60) {
            enemySpawnRate -= 0.5;
        }
    }
    
    // Update enemies
    enemies = enemies.filter(enemy => {
        enemy.update();
        return enemy.x > -enemy.width;
    });
    
    // Update particles
    particles = particles.filter(particle => {
        particle.update();
        return particle.life > 0;
    });
    
    // Check bullet-enemy collisions
    bullets.forEach((bullet, bulletIndex) => {
        enemies.forEach((enemy, enemyIndex) => {
            if (checkCollision(bullet, enemy)) {
                createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
                bullets.splice(bulletIndex, 1);
                enemies.splice(enemyIndex, 1);
                score += 10;
                scoreElement.textContent = score;
            }
        });
    });
    
    // Check player-enemy collisions
    enemies.forEach((enemy, enemyIndex) => {
        if (checkCollision(player, enemy)) {
            createExplosion(player.x + player.width / 2, player.y + player.height / 2);
            enemies.splice(enemyIndex, 1);
            lives--;
            livesElement.textContent = lives;
            
            if (lives <= 0) {
                gameOver();
            }
        }
    });
}

// Draw everything
function draw() {
    // Clear canvas with space background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw stars
    drawStars();
    
    // Draw game objects
    drawPlayer();
    
    bullets.forEach(bullet => bullet.draw());
    enemies.forEach(enemy => enemy.draw());
    particles.forEach(particle => particle.draw());
}

// Draw animated stars background
let stars = [];
for (let i = 0; i < 100; i++) {
    stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        speed: Math.random() * 2 + 0.5,
        size: Math.random() * 2
    });
}

function drawStars() {
    ctx.fillStyle = '#ffffff';
    stars.forEach(star => {
        ctx.globalAlpha = 0.8;
        ctx.fillRect(star.x, star.y, star.size, star.size);
        star.x -= star.speed;
        if (star.x < 0) {
            star.x = canvas.width;
            star.y = Math.random() * canvas.height;
        }
    });
    ctx.globalAlpha = 1;
}

// Game over function
function gameOver() {
    gameRunning = false;
    finalScoreElement.textContent = score;
    gameOverElement.style.display = 'block';
}

// Restart game function
function restartGame() {
    gameRunning = true;
    score = 0;
    lives = 3;
    player.x = 50;
    player.y = canvas.height / 2;
    bullets = [];
    enemies = [];
    particles = [];
    enemySpawnTimer = 0;
    enemySpawnRate = 120;
    
    scoreElement.textContent = score;
    livesElement.textContent = lives;
    gameOverElement.style.display = 'none';
}

// Game loop
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Start the game
gameLoop();
