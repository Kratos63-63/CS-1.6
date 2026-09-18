// Dust Operations — authoritative Cloudflare Worker + Durable Object.
// Multiplayer physics, collision, jump, reload lock, teams and combat are server-authoritative.
const MAX_PLAYERS=64,TICK=50,WORLD=78,SPEED=4.5,RUN_SPEED=7,PLAYER_RADIUS=.34,GROUND_Y=1.7,JUMP_SPEED=6.2,GRAVITY=16;
const WEAPONS={
 ak:{damage:34,range:90,interval:.115,spread:.012,magazine:30,reserve:90,reload:2.3},
 m4:{damage:28,range:90,interval:.095,spread:.008,magazine:30,reserve:90,reload:2.1},
 galil:{damage:29,range:88,interval:.105,spread:.011,magazine:35,reserve:105,reload:2.2},
 famas:{damage:27,range:86,interval:.09,spread:.01,magazine:25,reserve:100,reload:2.0},
 mp5:{damage:21,range:62,interval:.07,spread:.022,magazine:30,reserve:120,reload:2.0},
 p90:{damage:20,range:65,interval:.055,spread:.02,magazine:50,reserve:150,reload:2.1},
 xm1014:{damage:18,range:32,interval:.82,spread:.075,magazine:7,reserve:35,reload:2.8,pellets:8},
 scout:{damage:72,range:150,interval:1.05,spread:.002,magazine:10,reserve:60,reload:2.2},
 awp:{damage:115,range:180,interval:1.45,spread:.001,magazine:5,reserve:30,reload:3.0},
 deagle:{damage:48,range:70,interval:.38,spread:.009,magazine:7,reserve:35,reload:2.1},
 pistol:{damage:25,range:65,interval:.28,spread:.006,magazine:12,reserve:60,reload:1.55}
};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const finite=n=>Number.isFinite(Number(n));
const norm=a=>{let x=Number(a)||0;while(x>Math.PI)x-=Math.PI*2;while(x<-Math.PI)x+=Math.PI*2;return x};
const dir=(y,p)=>{const c=Math.cos(p),s=Math.sin(p);return{x:-Math.sin(y)*c,y:s,z:-Math.cos(y)*c}};
const pub=p=>({id:p.id,x:p.x,y:p.y,z:p.z,yaw:p.yaw,pitch:p.pitch,team:p.team,health:p.health,alive:p.alive,kills:p.kills,deaths:p.deaths,weapon:p.weapon});
const randomCode=()=>{const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let s='';for(let i=0;i<6;i++)s+=chars[Math.floor(Math.random()*chars.length)];return s};

// The collision layout mirrors dust-map.js. World cell size/offset are identical.
const N=80,TILE=2,OFFSET=80;
const grid=Array.from({length:N},()=>Array(N).fill(false));
const world=v=>v*TILE-OFFSET;
function carve(x1,z1,x2,z2){for(let z=z1;z<z2;z++)for(let x=x1;x<x2;x++)if(grid[z]&&x>=0&&x<N)grid[z][x]=true}
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
  carve(36, 9, 44, 13);
  carve(42, 5, 56, 20);
  carve(46, 19, 50, 44);
  carve(35, 40, 55, 54);
  carve(19, 48, 36, 52);
  carve(12, 40, 27, 54);
  carve(18, 35, 22, 41);
  carve(30, 27, 34, 43);
  carve(33, 40, 37, 44);
  carve(4, 27, 8, 44);
  carve(7, 40, 13, 44);
  carve(7, 26, 10, 29);
  carve(56, 12, 69, 19);
  carve(62, 18, 67, 40);
  carve(54, 36, 67, 43);
  carve(50, 52, 67, 61);
  carve(36, 54, 43, 66);
  carve(20, 53, 27, 67);
  carve(8, 46, 22, 53);
  carve(3, 42, 9, 55);
  carve(4, 15, 10, 25);
  carve(8, 10, 18, 17);
  carve(50, 4, 63, 11);
  carve(61, 6, 69, 15);
  carve(68, 16, 71, 43);
  carve(64, 40, 71, 56);
  carve(56, 59, 64, 66);
  carve(26, 63, 56, 68);
  carve(6, 52, 26, 58);
  carve(43, 21, 49, 30);
  carve(48, 26, 57, 31);
  carve(27, 44, 35, 50);
