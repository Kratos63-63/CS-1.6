DUST OPERATIONS v12
====================

Bu sürüm v10'un mevcut oyun içeriğini korur ve multiplayer akışını değiştirir.

MULTIPLAYER AKIŞI
- MULTIPLAYER > ODA KUR: oda oluşturulur ve maç HEMEN başlar.
- Oda kodu ekranda görünür.
- Başka oyuncu aynı kodu girerse mevcut devam eden maça doğrudan girer.
- Host'un ayrıca "Yeni Oyun" butonuna basması gerekmez.

VERİ PAYLAŞIMI / SERVER OTORİTESİ
- Oyuncu inputları sunucuya gönderilir.
- Oyuncu konumu, bakışı, takım, silah, can, kill/death ve alive durumu server state'inde tutulur.
- Sunucu periyodik snapshot yayınlar.
- Ateş hızı, şarjör ve silah seçimi server tarafından doğrulanır.
- Hasar ve ölüm server tarafından hesaplanır.
- Respawn server tarafından yapılır ve tüm oyunculara yayınlanır.
- Dost ateşi kapalıdır.

DOSYALAR
- index.html: oyun + oda arayüzü
- dust-map.js: mevcut harita
- dust-game.js: mevcut oyun mekanikleri
- network.js: websocket istemcisi
- server/worker.js: Cloudflare Worker + Durable Object backend
- server.js: yerel Node/WebSocket backend
- audio/: mevcut sesler

NOT
Tarayıcıdaki oyuncular Termux/npm/server kurmaz. İnternet multiplayer için Worker backend'in bir kez web'e deploy edilmiş olması gerekir. Paket içindeki /ws endpoint'i bu backend için hazırlanmıştır.
