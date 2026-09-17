DUST OPERATIONS — ONLINE ROOM BUILD 2.0

BU PAKETTE
- index.html
- dust-map.js
- dust-game.js
- network.js
- server.js
- package.json
- audio/*.wav
- menu-bg.jpg
- start-server.bat
- start-server.sh

ÖZELLİKLER
- 0–64 bot seçimi; botlar T/CT tarafına dengeli dağıtılır.
- Oda kur / odaya katıl.
- Gerçek WebSocket oda bağlantısı: oyuncuların hareketleri ve atış olayları paylaşılır.
- Host Yeni Oyun'a bastığında odadaki tüm oyuncular aynı maç ayarlarıyla başlar.
- İnternet üzerinden bağlantı için server.js'in çalıştığı makineye 8080/TCP portu yönlendirilmelidir.
- Multiplayer ekranındaki SERVER ADRESİ alanına ws://PUBLIC_IP:8080 yazılabilir.
- HTTPS üzerinden yayın yapıyorsanız WSS gerekir; ters proxy/TLS kullanın.
- Zıplama + yerçekimi.
- Duvara oturan, tırmanılabilir merdivenler ve üst platformlar.
- Merdivenlerin ladderColliders verisi ve harita collision sistemi vardır.
- AK-47, M4A1, Galil, Famas, MP5, P90, XM1014, Scout, AWP, Deagle, Glock, bıçak.
- Sniper dürbünü / zoom.
- Katmanlı yerel silah ve mekanik sesleri.
- Mobil kontrol butonlarını yalnızca ayar ekranında sürükleyip KAYDET; oyun sırasında özelleştirme düğmesi görünmez.
- Atmosferik procedural sky shader, sis, ışık ve gölgeler.

KURULUM
1) Node.js kurulu olmalı.
2) Bu klasörde terminal açın.
3) npm install
4) npm start
5) Host: http://localhost:8080
6) Aynı LAN: http://HOST-LAN-IP:8080
7) İnternet: router/firewall üzerinde TCP 8080'i host makineye yönlendirin ve oyunculara http://PUBLIC-IP:8080 adresini verin.

ODA
- Host Multiplayer > ODA KUR der.
- Oda kodunu diğer oyunculara verir.
- Diğer oyuncular SERVER ADRESİ + ODA KODU ile ODAYA KATIL der.
- Host Yeni Oyun'a basınca maç başlar.

NOT
Web tarayıcısı kendi başına internete açık bir oyun sunucusu açamaz. Bu nedenle uzaktan oyuncular için server.js'in internete erişilebilir olması gerekir. Bu paket sunucu ve oda protokolünü sağlar.
