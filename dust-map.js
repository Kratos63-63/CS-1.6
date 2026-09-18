import * as THREE from
"https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js";

export function createDustMap() {
  const group = new THREE.Group();
  group.name = "DustExpanded";

  const colliders = [];
  const N = 80;
  const TILE = 2;
  const HEIGHT = 6;
  const OFFSET = N * TILE / 2;

  const grid = Array.from(
    { length: N },
    () => Array(N).fill(false)
  );

  const world = value => value * TILE - OFFSET;

  let seed = 421;

  function random() {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  }

  function carve(x1, z1, x2, z2) {
    for (let z = z1; z < z2; z++) {
      for (let x = x1; x < x2; x++) {
        grid[z][x] = true;
      }
    }
  }

  function isFloor(x, z) {
    return (
      x >= 0 && z >= 0 &&
      x < N && z < N &&
      grid[z][x]
    );
  }

  // ---------------------------------------------------
  // HARİTA PLANI
  // ---------------------------------------------------

  // İlk haritanın ana bölgeleri.
  carve(16, 30, 24, 36);
  carve(13, 24, 27, 31);
  carve(7, 25, 16, 28);
  carve(7, 14, 11, 28);
  carve(3, 5, 15, 15);

  carve(14, 8, 24, 11);
  carve(18, 10, 23, 25);
  carve(22, 10, 29, 13);

  carve(27, 4, 37, 15);
  carve(29, 14, 33, 29);
  carve(24, 26, 33, 29);

  carve(21, 1, 30, 6);
  carve(21, 5, 24, 11);

  // Yeni doğu geçidi ve geniş pazar avlusu.
  carve(36, 9, 44, 13);
  carve(42, 5, 56, 20);

  // Yeni doğu uzun yolu.
  carve(46, 19, 50, 44);

  // Yeni güneydoğu depo avlusu.
  carve(35, 40, 55, 54);

  // Güney bağlantısı ve yeni başlangıç avlusu.
  carve(19, 48, 36, 52);
  carve(12, 40, 27, 54);
  carve(18, 35, 22, 41);

  // Orta bölgeden depoya ikinci rota.
  carve(30, 27, 34, 43);
  carve(33, 40, 37, 44);

  // Sol tarafta yeni yan yol.
  carve(4, 27, 8, 44);
  carve(7, 40, 13, 44);
  carve(7, 26, 10, 29);

  // ---------------------------------------------------
  // GENİŞLETİLMİŞ HARİTA — YENİ BAĞLANTILAR
  // Mevcut Dust yollarına dokunmadan dış halkayı büyütür.
  // ---------------------------------------------------
  carve(56, 12, 69, 19);       // Doğu meydanı
  carve(62, 18, 67, 40);       // Doğu ana geçit
  carve(54, 36, 67, 43);       // Doğu-güney bağlantısı
  carve(50, 52, 67, 61);       // Güneydoğu meydanı
  carve(36, 54, 43, 66);       // Güney koridoru
  carve(20, 53, 27, 67);       // Güneybatı koridoru
  carve(8, 46, 22, 53);        // Batı bağlantısı
  carve(3, 42, 9, 55);          // Batı dış geçidi
  carve(4, 15, 10, 25);         // Kuzeybatı bağlantısı
  carve(8, 10, 18, 17);         // Kuzeybatı avlu
  carve(50, 4, 63, 11);         // Kuzeydoğu avlu
  carve(61, 6, 69, 15);         // Kuzeydoğu kapı yolu

  // Dış halkayı birbirine bağlayan dar geçitler.
  carve(68, 16, 71, 43);
  carve(64, 40, 71, 56);
  carve(56, 59, 64, 66);
  carve(26, 63, 56, 68);
  carve(6, 52, 26, 58);

  // ---------------------------------------------------
  // MERDİVEN / YÜKSELTİ GEÇİŞLERİ İÇİN ZEMİN ALANLARI
  // Basamakların kendisi aşağıdaki geometri bölümünde eklenir.
  // ---------------------------------------------------
  carve(43, 21, 49, 30);
  carve(48, 26, 57, 31);
  carve(27, 44, 35, 50);

  // ---------------------------------------------------
  // PROSEDÜREL RENK + KABARTMA DOKULARI
  // ---------------------------------------------------

  function makeSurface(kind) {
    const size = kind === "wall" ? 1024 : 512;

    const canvas = document.createElement("canvas");
    const relief = document.createElement("canvas");

    canvas.width = canvas.height = size;
    relief.width = relief.height = size;

    const ctx = canvas.getContext("2d");
    const bump = relief.getContext("2d");

    ctx.fillStyle =
      kind === "wood" ? "#665033" : "#71634c";
    ctx.fillRect(0, 0, size, size);

    bump.fillStyle = "#444";
    bump.fillRect(0, 0, size, size);

    if (kind === "wood") {
      const plankWidth = size / 8;

      for (let i = 0; i < 8; i++) {
        const light = 28 + random() * 12;

        ctx.fillStyle = `hsl(34, 35%, ${light}%)`;
        ctx.fillRect(
          i * plankWidth + 2,
          0,
          plankWidth - 4,
          size
        );

        bump.fillStyle = "#b5b5b5";
        bump.fillRect(
          i * plankWidth + 2,
          0,
          plankWidth - 4,
          size
        );
      }

      // Ahşap damarları.
      for (let i = 0; i < 420; i++) {
        const x = random() * size;
        const y = random() * size;
        const length = 30 + random() * 180;

        ctx.strokeStyle = random() > 0.5
          ? "rgba(235,192,120,.16)"
          : "rgba(36,22,9,.25)";

        ctx.lineWidth = 0.5 + random() * 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.bezierCurveTo(
          x + 5, y + length / 3,
          x - 5, y + length * 0.7,
          x + 2, y + length
        );
        ctx.stroke();
      }

      // Budaklar.
      for (let i = 0; i < 12; i++) {
        const x = random() * size;
        const y = random() * size;

        for (let r = 2; r < 12; r += 2) {
          ctx.strokeStyle = "rgba(39,24,12,.24)";
          ctx.beginPath();
          ctx.ellipse(x, y, r, r * 2.8, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    } else {
      const brickWidth = kind === "wall" ? 256 : 128;
      const brickHeight = kind === "wall" ? 128 : 128;

      for (let row = 0; row < size / brickHeight; row++) {
        const offset = row % 2 ? brickWidth / 2 : 0;

        for (let column = -1;
             column <= size / brickWidth;
             column++) {
          const x = column * brickWidth + offset;
          const y = row * brickHeight;

          const light = kind === "wall"
            ? 53 + random() * 13
            : 43 + random() * 12;

          const hue = kind === "wall" ? 38 : 36;
          const saturation = kind === "wall" ? 30 : 23;

          const gradient = ctx.createLinearGradient(
            x, y, x + brickWidth, y + brickHeight
          );

          gradient.addColorStop(
            0,
            `hsl(${hue}, ${saturation}%, ${light + 5}%)`
          );

          gradient.addColorStop(
            1,
            `hsl(${hue}, ${saturation}%, ${light - 4}%)`
          );

          ctx.fillStyle = gradient;
          ctx.fillRect(
            x + 3, y + 3,
            brickWidth - 6, brickHeight - 6
          );

          bump.fillStyle = "#bcbcbc";
          bump.fillRect(
            x + 3, y + 3,
            brickWidth - 6, brickHeight - 6
          );

          bump.fillStyle = "#dedede";
          bump.fillRect(
            x + 7, y + 7,
            brickWidth - 14, brickHeight - 14
          );

          // Aşınmış açık kenarlar.
          ctx.strokeStyle = "rgba(255,234,186,.24)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x + 5, y + brickHeight - 6);
          ctx.lineTo(x + 5, y + 5);
          ctx.lineTo(x + brickWidth - 6, y + 5);
          ctx.stroke();

          // Her taşta değil, bazı taşlarda çatlak.
          if (random() > 0.66) {
            let px = x + 15 + random() * (brickWidth - 30);
            let py = y + 8;

            ctx.beginPath();
            bump.beginPath();
            ctx.moveTo(px, py);
            bump.moveTo(px, py);

            for (let step = 0; step < 5; step++) {
              px += (random() - 0.5) * 22;
              py += 8 + random() * 10;
              ctx.lineTo(px, py);
              bump.lineTo(px, py);
            }

            ctx.strokeStyle = "rgba(50,38,23,.36)";
            ctx.lineWidth = 1.5;
            ctx.stroke();

            bump.strokeStyle = "#777";
            bump.lineWidth = 2;
            bump.stroke();
          }
        }
      }
    }

    // İnce yüzey pürüzleri.
    const grainCount = kind === "wall" ? 42000 : 14000;

    for (let i = 0; i < grainCount; i++) {
      const x = random() * size;
      const y = random() * size;
      const bright = random() > 0.5;
      const width = 1 + random() * 3;

      ctx.fillStyle = bright
        ? "rgba(255,242,211,.10)"
        : "rgba(35,25,14,.12)";

      ctx.fillRect(x, y, width, 1 + random() * 2);

      bump.fillStyle = bright
        ? "rgba(255,255,255,.10)"
        : "rgba(0,0,0,.10)";

      bump.fillRect(x, y, width, 2);
    }

    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = map.wrapT = THREE.RepeatWrapping;

    const bumpMap = new THREE.CanvasTexture(relief);
    bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;

    return { map, bumpMap };
  }

  const wallSurface = makeSurface("wall");
  const floorSurface = makeSurface("floor");
  const woodSurface = makeSurface("wood");

  // Duvar dokusu yükseklik boyunca tekrar eder.
  wallSurface.map.repeat.set(0.5, 1.5);
  wallSurface.bumpMap.repeat.set(0.5, 1.5);

  const materials = {
    wall: new THREE.MeshStandardMaterial({
      ...wallSurface,
      bumpScale: 0.12,
      roughness: 0.94
    }),

    floor: new THREE.MeshStandardMaterial({
      ...floorSurface,
      bumpScale: 0.055,
      roughness: 1
    }),

    wood: new THREE.MeshStandardMaterial({
      ...woodSurface,
      bumpScale: 0.045,
      roughness: 0.87
    }),

    trim: new THREE.MeshStandardMaterial({
      color: 0x927b56,
      roughness: 0.96
    }),

    paleStone: new THREE.MeshStandardMaterial({
      color: 0xc0a778,
      roughness: 0.95
    }),

    dark: new THREE.MeshStandardMaterial({
      color: 0x443d30,
      roughness: 1
    }),

    metal: new THREE.MeshStandardMaterial({
      color: 0x4f5849,
      metalness: 0.25,
      roughness: 0.74
    }),

    iron: new THREE.MeshStandardMaterial({
      color: 0x39382f,
      metalness: 0.45,
      roughness: 0.7
    }),

    cloth: new THREE.MeshStandardMaterial({
      color: 0x9c7450,
      roughness: 1,
      side: THREE.DoubleSide
    })
  };

  // ---------------------------------------------------
  // TEMEL NESNE VE ÇARPIŞMA YARDIMCILARI
  // ---------------------------------------------------

  const cube = new THREE.BoxGeometry(1, 1, 1);

  function collider(x, z, width, depth) {
    colliders.push({
      minX: x - width / 2,
      maxX: x + width / 2,
      minZ: z - depth / 2,
      maxZ: z + depth / 2
    });
  }

  function box(
    x, y, z,
    width, height, depth,
    material,
    solid = false
  ) {
    const mesh = new THREE.Mesh(cube, material);

    mesh.position.set(x, y, z);
    mesh.scale.set(width, height, depth);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    group.add(mesh);

    if (solid) collider(x, z, width, depth);

    return mesh;
  }

  const dummy = new THREE.Object3D();

  function instance(mesh, index, x, y, z, sx, sy, sz, angle = 0) {
    dummy.position.set(x, y, z);
    dummy.scale.set(sx, sy, sz);
    dummy.rotation.set(0, angle, 0);
    dummy.updateMatrix();

    mesh.setMatrixAt(index, dummy.matrix);
  }

  // ---------------------------------------------------
  // TOPLU ZEMİN ÇİZİMİ
  // ---------------------------------------------------

  let floorCount = 0;

  for (const row of grid) {
    for (const cell of row) {
      if (cell) floorCount++;
    }
  }

  const floors = new THREE.InstancedMesh(
    cube, materials.floor, floorCount
  );

  const tint = new THREE.Color();
  let floorIndex = 0;

  for (let z = 0; z < N; z++) {
    for (let x = 0; x < N; x++) {
      if (!isFloor(x, z)) continue;

      instance(
        floors, floorIndex,
        world(x + 0.5), -0.15, world(z + 0.5),
        TILE, 0.3, TILE
      );

      tint.setHSL(0.105, 0.08, 0.84 + random() * 0.12);
      floors.setColorAt(floorIndex, tint);
      floorIndex++;
    }
  }

  floors.receiveShadow = true;
  floors.instanceMatrix.needsUpdate = true;
  if (floors.instanceColor) floors.instanceColor.needsUpdate = true;

  group.add(floors);

  // ---------------------------------------------------
  // TOPLU DUVAR ÇİZİMİ
  // ---------------------------------------------------

  const segments = [];

  for (let z = 0; z < N; z++) {
    for (let x = 0; x < N; x++) {
      if (!isFloor(x, z)) continue;

      const cx = world(x + 0.5);
      const cz = world(z + 0.5);

      if (!isFloor(x, z - 1)) {
        segments.push([cx, world(z), 0]);
      }

      if (!isFloor(x, z + 1)) {
        segments.push([cx, world(z + 1), 0]);
      }

      if (!isFloor(x - 1, z)) {
        segments.push([world(x), cz, Math.PI / 2]);
      }

      if (!isFloor(x + 1, z)) {
        segments.push([world(x + 1), cz, Math.PI / 2]);
      }
    }
  }

  const walls = new THREE.InstancedMesh(
    cube, materials.wall, segments.length
  );

  const caps = new THREE.InstancedMesh(
    cube, materials.paleStone, segments.length
  );

  const bases = new THREE.InstancedMesh(
    cube, materials.trim, segments.length
  );

  segments.forEach(([x, z, angle], index) => {
    instance(
      walls, index,
      x, HEIGHT / 2, z,
      TILE + 0.02, HEIGHT, 0.5,
      angle
    );

    instance(
      caps, index,
      x, HEIGHT - 0.05, z,
      TILE + 0.05, 0.24, 0.7,
      angle
    );

    instance(
      bases, index,
      x, 0.23, z,
      TILE + 0.03, 0.46, 0.65,
      angle
    );

    tint.setHSL(0.11, 0.06, 0.88 + random() * 0.1);
    walls.setColorAt(index, tint);

    collider(
      x, z,
      angle === 0 ? TILE + 0.02 : 0.5,
      angle === 0 ? 0.5 : TILE + 0.02
    );
  });

  for (const mesh of [walls, caps, bases]) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.instanceMatrix.needsUpdate = true;

    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }

    group.add(mesh);
  }

  // ---------------------------------------------------
  // KEMERLER VE TÜNEL
  // ---------------------------------------------------

  function arch(cellX, cellZ, rotated = false, width = 6) {
    const x = world(cellX);
    const z = world(cellZ);

    const radius = width / 2 - 0.65;
    const spring = 1.65;
    const top = spring + radius + 0.45;
    const depth = 0.8;

    const shape = new THREE.Shape();

    shape.moveTo(-width / 2, 0);
    shape.lineTo(-width / 2, top);
    shape.lineTo(width / 2, top);
    shape.lineTo(width / 2, 0);
    shape.lineTo(radius, 0);
    shape.lineTo(radius, spring);

    for (let i = 0; i <= 32; i++) {
      const angle = i / 32 * Math.PI;

      shape.lineTo(
        Math.cos(angle) * radius,
        spring + Math.sin(angle) * radius
      );
    }

    shape.lineTo(-radius, 0);
    shape.closePath();

    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: false
    });

    geometry.translate(0, 0, -depth / 2);

    const mesh = new THREE.Mesh(
      geometry, materials.paleStone
    );

    mesh.position.set(x, 0, z);
    mesh.rotation.y = rotated ? Math.PI / 2 : 0;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    const pillarWidth = width / 2 - radius;
    const offset = radius + pillarWidth / 2;

    for (const side of [-1, 1]) {
      collider(
        rotated ? x : x + side * offset,
        rotated ? z + side * offset : z,
        rotated ? depth : pillarWidth,
        rotated ? pillarWidth : depth
      );
    }

    // Taş kemerin üzerindeki derz çizgileri.
    for (let i = 0; i <= 10; i++) {
      const angle = i / 10 * Math.PI;
      const r = radius + 0.2;

      const detail = new THREE.Mesh(
        cube, materials.trim
      );

      detail.scale.set(0.035, 0.34, depth + 0.025);
      detail.position.set(
        Math.cos(angle) * r,
        spring + Math.sin(angle) * r,
        0
      );
      detail.rotation.z = angle - Math.PI / 2;

      const detailGroup = new THREE.Group();
      detailGroup.position.set(x, 0, z);
      detailGroup.rotation.y = rotated ? Math.PI / 2 : 0;
      detailGroup.add(detail);
      group.add(detailGroup);
    }
  }

  // Tünel tavanı.
  box(
    world(19), 4.75, world(9.5),
    20, 0.5, 6,
    materials.trim
  );

  arch(15.5, 9.5, true);
  arch(19, 9.5, true);
  arch(23, 9.5, true);

  // Yeni bölgelerdeki geçişler.
  arch(40, 11, true, 8);
  arch(48, 22, false, 8);
  arch(20, 38, false, 8);
  arch(29, 50, true, 8);
  arch(6, 34, false, 8);

  const lampMaterial = new THREE.MeshStandardMaterial({
    color: 0xffd69a,
    emissive: 0xffbc63,
    emissiveIntensity: 1.6
  });

  for (const cellX of [16, 20, 23]) {
    box(
      world(cellX), 4.42, world(9.5),
      0.6, 0.12, 0.35,
      lampMaterial
    );

    const light = new THREE.PointLight(
      0xffcf8f, 17, 10, 2
    );

    light.position.set(world(cellX), 3.6, world(9.5));
    group.add(light);
  }

  // ---------------------------------------------------
  // DETAYLI KASALAR
  // ---------------------------------------------------

  function crate(cellX, cellZ, size = 2.5, base = 0) {
    const x = world(cellX);
    const z = world(cellZ);

    box(
      x, base + size / 2, z,
      size, size, size,
      materials.wood,
      base < 1.8
    );

    for (const side of [-1, 1]) {
      for (const y of [0.16, size - 0.16]) {
        box(
          x, base + y, z + side * (size / 2 + 0.035),
          size + 0.1, 0.18, 0.08,
          materials.trim
        );

        box(
          x + side * (size / 2 + 0.035), base + y, z,
          0.08, 0.18, size + 0.1,
          materials.trim
        );
      }

      const diagonal = box(
        x, base + size / 2,
        z + side * (size / 2 + 0.085),
        0.15, size * 1.22, 0.09,
        materials.wood
      );

      diagonal.rotation.z = Math.PI / 4;

      // Metal köşe şeritleri.
      for (const edge of [-1, 1]) {
        box(
          x + edge * (size / 2 - 0.12),
          base + size / 2,
          z + side * (size / 2 + 0.04),
          0.12, size, 0.065,
          materials.iron
        );
      }
    }
  }

  const crates = [
    [6, 7, 3],
    [7.7, 7, 3],
    [6, 7, 2.5, 3],
    [12.5, 12.5, 2.4],

    [33, 8, 3],
    [34.7, 8, 3],
    [33, 8, 2.5, 3],
    [29, 12.5, 2.2],
    [35, 12, 2.4],

    [14.7, 26, 2.2],
    [24.5, 29, 2.5],
    [19, 18, 2],
    [31.5, 20, 1.8],

    // Pazar avlusu.
    [45, 7, 3],
    [46.7, 7, 3],
    [45, 7, 2.5, 3],
    [53, 16, 3],
    [44.5, 17, 2.5],

    // Depo avlusu.
    [39, 44, 3.5],
    [41, 44, 3.5],
    [39, 44, 3, 3.5],
    [50, 49, 3],
    [51.7, 49, 3],
    [46, 52, 2.4],

    // Yeni başlangıç alanı.
    [14, 42, 3],
    [15.7, 42, 3],
    [14, 42, 2.5, 3],
    [24, 51, 2.5]
  ];

  for (const args of crates) crate(...args);

  // ---------------------------------------------------
  // VARİLLER
  // ---------------------------------------------------

  const barrelGeometry = new THREE.CylinderGeometry(
    0.55, 0.55, 1.5, 12
  );

  const ringGeometry = new THREE.TorusGeometry(
    0.56, 0.04, 5, 12
  );

  function barrel(cellX, cellZ) {
    const x = world(cellX);
    const z = world(cellZ);

    const mesh = new THREE.Mesh(
      barrelGeometry, materials.metal
    );

    mesh.position.set(x, 0.75, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    collider(x, z, 1.1, 1.1);

    for (const height of [0.22, 1.26]) {
      const ring = new THREE.Mesh(
        ringGeometry, materials.iron
      );

      ring.rotation.x = Math.PI / 2;
      ring.position.set(x, height, z);
      group.add(ring);
    }
  }

  [
    [4.2, 12],
    [4.9, 12.3],
    [28, 5.2],
    [25, 25.2],
    [54, 7],
    [54, 7.8],
    [36.2, 51],
    [36.9, 51.4],
    [13, 49],
    [48.8, 30]
  ].forEach(args => barrel(...args));

  // ---------------------------------------------------
  // PAZAR SUNDURMALARI
  // ---------------------------------------------------

  function canopy(cellX, cellZ, width = 7, depth = 4) {
    const x = world(cellX);
    const z = world(cellZ);

    const roof = box(
      x, 3.65, z,
      width, 0.09, depth,
      materials.cloth
    );

    roof.rotation.z = 0.045;

    for (const sideX of [-1, 1]) {
      for (const sideZ of [-1, 1]) {
        box(
          x + sideX * (width / 2 - 0.15),
          1.75,
          z + sideZ * (depth / 2 - 0.15),
          0.14, 3.5, 0.14,
          materials.wood,
          true
        );
      }
    }

    // Alçak satış tezgâhı.
    box(
      x, 0.65, z,
      width * 0.72, 1.3, 1.25,
      materials.wood,
      true
    );
  }

  canopy(50, 6.6);
  canopy(54, 12.3, 4, 7);

  // ---------------------------------------------------
  // DUVAR NİŞLERİ VE KEPENKLER
  // ---------------------------------------------------

  function shutter(cellX, cellZ, rotation = 0) {
    const assembly = new THREE.Group();

    assembly.position.set(
      world(cellX), 2.9, world(cellZ)
    );

    assembly.rotation.y = rotation;

    const backing = new THREE.Mesh(cube, materials.dark);
    backing.scale.set(1.6, 2.1, 0.08);
    assembly.add(backing);

    for (let i = 0; i < 9; i++) {
      const slat = new THREE.Mesh(cube, materials.wood);
      slat.scale.set(1.45, 0.16, 0.11);
      slat.position.set(0, -0.88 + i * 0.22, 0.07);
      assembly.add(slat);
    }

    group.add(assembly);
  }

  shutter(46, 5.14);
  shutter(49, 5.14);
  shutter(52, 5.14);
  shutter(16, 40.14);
  shutter(24, 40.14);
  shutter(55.86, 16, -Math.PI / 2);
  shutter(54.86, 45, -Math.PI / 2);

  // ---------------------------------------------------
  // YENİ BİNALAR — ÇEŞİTLİ TİPLER
  // ---------------------------------------------------

  function buildingShell(cellX, cellZ, width, depth, type = "house") {
    const x = world(cellX);
    const z = world(cellZ);

    const wallH = type === "tower" ? 5.2 : 3.8;
    const wallT = type === "tower" ? 0.7 : 0.45;

    // Dört tarafı duvar; içi oynanabilir boşluk bırakılır.
    box(x, wallH / 2, z - depth / 2,
      width, wallH, wallT, materials.wall, true);

    box(x, wallH / 2, z + depth / 2,
      width, wallH, wallT, materials.wall, true);

    box(x - width / 2, wallH / 2, z,
      wallT, wallH, depth, materials.wall, true);

    box(x + width / 2, wallH / 2, z,
      wallT, wallH, depth, materials.wall, true);

    // Çatı saçakları.
    box(x, wallH + 0.18, z,
      width + 0.55, 0.28, depth + 0.55,
      type === "tower" ? materials.paleStone : materials.wood);

    if (type === "house") {
      // Ahşap kirişler.
      for (const sx of [-1, 1]) {
        box(x + sx * (width * 0.23), wallH / 2, z,
          0.18, wallH + 0.12, depth + 0.12,
          materials.wood);
      }
    }

    if (type === "warehouse") {
      box(x, 1.45, z - depth / 2 - 0.04,
        width * 0.55, 2.8, 0.12,
        materials.wood);

      for (let i = -2; i <= 2; i++) {
        box(x + i * 0.42, 1.45, z - depth / 2 - 0.11,
          0.09, 2.45, 0.08,
          materials.trim);
      }
    }

    if (type === "tower") {
      // Köşe taşları.
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          box(x + sx * (width / 2 - 0.32),
              wallH / 2,
              z + sz * (depth / 2 - 0.32),
              0.62, wallH + 0.18, 0.62,
              materials.paleStone);
        }
      }
    }
  }

  buildingShell(58, 15, 7.5, 6.5, "house");
  buildingShell(64, 25, 8.5, 7.0, "warehouse");
  buildingShell(57, 39, 7.0, 7.0, "house");
  buildingShell(54, 57, 8.0, 7.0, "warehouse");
  buildingShell(34, 61, 7.0, 7.0, "house");
  buildingShell(14, 51, 7.5, 6.0, "house");
  buildingShell(8, 20, 6.5, 6.5, "tower");
  buildingShell(57, 8, 6.0, 6.0, "tower");

  // ---------------------------------------------------
  // YENİ MERDİVENLER
  // ---------------------------------------------------

  function stair(cellX, cellZ, steps = 7, dir = "z") {
    const x = world(cellX);
    const z = world(cellZ);
    const stepW = 2.8;
    const stepD = 0.62;
    const stepH = 0.16;

    for (let i = 0; i < steps; i++) {
      const sx = dir === "x"
        ? x + (i - steps / 2) * stepD
        : x;
      const sz = dir === "x"
        ? z
        : z + (i - steps / 2) * stepD;

      box(
        sx,
        (i + 1) * stepH / 2,
        sz,
        dir === "x" ? stepD : stepW,
        (i + 1) * stepH,
        dir === "x" ? stepW : stepD,
        materials.paleStone
      );
    }
  }

  stair(45.2, 24.2, 8, "z");
  stair(30.5, 47.0, 7, "x");
  stair(61.2, 43.0, 8, "z");

  // ---------------------------------------------------
  // YENİ TÜNELLİ GEÇİTLER
  // ---------------------------------------------------

  function tunnel(cellX, cellZ, width = 6, depth = 10, rotated = false) {
    const x = world(cellX);
    const z = world(cellZ);

    const side = 0.72;
    const height = 4.7;

    if (!rotated) {
      box(x - width / 2, height / 2, z,
        side, height, depth, materials.wall, true);

      box(x + width / 2, height / 2, z,
        side, height, depth, materials.wall, true);

      box(x, height + 0.1, z,
        width + 0.2, 0.55, depth, materials.paleStone);

      arch(cellX, cellZ - depth / 2, false, width);
      arch(cellX, cellZ + depth / 2, false, width);
    } else {
      box(x, height / 2, z - width / 2,
        depth, height, side, materials.wall, true);

      box(x, height / 2, z + width / 2,
        depth, height, side, materials.wall, true);

      box(x, height + 0.1, z,
        depth, 0.55, width + 0.2, materials.paleStone);

      arch(cellX - depth / 2, cellZ, true, width);
      arch(cellX + depth / 2, cellZ, true, width);
    }
  }

  tunnel(64, 31, 6, 9, false);
  tunnel(40, 60, 6, 9, true);
  tunnel(9, 50, 6, 8, false);

  // Geçitleri aydınlatan yeni lambalar.
  for (const [cx, cz] of [
    [64, 26], [64, 36], [35, 61], [45, 60], [9, 46]
  ]) {
    const lamp = new THREE.PointLight(0xffcf8f, 13, 9, 2);
    lamp.position.set(world(cx), 3.1, world(cz));
    group.add(lamp);

    box(
      world(cx), 4.05, world(cz),
      0.38, 0.12, 0.38,
      materials.iron
    );
  }

  // ---------------------------------------------------
  // YAZILAR VE BOMBA ALANI İŞARETLERİ
  // ---------------------------------------------------

  function sign(text, cellX, cellZ, rotation = 0) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 256;

    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#913a27";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 125px Arial";
    ctx.fillText(text, 256, 128);

    // Boyada hafif aşınma.
    ctx.globalCompositeOperation = "destination-out";

    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = `rgba(0,0,0,${random() * 0.6})`;
      ctx.fillRect(
        random() * 512,
        random() * 256,
        1 + random() * 4,
        1 + random() * 3
      );
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(4.6, 2.3),
      new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1
      })
    );

    mesh.position.set(world(cellX), 2.7, world(cellZ));
    mesh.rotation.y = rotation;
    group.add(mesh);
  }

  sign("B", 9, 5.14);
  sign("A", 32, 4.14);
  sign("A →", 20.5, 24.86, Math.PI);
  sign("B ←", 20, 30.14);
  sign("DEPOT", 44, 53.86, Math.PI);
  sign("MARKET", 48, 19.86, Math.PI);

  function siteMarker(cellX, cellZ) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(2.2, 2.35, 48),
      new THREE.MeshBasicMaterial({
        color: 0xa34627,
        transparent: true,
        opacity: 0.72,
        side: THREE.DoubleSide
      })
    );

    ring.rotation.x = -Math.PI / 2;
    ring.position.set(world(cellX), 0.015, world(cellZ));
    group.add(ring);
  }

  siteMarker(10, 10);
  siteMarker(32, 11);

  // ---------------------------------------------------
  // DUVAR DİPLERİNDE KÜÇÜK TAŞLAR
  // Dekoratif; oyuncunun hareketini engellemez.
  // ---------------------------------------------------

  const rubbleCount = Math.floor(segments.length / 3);

  const rubble = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(1, 0),
    materials.trim,
    rubbleCount
  );

  for (let i = 0; i < rubbleCount; i++) {
    const [x, z] = segments[i * 3];

    instance(
      rubble, i,
      x + (random() - 0.5) * 1.1,
      0.07,
      z + (random() - 0.5) * 1.1,
      0.06 + random() * 0.15,
      0.04 + random() * 0.08,
      0.06 + random() * 0.13,
      random() * Math.PI
    );
  }

  rubble.instanceMatrix.needsUpdate = true;
  rubble.receiveShadow = true;
  group.add(rubble);

  // ---------------------------------------------------
  // ÇARPIŞMA: YAKIN ÇEVREDEKİ NESNELERİ KONTROL ET
  // ---------------------------------------------------

  const BUCKET_SIZE = 8;
  const buckets = new Map();

  function bucketKey(x, z) {
    return `${x},${z}`;
  }

  for (const bounds of colliders) {
    const minX = Math.floor(bounds.minX / BUCKET_SIZE);
    const maxX = Math.floor(bounds.maxX / BUCKET_SIZE);
    const minZ = Math.floor(bounds.minZ / BUCKET_SIZE);
    const maxZ = Math.floor(bounds.maxZ / BUCKET_SIZE);

    for (let z = minZ; z <= maxZ; z++) {
      for (let x = minX; x <= maxX; x++) {
        const key = bucketKey(x, z);

        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push(bounds);
      }
    }
  }

  function blocked(x, z, radius) {
    // Harita dışına çıkmayı da engelle.
    const cellX = Math.floor((x + OFFSET) / TILE);
    const cellZ = Math.floor((z + OFFSET) / TILE);

    if (!isFloor(cellX, cellZ)) return true;

    const minBX = Math.floor((x - radius) / BUCKET_SIZE);
    const maxBX = Math.floor((x + radius) / BUCKET_SIZE);
    const minBZ = Math.floor((z - radius) / BUCKET_SIZE);
    const maxBZ = Math.floor((z + radius) / BUCKET_SIZE);

    for (let bz = minBZ; bz <= maxBZ; bz++) {
      for (let bx = minBX; bx <= maxBX; bx++) {
        const list = buckets.get(bucketKey(bx, bz));
        if (!list) continue;

        for (const bounds of list) {
          const closestX = THREE.MathUtils.clamp(
            x, bounds.minX, bounds.maxX
          );

          const closestZ = THREE.MathUtils.clamp(
            z, bounds.minZ, bounds.maxZ
          );

          const dx = x - closestX;
          const dz = z - closestZ;

          if (dx * dx + dz * dz < radius * radius) {
            return true;
          }
        }
      }
    }

    return false;
  }

  function movePlayer(position, dx, dz, radius = 0.34, elevated = false) {
    const steps = Math.max(
      1,
      Math.ceil(Math.hypot(dx, dz) / 0.15)
    );

    const stepX = dx / steps;
    const stepZ = dz / steps;

    for (let i = 0; i < steps; i++) {
      if (elevated || !blocked(position.x + stepX, position.z, radius)) {
        position.x += stepX;
      }

      if (elevated || !blocked(position.x, position.z + stepZ, radius)) {
        position.z += stepZ;
      }
    }
  }

    // ---------------------------------------------------
    // DUVARA YAPIŞAN CS-TİPİ MERDİVENLER
    // ---------------------------------------------------
    const ladders = [];
    const ladderColliders = [];
    const rooftops = [];

    function ladder(cellX, cellZ, height = 5.6, rotation = 0) {
      const root = new THREE.Group();
      let px = world(cellX), pz = world(cellZ);

      // En yakın katı duvarı bulup merdiveni duvar yüzeyine oturt.
      let nearestWall = null, nearestDist = Infinity;
      for (const c of colliders) {
        const cx = THREE.MathUtils.clamp(px, c.minX, c.maxX);
        const cz = THREE.MathUtils.clamp(pz, c.minZ, c.maxZ);
        const d = Math.hypot(px - cx, pz - cz);
        if (d < nearestDist && d < 3.0) { nearestDist = d; nearestWall = c; }
      }
      if (nearestWall) {
        const dx = Math.min(Math.abs(px-nearestWall.minX), Math.abs(px-nearestWall.maxX));
        const dz = Math.min(Math.abs(pz-nearestWall.minZ), Math.abs(pz-nearestWall.maxZ));
        if (dx < dz) {
          px = px < (nearestWall.minX+nearestWall.maxX)/2 ? nearestWall.minX-0.08 : nearestWall.maxX+0.08;
          rotation = Math.PI/2;
        } else {
          pz = pz < (nearestWall.minZ+nearestWall.maxZ)/2 ? nearestWall.minZ-0.08 : nearestWall.maxZ+0.08;
          rotation = 0;
        }
      }

      root.position.set(px, 0, pz);
      root.rotation.y = rotation;

      // Duvara temas eden arka taşıyıcı plaka.
      const back = new THREE.Mesh(cube, materials.iron);
      back.scale.set(1.05, height, 0.10);
      back.position.set(0, height / 2, 0.08);
      root.add(back);

      for (const x of [-0.42, 0.42]) {
        const rail = new THREE.Mesh(cube, materials.iron);
        rail.scale.set(0.10, height, 0.10);
        rail.position.set(x, height / 2, -0.06);
        root.add(rail);
      }

      for (let y = 0.35; y < height; y += 0.43) {
        const rung = new THREE.Mesh(cube, materials.iron);
        rung.scale.set(0.92, 0.08, 0.11);
        rung.position.set(0, y, -0.13);
        root.add(rung);
      }

      // Tırmanma alanı için fiziksel sınır verisi. Bu veri harita API'sinden
      // dışarı açılır; hareket sistemi merdiven üzerinde bunu kullanır.
      ladderColliders.push({
        minX: px - 0.58, maxX: px + 0.58,
        minZ: pz - 0.22, maxZ: pz + 0.22,
        height, rotation
      });

      // Merdivenin ulaştığı üst platform. Yatay hareket elevated modda
      // duvar çarpışmasını aşar; platform yarıçapı burada tutulur.
      const roof = new THREE.Mesh(
        cube, materials.paleStone
      );
      roof.position.set(0, height, -0.55);
      roof.scale.set(4.2, 0.20, 3.2);
      roof.castShadow = true;
      roof.receiveShadow = true;
      root.add(roof);

      rooftops.push({
        x: px, z: pz - 0.55, radius: 2.6, height
      });

      group.add(root);
      ladders.push({
        position: new THREE.Vector3(px, 0, pz),
        height,
        rotation,
        width: 1.16,
        climbRadius: 1.35,
        collider: ladderColliders[ladderColliders.length - 1]
      });
    }

    ladder(43.0, 21.2, 5.4, 0);
    ladder(55.2, 36.0, 5.4, Math.PI / 2);
    ladder(28.2, 49.0, 5.4, Math.PI / 2);
    ladder(61.0, 14.2, 5.4, 0);

    return {
    group,
    colliders,

    navigation: {
      grid,
      tile: TILE,
      offset: OFFSET
    },

    isBlocked: blocked,
    ladders,
    ladderColliders,
    rooftops,

    spawn: new THREE.Vector3(
      world(20), 1.7, world(46)
    ),

    movePlayer,

    sites: {
      A: new THREE.Vector3(world(32), 0, world(11)),
      B: new THREE.Vector3(world(10), 0, world(10))
    }
  };
}

