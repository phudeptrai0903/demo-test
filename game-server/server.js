const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = 3000;
const TICK_RATE = 60; // Server updates per second
const GRAVITY = 0.8;
const PLAYER_SPEED = 5;
const JUMP_FORCE = 15;
const MAP_WIDTH = 2000;
const MAP_HEIGHT = 600;

// Weapon types
const WeaponType = {
    PISTOL: 'pistol',
    ASSAULT_RIFLE: 'assault_rifle',
    SHOTGUN: 'shotgun',
    SNIPER: 'sniper',
    KNIFE: 'knife',
    SHIELD: 'shield'
};

// Weapon configurations
const WeaponConfigs = {
    [WeaponType.PISTOL]: { damage: 20, fireRate: 300, bulletSpeed: 12, spread: 1, recoilForce: 0.3, bulletCount: 1, range: 1000 },
    [WeaponType.ASSAULT_RIFLE]: { damage: 15, fireRate: 100, bulletSpeed: 14, spread: 5, recoilForce: 0.5, bulletCount: 1, range: 800 },
    [WeaponType.SHOTGUN]: { damage: 15, fireRate: 800, bulletSpeed: 10, spread: 20, recoilForce: 1.5, bulletCount: 5, range: 400 },
    [WeaponType.SNIPER]: { damage: 80, fireRate: 1500, bulletSpeed: 20, spread: 0, recoilForce: 1.2, bulletCount: 1, range: 2000 },
    [WeaponType.KNIFE]: { damage: 100, fireRate: 500, bulletSpeed: 0, spread: 0, recoilForce: 0, bulletCount: 0, range: 60 },
    [WeaponType.SHIELD]: { damage: 0, fireRate: 0, bulletSpeed: 0, spread: 0, recoilForce: 0, bulletCount: 0, range: 0 }
};

// Augment types
const AugmentType = {
    CLONE: 'clone',
    RICOCHET: 'ricochet',
    SPEED_MINI: 'speed_mini'
};

// Game state
const players = new Map();
const bullets = new Map();
const augments = new Map();
const clones = new Map();
let gameStarted = false;

// Platform definitions
const platforms = [
    { x: 0, y: 550, width: 2000, height: 50 }, // Ground
    { x: 300, y: 450, width: 200, height: 20 },
    { x: 600, y: 350, width: 200, height: 20 },
    { x: 900, y: 450, width: 200, height: 20 },
    { x: 1200, y: 350, width: 200, height: 20 },
    { x: 1500, y: 450, width: 200, height: 20 },
    { x: 100, y: 250, width: 150, height: 20 },
    { x: 1700, y: 250, width: 150, height: 20 },
];

// Serve static files from game-client
app.use(express.static(path.join(__dirname, '../game-client')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../game-client/game.html'));
});

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    // Create new player
    const player = {
        id: socket.id,
        x: Math.random() * (MAP_WIDTH - 100) + 50,
        y: 100,
        vx: 0,
        vy: 0,
        width: 40,
        height: 60,
        health: 100,
        maxHealth: 100,
        kills: 0,
        deaths: 0,
        facingRight: true,
        isJumping: false,
        isOnGround: false,
        color: getRandomColor(),
        name: `Player${players.size + 1}`,
        currentWeapon: WeaponType.PISTOL,
        isBlocking: false,
        lastFireTime: 0,
        // Augment states
        hasRicochet: false,
        isMini: false,
        hasClone: false
    };

    players.set(socket.id, player);

    // Send initial game state to new player
    socket.emit('init', {
        playerId: socket.id,
        players: Array.from(players.values()),
        platforms: platforms,
        mapWidth: MAP_WIDTH,
        mapHeight: MAP_HEIGHT
    });

    // Notify other players
    socket.broadcast.emit('playerJoined', player);

    // Handle player input
    socket.on('input', (input) => {
        const player = players.get(socket.id);
        if (!player || player.health <= 0) return;

        // Weapon switching
        if (input.weapon && input.weapon !== player.currentWeapon) {
            player.currentWeapon = input.weapon;
        }

        // Shield blocking
        player.isBlocking = input.blocking && player.currentWeapon === WeaponType.SHIELD;

        // Movement (slower when blocking, faster when mini)
        player.vx = 0;
        let baseSpeed = PLAYER_SPEED;
        if (player.isMini) baseSpeed *= 1.5;
        if (player.isBlocking) baseSpeed *= 0.5;

        if (input.left) {
            player.vx = -baseSpeed;
            player.facingRight = false;
        }
        if (input.right) {
            player.vx = baseSpeed;
            player.facingRight = true;
        }

        // Jumping
        if (input.jump && player.isOnGround) {
            player.vy = -JUMP_FORCE;
            player.isJumping = true;
            player.isOnGround = false;
        }

        // Shooting/Attacking
        if (input.shoot && input.mouseX !== undefined) {
            const weaponConfig = WeaponConfigs[player.currentWeapon];
            const currentTime = Date.now();

            // Check fire rate
            if (currentTime - player.lastFireTime >= weaponConfig.fireRate) {
                player.lastFireTime = currentTime;

                if (player.currentWeapon === WeaponType.KNIFE) {
                    // Melee attack
                    performMeleeAttack(socket.id, input.mouseX, input.mouseY);
                } else if (player.currentWeapon !== WeaponType.SHIELD) {
                    // Ranged weapon
                    createWeaponBullets(socket.id, input.mouseX, input.mouseY);
                }

                // Apply recoil
                if (weaponConfig.recoilForce > 0) {
                    const recoilX = player.facingRight ? -weaponConfig.recoilForce : weaponConfig.recoilForce;
                    player.vx += recoilX;
                    player.vy -= weaponConfig.recoilForce * 0.3;
                }
            }
        }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
        players.delete(socket.id);
        io.emit('playerLeft', socket.id);

        // Remove player's clone
        for (const [cloneId, clone] of clones) {
            if (clone.ownerId === socket.id) {
                clones.delete(cloneId);
            }
        }
    });
});