const colliders=[];
function addCollider(x,z,w,d){colliders.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2})}
for(let z=0;z<N;z++)for(let x=0;x<N;x++){
  if(!grid[z][x])continue;
  const cx=world(x+.5),cz=world(z+.5);
  if(!grid[z-1]?.[x]) addCollider(cx,world(z),TILE+.02,.5);
  if(!grid[z+1]?.[x]) addCollider(cx,world(z+1),TILE+.02,.5);
  if(!grid[z]?.[x-1]) addCollider(world(x),cz,.5,TILE+.02);
  if(!grid[z]?.[x+1]) addCollider(world(x+1),cz,.5,TILE+.02);
}
function crate(cellX,cellZ,size){addCollider(world(cellX),world(cellZ),size,size)}
  crate(6.0, 7.0, 3.0);
  crate(7.7, 7.0, 3.0);
  crate(12.5, 12.5, 2.4);
  crate(33.0, 8.0, 3.0);
  crate(34.7, 8.0, 3.0);
  crate(29.0, 12.5, 2.2);
  crate(35.0, 12.0, 2.4);
  crate(14.7, 26.0, 2.2);
  crate(24.5, 29.0, 2.5);
  crate(19.0, 18.0, 2.0);
  crate(31.5, 20.0, 1.8);
  crate(45.0, 7.0, 3.0);
  crate(46.7, 7.0, 3.0);
  crate(53.0, 16.0, 3.0);
  crate(44.5, 17.0, 2.5);
  crate(39.0, 44.0, 3.5);
  crate(41.0, 44.0, 3.5);
  crate(50.0, 49.0, 3.0);
  crate(51.7, 49.0, 3.0);
  crate(46.0, 52.0, 2.4);
  crate(14.0, 42.0, 3.0);
  crate(15.7, 42.0, 3.0);
  crate(24.0, 51.0, 2.5);
function blocked(x,z,r=PLAYER_RADIUS){
  const cellX=Math.floor((x+OFFSET)/TILE),cellZ=Math.floor((z+OFFSET)/TILE);
  if(cellX<0||cellZ<0||cellX>=N||cellZ>=N||!grid[cellZ][cellX])return true;
  for(const c of colliders){const qx=clamp(x,c.minX,c.maxX),qz=clamp(z,c.minZ,c.maxZ);const dx=x-qx,dz=z-qz;if(dx*dx+dz*dz<r*r)return true}
  return false;
}
function movePlayer(p,dx,dz){
  const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.12));
  const sx=dx/steps,sz=dz/steps;
  for(let i=0;i<steps;i++){
    if(!blocked(p.x+sx,p.z,PLAYER_RADIUS))p.x+=sx;
    if(!blocked(p.x,p.z+sz,PLAYER_RADIUS))p.z+=sz;
  }
}
function rayAabb2D(o,d,maxDist,c){
  let tmin=0,tmax=maxDist;
  if(Math.abs(d.x)<1e-8){if(o.x<c.minX||o.x>c.maxX)return Infinity}else{const a=(c.minX-o.x)/d.x,b=(c.maxX-o.x)/d.x;const lo=Math.min(a,b),hi=Math.max(a,b);tmin=Math.max(tmin,lo);tmax=Math.min(tmax,hi)}
  if(Math.abs(d.z)<1e-8){if(o.z<c.minZ||o.z>c.maxZ)return Infinity}else{const a=(c.minZ-o.z)/d.z,b=(c.maxZ-o.z)/d.z;const lo=Math.min(a,b),hi=Math.max(a,b);tmin=Math.max(tmin,lo);tmax=Math.min(tmax,hi)}
  return tmax>=tmin&&tmin>=0?tmin:Infinity;
}
function wallDistance(o,d,range){let best=range;for(const c of colliders){const t=rayAabb2D(o,d,range,c);if(t<best)best=t}return best}

export default {async fetch(request,env){const url=new URL(request.url);if(url.pathname==='/ws'){if(request.headers.get('Upgrade')!=='websocket')return new Response('WebSocket required',{status:426});const id=env.ROOMS.idFromName('GLOBAL');return env.ROOMS.get(id).fetch(request)}return env.ASSETS.fetch(request)}};

