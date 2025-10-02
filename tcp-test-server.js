const net = require('net');

class TCPTestServer {
    constructor(port) {
        this.port = port;
        this.server = null;
        this.clients = new Map(); // Client'ları takip et
        this.isRunning = false;
    }

    start() {
        this.server = net.createServer((socket) => {
            const clientId = `${socket.remoteAddress}:${socket.remotePort}`;
            console.log(`🔴 Yeni client bağlandı: ${clientId}`);
            
            // Client'i takip et
            this.clients.set(clientId, socket);

            // Client'dan gelen verileri işle
            socket.on('data', (data) => {
                const message = data.toString().trim();
                console.log(`📤 ${clientId} den gelen: ${message}`);
                
                // Heartbeat ping'i için pong döndür
                if (message === 'ping') {
                    socket.write('pong');
                    console.log(`💓 Heartbeat yanıtlandı: ${clientId}`);
                } else {
                    // Echo mesajı gönder
                    const response = `Echo: ${message}`;
                    socket.write(response);
                    console.log(`📤 ${clientId} ye yanıt: ${response}`);
                }
            });

            // Client bağlantısı kesildiğinde
            socket.on('close', () => {
                console.log(`🔌 Client bağlantısı kesildi: ${clientId}`);
                this.clients.delete(clientId);
            });

            // Hata oluştuğunda
            socket.on('error', (err) => {
                console.log(`❌ Client hatası ${clientId}:`, err.message);
                this.clients.delete(clientId);
            });

            // Hoş geldin mesajı gönder
            socket.write('TCP Server'a hoş geldiniz!\n');
        });

        this.server.on('listening', () => {
            console.log(`🚀 Server ${this.port} portunda çalışıyor`);
            this.isRunning = true;
        });

        this.server.on('error', (err) => {
            console.error('❌ Server hatası:', err);
        });

        this.server.listen(this.port, () => {
            console.log(`📡 TCP Server ${this.port} portunda dinliyor...`);
        });
    }

    stop() {
        if (this.server) {
            console.log('🛑 Server kapatılıyor...');
            
            // Tüm client bağlantılarını kapat
            this.clients.forEach((socket, clientId) => {
                socket.write('Server kapatılıyor...\n');
                socket.destroy();
            });
            
            this.clients.clear();
            
            this.server.close(() => {
                console.log('✅ Server başarıyla kapatıldı');
                this.isRunning = false;
            });
        }
    }

    // Şu anda bağlı client sayısı
    getClientCount() {
        return this.clients.size;
    }

    // Bağlı client'lara mesaj gönder
    broadcast(message) {
        this.clients.forEach((socket, clientId) => {
            if (socket && !socket.destroyed) {
                socket.write(message);
                console.log(`📢 Broadcast mesajı gönderildi: ${clientId}`);
            }
        });
    }

    // Rastgele client bağlantısını kes (test için)
    disconnectRandomClient() {
        if (this.clients.size > 0) {
            const clientIds = Array.from(this.clients.keys());
            const randomClientId = clientIds[Math.floor(Math.random() * clientIds.length)];
            const socket = this.clients.get(randomClientId);
            
            console.log(`🔌 Rastgele client bağlantısı kesiliyor: ${randomClientId}`);
            socket.destroy();
            this.clients.delete(randomClientId);
        }
    }

    // Server'ın çalışıp çalışmadığını kontrol et
    isServerRunning() {
        return this.isRunning;
    }
}

// Test fonksiyonu
function runTestServer() {
    const server = new TCPTestServer(8080);
    
    server.start();

    // Test için birkaç dakika sonra yayın mesajı gönder
    setTimeout(() => {
        if (server.isServerRunning()) {
            server.broadcast('Özel mesaj: Test yayını!\n');
        }
    }, 10000);

    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n🛑 Server kapatılıyor...');
        server.stop();
        process.exit(0);
    });

    return server;
}

module.exports = TCPTestServer;

// Eğer bu dosya doğrudan çalıştırılıyorsa server'ı başlat
if (require.main === module) {
    runTestServer();
}