DUST OPERATIONS v10
===================

Bu sürüm v2-fixed içindeki mevcut oyun içeriğini temel alır ve multiplayeri bunun üstüne ekler.

KORUNAN İÇERİK
- Kontrol özelleştirme ekranı + cihazda kaydetme
- ATEŞ / ŞARJÖR / SİLAH / DÜRBÜN / ZIPLA / KOŞ butonları
- Scope overlay ve zoom
- AK, M4A1, GALIL, FAMAS, MP5, P90, XM1014, SCOUT, AWP, DEAGLE, GLOCK, BIÇAK
- Bot sayısı 0-64 ve zorluk seçimi
- Ayrı WAV ses bankası
- Gökyüzü, atmosfer, mevcut harita ve merdiven/çatı sistemi

MULTIPLAYER
- Oda kodu otomatik oluşturulur.
- Oyuncu server IP/port yazmaz.
- Aynı web adresindeki /ws endpoint kullanılır.
- 64 gerçek oyuncuya kadar oda.
- 20 Hz server snapshot.
- Server-authoritative hareket (server pozisyonu esas alınır).
- Server-authoritative ateş cooldown + ammo.
- Server-authoritative hasar, kill ve ölüm.
- 3 saniye sonra server respawn.
- Dost ateşi kapalı.

ÖNEMLİ
Tarayıcıdaki HTML tek başına internet üzerinde sunucu oluşturamaz. Oyuncuların Termux/npm çalıştırmasına gerek yok; ancak /ws backend bir kez internete deploy edilmiş olmalıdır.

CLOUDFLARE
- wrangler.toml ve server/worker.js hazırdır.
- Worker ile statik dosyalar aynı origin'den servis edilir.
- Böylece istemci otomatik olarak wss://SITEN/wss? değil, wss://SITEN/ws adresine bağlanır.

LOCAL TEST
1. npm install
2. npm start
3. http://localhost:8080 aç

Oyuncular için server URL alanı kaldırıldı; bağlantı otomatik.
