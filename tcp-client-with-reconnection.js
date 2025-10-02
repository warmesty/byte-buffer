const net = require('net');

class TCPClientWithReconnection {
    constructor(host, port) {
        this.host = host;
        this.port = port;
        this.socket = null;
        this.isConnected = false;
        this.shouldReconnect = true;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = Infinity; // Sonsuz yeniden deneme
        this.reconnectInterval = 1000; // Başlangıç 1 saniye
        this.maxReconnectInterval = 30000; // Maksimum 30 saniye
        this.reconnectIncrement = 1000; // Her seferinde 1 saniye artır
        this.reconnectTimeoutId = null;
        this.heartbeatInterval = null;
        this.heartbeatTimeout = 10000; // 10 saniye heartbeat timeout
    }

    // Ana bağlantı fonksiyonu
    connect() {
        console.log(`TCP Client: ${this.host}:${this.port} adresine bağlanıyor...`);
        
        this.socket = new net.Socket();
        
        // Bağlantı başarılı olduğunda
        this.socket.on('connect', () => {
            console.log('✅ Bağlantı başarılı!');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.reconnectInterval = 1000; // Reset reconnect interval
            
            // Heartbeat başlat
            this.startHeartbeat();
        });

        // Veri aldığında
        this.socket.on('data', (data) => {
            console.log('📥 Alınan veri:', data.toString());
            // Server'dan gelen heartbeat'i yakala
            if (data.toString().trim() === 'pong') {
                this.lastHeartbeatReceived = Date.now();
            }
        });

        // Bağlantı kapandığında
        this.socket.on('close', (hadError) => {
            console.log('🔌 Bağlantı kapatıldı, hata:', hadError);
            this.isConnected = false;
            this.stopHeartbeat();
            
            if (this.shouldReconnect) {
                this.scheduleReconnect();
            }
        });

        // Hata olduğunda
        this.socket.on('error', (err) => {
            console.log('❌ TCP Hatası:', err.message);
            this.isConnected = false;
            this.stopHeartbeat();
            
            if (this.shouldReconnect) {
                this.scheduleReconnect();
            }
        });

        // Socket'i bağla
        this.socket.connect(this.port, this.host);
    }

    // Yeniden bağlanma planla
    scheduleReconnect() {
        if (!this.shouldReconnect || this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('⚠️ Yeniden bağlanma durduruldu');
            return;
        }

        this.reconnectAttempts++;
        
        // Exponential backoff hesapla
        let delay = Math.min(
            this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1),
            this.maxReconnectInterval
        );

        console.log(`🔄 ${delay/1000} saniye sonra yeniden bağlanmaya çalışacak (deneme ${this.reconnectAttempts})...`);
        
        this.reconnectTimeoutId = setTimeout(() => {
            this.connect();
        }, delay);
    }

    // Heartbeat sistemi
    startHeartbeat() {
        this.lastHeartbeatReceived = Date.now();
        
        this.heartbeatInterval = setInterval(() => {
            if (!this.isConnected) return;
            
            // Server'a ping gönder
            this.socket.write('ping\n');
            
            // Timeout kontrolü
            setTimeout(() => {
                if (this.isConnected && 
                    Date.now() - this.lastHeartbeatReceived > this.heartbeatTimeout) {
                    console.log('💔 Heartbeat timeout - bağlantı kopmuş olabilir');
                    this.socket.destroy();
                }
            }, this.heartbeatTimeout / 2);
            
        }, this.heartbeatTimeout);
    }

    // Heartbeat'i durdur
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    // Veri gönder
    send(data) {
        if (this.isConnected && this.socket) {
            this.socket.write(data);
            console.log('📤 Gönderildi:', data.toString());
            return true;
        } else {
            console.log('⚠️ Bağlantı yok, veri gönderilemedi');
            return false;
        }
    }

    // Bağlantıyı kapat
    disconnect() {
        this.shouldReconnect = false;
        
        if (this.reconnectTimeoutId) {
            clearTimeout(this.reconnectTimeoutId);
        }
        
        this.stopHeartbeat();
        
        if (this.socket) {
            this.socket.destroy();
        }
        
        console.log('🔌 Client bağlantısı kapatıldı');
    }

    // Yeniden bağlanma ayarları
    setReconnectionSettings(options) {
        if (options.maxAttempts !== undefined) {
            this.maxReconnectAttempts = options.maxAttempts;
        }
        if (options.initialInterval !== undefined) {
            this.reconnectInterval = options.initialInterval;
        }
        if (options.maxInterval !== undefined) {
            this.maxReconnectInterval = options.maxInterval;
        }
        if (options.heartbeatTimeout !== undefined) {
            this.heartbeatTimeout = options.heartbeatTimeout;
        }
    }

    // Bağlantı durumunu kontrol et
    isConnectedToServer() {
        return this.isConnected;
    }

    // Manuel yeniden bağlanma
    forceReconnect() {
        console.log('🔄 Manuel yeniden bağlanma başlatılıyor...');
        if (this.socket) {
            this.socket.destroy();
        }
        this.reconnectAttempts = 0;
        this.connect();
    }
}

// Kullanım örneği
async function example() {
    const client = new TCPClientWithReconnection('localhost', 8080);
    
    // Yeniden bağlanma ayarları
    client.setReconnectionSettings({
        maxAttempts: Infinity,        // Sonsuz deneme
        initialInterval: 1000,       // 1 saniye ile başla
        maxInterval: 30000,          // Maksimum 30 saniye
        heartbeatTimeout: 10000      // 10 saniye heartbeat timeout
    });

    // Bağlantıyı başlat
    client.connect();

    // Test verisi gönder
    let messageCount = 0;
    const sendInterval = setInterval(() => {
        if (client.isConnectedToServer()) {
            const message = `Test mesajı ${++messageCount}`;
            client.send(message + '\n');
        }
    }, 5000);

    // Graceful shutdown için signal handlers
    process.on('SIGINT', () => {
        console.log('\n🛑 Çıkış yapılıyor...');
        clearInterval(sendInterval);
        client.disconnect();
        process.exit(0);
    });
}

// Export için
module.exports = TCPClientWithReconnection;

// Eğer bu dosya doğrudan çalıştırılıyorsa örneği başlat
if (require.main === module) {
    example().catch(console.error);
}