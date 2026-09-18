export function createDustGame({ THREE, scene, camera, dust }) {
  const hud = document.getElementById("hud");
  const notice = document.getElementById("notice");
  const damageOverlay = document.getElementById("damage");
  const crosshair = document.getElementById("crosshair");

  // Son genişletilmiş haritanın ölçüleri.
  // navigation eklenmişse doğrudan onu kullanır.
  const TILE = dust.navigation?.tile ?? 2;
  const OFFSET = dust.navigation?.offset ?? 60;
  const N = dust.navigation?.grid?.length ?? 60;

  const blocked = dust.isBlocked || ((x, z, radius) => {
    return dust.colliders.some(c => {
      const cx = THREE.MathUtils.clamp(x, c.minX, c.maxX);
      const cz = THREE.MathUtils.clamp(z, c.minZ, c.maxZ);
      return (x - cx) ** 2 + (z - cz) ** 2 < radius ** 2;
    });
  });

  const world = cell => cell * TILE - OFFSET;
  const otherTeam = team => team === "T" ? "CT" : "T";
  const teamName = team => team === "T" ? "TERÖRİST" : "ANTI TERÖRİST";

  // Sabit ve karşı uçlardaki takım üsleri.
  const bases = {
    T: new THREE.Vector3(world(20), 0, world(46)),
    CT: new THREE.Vector3(world(32), 0, world(10))
  };

  // ==================================================
  // HARİTADAN YÜRÜNEBİLİR ALANLARI ÇIKAR
  // ==================================================

  let grid = dust.navigation?.grid;

  if (!grid) {
    // Eski dosyada navigation yoksa gerçek zemin
    // örneklerinden yürüme ağı oluştur.
    const floorMesh = dust.group.children.find(object =>
      object.isInstancedMesh &&
      !object.castShadow &&
      object.receiveShadow
    );

    if (!floorMesh) {
      throw new Error("Genişletilmiş dust-map.js zemin ağı bulunamadı.");
    }

    grid = Array.from({ length: N }, () => Array(N).fill(false));

    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();

    for (let i = 0; i < floorMesh.count; i++) {
      floorMesh.getMatrixAt(i, matrix);
      position.setFromMatrixPosition(matrix);

      const x = Math.floor((position.x + OFFSET) / TILE);
      const z = Math.floor((position.z + OFFSET) / TILE);

      if (grid[z] && x >= 0 && x < N) grid[z][x] = true;
    }
  }

  const nodes = new Map();
  const key = (x, z) => `${x},${z}`;

  for (let z = 0; z < grid.length; z++) {
    for (let x = 0; x < grid[z].length; x++) {
      if (!grid[z][x]) continue;

      const position = new THREE.Vector3(
        world(x + 0.5), 0, world(z + 0.5)
      );

      if (blocked(position.x, position.z, 0.37)) continue;

      const id = key(x, z);
      nodes.set(id, { id, x, z, position, neighbors: [] });
    }
  }

  function clearWalk(a, b) {
    const steps = Math.max(1, Math.ceil(a.distanceTo(b) / 0.25));

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;

      if (blocked(
        THREE.MathUtils.lerp(a.x, b.x, t),
        THREE.MathUtils.lerp(a.z, b.z, t),
        0.37
      )) return false;
    }

    return true;
  }

  for (const node of nodes.values()) {
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const neighbor = nodes.get(key(node.x + dx, node.z + dz));

      if (neighbor && clearWalk(node.position, neighbor.position)) {
        node.neighbors.push(neighbor.id);
      }
    }
  }

  let walkNodes = [...nodes.values()];

  function nearest(position, list = walkNodes) {
    let best = null;
    let bestDistance = Infinity;

    for (const node of list) {
      const distance =
        (node.position.x - position.x) ** 2 +
        (node.position.z - position.z) ** 2;

      if (distance < bestDistance) {
        bestDistance = distance;
        best = node;
      }
    }

    return best;
  }

  const first = nearest(bases.T);

  if (!first) throw new Error("Yürünebilir harita alanı bulunamadı.");

  // Birbirine bağlı bölgeler.
  const visited = new Set([first.id]);
  const connected = [first];

  for (let head = 0; head < connected.length; head++) {
    for (const id of connected[head].neighbors) {
      if (visited.has(id)) continue;
      visited.add(id);
      connected.push(nodes.get(id));
    }
  }

  walkNodes = connected;

  function pathfind(position, targetId) {
    const start = nearest(position);
    if (!start || !nodes.has(targetId)) return [];

    const queue = [start.id];
    const previous = new Map([[start.id, null]]);
    let found = false;

    for (let head = 0; head < queue.length; head++) {
      const id = queue[head];

      if (id === targetId) {
        found = true;
        break;
      }

      for (const next of nodes.get(id).neighbors) {
        if (previous.has(next)) continue;
        previous.set(next, id);
        queue.push(next);
      }
    }

    if (!found) return [];

    const path = [];
    let current = targetId;

    while (current !== null) {
      path.push(nodes.get(current).position.clone());
      current = previous.get(current);
    }

    return path.reverse();
  }

  // Takım başına sabit, ayrı başlangıç noktaları.
  const spawnSlots = {};

  for (const team of ["T", "CT"]) {
    const candidates = [...walkNodes].sort((a, b) =>
      a.position.distanceToSquared(bases[team]) -
      b.position.distanceToSquared(bases[team])
    );

    const slots = [];

    for (const node of candidates) {
      if (slots.every(p => p.distanceTo(node.position) >= 1.65)) {
        slots.push(node.position.clone());
      }

      if (slots.length === 32) break;
    }

    if (slots.length < 8) {
      throw new Error("Takım başlangıç alanında yeterli yer yok.");
    }

    spawnSlots[team] = slots;
  }

  // ==================================================
  // SİLAH VERİLERİ
  // ==================================================

  const WEAPONS = {
    ak:      { name: "AK-47", damage: 34, interval: 0.115, magazine: 30, reserve: 90, reload: 2.3, spread: 0.012, range: 90, type: "rifle" },
    m4:      { name: "M4A1", damage: 28, interval: 0.095, magazine: 30, reserve: 90, reload: 2.1, spread: 0.008, range: 90, type: "rifle" },
    galil:   { name: "GALIL", damage: 29, interval: 0.105, magazine: 35, reserve: 105, reload: 2.25, spread: 0.011, range: 88, type: "rifle" },
    famas:   { name: "FAMAS", damage: 27, interval: 0.09, magazine: 25, reserve: 100, reload: 2.05, spread: 0.01, range: 86, type: "rifle" },
    mp5:     { name: "MP5", damage: 21, interval: 0.07, magazine: 30, reserve: 120, reload: 1.9, spread: 0.022, range: 62, type: "smg" },
    p90:     { name: "P90", damage: 20, interval: 0.055, magazine: 50, reserve: 150, reload: 2.2, spread: 0.02, range: 65, type: "smg" },
    xm1014:  { name: "XM1014", damage: 18, pellets: 8, interval: 0.82, magazine: 7, reserve: 35, reload: 2.5, spread: 0.075, range: 32, type: "shotgun" },
    scout:   { name: "SCOUT", damage: 72, interval: 1.05, magazine: 10, reserve: 60, reload: 2.25, spread: 0.002, range: 150, type: "sniper" },
    awp:     { name: "AWP", damage: 115, interval: 1.45, magazine: 5, reserve: 30, reload: 2.8, spread: 0.001, range: 180, type: "sniper" },
    deagle:  { name: "DEAGLE", damage: 48, interval: 0.38, magazine: 7, reserve: 35, reload: 1.8, spread: 0.009, range: 70, type: "pistol" },
    pistol:  { name: "GLOCK", damage: 25, interval: 0.28, magazine: 12, reserve: 60, reload: 1.55, spread: 0.006, range: 65, type: "pistol" },
    knife:   { name: "BIÇAK", damage: 55, interval: 0.6, magazine: 0, reserve: 0, reload: 0, spread: 0, range: 2.3, type: "knife" }
  };

  const difficulties = {
    easy: { speed: 2.5, interval: 1.05, spread: 0.075, damage: 12 },
    normal: { speed: 3, interval: 0.7, spread: 0.045, damage: 16 },
    hard: { speed: 3.5, interval: 0.45, spread: 0.024, damage: 20 }
  };

  // ==================================================
  // PAYLAŞILAN GEOMETRİ VE MALZEMELER
  // ==================================================

  const cube = new THREE.BoxGeometry(1, 1, 1);
  const sphere = new THREE.SphereGeometry(1, 12, 8);
  const capsule = new THREE.CapsuleGeometry(0.1, 0.25, 3, 8);

  const mats = {
    T: new THREE.MeshStandardMaterial({ color: 0x927247, roughness: 0.95 }),
    CT: new THREE.MeshStandardMaterial({ color: 0x3e5973, roughness: 0.95 }),
    vest: new THREE.MeshStandardMaterial({ color: 0x28312c, roughness: 0.9 }),
    skin: new THREE.MeshStandardMaterial({ color: 0xb58a68, roughness: 0.9 }),
    black: new THREE.MeshStandardMaterial({ color: 0x202528, roughness: 0.8 }),
    metal: new THREE.MeshStandardMaterial({
      color: 0x50565a, metalness: 0.55, roughness: 0.48
    }),
    wood: new THREE.MeshStandardMaterial({ color: 0x82502d, roughness: 0.8 }),
    visor: new THREE.MeshStandardMaterial({
      color: 0x18252c, roughness: 0.2, metalness: 0.25
    })
  };

  function part(parent, material, x, y, z, sx, sy, sz, geometry = cube) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    parent.add(mesh);
    return mesh;
  }

  const actors = new THREE.Group();
  scene.add(actors);

  let bots = [];
  let started = false;
  let active = false;
  let config = null;
  let skill = difficulties.normal;
  let phase = "idle";
  let phaseTime = 0;
  let roundTime = 150;
  let round = 0;
  let score = { T: 0, CT: 0 };
  let kills = 0;
  let deaths = 0;

  const player = {
    player: true,
    team: "T",
    health: 100,
    alive: true,
    position: camera.position
  };

  let inventory = [];
  let selected = 0;
  let shotCooldown = 0;
  let reloadRemaining = 0;
  let hurt = 0;
  let recoil = 0;
  let bobTime = 0;
  let messageTime = 0;
  let transientMessage = "";
  let lastHud = "";
  let scopeActive = false;
  let onEvent = null;
  let multiplayerMode = false;
  let networkId = null;

  function emit(type, data = {}) {
    if (typeof onEvent === "function") onEvent({ type, ...data });
  }

  function announce(text, seconds = 1.8) {
    transientMessage = text;
    messageTime = seconds;
  }

  function makeBot(team, slot) {
    const root = new THREE.Group();
    const bot = {
      player: false,
      team, slot, root,
      position: root.position,
      health: 100,
      alive: true,
      limbs: [],
      path: [],
      target: null,
      memory: 0,
      lastSeen: null,
      thinkTime: 0,
      cooldown: 0,
      anim: Math.random() * 6
    };

    const uniform = mats[team];

    part(root, uniform, 0, 1.13, 0, 2, 1.35, 1.4, capsule);
    part(root, mats.vest, 0, 1.18, 0.02, 0.43, 0.44, 0.31);

    part(root, mats.skin, 0, 1.61, 0, 0.145, 0.18, 0.14, sphere);
    part(root, uniform, 0, 1.73, -0.015, 0.17, 0.12, 0.17, sphere);

    // Maske ve gözlük.
    part(root, mats.black, 0, 1.55, 0.09, 0.25, 0.14, 0.12);
    part(root, mats.visor, 0, 1.66, 0.135, 0.24, 0.065, 0.035);

    for (const x of [-0.13, 0, 0.13]) {
      part(root, uniform, x, 1.13, 0.2, 0.1, 0.16, 0.09);
    }

    for (const side of [-1, 1]) {
      const leg = new THREE.Group();
      leg.position.set(side * 0.115, 0.89, 0);
      root.add(leg);

      part(leg, uniform, 0, -0.24, 0, 0.95, 1.12, 0.95, capsule);
      part(leg, uniform, 0, -0.61, 0, 0.85, 0.88, 0.85, capsule);
      part(leg, mats.black, 0, -0.8, 0.055, 0.18, 0.15, 0.29);

      bot.limbs.push(leg);

      const arm = new THREE.Group();
      arm.position.set(side * 0.27, 1.38, 0);
      arm.rotation.x = -0.72;
      root.add(arm);

      part(arm, uniform, 0, -0.19, 0, 0.78, 1.04, 0.78, capsule);
      part(arm, mats.black, 0, -0.39, 0, 0.075, 0.09, 0.075, sphere);
      bot.limbs.push(arm);
    }

    // Üçüncü şahıs silah modeli.
    part(root, mats.black, 0.13, 1.16, 0.38, 0.1, 0.13, 0.55);
    part(root, mats.metal, 0.13, 1.18, 0.75, 0.04, 0.04, 0.3);
    part(root, mats.black, 0.13, 1.03, 0.35, 0.07, 0.22, 0.12);

    root.traverse(object => {
      if (object.isMesh) {
        object.userData.actor = bot;
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });

    actors.add(root);
    return bot;
  }

  // Oyuncunun gövdesi görünmez; bot mermilerine hedef olur.
  const playerHitbox = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 1.7, 0.5),
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
      colorWrite: false
    })
  );

  playerHitbox.userData.actor = player;
  scene.add(playerHitbox);

  // ==================================================
  // BİRİNCİ ŞAHIS EL / SİLAH
  // ==================================================

  const view = new THREE.Group();
  camera.add(view);
  view.visible = false;

  function rebuildView() {
    view.clear();

    const weapon = inventory[selected]?.id;
    const uniform = mats[player.team];

    // Sağ kol ve el.
    part(view, uniform, 0.16, -0.25, -0.2, 0.095, 0.11, 0.3);
    part(view, mats.black, 0.155, -0.235, -0.38, 0.1, 0.095, 0.12);

    if (weapon === "knife") {
      part(view, mats.black, 0.155, -0.21, -0.48, 0.055, 0.065, 0.18);
      part(view, mats.metal, 0.155, -0.2, -0.65, 0.055, 0.012, 0.23);
      part(view, mats.metal, 0.155, -0.205, -0.53, 0.11, 0.02, 0.035);
    } else if (weapon === "pistol") {
      part(view, mats.black, 0.155, -0.2, -0.44, 0.07, 0.15, 0.09);
      part(view, mats.metal, 0.155, -0.13, -0.5, 0.085, 0.08, 0.29);
      part(view, mats.black, 0.155, -0.08, -0.59, 0.012, 0.025, 0.02);
    } else {
      const furniture = weapon === "ak" ? mats.wood : mats.black;

      // Sol destek kolu.
      const support = part(
        view, uniform, -0.04, -0.3, -0.36, 0.1, 0.1, 0.28
      );
      support.rotation.y = -0.4;

      part(view, mats.black, 0.015, -0.26, -0.52, 0.105, 0.08, 0.12);
      part(view, mats.black, 0.13, -0.17, -0.46, 0.1, 0.12, 0.38);
      part(view, furniture, 0.13, -0.18, -0.7, 0.09, 0.085, 0.21);
      part(view, mats.metal, 0.13, -0.155, -0.89, 0.033, 0.033, 0.25);
      part(view, furniture, 0.13, -0.18, -0.22, 0.1, 0.115, 0.18);

      const magazine = part(
        view, mats.black, 0.13, -0.285, -0.47, 0.075, 0.2, 0.11
      );

      magazine.rotation.x = weapon === "ak" ? -0.2 : 0;

      part(view, mats.black, 0.13, -0.095, -0.67, 0.055, 0.04, 0.06);
      part(view, mats.black, 0.13, -0.1, -0.93, 0.02, 0.075, 0.035);
    }

    // Dünya geometrisinin içinde kaybolmayan viewmodel.
    view.traverse(object => {
      if (!object.isMesh) return;

      // Paylaşılan dünya materyallerini değiştirmemek için kopya.
      object.material = object.material.clone();
      object.material.depthTest = false;
      object.material.depthWrite = false;
      object.material.fog = false;
      object.renderOrder = 100;
      object.frustumCulled = false;
    });
  }

  function clearViewMaterials() {
    view.traverse(object => {
      if (object.isMesh) object.material.dispose();
    });
  }

  function setWeapon(index) {
    if (!started || !player.alive) return;

    selected = (index + inventory.length) % inventory.length;
    reloadRemaining = 0;
    shotCooldown = 0.2;

    clearViewMaterials();
    rebuildView();
  }

  function cycleWeapon() {
    setWeapon(selected + 1);
  }

  function reload() {
    if (!active || phase !== "live" || !player.alive || reloadRemaining > 0) {
      return;
    }

    const item = inventory[selected];
    const weapon = WEAPONS[item.id];

    if (
      item.id === "knife" ||
      item.ammo >= weapon.magazine ||
      item.reserve <= 0
    ) return;

    reloadRemaining = weapon.reload;
    emit("reload", { weapon: item.id });
  }

  // ==================================================
  // GÖRÜŞ VE İSABET
  // ==================================================

  const mapRay = new THREE.Raycaster();
  const actorRay = new THREE.Raycaster();

  const aim = new THREE.Vector3();
  const eye = new THREE.Vector3();
  const targetPoint = new THREE.Vector3();

  function mapDistance(from, direction, range) {
    mapRay.set(from, direction);
    mapRay.near = 0.025;
    mapRay.far = range;

    const hits = mapRay.intersectObject(dust.group, true);

    const hit = hits.find(item => {
      const material = item.object.material;
      return !(material && material.transparent);
    });

    return hit ? hit.distance : range;
  }

  function clearSight(from, to) {
    aim.subVectors(to, from);
    const distance = aim.length();

    if (distance < 0.1) return true;

    aim.normalize();
    return mapDistance(from, aim, distance) >= distance - 0.12;
  }

  function actorsAlive() {
    const result = bots.filter(bot => bot.alive);
    if (player.alive) result.push(player);
    return result;
  }

  function actorCenter(actor, out) {
    out.copy(actor.position);
    out.y = actor.player ? 1.15 : actor.position.y + 1.15;
    return out;
  }

  function syncTargets() {
    playerHitbox.position.set(
      camera.position.x, 0.85, camera.position.z
    );
    playerHitbox.updateMatrixWorld(true);
    actors.updateMatrixWorld(true);
  }

  function traceActor(from, direction, range, shooter) {
    actorRay.set(from, direction);
    actorRay.near = 0.035;
    actorRay.far = range;

    const roots = bots
      .filter(bot => bot.alive && bot !== shooter)
      .map(bot => bot.root);

    if (player.alive && shooter !== player) roots.push(playerHitbox);

    const hits = actorRay.intersectObjects(roots, true);
    return hits[0] || null;
  }

  const traces = [];

  const tracerMaterial = new THREE.LineBasicMaterial({
    color: 0xffd18a,
    transparent: true,
    opacity: 0.75
  });

  function addTrace(from, to) {
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([from, to]),
      tracerMaterial
    );

    scene.add(line);
    traces.push({ line, life: 0.055 });
  }

  function applyDamage(victim, amount, attacker) {
    // Dost ateşi kesin olarak kapalı.
    if (
      phase !== "live" ||
      !victim.alive ||
      victim.team === attacker.team
    ) return;

    victim.health = Math.max(0, victim.health - amount);

    if (victim.player) {
      hurt = 0.75;
    } else {
      victim.memory = 4;
      victim.lastSeen = nearest(attacker.position).id;
      victim.thinkTime = 0;
    }

    if (victim.health > 0) return;

    victim.alive = false;

    if (victim.player) {
      deaths++;
      announce("ELENDİN — YENİ RAUNDU BEKLE", 3);
    } else {
      victim.root.visible = false;
    }

    if (attacker.player) {
      kills++;
      announce("+1 RAKİP ELENDİ");
    }
  }

  function shootPlayer() {
    if (
      !active || phase !== "live" ||
      !player.alive || shotCooldown > 0 || reloadRemaining > 0
    ) return;

    const item = inventory[selected];
    const weapon = WEAPONS[item.id];

    if (item.id !== "knife" && item.ammo <= 0) {
      reload();
      return;
    }

    if (item.id !== "knife") item.ammo--;

    shotCooldown = weapon.interval;
    recoil = item.id === "knife" ? 0.13 : 0.065;

    camera.updateMatrixWorld(true);
    syncTargets();

    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);

    direction.x += (Math.random() - 0.5) * weapon.spread;
    direction.y += (Math.random() - 0.5) * weapon.spread;
    direction.z += (Math.random() - 0.5) * weapon.spread;
    direction.normalize();

    emit("shot", {
      weapon: item.id, team: player.team, damage: weapon.damage, range: weapon.range,
      ox: camera.position.x, oy: camera.position.y, oz: camera.position.z,
      dx: direction.x, dy: direction.y, dz: direction.z
    });

    const wall = mapDistance(camera.position, direction, weapon.range);
    // Online maçta oyuncu-vs-oyuncu hasarı yalnızca sunucudan gelir.
    // Botlar yerel simülasyonda kalır.
    const hit = traceActor(camera.position, direction, wall, player);

    let distance = wall;

    if (hit) {
      distance = hit.distance;
      const victim = hit.object.userData.actor;

      if (victim.team === player.team) {
        announce("DOST ATEŞİ KAPALI", 0.7);
      } else if (!multiplayerMode || !victim.player) {
        const damage = weapon.pellets
          ? weapon.damage * Math.max(1, Math.round(weapon.pellets * 0.75))
          : weapon.damage;
        applyDamage(victim, damage, player);
        emit("hit", { weapon: item.id, target: victim.player ? "player" : "bot" });
        crosshair.style.filter = "brightness(2)";
      }
    }

    if (item.id !== "knife") {
      const end = camera.position.clone().addScaledVector(direction, distance);
      const from = camera.localToWorld(new THREE.Vector3(0.13, -0.15, -0.7));
      addTrace(from, end);
    }
  }

  function shootBot(bot, target) {
    if (!target.alive || target.team === bot.team) return;

    const from = bot.position.clone();
    from.y = 1.5;

    const center = actorCenter(target, new THREE.Vector3());
    if (!clearSight(from, center)) return;

    const distance = from.distanceTo(center);
    const spread = skill.spread * distance;

    center.x += (Math.random() - 0.5) * spread;
    center.y += (Math.random() - 0.5) * spread;
    center.z += (Math.random() - 0.5) * spread;

    const direction = center.sub(from).normalize();
    const wall = mapDistance(from, direction, 55);
    const hit = traceActor(from, direction, wall, bot);

    const end = from.clone().addScaledVector(
      direction, hit ? hit.distance : wall
    );

    addTrace(from, end);

    if (hit) {
      applyDamage(hit.object.userData.actor, skill.damage, bot);
    }
  }

  // ==================================================
  // BOT DAVRANIŞI
  // ==================================================

  function think(bot) {
    eye.copy(bot.position);
    eye.y = 1.58;

    const candidates = actorsAlive()
      .filter(actor => actor.team !== bot.team)
      .sort((a, b) =>
        bot.position.distanceToSquared(a.position) -
        bot.position.distanceToSquared(b.position)
      );

    let visibleEnemy = null;

    for (const candidate of candidates) {
      const distance = Math.hypot(
        candidate.position.x - bot.position.x,
        candidate.position.z - bot.position.z
      );

      if (distance > 38) continue;

      const angle = Math.atan2(
        candidate.position.x - bot.position.x,
        candidate.position.z - bot.position.z
      );

      const difference = Math.atan2(
        Math.sin(angle - bot.root.rotation.y),
        Math.cos(angle - bot.root.rotation.y)
      );

      if (Math.abs(difference) > 1.4 && distance > 7 && bot.memory <= 0) {
        continue;
      }

      actorCenter(candidate, targetPoint);

      if (clearSight(eye, targetPoint)) {
        visibleEnemy = candidate;
        break;
      }
    }

    bot.target = visibleEnemy;

    if (visibleEnemy) {
      bot.lastSeen = nearest(visibleEnemy.position).id;
      bot.memory = 4;

      const distance = Math.hypot(
        visibleEnemy.position.x - bot.position.x,
        visibleEnemy.position.z - bot.position.z
      );

      bot.path = distance > 10
        ? pathfind(bot.position, bot.lastSeen)
        : [];
    } else if (bot.memory > 0 && bot.lastSeen !== null) {
      bot.path = pathfind(bot.position, bot.lastSeen);
    } else if (!bot.path.length) {
      // Stratejik hedef: rakip üs.
      // Oyuncunun duvar arkasındaki konumunu kullanmaz.
      const enemyBase = bases[otherTeam(bot.team)];
      let goal;

      if (bot.position.distanceTo(enemyBase) > 12) {
        const candidates = walkNodes.filter(node =>
          node.position.distanceTo(enemyBase) < 10
        );

        goal = candidates.length
          ? candidates[Math.floor(Math.random() * candidates.length)]
          : nearest(enemyBase);
      } else {
        const nearby = walkNodes.filter(node => {
          const distance = node.position.distanceTo(bot.position);
          return distance > 6 && distance < 22;
        });

        goal = nearby.length
          ? nearby[Math.floor(Math.random() * nearby.length)]
          : nearest(enemyBase);
      }

      bot.path = pathfind(bot.position, goal.id);
    }
  }

  function updateBot(bot, dt) {
    if (!bot.alive) return;

    bot.thinkTime -= dt;
    bot.cooldown -= dt;
    bot.memory = Math.max(0, bot.memory - dt);

    if (bot.thinkTime <= 0) {
      think(bot);
      bot.thinkTime = 0.55 + Math.random() * 0.35;
    }

    let moving = false;

    if (bot.path.length) {
      const point = bot.path[0];
      const dx = point.x - bot.position.x;
      const dz = point.z - bot.position.z;
      const distance = Math.hypot(dx, dz);

      if (distance < 0.15) {
        bot.path.shift();
      } else {
        const step = Math.min(distance, skill.speed * dt);

        dust.movePlayer(
          bot.position,
          dx / distance * step,
          dz / distance * step,
          0.34
        );

        bot.root.rotation.y = Math.atan2(dx, dz);
        moving = true;
      }
    }

    if (bot.target?.alive) {
      bot.root.rotation.y = Math.atan2(
        bot.target.position.x - bot.position.x,
        bot.target.position.z - bot.position.z
      );

      if (bot.cooldown <= 0) {
        shootBot(bot, bot.target);
        bot.cooldown = skill.interval + Math.random() * 0.2;
      }
    }

    bot.anim += dt * skill.speed * 4;
    const swing = moving ? Math.sin(bot.anim) * 0.45 : 0;

    // limbs sırası: sol bacak, sol kol, sağ bacak, sağ kol.
    bot.limbs[0].rotation.x = swing;
    bot.limbs[2].rotation.x = -swing;
    bot.limbs[1].rotation.x = -0.72 - swing * 0.16;
    bot.limbs[3].rotation.x = -0.72 + swing * 0.16;

    bot.position.y = moving ? Math.abs(Math.sin(bot.anim)) * 0.02 : 0;
  }

  // ==================================================
  // RAUND SİSTEMİ
  // ==================================================

  function aliveCount(team) {
    return bots.filter(bot => bot.alive && bot.team === team).length +
      Number(player.alive && player.team === team);
  }

  function resetInventory() {
    const loadout = [
      config.primary, "m4", "galil", "famas", "mp5", "p90",
      "xm1014", "scout", "awp", "deagle", "pistol", "knife"
    ].filter((id, i, arr) => WEAPONS[id] && arr.indexOf(id) === i);

    inventory = loadout.map(id => ({
      id,
      ammo: WEAPONS[id].magazine,
      reserve: WEAPONS[id].reserve
    }));

    selected = 0;
    shotCooldown = 0;
    reloadRemaining = 0;
    recoil = 0;

    clearViewMaterials();
    rebuildView();
  }

  function beginRound() {
    round++;
    phase = "freeze";
    phaseTime = 3;
    roundTime = 150;

    player.health = 100;
    player.alive = true;

    camera.position.copy(spawnSlots[player.team][0]);
    camera.position.y = 1.7;

    for (const bot of bots) {
      bot.position.copy(spawnSlots[bot.team][bot.slot]);
      bot.root.rotation.y = bot.team === "T" ? 0 : Math.PI;
      bot.health = 100;
      bot.alive = true;
      bot.root.visible = true;
      bot.path = [];
      bot.target = null;
      bot.memory = 0;
      bot.lastSeen = null;
      bot.thinkTime = Math.random() * 0.7;
      bot.cooldown = 0.8 + Math.random();
    }

    resetInventory();
    syncTargets();
  }

  function finishRound(winner) {
    if (phase !== "live") return;

    phase = "end";
    phaseTime = 4;

    if (winner) {
      score[winner]++;
      transientMessage = `${teamName(winner)} KAZANDI`;
    } else {
      transientMessage = "SÜRE BİTTİ — BERABERE";
    }

    messageTime = 4;
  }

  function start(options) {
    config = options;
    player.team = options.team;
    skill = difficulties[options.difficulty] || difficulties.normal;

    for (const bot of bots) actors.remove(bot.root);
    bots = [];

    const requestedBots = Math.max(0, Math.min(64, Number(options.botCount ?? ((options.size - 1) * 2))));
    const teamBotCounts = {
      [player.team]: Math.floor(requestedBots / 2),
      [otherTeam(player.team)]: Math.ceil(requestedBots / 2)
    };

    for (const team of ["T", "CT"]) {
      for (let slot = 0; slot < teamBotCounts[team]; slot++) {
        bots.push(makeBot(team, slot % 32));
      }
    }

    for (const trace of traces) {
      scene.remove(trace.line);
      trace.line.geometry.dispose();
    }

    traces.length = 0;
    score = { T: 0, CT: 0 };
    kills = deaths = 0;
    round = 0;
    hurt = 0;
    messageTime = 0;
    started = true;

    beginRound();
  }

  function canMove() {
    return started && player.alive && phase === "live";
  }

  // ==================================================
  // GÜNCELLEME
  // ==================================================

  function update(dt, input) {
    active = started && input.playing;

    view.visible = active && player.alive;
    hud.style.display = active ? "block" : "none";
    notice.style.display = active ? "block" : "none";
    crosshair.style.display = active && player.alive ? "block" : "none";

    if (!active) {
      damageOverlay.style.opacity = "0";
      return;
    }

    syncTargets();

    hurt = Math.max(0, hurt - dt * 2);
    damageOverlay.style.opacity = String(hurt);

    recoil = Math.max(0, recoil - dt * 0.4);
    shotCooldown = Math.max(0, shotCooldown - dt);
    messageTime -= dt;
    crosshair.style.filter = "";

    if (reloadRemaining > 0) {
      reloadRemaining -= dt;

      if (reloadRemaining <= 0) {
        const item = inventory[selected];
        const weapon = WEAPONS[item.id];

        const amount = Math.min(
          weapon.magazine - item.ammo,
          item.reserve
        );

        item.ammo += amount;
        item.reserve -= amount;
        reloadRemaining = 0;
      }
    }

    if (phase === "freeze") {
      phaseTime -= dt;

      if (phaseTime <= 0) {
        phase = "live";
        announce("RAUND BAŞLADI");
      }
    } else if (phase === "live") {
      roundTime -= dt;

      if (input.fire) shootPlayer();

      for (const bot of bots) updateBot(bot, dt);

      const t = aliveCount("T");
      const ct = aliveCount("CT");

      if (!multiplayerMode && (t === 0 || ct === 0)) {
        finishRound(t === 0 ? "CT" : "T");
      } else if (!multiplayerMode && roundTime <= 0) {
        finishRound(null);
      }
    } else if (phase === "end") {
      phaseTime -= dt;
      if (phaseTime <= 0) beginRound();
    }

    // Silah yürüyüş / atış / şarjör hareketi.
    bobTime += dt * 9;
    const walking = canMove() ? input.movement : 0;

    view.position.set(
      Math.sin(bobTime) * 0.007 * walking,
      Math.abs(Math.cos(bobTime)) * 0.006 * walking -
        (reloadRemaining > 0 ? 0.18 : 0),
      recoil
    );

    view.rotation.set(
      recoil * 0.8,
      0,
      reloadRemaining > 0 ? -0.3 : 0
    );

    for (let i = traces.length - 1; i >= 0; i--) {
      traces[i].life -= dt;

      if (traces[i].life <= 0) {
        scene.remove(traces[i].line);
        traces[i].line.geometry.dispose();
        traces.splice(i, 1);
      }
    }

    const item = inventory[selected];
    const weapon = WEAPONS[item.id];

    const ammo = item.id === "knife"
      ? "—"
      : `${item.ammo} / ${item.reserve}`;

    const seconds = Math.max(0, Math.ceil(roundTime));
    const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

    const text =
      `T ${score.T} — ${score.CT} CT · RAUND ${round} · ${time}<br>` +
      `${player.team} · CAN ${player.health} · ${weapon.name} ${ammo}` +
      ` · K ${kills} / Ö ${deaths}<br>` +
      `HAYATTA: T ${aliveCount("T")} / CT ${aliveCount("CT")}` +
      (reloadRemaining > 0 ? " · ŞARJÖR…" : "");

    if (text !== lastHud) {
      hud.innerHTML = text;
      lastHud = text;
    }

    if (phase === "freeze") {
      notice.textContent =
        `${teamName(player.team)} · ${Math.max(1, Math.ceil(phaseTime))}`;
    } else if (phase === "end") {
      notice.textContent = transientMessage;
    } else if (messageTime > 0) {
      notice.textContent = transientMessage;
    } else if (!player.alive) {
      notice.textContent = "ELENDİN — YENİ RAUND BEKLENİYOR";
    } else {
      notice.textContent = "";
    }
  }

  function setEventHandler(handler) {
    onEvent = handler;
  }

  function setScope(activeState) {
    scopeActive = !!activeState;
    return scopeActive;
  }

  function getCurrentWeapon() {
    return inventory[selected]?.id || "ak";
  }

  function isReloading() {
    return reloadRemaining > 0;
  }

  function startAuthoritativeReload(duration) {
    const seconds = Math.max(0, Number(duration) || 0);
    if (seconds > 0) reloadRemaining = Math.max(reloadRemaining, seconds);
  }

  // Ağdaki başka bir oyuncunun ateşini yerel harita ve hitbox üzerinde doğrula.
  // Sunucu yalnızca olayı taşır; duvar ve isabet hesabı istemcide gerçek oyun
  // geometrisi üzerinden yapılır.
  function receiveRemoteShot(shot) {
    if (!active || phase !== "live" || !player.alive || !shot) return;

    const origin = new THREE.Vector3(shot.ox, shot.oy, shot.oz);
    const direction = new THREE.Vector3(shot.dx, shot.dy, shot.dz).normalize();
    const range = Number(shot.range || 100);
    const wall = mapDistance(origin, direction, range);

    const center = camera.position.clone();
    center.y = 0.95;
    const toCenter = center.sub(origin);
    const along = toCenter.dot(direction);
    if (along < 0 || along > wall + 0.05) return;

    const closest = origin.clone().addScaledVector(direction, along);
    const radius = 0.48;
    if (closest.distanceToSquared(center) > radius * radius) return;

    const attackerTeam = shot.team === "CT" ? "CT" : "T";
    if (attackerTeam === player.team) return;

    applyDamage(player, Math.max(1, Number(shot.damage || 20)), {
      player: false, team: attackerTeam, position: origin
    });
  }

  function setMultiplayer(enabled, id = null) {
    multiplayerMode = !!enabled;
    networkId = id;
  }

  function applyAuthoritativeSnapshot(state) {
    if (!multiplayerMode || !state) return;
    if (state.team === "T" || state.team === "CT") player.team = state.team;
    if (Number.isFinite(state.x) && Number.isFinite(state.z)) {
      // Soft correction: server is authoritative, but avoid visible teleport jitter.
      const dx = state.x - camera.position.x;
      const dz = state.z - camera.position.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.45) { camera.position.x = state.x; camera.position.z = state.z; }
      else { camera.position.x += dx * 0.22; camera.position.z += dz * 0.22; }
    }
    if (Number.isFinite(state.y)) camera.position.y = Math.max(1.7, state.y);
    player.health = Number.isFinite(state.health) ? state.health : player.health;
    if (state.alive === false && player.alive) {
      player.alive = false; deaths = Math.max(deaths, Number(state.deaths) || deaths + 1);
      announce("ELENDİN — SUNUCU ONAYLADI", 3);
    } else if (state.alive === true && !player.alive) {
      player.alive = true; player.health = state.health ?? 100; announce("YENİDEN DOĞDUN", 1.5);
    }
    if (Number.isFinite(state.kills)) kills = Math.max(kills, state.kills);
    if (Number.isFinite(state.deaths)) deaths = Math.max(deaths, state.deaths);
  }

  function applyAuthoritativeCombat(msg) {
    if (!multiplayerMode || !msg) return;
    if (msg.targetId === networkId) {
      player.health = Math.max(0, Number(msg.health ?? player.health));
      if (msg.damage > 0) hurt = Math.max(hurt, 0.75);
      if (msg.killed && player.alive) {
        player.alive = false;
        deaths++;
        announce("ELENDİN — SUNUCU ONAYLADI", 3);
      }
    }
    if (msg.attackerId === networkId && msg.hit) {
      crosshair.style.filter = "brightness(2)";
      if (msg.killed) { kills++; announce("+1 RAKİP ELENDİ", 1.5); }
    }
  }

  function getNetworkState() {
    return {
      player: {
        team: player.team,
        alive: player.alive,
        x: camera.position.x, y: camera.position.y, z: camera.position.z,
        ry: camera.rotation.y, rx: camera.rotation.x
      },
      bots: bots.map(bot => ({
        slot: bot.slot, team: bot.team, alive: bot.alive,
        x: bot.position.x, y: bot.position.y, z: bot.position.z,
        ry: bot.root.rotation.y, health: bot.health
      }))
    };
  }

  return {
    start, update, canMove, reload, cycleWeapon, setWeapon,
    setEventHandler, setScope, getCurrentWeapon, isReloading, startAuthoritativeReload, getNetworkState, receiveRemoteShot,
    setMultiplayer, applyAuthoritativeSnapshot, applyAuthoritativeCombat
  };
}
