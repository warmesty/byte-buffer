const TCPClientWithReconnection = require('./tcp-client-with-reconnection');

// Örnek kullanım
async function startTCPClient() {
    console.log('🚀 TCP Client örneği başlatılıyor...\n');

    // Client oluştur
    const client = new TCPClientWithReconnection('localhost', 8080);

    // Yeniden bağlanma ayarları
    client.setReconnectionSettings({
        maxAttempts: Infinity,        // Sonsuz deneme
        initialInterval: 2000,        // 2 saniye ile başla
        maxInterval: 10000,           // Maksimum 10 saniye
        heartbeatTimeout: 5000        // 5 saniye heartbeat timeout
    });

    let messageCounter = 0;

    // Bağlantıyı başlat
    client connectivity = () => {
        console.log(`📡 Client bağlantısı kuruldu, port: ${client.port}`);
    };

    client.connect();

    // Her 3 saniyede test mesajı gönder
    const messageInterval = setInterval(() => {
        if (client.isConnectedToServer()) {
            const testMessage = `Test mesajı #${++messageCounter} - ${new Date().toLocaleTimeString()}`;
            const sent = client.send(testMessage + '\n');
            
            if (!sent) {
                console.log('⚠️ Mesaj gönderilemedi - bağlantı kopuk');
            }
        } else {
            console.log('⏳ Server\'a bağlantı bekleniyor...');
        }
    }, 3000);

    // Simulated server disconnect test (test için)
    setTimeout(() => {
        console.log('\n🧪 TEST: Simulated server disconnect testi yapılacak');
        console.log('Server\'u durdurun ve tekrar başlatın...');
        console.log('Client otomatik olarak yeniden bağlanmaya çalışacak.\n');
    }, 15000);

    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n🛑 Client kapatılıyor...');
        clearInterval(messageInterval);
        client.disconnect();
        process.exit(0);
    });

    // Bazı ek özellikler
    setTimeout(() => {
        console.log('\n📊 Bağlantı durumu:', client.isConnectedToServer() ? '✅ BAĞLI' : '❌ BAĞLI DEĞİL');
        console.log('🔢 Mesaj sayısı:', messageCounter);
    }, 30000);

    // Manuel yeniden bağlanma komutu (test için)
    process.stdin.on('data', (data) => {
        const input = data.toString().trim();
        
        if (input === 'reconnect' || input === 'r') {
            console.log('🔄 Manuel yeniden bağlanma başlatılıyor...');
            client.forceReconnect();
        } else if (input === 'status' || input === 's') {
            console.log(`📊 Durum: ${client.isConnectedToServer() ? '✅ BAĞLI' : '❌ BAĞLI DEĞİL'}`);
            console.log(`📈 Mesaj sayısı: ${messageCounter}`);
        } else if (input === 'quit' || input === 'q') {
            console.log('🛑 Çıkış yapılıyor...');
            clearInterval(messageInterval);
            client.disconnect();
            process.exit(0);
        } else {
            console.log('📝 Komutlar:');
            console.log('  r veya reconnect - Yeniden bağlan');
            console.log('  s veya status   - Durumu göster');
            console.log('  q veya quit     - Çıkış yap');
        }
    });

    console.log('\n🎯 TCP Client aktif! Komutlar için konsola yazabilirsiniz:');
    console.log('  r - yeniden bağlan');
    console.log('  s - durum');
    console.log('  q - çıkış\n');
}

// Ana fonksiyonu çalıştır
if (require.main === module) {
    startTCPClient().catch(console.error);
}

module.exports = startTCPClient;