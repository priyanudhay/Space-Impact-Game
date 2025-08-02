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

// Player object - larger human character with rocket launcher
const player = {
    x: 50,
    y: canvas.height / 2,
    width: 35,
    height: 60,
    speed: 5,
    color: '#00ff00',
    animationFrame: 0,
    isMoving: false
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

// Enemy class - Coronavirus particles
class Enemy {
    constructor() {
        this.x = canvas.width;
        this.y = Math.random() * (canvas.height - 40);
        this.width = 35;
        this.height = 35;
        this.speed = 1.5 + Math.random() * 2.5;
        this.color = '#ff4444';
        this.health = 1;
        this.rotationAngle = 0;
        this.floatOffset = Math.random() * Math.PI * 2;
    }
    
    update() {
        this.x -= this.speed;
        
        // Floating movement pattern like virus particles
        this.y += Math.sin(this.x * 0.02 + this.floatOffset) * 1.5;
        this.rotationAngle += 0.05;
        
        // Keep enemy within bounds
        if (this.y < 0) this.y = 0;
        if (this.y > canvas.height - this.height) this.y = canvas.height - this.height;
    }
    
    draw() {
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        const radius = this.width / 2;
        
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(this.rotationAngle);
        
        // Main virus body (sphere)
        ctx.fillStyle = '#ff6666';
        ctx.beginPath();
        ctx.arc(0, 0, radius - 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner core
        ctx.fillStyle = '#ff4444';
        ctx.beginPath();
        ctx.arc(0, 0, radius - 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Virus spikes (corona spikes)
        ctx.fillStyle = '#ff8888';
        const spikeCount = 12;
        for (let i = 0; i < spikeCount; i++) {
            const angle = (i / spikeCount) * Math.PI * 2;
            const spikeX = Math.cos(angle) * (radius - 2);
            const spikeY = Math.sin(angle) * (radius - 2);
            const tipX = Math.cos(angle) * (radius + 4);
            const tipY = Math.sin(angle) * (radius + 4);
            
            // Draw spike as small circle
            ctx.beginPath();
            ctx.arc(tipX, tipY, 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Connect spike to body
            ctx.strokeStyle = '#ff8888';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(spikeX, spikeY);
            ctx.lineTo(tipX, tipY);
            ctx.stroke();
        }
        
        // RNA strands inside (genetic material)
        ctx.strokeStyle = '#ffaaaa';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, radius - 12, 0, Math.PI);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, radius - 15, Math.PI, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
        
        // Add glow effect around virus
        ctx.shadowColor = '#ff4444';
        ctx.shadowBlur = 10;
        ctx.fillStyle = 'rgba(255, 68, 68, 0.3)';
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius + 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
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
        player.isMoving = true;
    }
    if (keys['ArrowDown'] && player.y < canvas.height - player.height) {
        player.y += player.speed;
        player.isMoving = true;
    }
    if (keys['ArrowLeft'] && player.x > 0) {
        player.x -= player.speed;
        player.isMoving = true;
    }
    if (keys['ArrowRight'] && player.x < canvas.width / 3) {
        player.x += player.speed;
        player.isMoving = true;
    }
    if (!keys['ArrowUp'] && !keys['ArrowDown'] && !keys['ArrowLeft'] && !keys['ArrowRight']) {
        player.isMoving = false;
    }
}

// Draw player - larger human character with rocket launcher
function drawPlayer() {
    const centerX = player.x + player.width / 2;
    const centerY = player.y + player.height / 2;
    
    // Walking animation offset
    let walkOffset = 0;
    if (player.isMoving) {
        player.animationFrame += 0.3;
        walkOffset = Math.sin(player.animationFrame) * 1.5;
    }
    
    // Save context for transformations
    ctx.save();
    ctx.translate(0, walkOffset);
    
    // Head (larger and more detailed)
    ctx.fillStyle = '#ffdbac'; // Skin color
    ctx.beginPath();
    ctx.arc(centerX, player.y + 12, 10, 0, Math.PI * 2);
    ctx.fill();
    
    // Hair
    ctx.fillStyle = '#8B4513'; // Brown hair
    ctx.beginPath();
    ctx.arc(centerX, player.y + 8, 10, Math.PI, Math.PI * 2);
    ctx.fill();
    
    // Eyes (larger and more detailed)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(centerX - 4, player.y + 9, 3, 3); // Left eye white
    ctx.fillRect(centerX + 1, player.y + 9, 3, 3); // Right eye white
    ctx.fillStyle = '#000000';
    ctx.fillRect(centerX - 3, player.y + 10, 2, 2); // Left pupil
    ctx.fillRect(centerX + 2, player.y + 10, 2, 2); // Right pupil
    
    // Nose
    ctx.fillStyle = '#e6c2a6';
    ctx.fillRect(centerX - 1, player.y + 12, 2, 3);
    
    // Mouth
    ctx.fillStyle = '#000000';
    ctx.fillRect(centerX - 2, player.y + 15, 4, 1);
    
    // Neck
    ctx.fillStyle = '#ffdbac';
    ctx.fillRect(centerX - 3, player.y + 22, 6, 4);
    
    // Body (larger military vest/uniform)
    ctx.fillStyle = '#2d5016'; // Military green
    ctx.fillRect(centerX - 8, player.y + 26, 16, 20);
    
    // Vest details (larger)
    ctx.fillStyle = '#1a3009';
    ctx.fillRect(centerX - 7, player.y + 28, 14, 3); // Chest strap
    ctx.fillRect(centerX - 6, player.y + 35, 12, 2); // Belt
    ctx.fillRect(centerX - 5, player.y + 32, 10, 1); // Middle strap
    
    // Left arm (supporting rocket launcher)
    ctx.fillStyle = '#ffdbac'; // Skin
    ctx.fillRect(centerX - 12, player.y + 28, 4, 12); // Upper arm
    ctx.fillRect(centerX - 14, player.y + 40, 4, 8); // Forearm
    
    // Right arm (holding rocket launcher grip)
    ctx.fillRect(centerX + 8, player.y + 28, 4, 12); // Upper arm
    ctx.fillRect(centerX + 10, player.y + 40, 4, 8); // Forearm
    
    // Rocket Launcher (shoulder-mounted)
    ctx.fillStyle = '#444444'; // Dark gray launcher body
    ctx.fillRect(centerX - 5, player.y + 18, 20, 6); // Main tube
    ctx.fillRect(centerX + 15, player.y + 19, 8, 4); // Front section
    
    // Launcher details
    ctx.fillStyle = '#666666';
    ctx.fillRect(centerX - 3, player.y + 16, 4, 2); // Sight
    ctx.fillRect(centerX - 8, player.y + 20, 3, 2); // Grip
    ctx.fillStyle = '#222222';
    ctx.fillRect(centerX + 23, player.y + 20, 3, 2); // Muzzle
    
    // Rocket launcher support strap
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(centerX - 2, player.y + 25, 8, 2);
    
    // Rocket/Missile visible in launcher
    ctx.fillStyle = '#ff4444';
    ctx.fillRect(centerX + 16, player.y + 20, 6, 2); // Rocket body
    ctx.fillStyle = '#ffaa00';
    ctx.fillRect(centerX + 22, player.y + 20, 2, 2); // Rocket tip
    
    // Muzzle blast (when shooting)
    if (keys['Space']) {
        ctx.fillStyle = '#ffff00';
        ctx.fillRect(centerX + 26, player.y + 18, 8, 2);
        ctx.fillStyle = '#ff6600';
        ctx.fillRect(centerX + 26, player.y + 20, 12, 2);
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(centerX + 26, player.y + 22, 8, 2);
        // Smoke effect
        ctx.fillStyle = 'rgba(128, 128, 128, 0.7)';
        ctx.fillRect(centerX + 30, player.y + 17, 6, 8);
    }
    
    // Hands (larger)
    ctx.fillStyle = '#ffdbac';
    ctx.fillRect(centerX - 10, player.y + 38, 3, 4); // Left hand on launcher
    ctx.fillRect(centerX + 12, player.y + 38, 3, 4); // Right hand on grip
    
    // Legs (larger military pants)
    ctx.fillStyle = '#2d5016'; // Military green pants
    ctx.fillRect(centerX - 6, player.y + 46, 4, 14); // Left leg
    ctx.fillRect(centerX + 2, player.y + 46, 4, 14); // Right leg
    
    // Boots (larger)
    ctx.fillStyle = '#000000';
    ctx.fillRect(centerX - 7, player.y + 58, 6, 4); // Left boot
    ctx.fillRect(centerX + 1, player.y + 58, 6, 4); // Right boot
    
    // Add tactical glow effect
    ctx.shadowColor = '#00ff00';
    ctx.shadowBlur = 8;
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(player.x - 2, player.y - 2, player.width + 4, player.height + 4);
    ctx.shadowBlur = 0;
    
    ctx.restore();
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
