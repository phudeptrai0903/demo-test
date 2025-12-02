// Renderer class - handles all drawing and visual effects
class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // Create explosion particles
    createExplosion(x, y, color = '#FF6B6B') {
        for (let i = 0; i < 20; i++) {
            const angle = (Math.PI * 2 * i) / 20;
            const speed = 2 + Math.random() * 3;

            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0,
                color: color,
                size: 3 + Math.random() * 3
            });
        }
    }

    // Create blood particles
    createBlood(x, y) {
        for (let i = 0; i < 10; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4 - 2,
                life: 1.0,
                color: '#8B0000',
                size: 2 + Math.random() * 2
            });
        }
    }

    // Create bullet impact particles
    createImpact(x, y) {
        for (let i = 0; i < 5; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 3,
                vy: (Math.random() - 0.5) * 3,
                life: 0.5,
                color: '#FFA500',
                size: 2
            });
        }
    }

    // Update and draw particles
    updateParticles(camera) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            // Update
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.2; // Gravity
            p.life -= 0.02;

            // Remove dead particles
            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }

            // Draw
            const screenX = p.x - camera.x;
            const screenY = p.y - camera.y;

            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = p.life;
            this.ctx.fillRect(screenX, screenY, p.size, p.size);
            this.ctx.globalAlpha = 1.0;
        }
    }

    // Draw crosshair
    drawCrosshair(mouseX, mouseY) {
        this.ctx.strokeStyle = '#FF0000';
        this.ctx.lineWidth = 2;

        // Crosshair lines
        this.ctx.beginPath();
        this.ctx.moveTo(mouseX - 10, mouseY);
        this.ctx.lineTo(mouseX - 3, mouseY);
        this.ctx.moveTo(mouseX + 3, mouseY);
        this.ctx.lineTo(mouseX + 10, mouseY);
        this.ctx.moveTo(mouseX, mouseY - 10);
        this.ctx.lineTo(mouseX, mouseY - 3);
        this.ctx.moveTo(mouseX, mouseY + 3);
        this.ctx.lineTo(mouseX, mouseY + 10);
        this.ctx.stroke();

        // Center dot
        this.ctx.fillStyle = '#FF0000';
        this.ctx.fillRect(mouseX - 1, mouseY - 1, 2, 2);
    }

    // Draw damage indicator
    drawDamageIndicator(health, maxHealth) {
        if (health < maxHealth * 0.3) {
            // Red vignette when low health
            const gradient = this.ctx.createRadialGradient(
                this.canvas.width / 2, this.canvas.height / 2, this.canvas.width * 0.3,
                this.canvas.width / 2, this.canvas.height / 2, this.canvas.width * 0.7
            );

            gradient.addColorStop(0, 'rgba(255, 0, 0, 0)');
            gradient.addColorStop(1, `rgba(255, 0, 0, ${0.3 - (health / maxHealth)})`);

            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    // Draw augments
    drawAugments(augments, camera) {
        augments.forEach(augment => {
            const screenX = augment.x - camera.x;
            const screenY = augment.y - camera.y;

            // Draw box
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 2;
            this.ctx.fillRect(screenX, screenY, augment.width, augment.height);
            this.ctx.strokeRect(screenX, screenY, augment.width, augment.height);

            // Draw icon/symbol based on type
            this.ctx.fillStyle = '#000000';
            this.ctx.font = '20px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';

            let symbol = '?';
            let color = '#CCCCCC';

            switch (augment.type) {
                case 'clone':
                    symbol = '👥';
                    color = '#9B59B6'; // Purple
                    break;
                case 'ricochet':
                    symbol = '↩️';
                    color = '#F1C40F'; // Yellow
                    break;
                case 'speed_mini':
                    symbol = '⚡';
                    color = '#2ECC71'; // Green
                    break;
            }

            // Inner color
            this.ctx.fillStyle = color;
            this.ctx.fillRect(screenX + 2, screenY + 2, augment.width - 4, augment.height - 4);

            // Symbol
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.fillText(symbol, screenX + augment.width / 2, screenY + augment.height / 2);

            // Glow effect
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = color;
            this.ctx.strokeRect(screenX, screenY, augment.width, augment.height);
            this.ctx.shadowBlur = 0;
        });
    }
}
