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

  const world = value =>
    value * TILE - OFFSET;


  let seed = 421;

  function random() {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  }


  function carve(x1, z1, x2, z2) {

    for (let z = z1; z < z2; z++) {

      for (let x = x1; x < x2; x++) {

        if (
          x >= 0 &&
          z >= 0 &&
          x < N &&
          z < N
        ) {
          grid[z][x] = true;
        }

      }
    }

  }


  function isFloor(x, z) {

    return (
      x >= 0 &&
      z >= 0 &&
      x < N &&
      z < N &&
      grid[z][x]
    );

  }



  // ===================================================
  // HARİTA PLANI
  // ===================================================


  carve(16,30,24,36);
  carve(13,24,27,31);
  carve(7,25,16,28);
  carve(7,14,11,28);
  carve(3,5,15,15);

  carve(14,8,24,11);
  carve(18,10,23,25);
  carve(22,10,29,13);

  carve(27,4,37,15);
  carve(29,14,33,29);
  carve(24,26,33,29);

  carve(21,1,30,6);
  carve(21,5,24,11);



  // Doğu bölgesi

  carve(36,9,44,13);
  carve(42,5,56,20);

  carve(46,19,50,44);

  carve(35,40,55,54);



  // Güney bağlantıları

  carve(19,48,36,52);
  carve(12,40,27,54);
  carve(18,35,22,41);


  carve(30,27,34,43);
  carve(33,40,37,44);



  // Sol bağlantılar

  carve(4,27,8,44);
  carve(7,40,13,44);
  carve(7,26,10,29);



  // ===================================================
  // GENİŞLETİLMİŞ DIŞ HALKA
  // ===================================================


  carve(56,12,69,19);
  carve(62,18,67,40);
  carve(54,36,67,43);

  carve(50,52,67,61);
  carve(36,54,43,66);

  carve(20,53,27,67);
  carve(8,46,22,53);

  carve(3,42,9,55);

  carve(4,15,10,25);
  carve(8,10,18,17);

  carve(50,4,63,11);
  carve(61,6,69,15);



  // Dış bağlantılar

  carve(68,16,71,43);
  carve(64,40,71,56);

  carve(56,59,64,66);
  carve(26,63,56,68);

  carve(6,52,26,58);



  // Merdiven bölgeleri

  carve(43,21,49,30);
  carve(48,26,57,31);
  carve(27,44,35,50);



  // ===================================================
  // PROSEDÜREL TEXTURE SİSTEMİ
  // ===================================================


  function makeSurface(kind) {

    const size =
      kind === "wall"
      ? 1024
      : 512;


    const canvas =
      document.createElement("canvas");


    const relief =
      document.createElement("canvas");


    canvas.width =
    canvas.height =
    relief.width =
    relief.height =
      size;



    const ctx =
      canvas.getContext("2d");


    const bump =
      relief.getContext("2d");



    ctx.fillStyle =
      kind === "wood"
      ? "#665033"
      : "#71634c";


    ctx.fillRect(
      0,
      0,
      size,
      size
    );


    bump.fillStyle="#444";

    bump.fillRect(
      0,
      0,
      size,
      size
    );



    if(kind==="wood") {


      const plankWidth =
        size / 8;


      for(let i=0;i<8;i++){


        const light =
          28 + random()*12;


        ctx.fillStyle =
          `hsl(34,35%,${light}%)`;


        ctx.fillRect(
          i*plankWidth+2,
          0,
          plankWidth-4,
          size
        );


        bump.fillStyle="#b5b5b5";

        bump.fillRect(
          i*plankWidth+2,
          0,
          plankWidth-4,
          size
        );

      }


      for(let i=0;i<420;i++){

        const x=random()*size;
        const y=random()*size;

        ctx.strokeStyle =
          random()>0.5
          ? "rgba(235,192,120,.16)"
          : "rgba(36,22,9,.25)";


        ctx.lineWidth =
          0.5+random()*2;


        ctx.beginPath();

        ctx.moveTo(x,y);

        ctx.bezierCurveTo(
          x+5,
          y+40,
          x-5,
          y+120,
          x+2,
          y+180
        );

        ctx.stroke();

      }


    } else {


      const brickWidth =
        kind==="wall"
        ? 256
        : 128;


      const brickHeight=128;


      for(
        let row=0;
        row<size/brickHeight;
        row++
      ){

        const offset =
          row%2
          ? brickWidth/2
          : 0;


        for(
          let column=-1;
          column<=size/brickWidth;
          column++
        ){

          const x =
            column*brickWidth+offset;

          const y =
            row*brickHeight;


          const light =
            kind==="wall"
            ? 53+random()*13
            : 43+random()*12;


          ctx.fillStyle =
          `hsl(38,30%,${light}%)`;


          ctx.fillRect(
            x+3,
            y+3,
            brickWidth-6,
            brickHeight-6
          );


          bump.fillStyle="#bcbcbc";

          bump.fillRect(
            x+3,
            y+3,
            brickWidth-6,
            brickHeight-6
          );

        }
      }

    }


    const map =
      new THREE.CanvasTexture(canvas);


    map.colorSpace =
      THREE.SRGBColorSpace;


    map.wrapS =
    map.wrapT =
      THREE.RepeatWrapping;



    const bumpMap =
      new THREE.CanvasTexture(relief);


    bumpMap.wrapS =
    bumpMap.wrapT =
      THREE.RepeatWrapping;



    return {
      map,
      bumpMap
    };

  }