// Create weapon-specific bullets
function createWeaponBullets(playerId, targetX, targetY, isClone = false) {
    let player;
    let startX, startY;
    let weaponConfig;
    let currentWeapon;

    if (isClone) {
        player = clones.get(playerId);
        if (!player) return;
        // Clones use default pistol stats but maybe weaker? keeping same for now
        currentWeapon = WeaponType.PISTOL;
        weaponConfig = WeaponConfigs[currentWeapon];
        startX = player.x + (player.facingRight ? player.width : 0);
        startY = player.y + player.height / 2;
    } else {
        player = players.get(playerId);
        if (!player) return;
        currentWeapon = player.currentWeapon;
        weaponConfig = WeaponConfigs[currentWeapon];
        startX = player.x + (player.facingRight ? player.width : 0);
        startY = player.y + player.height / 2;
    }

    // Calculate base direction
    const dx = targetX - startX;
    const dy = targetY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const baseAngle = Math.atan2(dy, dx);

    // Create bullets based on weapon type
    const bulletCount = isClone ? 1 : weaponConfig.bulletCount;

    for (let i = 0; i < bulletCount; i++) {
        const bulletId = uuidv4();

        // Calculate spread
        let angle = baseAngle;
        if (weaponConfig.spread > 0 && !isClone) {
            const spreadRad = (weaponConfig.spread * Math.PI) / 180;
            if (weaponConfig.bulletCount > 1) {
                // Shotgun - distribute pellets evenly
                const offset = (i - (weaponConfig.bulletCount - 1) / 2) * (spreadRad / (weaponConfig.bulletCount - 1));
                angle = baseAngle + offset;
            } else {
                // Random spread for assault rifle
                angle = baseAngle + (Math.random() - 0.5) * spreadRad;
            }
        }

        const bullet = {
            id: bulletId,
            x: startX,
            y: startY,
            vx: Math.cos(angle) * weaponConfig.bulletSpeed,
            vy: Math.sin(angle) * weaponConfig.bulletSpeed,
            ownerId: isClone ? player.ownerId : playerId, // Owner is always the real player
            radius: currentWeapon === WeaponType.SNIPER ? 6 : (bulletCount > 1 ? 3 : 4),
            damage: weaponConfig.damage,
            weaponType: currentWeapon,
            createdAt: Date.now(),
            // Ricochet properties
            bounces: (player.hasRicochet && !isClone) ? 1 : 0
        };

        bullets.set(bulletId, bullet);
    }
}

// Melee attack for knife
function performMeleeAttack(playerId, targetX, targetY) {
    const attacker = players.get(playerId);
    if (!attacker) return;

    const weaponConfig = WeaponConfigs[WeaponType.KNIFE];
    const attackX = attacker.x + attacker.width / 2;
    const attackY = attacker.y + attacker.height / 2;

    // Check all players in melee range
    players.forEach(player => {
        if (player.id === playerId || player.health <= 0) return;

        const dx = (player.x + player.width / 2) - attackX;
        const dy = (player.y + player.height / 2) - attackY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Check if in range and in front of attacker
        const inFront = (attacker.facingRight && dx > 0) || (!attacker.facingRight && dx < 0);

        if (distance < weaponConfig.range && inFront) {
            // Hit!
            player.health -= weaponConfig.damage;

            if (player.health <= 0) {
                player.deaths++;
                attacker.kills++;

                io.emit('playerKilled', {
                    victimId: player.id,
                    killerId: playerId,
                    weapon: WeaponType.KNIFE
                });

                setTimeout(() => {
                    respawnPlayer(player);
                    io.emit('playerRespawned', player.id);
                }, 2000);
            }
        }
    });
}

