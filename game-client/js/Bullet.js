// Bullet class
class Bullet {
    constructor(data) {
        this.id = data.id;
        this.x = data.x;
        this.y = data.y;
        this.vx = data.vx;
        this.vy = data.vy;
        this.ownerId = data.ownerId;
        this.radius = data.radius || 4;
        this.damage = data.damage || 20;
        this.weaponType = data.weaponType || 'pistol';

        // Visual trail
        this.trail = [];
        this.maxTrailLength = this.weaponType === 'sniper' ? 8 : 5;

        // Weapon-specific colors
        this.color = this.getWeaponColor();
    }

    getWeaponColor() {
        const colors = {
            'pistol': '#FFFF00',
            'assault_rifle': '#FF8800',
            'shotgun': '#FF4444',
            'sniper': '#00FFFF'
        };
        return colors[this.weaponType] || '#FFFF00';
    }

    update(data) {
        // Store previous position for trail
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > this.maxTrailLength) {
            this.trail.shift();
        }

        this.x = data.x;
        this.y = data.y;
    }

    draw(ctx, camera) {
        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;

        // Draw trail (longer for sniper)
        if (this.trail.length > 0) {
            ctx.strokeStyle = this.weaponType === 'sniper' ? 'rgba(0, 255, 255, 0.5)' :
                this.weaponType === 'shotgun' ? 'rgba(255, 68, 68, 0.5)' :
                    this.weaponType === 'assault_rifle' ? 'rgba(255, 136, 0, 0.5)' :
                        'rgba(255, 255, 0, 0.5)';
            ctx.lineWidth = this.weaponType === 'sniper' ? 3 : 2;
            ctx.beginPath();

            for (let i = 0; i < this.trail.length; i++) {
                const trailX = this.trail[i].x - camera.x;
                const trailY = this.trail[i].y - camera.y;

                if (i === 0) {
                    ctx.moveTo(trailX, trailY);
                } else {
                    ctx.lineTo(trailX, trailY);
                }
            }

            ctx.lineTo(screenX, screenY);
            ctx.stroke();
        }

        // Draw bullet
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Glow effect (stronger for sniper)
        const glowSize = this.weaponType === 'sniper' ? 3 : 2;
        const glowColor = this.weaponType === 'sniper' ? 'rgba(0, 255, 255, 0.3)' :
            this.weaponType === 'shotgun' ? 'rgba(255, 68, 68, 0.3)' :
                this.weaponType === 'assault_rifle' ? 'rgba(255, 136, 0, 0.3)' :
                    'rgba(255, 255, 0, 0.3)';
        ctx.fillStyle = glowColor;
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.radius * glowSize, 0, Math.PI * 2);
        ctx.fill();
    }
}