// DEVAMI BÖLÜM 2'DE...
  // ===================================================
  // TEXTURE OLUŞTURMA
  // ===================================================

  const wallSurface = makeSurface("wall");
  const floorSurface = makeSurface("floor");
  const woodSurface = makeSurface("wood");


  wallSurface.map.repeat.set(
    0.5,
    1.5
  );

  wallSurface.bumpMap.repeat.set(
    0.5,
    1.5
  );



  const materials = {

    wall:
      new THREE.MeshStandardMaterial({

        ...wallSurface,

        bumpScale:0.12,

        roughness:0.94

      }),



    floor:
      new THREE.MeshStandardMaterial({

        ...floorSurface,

        bumpScale:0.055,

        roughness:1

      }),



    wood:
      new THREE.MeshStandardMaterial({

        ...woodSurface,

        bumpScale:0.045,

        roughness:0.87

      }),



    trim:
      new THREE.MeshStandardMaterial({

        color:0x927b56,

        roughness:0.96

      }),



    paleStone:
      new THREE.MeshStandardMaterial({

        color:0xc0a778,

        roughness:0.95

      }),



    dark:
      new THREE.MeshStandardMaterial({

        color:0x443d30,

        roughness:1

      }),



    metal:
      new THREE.MeshStandardMaterial({

        color:0x4f5849,

        metalness:0.25,

        roughness:0.74

      }),



    iron:
      new THREE.MeshStandardMaterial({

        color:0x39382f,

        metalness:0.45,

        roughness:0.7

      }),



    cloth:
      new THREE.MeshStandardMaterial({

        color:0x9c7450,

        roughness:1,

        side:THREE.DoubleSide

      })

  };



  // ===================================================
  // TEMEL NESNE SİSTEMİ
  // ===================================================


  const cube =
    new THREE.BoxGeometry(
      1,
      1,
      1
    );



  function collider(
    x,
    z,
    width,
    depth
  ){

    colliders.push({

      minX:x-width/2,

      maxX:x+width/2,

      minZ:z-depth/2,

      maxZ:z+depth/2

    });

  }




  function box(
    x,
    y,
    z,
    width,
    height,
    depth,
    material,
    solid=false
  ){

    const mesh =
      new THREE.Mesh(
        cube,
        material
      );


    mesh.position.set(
      x,
      y,
      z
    );


    mesh.scale.set(
      width,
      height,
      depth
    );


    mesh.castShadow=true;

    mesh.receiveShadow=true;


    group.add(mesh);



    if(solid){

      collider(
        x,
        z,
        width,
        depth
      );

    }


    return mesh;

  }




  const dummy =
    new THREE.Object3D();



  function instance(
    mesh,
    index,
    x,
    y,
    z,
    sx,
    sy,
    sz,
    angle=0
  ){

    dummy.position.set(
      x,
      y,
      z
    );


    dummy.scale.set(
      sx,
      sy,
      sz
    );


    dummy.rotation.set(
      0,
      angle,
      0
    );


    dummy.updateMatrix();


    mesh.setMatrixAt(
      index,
      dummy.matrix
    );

  }




  // ===================================================
  // ZEMİN SİSTEMİ
  // ===================================================


  let floorCount=0;


  for(const row of grid){

    for(const cell of row){

      if(cell)
        floorCount++;

    }

  }



  const floors =
    new THREE.InstancedMesh(
      cube,
      materials.floor,
      floorCount
    );



  const tint =
    new THREE.Color();



  let floorIndex=0;



  for(
    let z=0;
    z<N;
    z++
  ){

    for(
      let x=0;
      x<N;
      x++
    ){


      if(!isFloor(x,z))
        continue;



      instance(

        floors,

        floorIndex,

        world(x+0.5),

        -0.15,

        world(z+0.5),

        TILE,

        0.3,

        TILE

      );



      tint.setHSL(

        0.105,

        0.08,

        0.84+random()*0.12

      );



      floors.setColorAt(

        floorIndex,

        tint

      );


      floorIndex++;


    }

  }



  floors.receiveShadow=true;


  floors.instanceMatrix.needsUpdate=true;



  if(floors.instanceColor){

    floors.instanceColor.needsUpdate=true;

  }



  group.add(floors);




  // ===================================================
  // DUVAR SİSTEMİ
  // ===================================================


  const segments=[];



  for(
    let z=0;
    z<N;
    z++
  ){

    for(
      let x=0;
      x<N;
      x++
    ){


      if(!isFloor(x,z))
        continue;



      const cx =
        world(x+0.5);


      const cz =
        world(z+0.5);



      if(!isFloor(x,z-1))

        segments.push([
          cx,
          world(z),
          0
        ]);



      if(!isFloor(x,z+1))

        segments.push([
          cx,
          world(z+1),
          0
        ]);



      if(!isFloor(x-1,z))

        segments.push([
          world(x),
          cz,
          Math.PI/2
        ]);



      if(!isFloor(x+1,z))

        segments.push([
          world(x+1),
          cz,
          Math.PI/2
        ]);


    }

  }



  const walls =
    new THREE.InstancedMesh(

      cube,

      materials.wall,

      segments.length

    );



  const caps =
    new THREE.InstancedMesh(

      cube,

      materials.paleStone,

      segments.length

    );



  const bases =
    new THREE.InstancedMesh(

      cube,

      materials.trim,

      segments.length

    );