// Spawn Augment
function spawnAugment() {
    if (augments.size >= 3) return; // Max 3 augments at a time

    const id = uuidv4();
    const types = Object.values(AugmentType);
    const type = types[Math.floor(Math.random() * types.length)];

    const augment = {
        id: id,
        x: Math.random() * (MAP_WIDTH - 100) + 50,
        y: 0, // Start from top
        width: 30,
        height: 30,
        type: type,
        vy: 2 // Falling speed
    };

    augments.set(id, augment);
    io.emit('augmentSpawned', augment);
}

// Spawn Clone
function spawnClone(ownerId) {
    // Remove existing clone if any
    for (const [cloneId, clone] of clones) {
        if (clone.ownerId === ownerId) {
            clones.delete(cloneId);
        }
    }

    const owner = players.get(ownerId);
    if (!owner) return;

    const cloneId = uuidv4();
    const clone = {
        id: cloneId,
        ownerId: ownerId,
        x: owner.x,
        y: owner.y,
        width: 40,
        height: 60,
        vx: 0,
        vy: 0,
        facingRight: owner.facingRight,
        lastFireTime: 0,
        health: 100 // Clones can't die currently but good to have structure
    };

    clones.set(cloneId, clone);
}

// Game loop
setInterval(() => {
    updateGame();

    // Send game state to all clients
    io.emit('update', {
        players: Array.from(players.values()),
        bullets: Array.from(bullets.values()),
        augments: Array.from(augments.values()),
        clones: Array.from(clones.values())
    });
}, 1000 / TICK_RATE);

// Augment spawner
setInterval(() => {
    if (Math.random() < 0.3) { // 30% chance every 5 seconds
        spawnAugment();
    }
}, 5000);