export class Room{
 constructor(ctx,env){this.ctx=ctx;this.env=env;this.players=new Map();this.rooms=new Map();this.timer=null;this.loaded=false}
 async fetch(request){await this.load();const pair=new WebSocketPair();const [client,ws]=Object.values(pair);ws.accept();const p=this.makePlayer(ws);this.players.set(p.id,p);ws.addEventListener('message',e=>this.handle(p.id,e.data));ws.addEventListener('close',()=>this.leave(p.id));this.send(ws,{type:'hello',id:p.id});this.ensureLoop();return new Response(null,{status:101,webSocket:client})}
 async load(){if(this.loaded)return;this.loaded=true;const saved=await this.ctx.storage.get('roomConfigs')||{};for(const [code,config] of Object.entries(saved))this.rooms.set(code,{code,host:null,config,players:new Set(),nextSlot:0})}
 async persist(){const o={};for(const [c,r] of this.rooms)o[c]=r.config;await this.ctx.storage.put('roomConfigs',o)}
 makePlayer(ws){return{id:crypto.randomUUID(),ws,room:null,team:'T',preferredTeam:'T',slot:0,x:-20,y:GROUND_Y,z:32,yaw:0,pitch:0,vy:0,health:100,alive:true,kills:0,deaths:0,weapon:'ak',ammo:Object.fromEntries(Object.entries(WEAPONS).map(([k,w])=>[k,w.magazine])),reserve:Object.fromEntries(Object.entries(WEAPONS).map(([k,w])=>[k,w.reserve])),input:{forward:0,side:0,run:false,yaw:0,pitch:0,fire:false,jump:false,weapon:'ak'},lastShot:0,reloadUntil:0,respawnAt:0}}
 send(ws,m){try{ws.send(JSON.stringify(m))}catch{}}
 broadcast(r,m,except){for(const id of r.players){const p=this.players.get(id);if(p&&p.ws!==except)this.send(p.ws,m)}}
 ensureLoop(){if(this.timer)return;this.timer=setInterval(()=>this.tick(),TICK)}
 roomFor(p){return p.room?this.rooms.get(p.room):null}
 assign(r,p,preferred=p.preferredTeam){
   const team=preferred==='CT'?'CT':'T';
   p.team=team;p.preferredTeam=team;p.slot=r.nextSlot++;
   // T başlangıcı eski sürümde haritanın boş bir hücresine düşüyordu.
   // Geçerli Dust koridoruna taşıyoruz.
   const b=team==='T'?{x:-40,z:20,yaw:0}:{x:4,z:-40,yaw:Math.PI};
   const slot=p.slot; p.x=b.x+(slot%4-1.5)*1.25;p.z=b.z+(Math.floor(slot/4)%2-.5)*1.25;p.y=GROUND_Y;p.vy=0;p.yaw=b.yaw;p.pitch=0;p.health=100;p.alive=true;p.reloadUntil=0;p.weapon='ak';
 }
 async handle(id,raw){let m;try{m=JSON.parse(raw)}catch{return}const p=this.players.get(id);if(!p)return;
  if(m.type==='create'){if(p.room)return;let c=randomCode();while(this.rooms.has(c))c=randomCode();const config=sanitize(m.config);const r={code:c,host:id,config,players:new Set([id]),nextSlot:0};this.rooms.set(c,r);p.room=c;p.preferredTeam=config.team;this.assign(r,p,p.preferredTeam);await this.persist();this.send(p.ws,{type:'room',room:c,host:true,config:r.config,count:1,playerTeam:p.team});this.send(p.ws,{type:'start',config:{...r.config,team:p.team}});return}
  if(m.type==='join'){const c=String(m.room||'').trim().toUpperCase(),r=this.rooms.get(c);if(!r)return this.send(p.ws,{type:'error',message:'Oda bulunamadı. Kodun doğru olduğundan emin ol.'});if(r.players.size>=MAX_PLAYERS)return this.send(p.ws,{type:'error',message:'Oda dolu.'});r.players.add(id);p.room=c;p.preferredTeam=m.team==='CT'?'CT':'T';this.assign(r,p,p.preferredTeam);this.send(p.ws,{type:'room',room:c,host:false,config:r.config,count:r.players.size,playerTeam:p.team});this.send(p.ws,{type:'snapshot',players:[...r.players].map(x=>pub(this.players.get(x))).filter(x=>x&&x.id!==id)});this.broadcast(r,{type:'room-count',count:r.players.size});this.send(p.ws,{type:'start',config:{...r.config,team:p.team}});return}
  const r=this.roomFor(p);if(!r)return;
  if(m.type==='start'&&r.host===id){r.config=sanitize(m.config||r.config);p.preferredTeam=r.config.team;for(const pid of r.players){const q=this.players.get(pid);if(q)this.send(q.ws,{type:'start',config:{...r.config,team:q.team}})}await this.persist();return}
  if(m.type==='input'){const i=m.input||{};p.input.forward=clamp(Number(i.forward)||0,-1,1);p.input.side=clamp(Number(i.side)||0,-1,1);p.input.run=!!i.run;p.input.yaw=finite(i.yaw)?Number(i.yaw):p.yaw;p.input.pitch=finite(i.pitch)?Number(i.pitch):p.pitch;p.input.fire=!!i.fire;p.input.jump=!!i.jump;p.input.weapon=Object.hasOwn(WEAPONS,i.weapon)?i.weapon:'ak';p.weapon=p.input.weapon;return}
  if(m.type==='reload'){const w=WEAPONS[p.weapon];if(!w||Date.now()<p.reloadUntil||p.weapon==='knife')return;const have=p.ammo[p.weapon]??0,res=p.reserve[p.weapon]??w.reserve;if(have>=w.magazine||res<=0)return;p.reloadUntil=Date.now()+w.reload*1000;p.input.fire=false;this.send(p.ws,{type:'reload-start',id:p.id,weapon:p.weapon,duration:w.reload});return}
 }
 fire(r,p){if(!p.alive||Date.now()<p.reloadUntil)return;const wid=Object.hasOwn(WEAPONS,p.input.weapon)?p.input.weapon:'ak',w=WEAPONS[wid],now=Date.now();if(now-p.lastShot<w.interval*1000)return;if((p.ammo[wid]??w.magazine)<=0)return;p.lastShot=now;p.weapon=wid;p.ammo[wid]--;const d=dir(p.yaw,p.pitch),o={x:p.x,y:p.y-.25,z:p.z},wall=wallDistance(o,d,w.range);let best=null,bd=wall;
   for(const id of r.players){const q=this.players.get(id);if(!q||q.id===p.id||!q.alive||q.team===p.team)continue;const vx=q.x-o.x,vy=(q.y-.5)-o.y,vz=q.z-o.z,dist=Math.hypot(vx,vy,vz);if(dist>bd||dist>w.range)continue;const dot=(vx*d.x+vy*d.y+vz*d.z)/(dist||1),cone=w.spread+Math.min(.07,.28/Math.max(dist,1));if(dot<Math.cos(cone))continue;const px=o.x+d.x*dist,pz=o.z+d.z*dist;if(Math.hypot(q.x-px,q.z-pz)>.62)continue;if(dist<bd){bd=dist;best=q}}
   const common={type:'combat',attackerId:p.id,targetId:best?.id||null,hit:!!best,damage:0,killed:false,health:best?.health||0,weapon:wid,ox:o.x,oy:o.y,oz:o.z,tx:o.x+d.x*bd,ty:o.y+d.y*bd,tz:o.z+d.z*bd,dx:d.x,dy:d.y,dz:d.z,range:bd,team:p.team};
   if(best){let damage=w.damage;if(w.pellets)damage=w.damage*Math.max(1,Math.round(w.pellets*.75));best.health=Math.max(0,best.health-damage);common.damage=damage;common.health=best.health;common.killed=best.health<=0;if(common.killed){best.alive=false;best.deaths++;best.respawnAt=now+3000;p.kills++}}
   this.broadcast(r,common);
 }
 tick(){const now=Date.now();for(const r of this.rooms.values()){for(const id of r.players){const p=this.players.get(id);if(!p)continue;if(!p.alive){if(now>=p.respawnAt){this.assign(r,p,p.preferredTeam);this.broadcast(r,{type:'respawn',id:p.id,state:pub(p)})}continue}
    const i=p.input; if(p.reloadUntil>0 && now>=p.reloadUntil){const w=WEAPONS[p.weapon];if(w){const have=p.ammo[p.weapon]??0,res=p.reserve[p.weapon]??w.reserve,need=Math.max(0,w.magazine-have),take=Math.min(need,res);p.ammo[p.weapon]=have+take;p.reserve[p.weapon]=res-take}p.reloadUntil=0;} if(now>=p.reloadUntil && i.jump && p.y<=GROUND_Y+.03){p.vy=JUMP_SPEED;i.jump=false} else i.jump=false;
    p.yaw=norm(i.yaw);p.pitch=clamp(i.pitch,-1.45,1.45);const dt=TICK/1000;let f=i.forward,s=i.side,len=Math.hypot(f,s)||1;if(len>1){f/=len;s/=len}const speed=i.run?RUN_SPEED:SPEED;movePlayer(p,(-Math.sin(p.yaw)*f+Math.cos(p.yaw)*s)*speed*dt,(-Math.cos(p.yaw)*f-Math.sin(p.yaw)*s)*speed*dt);
    p.vy-=GRAVITY*dt;p.y+=p.vy*dt;if(p.y<=GROUND_Y){p.y=GROUND_Y;p.vy=0}if(p.y>GROUND_Y+.01)p.y=Math.min(p.y,7.0);if(i.fire)this.fire(r,p);
   }this.broadcast(r,{type:'snapshot',players:[...r.players].map(x=>pub(this.players.get(x))).filter(Boolean)})}}
 leave(id){const p=this.players.get(id);if(!p)return;const r=this.roomFor(p);if(r){r.players.delete(id);if(r.host===id){r.host=r.players.values().next().value||null;if(r.host){const h=this.players.get(r.host);this.send(h.ws,{type:'room',room:r.code,host:true,config:r.config,count:r.players.size,playerTeam:h.team})}}this.broadcast(r,{type:'player-left',id,count:r.players.size});if(!r.players.size)this.rooms.delete(r.code)}this.players.delete(id)}
}
function sanitize(c){return{team:c?.team==='CT'?'CT':'T',botCount:clamp(Number(c?.botCount)||0,0,64),difficulty:['easy','normal','hard'].includes(c?.difficulty)?c.difficulty:'normal',primary:Object.hasOwn(WEAPONS,c?.primary)?c.primary:'ak'}}