// DEVAMI BÖLÜM 3'TE...
  // ===================================================
  // DUVAR INSTANCED MESH TAMAMLAMA
  // ===================================================


  segments.forEach(([x,z,angle],index)=>{


    instance(

      walls,

      index,

      x,

      HEIGHT/2,

      z,

      TILE+0.02,

      HEIGHT,

      0.5,

      angle

    );



    instance(

      caps,

      index,

      x,

      HEIGHT-0.05,

      z,

      TILE+0.05,

      0.24,

      0.7,

      angle

    );



    instance(

      bases,

      index,

      x,

      0.23,

      z,

      TILE+0.03,

      0.46,

      0.65,

      angle

    );



    tint.setHSL(

      0.11,

      0.06,

      0.88+random()*0.1

    );


    walls.setColorAt(

      index,

      tint

    );



    collider(

      x,

      z,

      angle===0
      ? TILE+0.02
      : 0.5,

      angle===0
      ? 0.5
      : TILE+0.02

    );


  });




  for(const mesh of [

    walls,

    caps,

    bases

  ]){


    mesh.castShadow=true;

    mesh.receiveShadow=true;


    mesh.instanceMatrix.needsUpdate=true;



    if(mesh.instanceColor)

      mesh.instanceColor.needsUpdate=true;



    group.add(mesh);

  }





  // ===================================================
  // KEMER SİSTEMİ
  // ===================================================


  function arch(
    cellX,
    cellZ,
    rotated=false,
    width=6
  ){


    const x =
      world(cellX);


    const z =
      world(cellZ);



    const radius =
      width/2-0.65;


    const spring=1.65;


    const top =
      spring+radius+0.45;


    const depth=0.8;



    const shape =
      new THREE.Shape();



    shape.moveTo(
      -width/2,
      0
    );


    shape.lineTo(
      -width/2,
      top
    );


    shape.lineTo(
      width/2,
      top
    );


    shape.lineTo(
      width/2,
      0
    );



    shape.lineTo(
      radius,
      0
    );


    shape.lineTo(
      radius,
      spring
    );



    for(
      let i=0;
      i<=32;
      i++
    ){

      const angle =
        i/32*Math.PI;



      shape.lineTo(

        Math.cos(angle)*radius,

        spring+
        Math.sin(angle)*radius

      );

    }



    shape.closePath();



    const geometry =
      new THREE.ExtrudeGeometry(

        shape,

        {
          depth,
          bevelEnabled:false
        }

      );



    geometry.translate(
      0,
      0,
      -depth/2
    );



    const mesh =
      new THREE.Mesh(

        geometry,

        materials.paleStone

      );



    mesh.position.set(
      x,
      0,
      z
    );


    mesh.rotation.y =
      rotated
      ? Math.PI/2
      : 0;



    mesh.castShadow=true;

    mesh.receiveShadow=true;



    group.add(mesh);




    const pillarWidth =
      width/2-radius;


    const offset =
      radius+
      pillarWidth/2;



    for(const side of [-1,1]){


      collider(

        rotated
        ? x
        : x+side*offset,


        rotated
        ? z+side*offset
        : z,


        rotated
        ? depth
        : pillarWidth,


        rotated
        ? pillarWidth
        : depth

      );


    }


  }





  // ===================================================
  // TÜNEL VE IŞIKLAR
  // ===================================================


  box(

    world(19),

    4.75,

    world(9.5),

    20,

    0.5,

    6,

    materials.trim

  );



  arch(15.5,9.5,true);

  arch(19,9.5,true);

  arch(23,9.5,true);



  arch(40,11,true,8);

  arch(48,22,false,8);

  arch(20,38,false,8);

  arch(29,50,true,8);

  arch(6,34,false,8);




  const lampMaterial =
    new THREE.MeshStandardMaterial({

      color:0xffd69a,

      emissive:0xffbc63,

      emissiveIntensity:1.6

    });




  for(
    const cellX of [16,20,23]
  ){


    box(

      world(cellX),

      4.42,

      world(9.5),

      0.6,

      0.12,

      0.35,

      lampMaterial

    );



    const light =
      new THREE.PointLight(

        0xffcf8f,

        17,

        10,

        2

      );



    light.position.set(

      world(cellX),

      3.6,

      world(9.5)

    );


    group.add(light);


  }





  // ===================================================
  // KASA SİSTEMİ
  // ===================================================


  function crate(
    cellX,
    cellZ,
    size=2.5,
    base=0
  ){


    const x =
      world(cellX);


    const z =
      world(cellZ);



    box(

      x,

      base+size/2,

      z,

      size,

      size,

      size,

      materials.wood,

      base<1.8

    );



    for(
      const side of [-1,1]
    ){


      for(
        const y of [0.16,size-0.16]
      ){


        box(

          x,

          base+y,

          z+side*(size/2+0.035),

          size+0.1,

          0.18,

          0.08,

          materials.trim

        );



        box(

          x+side*(size/2+0.035),

          base+y,

          z,

          0.08,

          0.18,

          size+0.1,

          materials.trim

        );


      }


    }


  }





  const crates=[

    [6,7,3],

    [7.7,7,3],

    [33,8,3],

    [34.7,8,3],

    [45,7,3],

    [46.7,7,3],

    [39,44,3.5],

    [41,44,3.5],

    [50,49,3],

    [14,42,3],

    [24,51,2.5]

  ];



  for(
    const args of crates
  )

    crate(...args);





  // ===================================================
  // VARİL SİSTEMİ
  // ===================================================


  const barrelGeometry =
    new THREE.CylinderGeometry(

      0.55,

      0.55,

      1.5,

      12

    );



  function barrel(cellX,cellZ){


    const mesh =
      new THREE.Mesh(

        barrelGeometry,

        materials.metal

      );



    mesh.position.set(

      world(cellX),

      0.75,

      world(cellZ)

    );



    mesh.castShadow=true;

    group.add(mesh);



    collider(

      world(cellX),

      world(cellZ),

      1.1,

      1.1

    );


  }




  [

    [4.2,12],

    [28,5.2],

    [54,7],

    [36.2,51],

    [48.8,30]

  ].forEach(

    a=>barrel(...a)

  );




