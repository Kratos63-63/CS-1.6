const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const WebSocket = require('ws');

const PORT = Number(process.env.PORT || 8080);
const ROOT = __dirname;
const rooms = new Map();
const MAX_PLAYERS = 64;
const TICK = 50;
const SPEED = 4.5, RUN_SPEED = 7;
const WORLD = 78;
const WEAPONS = {
  ak:{damage:34,range:90,interval:.115,spread:.012,magazine:30,reserve:90},
  m4:{damage:28,range:90,interval:.095,spread:.008,magazine:30,reserve:90},
  galil:{damage:29,range:88,interval:.105,spread:.011,magazine:35,reserve:105},
  famas:{damage:27,range:86,interval:.09,spread:.01,magazine:25,reserve:100},
  mp5:{damage:21,range:62,interval:.07,spread:.022,magazine:30,reserve:120},
  p90:{damage:20,range:65,interval:.055,spread:.02,magazine:50,reserve:150},
  xm1014:{damage:18,range:32,interval:.82,spread:.075,magazine:7,reserve:35,pellets:8},
  scout:{damage:72,range:150,interval:1.05,spread:.002,magazine:10,reserve:60},
  awp:{damage:115,range:180,interval:1.45,spread:.001,magazine:5,reserve:30},
  deagle:{damage:48,range:70,interval:.38,spread:.009,magazine:7,reserve:35},
  pistol:{damage:25,range:65,interval:.28,spread:.006,magazine:12,reserve:60}
};
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.wav':'audio/wav','.json':'application/json'};
const send=(ws,m)=>{if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(m));};
const code=()=>{let c;do c=crypto.randomBytes(3).toString('hex').toUpperCase();while(rooms.has(c));return c;};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const finite=n=>Number.isFinite(Number(n));
const norm=a=>{let x=Number(a)||0;while(x>Math.PI)x-=Math.PI*2;while(x<-Math.PI)x+=Math.PI*2;return x;};
function dir(yaw,pitch){const cp=Math.cos(pitch),sp=Math.sin(pitch);return{x:-Math.sin(yaw)*cp,y:sp,z:-Math.cos(yaw)*cp};}
function publicState(p){return{id:p.id,x:p.x,y:p.y,z:p.z,yaw:p.yaw,pitch:p.pitch,team:p.team,health:p.health,alive:p.alive,kills:p.kills,deaths:p.deaths,weapon:p.weapon};}
function broadcast(room,m,except){for(const p of room.players.values())if(p.ws!==except)send(p.ws,m);}
function spawn(p){const base=p.team==='T'?{x:-40,z:12,yaw:0}:{x:4,z:-60,yaw:Math.PI};const slots=[[0,0],[-2,0],[2,0],[0,-2],[0,2],[-2,-2],[2,-2],[-2,2]];const [dx,dz]=slots[p.slot%slots.length];p.x=base.x+dx;p.z=base.z+dz;p.y=1.7;p.yaw=base.yaw;p.pitch=0;}
function assignTeam(room,p){let t=0,ct=0;for(const q of room.players.values())q.team==='T'?t++:ct++;p.team=t<=ct?'T':'CT';p.slot=room.nextSlot++;spawn(p);}
function makePlayer(ws){return{id:crypto.randomUUID(),ws,room:null,team:'T',slot:0,x:-40,y:1.7,z:12,yaw:0,pitch:0,health:100,alive:true,kills:0,deaths:0,weapon:'ak',ammo:Object.fromEntries(Object.entries(WEAPONS).map(([k,w])=>[k,w.magazine])),reserve:Object.fromEntries(Object.entries(WEAPONS).map(([k,w])=>[k,w.reserve])),input:{forward:0,side:0,run:false,yaw:0,pitch:0},lastShot:0,respawnAt:0};}
function validRoom(c){return /^[A-Z0-9]{6}$/.test(c);}
function fire(room,p,requested){if(!p.alive)return;const weaponId=Object.prototype.hasOwnProperty.call(WEAPONS,requested)?requested:'ak';const w=WEAPONS[weaponId];const now=Date.now();if(now-p.lastShot<w.interval*1000)return;if((p.ammo[weaponId]??w.magazine)<=0)return;p.lastShot=now;p.weapon=weaponId;p.ammo[weaponId]--;
  const d=dir(p.yaw,p.pitch);const origin={x:p.x,y:1.45,z:p.z};let best=null,bestDist=Infinity;
  for(const q of room.players.values()){if(q.id===p.id||!q.alive||q.team===p.team)continue;const vx=q.x-origin.x,vy=1.2-origin.y,vz=q.z-origin.z;const dist=Math.hypot(vx,vy,vz);if(dist>w.range)continue;const dot=(vx*d.x+vy*d.y+vz*d.z)/(dist||1);const cone=w.spread+Math.min(.07,.28/Math.max(dist,1));if(dot<Math.cos(cone))continue;const closest=origin.x+d.x*dist,closestY=origin.y+d.y*dist,closestZ=origin.z+d.z*dist;const lateral=Math.hypot(q.x-closest,q.z-closestZ);if(lateral>.62)continue;if(dist<bestDist){bestDist=dist;best=q;}}
  if(best){let damage=w.damage;if(w.pellets)damage=w.damage*Math.max(1,Math.round(w.pellets*.75));best.health=Math.max(0,best.health-damage);const killed=best.health<=0;if(killed){best.alive=false;best.deaths++;best.respawnAt=now+3000;p.kills++;}broadcast(room,{type:'combat',attackerId:p.id,targetId:best.id,hit:true,damage,killed,health:best.health,weapon:weaponId,ox:origin.x,oy:origin.y,oz:origin.z,tx:best.x,ty:1.2,tz:best.z});}
  else broadcast(room,{type:'combat',attackerId:p.id,targetId:null,hit:false,damage:0,killed:false,health:0,weapon:weaponId,ox:origin.x,oy:origin.y,oz:origin.z,tx:origin.x+d.x*w.range,ty:origin.y+d.y*w.range,tz:origin.z+d.z*w.range});
}
function tick(room){const dt=TICK/1000;const now=Date.now();for(const p of room.players.values()){
  if(!p.alive){if(now>=p.respawnAt){p.health=100;p.alive=true;spawn(p);broadcast(room,{type:'respawn',id:p.id,state:publicState(p)});}continue;}
  const i=p.input;const l=Math.hypot(i.forward,i.side)||1;const f=i.forward/l,s=i.side/l;const speed=i.run?RUN_SPEED:SPEED;p.yaw=norm(i.yaw);p.pitch=clamp(i.pitch,-1.45,1.45);p.x=clamp(p.x+(-Math.sin(p.yaw)*f+Math.cos(p.yaw)*s)*speed*dt,-WORLD,WORLD);p.z=clamp(p.z+(-Math.cos(p.yaw)*f-Math.sin(p.yaw)*s)*speed*dt,-WORLD,WORLD);
  if(i.fire)fire(room,p,p.weapon);
}broadcast(room,{type:'snapshot',players:[...room.players.values()].map(publicState)});}
function createRoom(){const c=code();rooms.set(c,{code:c,host:null,players:new Map(),config:{},timer:null,nextSlot:0});return rooms.get(c);}
const server=http.createServer((req,res)=>{let u=decodeURIComponent((req.url||'/').split('?')[0]);if(u==='/')u='/index.html';const file=path.resolve(ROOT,'.'+u);if(!file.startsWith(ROOT)||!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404);return res.end('Not found');}res.writeHead(200,{'Content-Type':mime[path.extname(file).toLowerCase()]||'application/octet-stream','Cache-Control':'no-cache'});fs.createReadStream(file).pipe(res);});
const wss=new WebSocket.Server({server});
wss.on('connection',ws=>{const p=makePlayer(ws);send(ws,{type:'hello',id:p.id});ws.on('message',raw=>{let m;try{m=JSON.parse(raw)}catch{return}if(!m||typeof m.type!=='string')return;
  if(m.type==='create'){if(p.room)return;const r=createRoom();r.host=p.id;r.players.set(p.id,p);p.room=r.code;assignTeam(r,p);r.config=sanitizeConfig(m.config);if(!r.timer)r.timer=setInterval(()=>tick(r),TICK);send(ws,{type:'room',room:r.code,host:true,config:r.config,count:r.players.size});send(ws,{type:'start',config:r.config});return;}
  if(m.type==='join'){const c=String(m.room||'').trim().toUpperCase(),r=rooms.get(c);if(!r)return send(ws,{type:'error',message:'Oda bulunamadı. Kodun doğru olduğundan emin ol.'});if(r.players.size>=MAX_PLAYERS)return send(ws,{type:'error',message:'Oda dolu.'});r.players.set(p.id,p);p.room=r.code;assignTeam(r,p);if(!r.timer)r.timer=setInterval(()=>tick(r),TICK);send(ws,{type:'room',room:r.code,host:false,config:r.config,count:r.players.size});send(ws,{type:'snapshot',players:[...r.players.values()].filter(q=>q.id!==p.id).map(publicState)});broadcast(r,{type:'room-count',count:r.players.size});broadcast(r,{type:'start',config:r.config});return;}
  const r=p.room&&rooms.get(p.room);if(!r)return;
  if(m.type==='start'&&p.id===r.host){r.config=sanitizeConfig(m.config||r.config);broadcast(r,{type:'start',config:r.config});return;}
  if(m.type==='input'){const i=m.input||{};p.input.forward=clamp(Number(i.forward)||0,-1,1);p.input.side=clamp(Number(i.side)||0,-1,1);p.input.run=!!i.run;p.input.yaw=finite(i.yaw)?Number(i.yaw):p.yaw;p.input.pitch=finite(i.pitch)?Number(i.pitch):p.pitch;p.input.fire=!!i.fire;p.input.weapon=Object.prototype.hasOwnProperty.call(WEAPONS,i.weapon)?i.weapon:'ak';return;}
  if(m.type==='fire'){p.input.yaw=finite(m.yaw)?Number(m.yaw):p.yaw;p.input.pitch=finite(m.pitch)?Number(m.pitch):p.pitch;fire(r,p,m.weapon);return;}
  if(m.type==='reload'){const w=WEAPONS[p.weapon];if(w){const have=p.ammo[p.weapon]??0,cap=w.magazine,res=p.reserve[p.weapon]??w.reserve,need=cap-have,take=Math.min(need,res);p.ammo[p.weapon]=have+take;p.reserve[p.weapon]=res-take;broadcast(r,{type:'ammo',id:p.id,weapon:p.weapon,ammo:p.ammo[p.weapon],reserve:p.reserve[p.weapon]});}return;}
});ws.on('close',()=>{const r=p.room&&rooms.get(p.room);if(!r)return;r.players.delete(p.id);broadcast(r,{type:'player-left',id:p.id,count:r.players.size});if(r.host===p.id){const n=r.players.values().next().value;r.host=n?.id||null;if(n)send(n.ws,{type:'room',room:r.code,host:true,config:r.config,count:r.players.size});}if(!r.players.size){clearInterval(r.timer);rooms.delete(r.code);}});});
server.listen(PORT,'0.0.0.0',()=>console.log(`Dust Operations v10 server on :${PORT}`));
function sanitizeConfig(c){return{team:c?.team==='CT'?'CT':'T',botCount:clamp(Number(c?.botCount)||0,0,64),difficulty:['easy','normal','hard'].includes(c?.difficulty)?c.difficulty:'normal',primary:Object.prototype.hasOwnProperty.call(WEAPONS,c?.primary)?c.primary:'ak'};}
