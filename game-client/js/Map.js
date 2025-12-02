// Map class - handles platforms and background
class GameMap {
    constructor(platforms, width, height) {
        this.platforms = platforms;
        this.width = width;
        this.height = height;
    }

    draw(ctx, camera) {
        // Draw sky gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(1, '#4A90A4');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        // Draw clouds
        this.drawClouds(ctx, camera);

        // Draw distant mountains
        this.drawMountains(ctx, camera);

        // Draw platforms
        this.platforms.forEach(platform => {
            const screenX = platform.x - camera.x;
            const screenY = platform.y - camera.y;

            // Platform shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.fillRect(screenX + 2, screenY + 2, platform.width, platform.height);

            // Platform
            ctx.fillStyle = '#654321';
            ctx.fillRect(screenX, screenY, platform.width, platform.height);

            // Platform top (grass/metal)
            ctx.fillStyle = platform.y > 500 ? '#228B22' : '#8B4513';
            ctx.fillRect(screenX, screenY, platform.width, 4);

            // Platform details
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;
            ctx.strokeRect(screenX, screenY, platform.width, platform.height);
        });
    }

    drawClouds(ctx, camera) {
        const cloudPositions = [
            { x: 200, y: 80 },
            { x: 500, y: 120 },
            { x: 900, y: 60 },
            { x: 1300, y: 100 },
            { x: 1700, y: 90 }
        ];

        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        cloudPositions.forEach(cloud => {
            const screenX = cloud.x - camera.x * 0.3; // Parallax effect
            const screenY = cloud.y;

            // Simple cloud shape
            ctx.beginPath();
            ctx.arc(screenX, screenY, 20, 0, Math.PI * 2);
            ctx.arc(screenX + 25, screenY, 25, 0, Math.PI * 2);
            ctx.arc(screenX + 50, screenY, 20, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    drawMountains(ctx, camera) {
        ctx.fillStyle = 'rgba(100, 100, 150, 0.4)';

        const mountains = [
            { x: 0, height: 200 },
            { x: 300, height: 250 },
            { x: 700, height: 180 },
            { x: 1200, height: 220 },
            { x: 1600, height: 200 }
        ];

        mountains.forEach(mountain => {
            const screenX = mountain.x - camera.x * 0.5; // Parallax effect
            const baseY = ctx.canvas.height - 100;

            ctx.beginPath();
            ctx.moveTo(screenX, baseY);
            ctx.lineTo(screenX + 150, baseY - mountain.height);
            ctx.lineTo(screenX + 300, baseY);
            ctx.closePath();
            ctx.fill();
        });
    }
}
