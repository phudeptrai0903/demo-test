// Main game client
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.network = new NetworkClient();
        this.renderer = new Renderer(this.canvas);

        this.players = new Map();
        this.bullets = new Map();
        this.augments = [];
        this.clones = new Map();
        this.map = null;
        this.localPlayer = null;

        this.camera = { x: 0, y: 0 };
        this.input = {
            left: false,
            right: false,
            jump: false,
            shoot: false,
            mouseX: 0,
            mouseY: 0,
            weapon: 'pistol',
            blocking: false
        };

        this.lastTime = 0;
        this.running = false;

        this.mouseCanvasX = 0;
        this.mouseCanvasY = 0;

        this.currentWeapon = 'pistol';
        this.weaponNames = {
            'pistol': 'Pistol',
            'assault_rifle': 'Assault Rifle',
            'shotgun': 'Shotgun',
            'sniper': 'Sniper Rifle',
            'knife': 'Knife',
            'shield': 'Shield'
        };

        // Weapon fire rate control
        this.lastFireTime = 0;
        this.weaponConfigs = {
            'pistol': { fireRate: 300 },
            'assault_rifle': { fireRate: 100 },
            'shotgun': { fireRate: 800 },
            'sniper': { fireRate: 1500 },
            'knife': { fireRate: 500 },
            'shield': { fireRate: 0 }
        };

        this.setupEventListeners();
        this.resizeCanvas();
    }

    setupEventListeners() {
        // Keyboard input
        window.addEventListener('keydown', (e) => {
            if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
                this.input.left = true;
            }
            if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
                this.input.right = true;
            }
            if (e.key === 'w' || e.key === 'W' || e.key === ' ' || e.key === 'ArrowUp') {
                this.input.jump = true;
                if (this.localPlayer && this.localPlayer.isOnGround) {
                    sounds.playJump();
                }
            }
            if (e.key === 'Tab') {
                e.preventDefault();
                this.toggleScoreboard();
            }

            // Weapon switching
            if (e.key === '1') this.switchWeapon('pistol');
            if (e.key === '2') this.switchWeapon('assault_rifle');
            if (e.key === '3') this.switchWeapon('shotgun');
            if (e.key === '4') this.switchWeapon('sniper');
            if (e.key === '5') this.switchWeapon('knife');
            if (e.key === '6') this.switchWeapon('shield');
        });

        window.addEventListener('keyup', (e) => {
            if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
                this.input.left = false;
            }
            if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
                this.input.right = false;
            }
            if (e.key === 'w' || e.key === 'W' || e.key === ' ' || e.key === 'ArrowUp') {
                this.input.jump = false;
            }
        });

        // Mouse input
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseCanvasX = e.clientX - rect.left;
            this.mouseCanvasY = e.clientY - rect.top;
        });

        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Left click
                const currentTime = Date.now();
                const fireRate = this.weaponConfigs[this.currentWeapon].fireRate;

                // Check if enough time has passed since last shot
                if (currentTime - this.lastFireTime >= fireRate) {
                    this.input.shoot = true;
                    this.input.blocking = (this.currentWeapon === 'shield');
                    this.lastFireTime = currentTime;

                    if (this.localPlayer) {
                        this.localPlayer.shoot();
                        if (this.currentWeapon !== 'shield') {
                            sounds.playShoot();
                        }
                    }
                }
            }
        });

        this.canvas.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                this.input.shoot = false;
                this.input.blocking = false;
            }
        });

        // Prevent context menu
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        // Resize
        window.addEventListener('resize', () => this.resizeCanvas());

        // Scoreboard toggle
        document.getElementById('toggleScoreboard').addEventListener('click', () => {
            this.toggleScoreboard();
        });

        // Weapon selector clicks
        document.querySelectorAll('.weapon-item').forEach(item => {
            item.addEventListener('click', () => {
                const weapon = item.getAttribute('data-weapon');
                this.switchWeapon(weapon);
            });
        });
    }

    switchWeapon(weaponType) {
        this.currentWeapon = weaponType;
        this.input.weapon = weaponType;

        // Update UI
        document.getElementById('weaponName').textContent = this.weaponNames[weaponType];
        document.querySelectorAll('.weapon-item').forEach(item => {
            if (item.getAttribute('data-weapon') === weaponType) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Update local player
        if (this.localPlayer) {
            this.localPlayer.currentWeapon = weaponType;
        }
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    async connect(serverAddress, playerName) {
        try {
            const data = await this.network.connect(serverAddress);

            // Initialize game state
            this.map = new GameMap(data.platforms, data.mapWidth, data.mapHeight);

            // Create players
            data.players.forEach(playerData => {
                const player = new Player(playerData);
                this.players.set(player.id, player);

                if (player.id === this.network.playerId) {
                    this.localPlayer = player;
                    this.localPlayer.name = playerName || 'Player';
                }
            });

            // Setup network callbacks
            this.network.onUpdate = (data) => this.handleUpdate(data);
            this.network.onPlayerJoined = (playerData) => this.handlePlayerJoined(playerData);
            this.network.onPlayerLeft = (playerId) => this.handlePlayerLeft(playerId);
            this.network.onPlayerKilled = (data) => this.handlePlayerKilled(data);
            this.network.onPlayerRespawned = (playerId) => this.handlePlayerRespawned(playerId);

            // Augment events
            this.network.socket.on('augmentSpawned', (augment) => {
                // Optional: Play sound
            });

            this.network.socket.on('augmentCollected', (data) => {
                if (this.localPlayer && data.playerId === this.localPlayer.id) {
                    // Play collection sound
                    // sounds.playCollect(); 
                }
            });

            // Start game loop
            this.running = true;
            this.lastTime = performance.now();
            requestAnimationFrame((time) => this.gameLoop(time));

            return true;
        } catch (error) {
            console.error('Connection failed:', error);
            throw error;
        }
    }

    handleUpdate(data) {
        // Update players
        data.players.forEach(playerData => {
            let player = this.players.get(playerData.id);
            if (player) {
                player.update(playerData);
            } else {
                player = new Player(playerData);
                this.players.set(player.id, player);
            }
        });

        // Remove disconnected players
        const serverPlayerIds = new Set(data.players.map(p => p.id));
        for (const [id, player] of this.players) {
            if (!serverPlayerIds.has(id)) {
                this.players.delete(id);
            }
        }

        // Update bullets
        const newBullets = new Map();
        data.bullets.forEach(bulletData => {
            let bullet = this.bullets.get(bulletData.id);
            if (bullet) {
                bullet.update(bulletData);
            } else {
                bullet = new Bullet(bulletData);
            }
            bullet.bounces = bulletData.bounces; // Sync bounces
            newBullets.set(bullet.id, bullet);
        });
        this.bullets = newBullets;

        // Update augments
        this.augments = data.augments || [];

        // Update clones
        const serverCloneIds = new Set();
        if (data.clones) {
            data.clones.forEach(c => {
                serverCloneIds.add(c.id);
                if (this.clones.has(c.id)) {
                    this.clones.get(c.id).updateState(c);
                } else {
                    const newClone = new Player(c);
                    newClone.isClone = true;
                    this.clones.set(c.id, newClone);
                }
            });
        }

        // Remove missing clones
        for (const [id, clone] of this.clones) {
            if (!serverCloneIds.has(id)) {
                this.clones.delete(id);
            }
        }

        // Update local player reference
        if (this.network.socket && this.players.has(this.network.socket.id)) {
            this.localPlayer = this.players.get(this.network.socket.id);
        }
    }

    handlePlayerJoined(playerData) {
        const player = new Player(playerData);
        this.players.set(player.id, player);
        this.showKillFeed(`${player.name} joined the game`);
    }

    handlePlayerLeft(playerId) {
        const player = this.players.get(playerId);
        if (player) {
            this.showKillFeed(`${player.name} left the game`);
            this.players.delete(playerId);
        }
    }

    handlePlayerRespawned(playerId) {
        if (playerId === this.network.playerId) {
            document.getElementById('respawnMessage').style.display = 'none';
        }
    }

    gameLoop(currentTime) {
        if (!this.running) return;

        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        // Handle auto-fire for assault rifle
        if (this.input.shoot && this.currentWeapon === 'assault_rifle') {
            const fireRate = this.weaponConfigs[this.currentWeapon].fireRate;
            if (currentTime - this.lastFireTime >= fireRate) {
                this.lastFireTime = currentTime;
                if (this.localPlayer) {
                    this.localPlayer.shoot();
                    sounds.playShoot();
                }
            }
        }

        // Send input to server
        if (this.localPlayer) {
            // Convert mouse position to world coordinates
            const worldMouseX = this.mouseCanvasX + this.camera.x;
            const worldMouseY = this.mouseCanvasY + this.camera.y;

            this.input.mouseX = worldMouseX;
            this.input.mouseY = worldMouseY;

            this.network.sendInput(this.input);
        }

        // Update animations
        this.players.forEach(player => {
            player.updateAnimation(deltaTime);
        });

        // Update camera
        this.updateCamera();

        // Update HUD
        this.updateHUD();

        // Render
        this.render();

        requestAnimationFrame((time) => this.gameLoop(time));
    }

    updateCamera() {
        if (!this.localPlayer) return;

        // Center camera on local player
        const targetX = this.localPlayer.x - this.canvas.width / 2 + this.localPlayer.width / 2;
        const targetY = this.localPlayer.y - this.canvas.height / 2 + this.localPlayer.height / 2;

        // Smooth camera movement
        this.camera.x += (targetX - this.camera.x) * 0.1;
        this.camera.y += (targetY - this.camera.y) * 0.1;

        // Clamp camera to map bounds
        this.camera.x = Math.max(0, Math.min(this.camera.x, this.map.width - this.canvas.width));
        this.camera.y = Math.max(0, Math.min(this.camera.y, this.map.height - this.canvas.height));
    }

    updateHUD() {
        if (!this.localPlayer) return;

        // Update health bar
        const healthPercent = (this.localPlayer.health / this.localPlayer.maxHealth) * 100;
        document.getElementById('healthBar').style.width = healthPercent + '%';
        document.getElementById('healthText').textContent =
            `${Math.max(0, this.localPlayer.health)}/${this.localPlayer.maxHealth}`;

        // Update kills/deaths
        document.getElementById('kills').textContent = this.localPlayer.kills;
        document.getElementById('deaths').textContent = this.localPlayer.deaths;
    }

    render() {
        this.renderer.clear();

        // Draw map
        if (this.map) {
            this.map.draw(this.ctx, this.camera);
        }

        // Draw augments
        this.renderer.drawAugments(this.augments, this.camera);

        // Draw players
        this.players.forEach(player => {
            player.draw(this.ctx, this.camera);
        });

        // Draw clones
        this.clones.forEach(clone => {
            clone.draw(this.ctx, this.camera);
        });

        // Draw bullets
        this.bullets.forEach(bullet => {
            bullet.draw(this.ctx, this.camera);
        });

        // Draw particles
        this.renderer.updateParticles(this.camera);

        // Draw crosshair
        this.renderer.drawCrosshair(this.mouseCanvasX, this.mouseCanvasY);

        // Draw damage indicator
        if (this.localPlayer) {
            this.renderer.drawDamageIndicator(this.localPlayer.health, this.localPlayer.maxHealth);
        }
    }

    toggleScoreboard() {
        const scoreboard = document.getElementById('scoreboard');
        if (scoreboard.style.display === 'none') {
            scoreboard.style.display = 'block';
            this.updateScoreboard();
        } else {
            scoreboard.style.display = 'none';
        }
    }

    updateScoreboard() {
        const tbody = document.getElementById('scoreTableBody');
        tbody.innerHTML = '';

        // Sort players by kills
        const sortedPlayers = Array.from(this.players.values())
            .sort((a, b) => b.kills - a.kills);

        sortedPlayers.forEach(player => {
            const row = tbody.insertRow();
            const kd = player.deaths > 0 ? (player.kills / player.deaths).toFixed(2) : player.kills;

            row.innerHTML = `
        <td style="color: ${player.color}">${player.name}</td>
        <td>${player.kills}</td>
        <td>${player.deaths}</td>
        <td>${kd}</td>
      `;

            if (player.id === this.network.playerId) {
                row.style.background = 'rgba(78, 205, 196, 0.2)';
            }
        });
    }

    showKillFeed(message) {
        const killFeed = document.getElementById('killFeed');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'kill-message';
        messageDiv.textContent = message;

        killFeed.appendChild(messageDiv);

        // Remove after 5 seconds
        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }
}

// Initialize game
let game = null;

document.getElementById('connectBtn').addEventListener('click', async () => {
    const serverIP = document.getElementById('serverIP').value;
    const playerName = document.getElementById('playerName').value || 'Player';
    const statusDiv = document.getElementById('connectionStatus');
    const connectBtn = document.getElementById('connectBtn');

    if (!serverIP) {
        statusDiv.textContent = 'Please enter server address';
        statusDiv.style.color = '#ff6b6b';
        return;
    }

    connectBtn.disabled = true;
    statusDiv.textContent = 'Connecting...';
    statusDiv.style.color = '#4ecdc4';

    try {
        game = new Game();
        await game.connect(serverIP, playerName);

        // Switch to game screen
        document.getElementById('connectionScreen').style.display = 'none';
        document.getElementById('gameScreen').style.display = 'block';

        // Hide cursor on canvas
        game.canvas.style.cursor = 'none';

    } catch (error) {
        statusDiv.textContent = 'Connection failed: ' + error.message;
        statusDiv.style.color = '#ff6b6b';
        connectBtn.disabled = false;
        console.error('Connection error:', error);
    }
});

// Allow Enter key to connect
document.getElementById('serverIP').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('connectBtn').click();
    }
});

document.getElementById('playerName').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('connectBtn').click();
    }
});
