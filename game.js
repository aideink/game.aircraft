const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game objects
const player = {
    x: canvas.width / 2,
    y: canvas.height - 50,
    width: 50,
    height: 30,
    speed: 5
};

const gameState = {
    bullets: [],
    enemies: [],
    score: 0,
    gameOver: false,
    restartButton: {
        x: 0,
        y: 0,
        width: 200,
        height: 50
    },
    bossSpawned: false,
    bossSpawnScore: 200,  // Boss appears after this score
    level: 1,
    powerMeter: 0,
    maxPower: 100,
    particles: [],
    stars: [],
    powerupSpawnTimer: 0,
    levelComplete: false,
    levelEnemiesCleared: false,
    enemiesRequiredForLevel: 10, // Number of enemies to defeat before boss appears
    enemiesDefeatedInLevel: 0
};

// Key controls
const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    Space: false
};

// Event listeners
document.addEventListener('keydown', (e) => {
    if (e.code in keys) {
        keys[e.code] = true;
    }
});

document.addEventListener('keyup', (e) => {
    if (e.code in keys) {
        keys[e.code] = false;
    }
});

// Add this at the top of the file with other global variables
const enemyImage = new Image();
enemyImage.src = 'enemy-aircraft.svg';

// Add this near the top with other global variables
const playerImage = new Image();
playerImage.src = 'hero-aircraft.svg';

// Game functions
function createBullet() {
    return {
        x: player.x + player.width / 2,
        y: player.y,
        width: 4,
        height: 10,
        speed: 7
    };
}

function createEnemy(type = 'normal') {
    const enemyTypes = {
        normal: {
            width: 24,  // Adjusted for vertical SVG aspect ratio
            height: 40, // Adjusted for vertical SVG aspect ratio
            speed: 2,
            health: 1,
            points: 10
        },
        middle: {
            width: 36,  // Adjusted for vertical SVG aspect ratio
            height: 60, // Adjusted for vertical SVG aspect ratio
            speed: 1.5,
            health: 3,
            points: 25
        },
        boss: {
            width: 60,  // Adjusted for vertical SVG aspect ratio
            height: 100, // Adjusted for vertical SVG aspect ratio
            speed: 1,
            health: 10,
            points: 100
        }
    };

    const enemyConfig = enemyTypes[type];
    return {
        x: Math.random() * (canvas.width - enemyConfig.width),
        y: -enemyConfig.height,
        ...enemyConfig,
        type: type,
        currentHealth: enemyConfig.health
    };
}

function createParticle(x, y, color, type = 'explosion') {
    return {
        x,
        y,
        color,
        type,
        size: Math.random() * 3 + 2,
        speedX: (Math.random() - 0.5) * 8,
        speedY: (Math.random() - 0.5) * 8,
        life: 1
    };
}

function createStar() {
    return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2,
        speed: Math.random() * 0.5 + 0.1
    };
}

// Initialize stars
for (let i = 0; i < 100; i++) {
    gameState.stars.push(createStar());
}

function drawPlayer() {
    // Draw engine glow
    const gradient = ctx.createRadialGradient(
        player.x + player.width/2, player.y + player.height,
        0, player.x + player.width/2, player.y + player.height, 30
    );
    gradient.addColorStop(0, 'rgba(255, 100, 0, 0.5)');
    gradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(player.x - 15, player.y + player.height - 10, player.width + 30, 40);

    // Draw player ship using SVG
    ctx.drawImage(playerImage, player.x, player.y, player.width, player.height);
}

