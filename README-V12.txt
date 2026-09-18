DUST OPERATIONS — MULTIPLAYER FIX
================================

Bu paket mevcut v12 oyun içeriğini korur ve multiplayer tarafındaki fizik/oyuncu senkron sorunlarını düzeltir.

DÜZELTİLENLER
- Server-authoritative duvar çarpışması: oyuncu duvarların içinden geçemez.
- Server-authoritative kasa/engel çarpışması: kutuların içinden geçilemez ve mermiler kutunun içinden devam etmez.
- Zıplama + yerçekimi server tarafında doğrulanır.
- Reload sırasında ateş server ve client tarafında kilitlenir. Reload süresi bitince mühimmat doldurulur.
- Multiplayer ekranında T / CT takım seçimi vardır. Katılan oyuncunun seçtiği takım server tarafından korunur.
- Host bir oyuncunun takımını diğer oyunculara yanlışlıkla aktaramaz; her oyuncunun kendi takımı snapshot/start mesajında korunur.
- WebSocket endpoint aynı oyunun /ws adresini kullanır.
- Silah sesleri daha katmanlı ve güçlü transient/bass/tail yapısıyla yeniden işlendi.

CLOUDFLARE
- worker.js kökte bulunur.
- wrangler.toml main = "worker.js" olarak ayarlanmıştır.
- Worker adı cs-1-6 ile eşleştirilmiştir.
- Durable Object binding: ROOMS -> Room.
- Oyuncular Termux/npm/server çalıştırmaz; backend Cloudflare üzerinde çalışır.

DEPLOY
- GitHub reposuna paket içeriğini koy.
- Cloudflare Workers Builds için build/deploy komutu: npx wrangler deploy
- Deploy edilen /ws adresi oyun tarafından otomatik kullanılır.