// Update game state
function updateGame() {
    // Update players
    players.forEach(player => {
        if (player.health <= 0) return;

        // Apply gravity
        player.vy += GRAVITY;

        // Update position
        player.x += player.vx;
        player.y += player.vy;

        // Check platform collisions
        player.isOnGround = false;
        platforms.forEach(platform => {
            if (checkPlatformCollision(player, platform)) {
                player.isOnGround = true;
                player.isJumping = false;
            }
        });

        // Boundary checks
        if (player.x < 0) player.x = 0;
        if (player.x + player.width > MAP_WIDTH) player.x = MAP_WIDTH - player.width;
        if (player.y > MAP_HEIGHT) {
            // Fall off map - respawn
            respawnPlayer(player);
        }

        // Check augment collection
        augments.forEach((augment, augmentId) => {
            if (checkCollision(player, augment)) {
                // Apply effect
                if (augment.type === AugmentType.CLONE) {
                    player.hasClone = true;
                    spawnClone(player.id);
                } else if (augment.type === AugmentType.RICOCHET) {
                    player.hasRicochet = true;
                } else if (augment.type === AugmentType.SPEED_MINI) {
                    player.isMini = true;
                    player.width = 20;
                    player.height = 30;
                }

                augments.delete(augmentId);
                io.emit('augmentCollected', { playerId: player.id, type: augment.type });
            }
        });
    });

    // Update clones
    clones.forEach(clone => {
        const owner = players.get(clone.ownerId);
        if (!owner || owner.health <= 0) {
            clones.delete(clone.id);
            return;
        }

        // Follow owner
        const dx = owner.x - clone.x;
        const dy = owner.y - clone.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Simple follow logic
        if (dist > 60) {
            clone.x += (dx / dist) * 4;
            clone.y += (dy / dist) * 4;
        }

        clone.facingRight = dx > 0;

        // Auto shoot nearest enemy
        let nearestEnemy = null;
        let minEnemyDist = 500;

        players.forEach(enemy => {
            if (enemy.id !== clone.ownerId && enemy.health > 0) {
                const edx = enemy.x - clone.x;
                const edy = enemy.y - clone.y;
                const edist = Math.sqrt(edx * edx + edy * edy);
                if (edist < minEnemyDist) {
                    minEnemyDist = edist;
                    nearestEnemy = enemy;
                }
            }
        });

        if (nearestEnemy) {
            const currentTime = Date.now();
            if (currentTime - clone.lastFireTime > 1000) { // Fire every 1s
                clone.lastFireTime = currentTime;
                createWeaponBullets(clone.id, nearestEnemy.x + nearestEnemy.width / 2, nearestEnemy.y + nearestEnemy.height / 2, true);
            }
        }
    });

    // Update augments
    augments.forEach((augment, id) => {
        augment.y += augment.vy;

        // Check platform collisions for augments
        platforms.forEach(platform => {
            if (augment.y + augment.height > platform.y &&
                augment.y < platform.y + platform.height &&
                augment.x + augment.width > platform.x &&
                augment.x < platform.x + platform.width) {
                augment.y = platform.y - augment.height;
                augment.vy = 0;
            }
        });

        if (augment.y > MAP_HEIGHT) {
            augments.delete(id);
        }
    });

    // Update bullets
    bullets.forEach((bullet, bulletId) => {
        bullet.x += bullet.vx;
        bullet.y += bullet.vy;

        // Remove bullets that are out of bounds or too old
        if (bullet.x < 0 || bullet.x > MAP_WIDTH ||
            bullet.y < 0 || bullet.y > MAP_HEIGHT ||
            Date.now() - bullet.createdAt > 3000) {
            bullets.delete(bulletId);
            return;
        }

        // Check platform collisions for ricochet
        let hitPlatform = false;
        platforms.forEach(platform => {
            if (!hitPlatform &&
                bullet.x > platform.x && bullet.x < platform.x + platform.width &&
                bullet.y > platform.y && bullet.y < platform.y + platform.height) {

                if (bullet.bounces > 0) {
                    // Bounce!
                    bullet.vy = -bullet.vy; // Simple vertical bounce
                    bullet.bounces--;
                    hitPlatform = true;
                } else {
                    bullets.delete(bulletId);
                    hitPlatform = true;
                }
            }
        });
        if (hitPlatform) return;

        // Check bullet-player collisions
        players.forEach(player => {
            if (player.id === bullet.ownerId || player.health <= 0) return;

            // Shield blocking
            if (player.isBlocking) {
                const dx = bullet.x - (player.x + player.width / 2);
                const blockDirection = player.facingRight ? 1 : -1;
                const bulletDirection = dx > 0 ? 1 : -1;

                // Block if bullet is coming from the front
                if (blockDirection === bulletDirection) {
                    const dy = bullet.y - (player.y + player.height / 2);
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < player.width + 20) {
                        bullets.delete(bulletId);
                        io.emit('bulletBlocked', { playerId: player.id, bulletId: bulletId });
                        return;
                    }
                }
            }

            const dx = bullet.x - (player.x + player.width / 2);
            const dy = bullet.y - (player.y + player.height / 2);
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < player.width / 2 + bullet.radius) {
                // Hit!
                player.health -= bullet.damage;
                bullets.delete(bulletId);

                if (player.health <= 0) {
                    player.deaths++;
                    const shooter = players.get(bullet.ownerId);
                    if (shooter) {
                        shooter.kills++;
                    }

                    io.emit('playerKilled', {
                        victimId: player.id,
                        killerId: bullet.ownerId,
                        weapon: bullet.weaponType
                    });

                    // Respawn after delay
                    setTimeout(() => {
                        respawnPlayer(player);
                        io.emit('playerRespawned', player.id);
                    }, 2000);
                }
            }
        });
    });
}

function checkCollision(rect1, rect2) {
    return (rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y);
}

function checkPlatformCollision(player, platform) {
    // Simple AABB collision with "feet" check
    if (player.x < platform.x + platform.width &&
        player.x + player.width > platform.x &&
        player.y + player.height >= platform.y &&
        player.y + player.height <= platform.y + platform.height + 10 && // Tolerance
        player.vy >= 0) { // Only collide when falling

        player.y = platform.y - player.height;
        player.vy = 0;
        return true;
    }
    return false;
}

function respawnPlayer(player) {
    player.health = player.maxHealth;
    player.x = Math.random() * (MAP_WIDTH - 100) + 50;
    player.y = 100;
    player.vx = 0;
    player.vy = 0;
    player.currentWeapon = WeaponType.PISTOL;
    player.isBlocking = false;
    // Reset augments
    player.hasRicochet = false;
    player.isMini = false;
    player.hasClone = false;
    player.width = 40;
    player.height = 60;

    // Remove clone if any
    for (const [cloneId, clone] of clones) {
        if (clone.ownerId === player.id) {
            clones.delete(cloneId);
        }
    }
}

function getRandomColor() {
    const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#FF9F43', '#54A0FF', '#5F27CD'];
    return colors[Math.floor(Math.random() * colors.length)];
}

server.listen(PORT, () => {
    console.log('==================================================');
    console.log('🎮 LAN Shooter Game Server Started!');
    console.log('==================================================');
    console.log(`Local: http://localhost:${PORT}`);

    // Get local IP
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                console.log(`LAN:   http://${net.address}:${PORT}`);
            }
        }
    }
    console.log('==================================================');
    console.log('Share the LAN address with other players on your network!');
    console.log('==================================================');
});
