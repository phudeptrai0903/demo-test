// Player class
class Player {
    constructor(data) {
        this.id = data.id;
        this.x = data.x;
        this.y = data.y;
        this.vx = data.vx || 0;
        this.vy = data.vy || 0;
        this.width = data.width || 40;
        this.height = data.height || 60;
        this.health = data.health || 100;
        this.maxHealth = data.maxHealth || 100;
        this.kills = data.kills || 0;
        this.deaths = data.deaths || 0;
        this.facingRight = data.facingRight !== undefined ? data.facingRight : true;
        this.isJumping = data.isJumping || false;
        this.isOnGround = data.isOnGround || false;
        this.color = data.color || '#FF6B6B';
        this.name = data.name || 'Player';
        this.currentWeapon = data.currentWeapon || 'pistol';
        this.isBlocking = data.isBlocking || false;
        this.isClone = data.isClone || false;
        this.isMini = data.isMini || false;

        // Animation
        this.animFrame = 0;
        this.animTimer = 0;
        this.isShooting = false;
        this.shootTimer = 0;
        this.meleeTimer = 0;
        this.isMelee = false;
    }

    updateState(data) {
        this.x = data.x;
        this.y = data.y;
        this.vx = data.vx || 0;
        this.vy = data.vy || 0;
        this.health = data.health;
        this.kills = data.kills;
        this.deaths = data.deaths;
        this.facingRight = data.facingRight;
        this.isJumping = data.isJumping;
        this.isOnGround = data.isOnGround;
        this.currentWeapon = data.currentWeapon || this.currentWeapon;
        this.isBlocking = data.isBlocking || false;
        this.isMini = data.isMini || false;
        // isClone is usually set on creation for client-side clones
    }

    // Alias for update to match game.js usage
    update(data) {
        this.updateState(data);
    }

    updateAnimation(deltaTime) {
        // Update animation frame
        this.animTimer += deltaTime;
        if (this.animTimer > 100) {
            this.animTimer = 0;
            if (Math.abs(this.vx) > 0.1) {
                this.animFrame = (this.animFrame + 1) % 4;
            } else {
                this.animFrame = 0;
            }
        }

        // Update shoot timer
        if (this.shootTimer > 0) {
            this.shootTimer -= deltaTime;
            if (this.shootTimer <= 0) {
                this.isShooting = false;
            }
        }

        // Update melee timer
        if (this.meleeTimer > 0) {
            this.meleeTimer -= deltaTime;
            if (this.meleeTimer <= 0) {
                this.isMelee = false;
            }
        }
    }

    shoot() {
        if (this.currentWeapon === 'knife') {
            this.isMelee = true;
            this.meleeTimer = 200;
        } else {
            this.isShooting = true;
            this.shootTimer = 100;
        }
    }

    draw(ctx, camera) {
        if (this.health <= 0) return;

        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;

        ctx.save();

        // Clone transparency
        if (this.isClone) {
            ctx.globalAlpha = 0.6;
        }

        // Flip sprite if facing left
        if (!this.facingRight) {
            ctx.translate(screenX + this.width / 2, screenY + this.height / 2);
            ctx.scale(-1, 1);
            ctx.translate(-(screenX + this.width / 2), -(screenY + this.height / 2));
        }

        // Draw player body (simple pixel art style)
        // Head
        ctx.fillStyle = this.color;
        ctx.fillRect(screenX + 12, screenY, 16, 16);

        // Body
        ctx.fillStyle = this.color;
        ctx.fillRect(screenX + 10, screenY + 16, 20, 24);

        // Arms
        const armOffset = this.isShooting || this.isMelee ? 5 : 0;
        ctx.fillStyle = this.color;
        ctx.fillRect(screenX + 5, screenY + 18 - armOffset, 8, 16);
        ctx.fillRect(screenX + 27, screenY + 18 - armOffset, 8, 16);

        // Legs (animated when moving)
        const legOffset = Math.abs(this.vx) > 0.1 ? Math.sin(this.animFrame) * 3 : 0;
        ctx.fillStyle = this.color;
        ctx.fillRect(screenX + 12, screenY + 40, 6, 20 + legOffset);
        ctx.fillRect(screenX + 22, screenY + 40, 6, 20 - legOffset);

        // Draw weapons with detailed pixel art
        this.drawWeapon(ctx, screenX, screenY);

        ctx.restore();

        // Draw name
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 12px "Courier New"';
        ctx.textAlign = 'center';
        ctx.fillText(this.name, screenX + this.width / 2, screenY - 10);

        // Draw health bar
        const barWidth = this.width;
        const barHeight = 4;
        const healthPercent = this.health / this.maxHealth;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(screenX, screenY - 5, barWidth, barHeight);

        ctx.fillStyle = healthPercent > 0.5 ? '#4CAF50' : healthPercent > 0.25 ? '#FFA500' : '#F44336';
        ctx.fillRect(screenX, screenY - 5, barWidth * healthPercent, barHeight);
    }

