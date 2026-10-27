import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { randomBytes } from 'node:crypto';
const app=express(),http=createServer(app),io=new Server(http);
app.use(express.static('public'));
app.get('/', (req, res) => {
  res.sendFile('index.html', {
    root: new URL('./public/', import.meta.url).pathname
  });
});
const rooms=new Map(), nodes=['Gateway','DNS','Core Switch','Database','Wi-Fi','Firewall'];
const snapshot=r=>({code:r.code,host:r.host,players:Object.entries(r.players).map(([id,p])=>({id,name:p.name,score:p.score,online:!!p.socketId})),phase:r.phase,health:r.health,time:r.time,incidents:r.incidents,log:r.log.slice(-5),result:r.result||null});
function send(r){io.to(r.code).emit('state',snapshot(r))}
function incident(r){const node=nodes[Math.floor(Math.random()*nodes.length)],types=['Packet loss','Routing loop','Access denied','Service outage'];r.incidents.push({id:++r.seq,node,type:types[Math.floor(Math.random()*types.length)]});r.health=Math.max(0,r.health-7);r.log.push(`Alert: ${node} needs attention`)}
function finish(r){
 r.phase='finished';clearInterval(r.timer);r.timer=null;
 const success=r.health>0&&r.time===0;
 const ranking=Object.entries(r.players).map(([id,p])=>({id,name:p.name,score:p.score})).sort((a,b)=>b.score-a.score);
 const top=ranking.length?ranking[0].score:0;
 const winners=ranking.filter(p=>p.score===top&&top>0);
 r.result={success,ranking,winners,teamScore:ranking.reduce((n,p)=>n+p.score,0)};
 r.log.push(success?'Mission complete! City connected.':'Network offline. Try again!');send(r)
}
function scheduleCleanup(r){clearTimeout(r.cleanup);r.cleanup=setTimeout(()=>{if(Object.values(r.players).every(p=>!p.socketId)){clearInterval(r.timer);rooms.delete(r.code)}},10*60*1000);r.cleanup.unref?.()}
io.on('connection',socket=>{
 socket.on('join',(payload={},ack=()=>{})=>{
  let {code,name,token}=payload;name=String(name||'Engineer').trim().slice(0,18)||'Engineer';code=String(code||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6);token=typeof token==='string'?token:'';
  if(socket.data.code)return ack({error:'Already in a room. Refresh to reconnect.'});
  let r=code?rooms.get(code):null;
  if(code&&!r)return ack({error:'Room not found. Check the invite code.'});
  if(!r){do{code=randomBytes(4).toString('hex').slice(0,6).toUpperCase()}while(rooms.has(code));r={code,host:null,players:{},phase:'lobby',health:100,time:90,incidents:[],seq:0,log:['Waiting for engineers...'],timer:null,cleanup:null};rooms.set(code,r)}
  let id=Object.keys(r.players).find(id=>r.players[id].token===token&&token);
  if(!id){if(r.phase!=='lobby')return ack({error:'Mission already started. Only existing players can reconnect.'});if(Object.keys(r.players).length>=4)return ack({error:'Room full (4 players).'});id=randomBytes(12).toString('hex');token=randomBytes(24).toString('hex');r.players[id]={name,score:0,token,socketId:null};if(!r.host)r.host=id}
  const old=r.players[id].socketId;if(old&&old!==socket.id){const previous=io.sockets.sockets.get(old);if(previous){previous.data.code=null;previous.data.playerId=null;previous.leave(code);previous.emit('session-replaced')} }
  r.players[id].socketId=socket.id;socket.data.code=code;socket.data.playerId=id;socket.join(code);clearTimeout(r.cleanup);r.cleanup=null;ack({code,token,id,name:r.players[id].name});send(r);
 });
 socket.on('start',()=>{const r=rooms.get(socket.data.code);if(!r||r.host!==socket.data.playerId||r.phase!=='lobby')return;r.phase='playing';r.log.push('Mission started! Repair incidents together.');incident(r);send(r);r.timer=setInterval(()=>{if(r.phase!=='playing')return;r.time--;if(r.time%8===0&&r.incidents.length<5)incident(r);if(r.incidents.length)r.health=Math.max(0,r.health-1);if(r.time<=0||r.health<=0)finish(r);else send(r)},1000)});
 socket.on('rematch',()=>{const r=rooms.get(socket.data.code);if(!r||r.host!==socket.data.playerId||r.phase!=='finished')return;clearInterval(r.timer);r.timer=null;r.phase='lobby';r.health=100;r.time=90;r.incidents=[];r.result=null;r.log=['Rematch ready. Host can start a new mission.'];for(const p of Object.values(r.players))p.score=0;send(r)});
 socket.on('repair',id=>{const r=rooms.get(socket.data.code),p=r?.players[socket.data.playerId];if(!r||r.phase!=='playing'||!p||p.socketId!==socket.id)return;const index=r.incidents.findIndex(x=>x.id===id);if(index<0)return;const [issue]=r.incidents.splice(index,1);p.score+=100;r.health=Math.min(100,r.health+5);r.log.push(`${p.name} repaired ${issue.node}`);send(r)});
 socket.on('disconnect',()=>{const r=rooms.get(socket.data.code),p=r?.players[socket.data.playerId];if(!r||!p||p.socketId!==socket.id)return;p.socketId=null;if(Object.values(r.players).every(x=>!x.socketId))scheduleCleanup(r);send(r)})
});
http.listen(process.env.PORT||3000,()=>console.log('Packet Panic running on port '+(process.env.PORT||3000)));
