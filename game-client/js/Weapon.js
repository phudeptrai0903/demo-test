// Weapon types
const WeaponType = {
    PISTOL: 'pistol',
    ASSAULT_RIFLE: 'assault_rifle',
    SHOTGUN: 'shotgun',
    SNIPER: 'sniper',
    KNIFE: 'knife',
    SHIELD: 'shield'
};

// Weapon class
class Weapon {
    constructor(type) {
        this.type = type;
        this.config = this.getConfig(type);
        this.lastFireTime = 0;
        this.isAutoFiring = false;
    }

    getConfig(type) {
        const configs = {
            [WeaponType.PISTOL]: {
                name: 'Pistol',
                damage: 20,
                fireRate: 300, // ms between shots
                bulletSpeed: 12,
                spread: 0, // degrees
                recoilForce: 2,
                bulletCount: 1,
                range: 1000,
                autoFire: false,
                isMelee: false,
                canBlock: false,
                color: '#FFFF00',
                icon: '🔫'
            },
            [WeaponType.ASSAULT_RIFLE]: {
                name: 'Assault Rifle',
                damage: 15,
                fireRate: 100,
                bulletSpeed: 14,
                spread: 2,
                recoilForce: 1.5,
                bulletCount: 1,
                range: 800,
                autoFire: true,
                isMelee: false,
                canBlock: false,
                color: '#FF8800',
                icon: '🔫'
            },
            [WeaponType.SHOTGUN]: {
                name: 'Shotgun',
                damage: 15,
                fireRate: 800,
                bulletSpeed: 10,
                spread: 15,
                recoilForce: 8,
                bulletCount: 5, // 5 pellets
                range: 400,
                autoFire: false,
                isMelee: false,
                canBlock: false,
                color: '#FF4444',
                icon: '💥'
            },
            [WeaponType.SNIPER]: {
                name: 'Sniper Rifle',
                damage: 80,
                fireRate: 1500,
                bulletSpeed: 20,
                spread: 0,
                recoilForce: 12,
                bulletCount: 1,
                range: 2000,
                autoFire: false,
                isMelee: false,
                canBlock: false,
                color: '#00FFFF',
                icon: '🎯'
            },
            [WeaponType.KNIFE]: {
                name: 'Knife',
                damage: 100,
                fireRate: 500,
                bulletSpeed: 0,
                spread: 0,
                recoilForce: 0,
                bulletCount: 0,
                range: 60, // melee range
                autoFire: false,
                isMelee: true,
                canBlock: false,
                color: '#FFFFFF',
                icon: '🔪'
            },
            [WeaponType.SHIELD]: {
                name: 'Shield',
                damage: 0,
                fireRate: 0,
                bulletSpeed: 0,
                spread: 0,
                recoilForce: 0,
                bulletCount: 0,
                range: 0,
                autoFire: false,
                isMelee: false,
                canBlock: true,
                color: '#4444FF',
                icon: '🛡️'
            }
        };

        return configs[type] || configs[WeaponType.PISTOL];
    }

    canFire(currentTime) {
        return currentTime - this.lastFireTime >= this.config.fireRate;
    }

    fire(currentTime) {
        if (this.canFire(currentTime)) {
            this.lastFireTime = currentTime;
            return true;
        }
        return false;
    }

    getRecoilVector(facingRight) {
        const force = this.config.recoilForce;
        return {
            x: facingRight ? -force : force,
            y: -force * 0.3 // slight upward recoil
        };
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Weapon, WeaponType };
}