    drawWeapon(ctx, screenX, screenY) {
        const gunX = screenX + (this.facingRight ? 30 : 10);
        const gunY = screenY + 22;

        if (this.currentWeapon === 'pistol') {
            this.drawPistol(ctx, gunX, gunY);
        } else if (this.currentWeapon === 'assault_rifle') {
            this.drawAssaultRifle(ctx, gunX, gunY);
        } else if (this.currentWeapon === 'shotgun') {
            this.drawShotgun(ctx, gunX, gunY);
        } else if (this.currentWeapon === 'sniper') {
            this.drawSniper(ctx, gunX, gunY);
        } else if (this.currentWeapon === 'knife') {
            this.drawKnife(ctx, screenX, screenY);
        } else if (this.currentWeapon === 'shield') {
            this.drawShield(ctx, screenX, screenY);
        }
    }

    drawPistol(ctx, gunX, gunY) {
        const dir = this.facingRight ? 1 : -1;
        const offset = this.facingRight ? 0 : -14;

        // Gun body
        ctx.fillStyle = '#2C2C2C';
        ctx.fillRect(gunX + offset, gunY + (this.isShooting ? 0 : 2), 14, 6);

        // Barrel
        ctx.fillStyle = '#1A1A1A';
        ctx.fillRect(gunX + offset + (this.facingRight ? 14 : -4), gunY + (this.isShooting ? 2 : 4), 4, 2);

        // Grip
        ctx.fillStyle = '#3C3C3C';
        ctx.fillRect(gunX + offset + 2, gunY + (this.isShooting ? 6 : 8), 4, 6);

        if (this.isShooting) {
            // Muzzle flash
            ctx.fillStyle = '#FFA500';
            ctx.fillRect(gunX + offset + (this.facingRight ? 18 : -8), gunY, 6, 6);
            ctx.fillStyle = '#FFFF00';
            ctx.fillRect(gunX + offset + (this.facingRight ? 20 : -6), gunY + 2, 2, 2);
        }
    }

    drawAssaultRifle(ctx, gunX, gunY) {
        const offset = this.facingRight ? 0 : -22;

        // Gun body
        ctx.fillStyle = '#1A1A1A';
        ctx.fillRect(gunX + offset, gunY + (this.isShooting ? 0 : 2), 22, 5);

        // Barrel
        ctx.fillStyle = '#0A0A0A';
        ctx.fillRect(gunX + offset + (this.facingRight ? 22 : -6), gunY + (this.isShooting ? 1 : 3), 6, 3);

        // Stock
        ctx.fillStyle = '#2C2C2C';
        ctx.fillRect(gunX + offset + (this.facingRight ? -4 : 22), gunY + (this.isShooting ? 1 : 3), 4, 3);

        // Magazine
        ctx.fillStyle = '#3C3C3C';
        ctx.fillRect(gunX + offset + 8, gunY + (this.isShooting ? 5 : 7), 6, 8);

        // Grip
        ctx.fillStyle = '#2C2C2C';
        ctx.fillRect(gunX + offset + 14, gunY + (this.isShooting ? 5 : 7), 4, 6);

        if (this.isShooting) {
            // Muzzle flash
            ctx.fillStyle = '#FFA500';
            ctx.fillRect(gunX + offset + (this.facingRight ? 28 : -12), gunY - 2, 8, 8);
            ctx.fillStyle = '#FFFF00';
            ctx.fillRect(gunX + offset + (this.facingRight ? 30 : -10), gunY, 4, 4);
        }
    }

