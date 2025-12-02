// Network client - handles Socket.io communication
class NetworkClient {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.playerId = null;
        this.onInit = null;
        this.onUpdate = null;
        this.onPlayerJoined = null;
        this.onPlayerLeft = null;
        this.onPlayerKilled = null;
        this.onPlayerRespawned = null;
    }

    connect(serverAddress) {
        return new Promise((resolve, reject) => {
            try {
                // Parse server address
                let url = serverAddress;
                if (!url.startsWith('http://') && !url.startsWith('https://')) {
                    url = 'http://' + url;
                }

                this.socket = io(url);

                this.socket.on('connect', () => {
                    console.log('Connected to server');
                    this.connected = true;
                });

                this.socket.on('init', (data) => {
                    console.log('Received init data', data);
                    this.playerId = data.playerId;
                    if (this.onInit) {
                        this.onInit(data);
                    }
                    resolve(data);
                });

                this.socket.on('update', (data) => {
                    if (this.onUpdate) {
                        this.onUpdate(data);
                    }
                });

                this.socket.on('playerJoined', (player) => {
                    console.log('Player joined:', player.name);
                    if (this.onPlayerJoined) {
                        this.onPlayerJoined(player);
                    }
                });

                this.socket.on('playerLeft', (playerId) => {
                    console.log('Player left:', playerId);
                    if (this.onPlayerLeft) {
                        this.onPlayerLeft(playerId);
                    }
                });

                this.socket.on('playerKilled', (data) => {
                    console.log('Player killed:', data);
                    if (this.onPlayerKilled) {
                        this.onPlayerKilled(data);
                    }
                });

                this.socket.on('playerRespawned', (playerId) => {
                    console.log('Player respawned:', playerId);
                    if (this.onPlayerRespawned) {
                        this.onPlayerRespawned(playerId);
                    }
                });

                this.socket.on('disconnect', () => {
                    console.log('Disconnected from server');
                    this.connected = false;
                });

                this.socket.on('connect_error', (error) => {
                    console.error('Connection error:', error);
                    reject(error);
                });

            } catch (error) {
                reject(error);
            }
        });
    }

    sendInput(input) {
        if (this.socket && this.connected) {
            this.socket.emit('input', input);
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.connected = false;
        }
    }
}