function drawBullets() {
    gameState.bullets.forEach(bullet => {
        // Draw bullet glow
        const gradient = ctx.createRadialGradient(
            bullet.x + bullet.width/2, bullet.y + bullet.height/2,
            0, bullet.x + bullet.width/2, bullet.y + bullet.height/2, 10
        );
        gradient.addColorStop(0, 'rgba(255, 255, 0, 0.5)');
        gradient.addColorStop(1, 'rgba(255, 255, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(bullet.x - 8, bullet.y - 8, bullet.width + 16, bullet.height + 16);

        // Draw bullet
        ctx.fillStyle = '#ffff00';
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });
}

function drawEnemies() {
    gameState.enemies.forEach(enemy => {
        // Draw enemy using SVG image
        ctx.save();
        
        // Add a red tint for boss, orange for middle enemies
        if (enemy.type === 'boss') {
            ctx.filter = 'hue-rotate(320deg) saturate(150%)';
        } else if (enemy.type === 'middle') {
            ctx.filter = 'hue-rotate(60deg) saturate(150%)';
        }
        
        ctx.drawImage(enemyImage, enemy.x, enemy.y, enemy.width, enemy.height);
        ctx.restore();
        
        // Draw health bar for middle and boss enemies
        if (enemy.type !== 'normal') {
            const healthPercentage = enemy.currentHealth / enemy.health;
            const healthBarWidth = enemy.width;
            const healthBarHeight = 5;
            
            // Health bar background
            ctx.fillStyle = '#FF0000';
            ctx.fillRect(enemy.x, enemy.y - 10, healthBarWidth, healthBarHeight);
            
            // Current health
            ctx.fillStyle = '#00FF00';
            ctx.fillRect(enemy.x, enemy.y - 10, healthBarWidth * healthPercentage, healthBarHeight);
        }
    });
}

function drawScore() {
    ctx.fillStyle = '#000000';
    ctx.font = '20px Arial';
    ctx.fillText(`Score: ${gameState.score}`, 10, 30);
}

function updatePlayer() {
    if (keys.ArrowLeft && player.x > 0) {
        player.x -= player.speed;
    }
    if (keys.ArrowRight && player.x < canvas.width - player.width) {
        player.x += player.speed;
    }
    if (keys.Space) {
        if (gameState.bullets.length < 5) {
            gameState.bullets.push(createBullet());
        }
        keys.Space = false;
    }
}

function updateBullets() {
    gameState.bullets = gameState.bullets.filter(bullet => {
        bullet.y -= bullet.speed;
        return bullet.y > 0;
    });
}

function updateEnemies() {
    // Check if level is complete (all enemies + boss defeated)
    if (gameState.levelComplete && gameState.enemies.length === 0) {
        startNextLevel();
        return;
    }

    // Check if regular enemies are cleared
    if (!gameState.levelEnemiesCleared && 
        gameState.enemiesDefeatedInLevel >= gameState.enemiesRequiredForLevel) {
        gameState.levelEnemiesCleared = true;
    }

    // Spawn boss when regular enemies are cleared
    if (gameState.levelEnemiesCleared && 
        !gameState.bossSpawned && 
        gameState.enemies.length === 0) {
        spawnBoss();
        return;
    }
    
    // Regular enemy spawning (only if not cleared and no boss present)
    if (!gameState.levelEnemiesCleared && 
        !gameState.enemies.some(e => e.type === 'boss') && 
        Math.random() < 0.02) {
        // 70% normal, 30% middle enemy
        const enemyType = Math.random() < 0.7 ? 'normal' : 'middle';
        gameState.enemies.push(createEnemy(enemyType));
    }

    // Update enemy positions
    gameState.enemies = gameState.enemies.filter(enemy => {
        enemy.y += enemy.speed;
        
        // Boss movement pattern
        if (enemy.type === 'boss') {
            // More complex boss movement
            enemy.x += Math.sin(enemy.y / 30) * 3;
            // Keep boss in bounds
            enemy.x = Math.max(0, Math.min(canvas.width - enemy.width, enemy.x));
            // Keep boss in top portion of screen
            enemy.y = Math.min(enemy.y, canvas.height / 3);
        }
        
        return enemy.y < canvas.height;
    });
}

function checkCollisions() {
    gameState.bullets.forEach((bullet, bulletIndex) => {
        gameState.enemies.forEach((enemy, enemyIndex) => {
            if (bullet.x < enemy.x + enemy.width &&
                bullet.x + bullet.width > enemy.x &&
                bullet.y < enemy.y + enemy.height &&
                bullet.y + bullet.height > enemy.y) {
                
                gameState.bullets.splice(bulletIndex, 1);
                enemy.currentHealth--;
                
                if (enemy.currentHealth <= 0) {
                    gameState.enemies.splice(enemyIndex, 1);
                    gameState.score += enemy.points;
                    destroyEnemy(enemy);
                    
                    if (enemy.type === 'boss') {
                        gameState.levelComplete = true;
                    } else {
                        gameState.enemiesDefeatedInLevel++;
                    }
                }
            }
        });
    });

    // Player collision check remains the same
    gameState.enemies.forEach(enemy => {
        if (player.x < enemy.x + enemy.width &&
            player.x + player.width > enemy.x &&
            player.y < enemy.y + enemy.height &&
            player.y + player.height > enemy.y) {
            gameState.gameOver = true;
        }
    });
}

function resetGame() {
    gameState.bullets = [];
    gameState.enemies = [];
    gameState.score = 0;
    gameState.gameOver = false;
    gameState.level = 1;
    gameState.bossSpawned = false;
    gameState.powerMeter = 0;
    gameState.levelComplete = false;
    gameState.levelEnemiesCleared = false;
    gameState.enemiesDefeatedInLevel = 0;
    gameState.enemiesRequiredForLevel = 10;
    player.x = canvas.width / 2;
    player.y = canvas.height - 50;
}

function updateParticles() {
    gameState.particles = gameState.particles.filter(particle => {
        particle.x += particle.speedX;
        particle.y += particle.speedY;
        particle.life -= 0.02;
        return particle.life > 0;
    });
}

function drawParticles() {
    gameState.particles.forEach(particle => {
        ctx.globalAlpha = particle.life;
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;
}

function updateStars() {
    gameState.stars.forEach(star => {
        star.y += star.speed;
        if (star.y > canvas.height) {
            star.y = 0;
            star.x = Math.random() * canvas.width;
        }
    });
}

function drawStars() {
    ctx.fillStyle = '#ffffff';
    gameState.stars.forEach(star => {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    });
}

function destroyEnemy(enemy) {
    const colors = ['#ff0000', '#ff8800', '#ffff00'];
    for (let i = 0; i < 20; i++) {
        gameState.particles.push(createParticle(
            enemy.x + enemy.width/2,
            enemy.y + enemy.height/2,
            colors[Math.floor(Math.random() * colors.length)]
        ));
    }
}

function updateUI() {
    document.getElementById('score').textContent = `Score: ${gameState.score}`;
    document.getElementById('level').textContent = 
        `Level: ${gameState.level} (${gameState.enemiesDefeatedInLevel}/${gameState.enemiesRequiredForLevel} enemies)`;
    document.getElementById('powerFill').style.width = 
        `${(gameState.powerMeter / gameState.maxPower) * 100}%`;
}

function gameLoop() {
    if (gameState.gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Center the restart button better
        const button = gameState.restartButton;
        button.width = 180;  // Adjusted width
        button.height = 50;
        button.x = (canvas.width / 2) - (button.width / 2);
        button.y = (canvas.height / 2) + 40;  // Moved down a bit
        
        // Draw game over text with glow
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#4488ff';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';  // Center align all text
        ctx.fillText('Game Over!', canvas.width/2, canvas.height/2 - 40);
        ctx.font = 'bold 24px Arial';
        ctx.fillText(`Final Score: ${gameState.score}`, canvas.width/2, canvas.height/2);
        ctx.fillText(`Level Reached: ${gameState.level}`, canvas.width/2, canvas.height/2 + 30);
        
        // Draw restart button with glow
        ctx.fillStyle = '#4488ff';
        ctx.fillRect(button.x, button.y, button.width, button.height);
        
        // Center the text in the button
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px Arial';
        ctx.fillText('Restart Game', canvas.width/2, button.y + 33);
        ctx.shadowBlur = 0;
        ctx.textAlign = 'left';  // Reset text alignment for rest of the game
        
        return;
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update and draw game elements
    updateStars();
    drawStars();
    
    updatePlayer();
    updateBullets();
    updateEnemies();
    updateParticles();
    checkCollisions();

    drawPlayer();
    drawBullets();
    drawEnemies();
    drawParticles();
    
    updateUI();

    requestAnimationFrame(gameLoop);
}

// Add click event listener for the restart button
canvas.addEventListener('click', (e) => {
    if (!gameState.gameOver) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const button = gameState.restartButton;

    if (clickX >= button.x && 
        clickX <= button.x + button.width && 
        clickY >= button.y && 
        clickY <= button.y + button.height) {
        resetGame();
        gameLoop();
    }
});

// Start the game
gameLoop(); 

// Add new function to spawn boss
function spawnBoss() {
    const boss = createEnemy('boss');
    boss.health = 10 + (gameState.level * 5); // Boss gets harder each level
    boss.currentHealth = boss.health;
    boss.points = 100 * gameState.level;
    gameState.enemies.push(boss);
    gameState.bossSpawned = true;
    
    // Show "BOSS BATTLE" text
    showBossWarning();
}

// Add function to show boss warning
function showBossWarning() {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#FF0000';
    ctx.font = 'bold 72px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('BOSS BATTLE!', canvas.width/2, canvas.height/2);
    ctx.restore();
}

// Add function to start next level
function startNextLevel() {
    gameState.level++;
    gameState.levelComplete = false;
    gameState.levelEnemiesCleared = false;
    gameState.bossSpawned = false;
    gameState.enemiesDefeatedInLevel = 0;
    gameState.enemiesRequiredForLevel = 10 + (gameState.level * 2); // More enemies each level
    
    // Show level start text
    showLevelStart();
}

// Add function to show level start
function showLevelStart() {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 255, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#4488ff';
    ctx.font = 'bold 72px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Level ${gameState.level}`, canvas.width/2, canvas.height/2);
    
    // Add level requirements text
    ctx.font = 'bold 24px Arial';
    ctx.fillText(`Defeat ${gameState.enemiesRequiredForLevel} enemies to reach the boss`, 
        canvas.width/2, canvas.height/2 + 50);
    ctx.restore();
} 