    drawShotgun(ctx, gunX, gunY) {
        const offset = this.facingRight ? 0 : -20;

        // Gun body (wood)
        ctx.fillStyle = '#3C2415';
        ctx.fillRect(gunX + offset, gunY + (this.isShooting ? 0 : 2), 20, 6);

        // Wide barrel
        ctx.fillStyle = '#2C1810';
        ctx.fillRect(gunX + offset + (this.facingRight ? 20 : -6), gunY + (this.isShooting ? 0 : 2), 6, 6);

        // Pump grip
        ctx.fillStyle = '#4C3020';
        ctx.fillRect(gunX + offset + 10, gunY + (this.isShooting ? 6 : 8), 6, 4);

        // Stock
        ctx.fillStyle = '#3C2415';
        ctx.fillRect(gunX + offset + (this.facingRight ? -6 : 20), gunY + (this.isShooting ? 2 : 4), 6, 4);

        if (this.isShooting) {
            // Large muzzle flash
            ctx.fillStyle = '#FFA500';
            ctx.fillRect(gunX + offset + (this.facingRight ? 26 : -18), gunY - 3, 12, 12);
            ctx.fillStyle = '#FFFF00';
            ctx.fillRect(gunX + offset + (this.facingRight ? 28 : -16), gunY - 1, 8, 8);
        }
    }

    drawSniper(ctx, gunX, gunY) {
        const offset = this.facingRight ? 0 : -28;

        // Gun body
        ctx.fillStyle = '#0A0A0A';
        ctx.fillRect(gunX + offset, gunY + (this.isShooting ? 1 : 3), 28, 4);

        // Long barrel
        ctx.fillStyle = '#1A1A1A';
        ctx.fillRect(gunX + offset + (this.facingRight ? 28 : -6), gunY + (this.isShooting ? 2 : 4), 6, 2);

        // Scope
        ctx.fillStyle = '#2C2C2C';
        ctx.fillRect(gunX + offset + 12, gunY + (this.isShooting ? -3 : -1), 8, 3);
        ctx.fillStyle = '#6699CC';
        ctx.fillRect(gunX + offset + 18, gunY + (this.isShooting ? -2 : 0), 2, 1);

        // Stock
        ctx.fillStyle = '#3C2415';
        ctx.fillRect(gunX + offset + (this.facingRight ? -6 : 22), gunY + (this.isShooting ? 2 : 4), 6, 3);

        if (this.isShooting) {
            // Muzzle flash
            ctx.fillStyle = '#00FFFF';
            ctx.fillRect(gunX + offset + (this.facingRight ? 34 : -12), gunY, 6, 6);
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(gunX + offset + (this.facingRight ? 36 : -10), gunY + 2, 2, 2);
        }
    }

    drawKnife(ctx, screenX, screenY) {
        if (this.isMelee) {
            // Slash animation
            ctx.strokeStyle = '#CCCCCC';
            ctx.lineWidth = 4;
            ctx.beginPath();
            const slashX = screenX + (this.facingRight ? 40 : 0);
            ctx.arc(slashX, screenY + 25, 25, -Math.PI / 3, Math.PI / 3);
            ctx.stroke();
        } else {
            // Knife handle
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(screenX + (this.facingRight ? 30 : 5), screenY + 26, 8, 4);

            // Knife blade
            ctx.fillStyle = '#C0C0C0';
            ctx.fillRect(screenX + (this.facingRight ? 38 : -5), screenY + 27, 12, 2);
        }
    }

    drawShield(ctx, screenX, screenY) {
        const shieldX = screenX + (this.facingRight ? -8 : 38);
        const shieldY = screenY + 15;

        // Shield body
        ctx.fillStyle = this.isBlocking ? '#4444FF' : '#6666AA';
        ctx.fillRect(shieldX, shieldY, 10, 30);

        // Shield rim
        ctx.fillStyle = '#333366';
        ctx.fillRect(shieldX, shieldY, 2, 30);
        ctx.fillRect(shieldX + 8, shieldY, 2, 30);

        if (this.isBlocking) {
            // Shield glow
            ctx.strokeStyle = '#8888FF';
            ctx.lineWidth = 3;
            ctx.strokeRect(shieldX - 2, shieldY - 2, 14, 34);
        }
    }
}