// DEVAMI BÖLÜM 4'TE...
  // ===================================================
  // BİNA SİSTEMİ
  // ===================================================


  function buildingShell(
    cellX,
    cellZ,
    width,
    depth,
    type="house"
  ){

    const x =
      world(cellX);

    const z =
      world(cellZ);


    const wallH =
      type==="tower"
      ? 5.2
      : 3.8;


    const wallT =
      type==="tower"
      ? 0.7
      : 0.45;



    box(
      x,
      wallH/2,
      z-depth/2,
      width,
      wallH,
      wallT,
      materials.wall,
      true
    );


    box(
      x,
      wallH/2,
      z+depth/2,
      width,
      wallH,
      wallT,
      materials.wall,
      true
    );


    box(
      x-width/2,
      wallH/2,
      z,
      wallT,
      wallH,
      depth,
      materials.wall,
      true
    );


    box(
      x+width/2,
      wallH/2,
      z,
      wallT,
      wallH,
      depth,
      materials.wall,
      true
    );



    box(
      x,
      wallH+0.18,
      z,
      width+0.55,
      0.28,
      depth+0.55,
      type==="tower"
      ? materials.paleStone
      : materials.wood
    );



    if(type==="tower"){

      for(const sx of [-1,1]){

        for(const sz of [-1,1]){


          box(

            x+sx*(width/2-0.32),

            wallH/2,

            z+sz*(depth/2-0.32),

            0.62,

            wallH+0.18,

            0.62,

            materials.paleStone

          );


        }

      }

    }


  }




  buildingShell(
    58,
    15,
    7.5,
    6.5,
    "house"
  );


  buildingShell(
    64,
    25,
    8,
    7,
    "house"
  );


  buildingShell(
    8,
    20,
    6.5,
    6.5,
    "tower"
  );


  buildingShell(
    57,
    8,
    6,
    6,
    "tower"
  );





  // ===================================================
  // MERDİVEN SİSTEMİ
  // ===================================================


  const ladders=[];
  const rooftops=[];



  function ladder(
    cellX,
    cellZ,
    height=5.4
  ){

    const x =
      world(cellX);

    const z =
      world(cellZ);



    const root =
      new THREE.Group();



    root.position.set(
      x,
      0,
      z
    );



    for(
      let y=0;
      y<height;
      y+=0.45
    ){


      const step =
        new THREE.Mesh(
          cube,
          materials.iron
        );


      step.scale.set(
        1,
        0.08,
        0.15
      );


      step.position.set(
        0,
        y,
        0
      );


      root.add(step);


    }



    group.add(root);



    ladders.push({

      x,
      z,
      height

    });



    rooftops.push({

      x,
      z,
      radius:2.5,
      height

    });


  }




  ladder(43,21);

  ladder(55,36);

  ladder(28,49);

  ladder(61,14);





  // ===================================================
  // ÇARPIŞMA VE HAREKET
  // ===================================================


  const BUCKET_SIZE=8;

  const buckets=new Map();



  function bucketKey(x,z){

    return `${x},${z}`;

  }




  for(
    const bounds of colliders
  ){

    const minX =
      Math.floor(
        bounds.minX/BUCKET_SIZE
      );


    const maxX =
      Math.floor(
        bounds.maxX/BUCKET_SIZE
      );


    const minZ =
      Math.floor(
        bounds.minZ/BUCKET_SIZE
      );


    const maxZ =
      Math.floor(
        bounds.maxZ/BUCKET_SIZE
      );



    for(
      let z=minZ;
      z<=maxZ;
      z++
    ){

      for(
        let x=minX;
        x<=maxX;
        x++
      ){


        const key =
          bucketKey(x,z);


        if(!buckets.has(key))

          buckets.set(
            key,
            []
          );


        buckets.get(key)
          .push(bounds);


      }

    }

  }





  function blocked(
    x,
    z,
    radius=0.34
  ){


    const cellX =
      Math.floor(
        (x+OFFSET)/TILE
      );


    const cellZ =
      Math.floor(
        (z+OFFSET)/TILE
      );


    if(!isFloor(cellX,cellZ))

      return true;



    const minBX =
      Math.floor(
        (x-radius)/BUCKET_SIZE
      );


    const maxBX =
      Math.floor(
        (x+radius)/BUCKET_SIZE
      );


    const minBZ =
      Math.floor(
        (z-radius)/BUCKET_SIZE
      );


    const maxBZ =
      Math.floor(
        (z+radius)/BUCKET_SIZE
      );



    for(
      let bz=minBZ;
      bz<=maxBZ;
      bz++
    ){

      for(
        let bx=minBX;
        bx<=maxBX;
        bx++
      ){


        const list =
          buckets.get(
            bucketKey(bx,bz)
          );


        if(!list)
          continue;



        for(
          const b of list
        ){


          const cx =
            THREE.MathUtils.clamp(
              x,
              b.minX,
              b.maxX
            );


          const cz =
            THREE.MathUtils.clamp(
              z,
              b.minZ,
              b.maxZ
            );


          const dx=x-cx;

          const dz=z-cz;



          if(
            dx*dx+dz*dz <
            radius*radius
          )

            return true;


        }

      }

    }


    return false;

  }





  function movePlayer(
    position,
    dx,
    dz,
    radius=0.34
  ){


    const steps =
      Math.max(
        1,
        Math.ceil(
          Math.hypot(dx,dz)/0.15
        )
      );



    const sx =
      dx/steps;


    const sz =
      dz/steps;



    for(
      let i=0;
      i<steps;
      i++
    ){


      if(
        !blocked(
          position.x+sx,
          position.z,
          radius
        )
      )

        position.x+=sx;



      if(
        !blocked(
          position.x,
          position.z+sz,
          radius
        )
      )

        position.z+=sz;


    }


  }





  // ===================================================
  // DIŞ API
  // ===================================================


  return {

    group,

    colliders,


    navigation:{

      grid,

      tile:TILE,

      offset:OFFSET

    },


    isBlocked:blocked,


    movePlayer,


    ladders,


    rooftops,


    spawn:

      new THREE.Vector3(

        world(20),

        1.7,

        world(46)

      ),



    sites:{

      A:

      new THREE.Vector3(

        world(32),

        0,

        world(11)

      ),


      B:

      new THREE.Vector3(

        world(10),

        0,

        world(10)

      )

    }


  };


}