// Omaggio web a Super Mario Kart (1992). Codice, disegni e sintesi audio nuovi.
// Regole GP dal manuale Nintendo; fisica e tracciati sono ricostruzioni, non ROM.
registerGame({
 id:'mario-kart',title:'SUPER MARIO KART',license:'MIT',color:'#f27369',bg:'#152a3c',size:[480,640],flexH:true,flexMin:1.05,
 blurb:'Un omaggio al Kart SNES: otto piloti, quattro coppe, venti circuiti e cinque giri. B accelera, A usa l’oggetto, sinistra/destra sterzano, giù frena, su salta e derapa. START pausa, SELECT cambia mappa/specchio. Anche in orizzontale, con croce e A/B. Grafica e fisica ricostruite per il web.',
 inputs:['CROCE + A/B','20 CIRCUITI','ORIZZONTALE'],
 create(api){
  const{cv,g,held}=api;let W=cv.width,H=cv.height;
  const TAU=Math.PI*2,clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),wrap=(n,l)=>(n%l+l)%l,angle=n=>wrap(n+Math.PI,TAU)-Math.PI;
  const DRIVERS=[['MARIO','#ed5148','M',1,1,1],['LUIGI','#59ba60','L',1,1,1],['PEACH','#f59ac3','P',.96,1.25,.95],['YOSHI','#75c754','Y',.96,1.25,.95],['BOWSER','#dfb640','B',1.12,.72,.85],['D.K. JR','#ac724c','J',1.12,.72,.85],['KOOPA','#72c2a0','K',.94,1.12,1.23],['TOAD','#f3e8ca','T',.94,1.12,1.23]];
  const CUPS=['MUSHROOM CUP','FLOWER CUP','STAR CUP','SPECIAL CUP'];
  const NAMES=['Mario Circuit 1','Donut Plains 1','Ghost Valley 1','Bowser Castle 1','Mario Circuit 2','Choco Island 1','Ghost Valley 2','Donut Plains 2','Bowser Castle 2','Mario Circuit 3','Koopa Beach 1','Choco Island 2','Vanilla Lake 1','Bowser Castle 3','Mario Circuit 4','Donut Plains 3','Koopa Beach 2','Ghost Valley 3','Vanilla Lake 2','Rainbow Road'];
  const TYPES=[0,1,2,3,0,4,2,1,3,0,5,4,6,3,0,1,5,2,6,7];
  const BIOMES=[
   {sky:'#63ccec',ground:'#70b645',road:'#a89778',edge:'#fff3db',dark:'#d34f45',hill:'#439f5d'},
   {sky:'#a2def1',ground:'#7cb463',road:'#d7b287',edge:'#f3da9a',dark:'#916e58',hill:'#4c9354'},
   {sky:'#181c40',ground:'#181c31',road:'#9c826c',edge:'#c2a78b',dark:'#594a4d',hill:'#293149',void:true},
   {sky:'#311d3d',ground:'#e56e39',road:'#68657e',edge:'#e8ad61',dark:'#aa494b',hill:'#55405c',void:true},
   {sky:'#e8b8c4',ground:'#af7959',road:'#d6b47d',edge:'#f7e2a0',dark:'#896348',hill:'#a46763'},
   {sky:'#7bd7f1',ground:'#458fc2',road:'#f5d997',edge:'#f9eac7',dark:'#dfbd72',hill:'#5bb1bf',void:true},
   {sky:'#b4d9ee',ground:'#619bb9',road:'#d1ebef',edge:'#f8fcff',dark:'#91bdcf',hill:'#91b6d1',void:true,ice:true},
   {sky:'#12102f',ground:'#17122c',road:'#a9a9e5',edge:'#ffefa7',dark:'#948be0',hill:'#17132d',void:true}
  ];
  // Venti percorsi chiusi disegnati a mano. Stessi ambienti e ordine delle coppe;
  // geometria ricostruita e adattata, senza campionare le mappe della cartuccia.
  const ROUTES=[
   [[250,820],[800,820],[860,700],[820,480],[680,420],[650,180],[230,170],[140,320],[270,450],[430,470],[480,640],[180,650],[130,820]],
   [[250,820],[790,820],[860,650],[740,510],[850,330],[690,160],[480,240],[290,150],[130,290],[260,470],[150,610],[130,820]],
   [[250,820],[820,820],[820,580],[590,580],[590,350],[830,350],[830,140],[150,140],[150,390],[390,390],[390,650],[130,650],[130,820]],
   [[250,820],[820,820],[820,650],[550,650],[550,480],[820,480],[820,170],[620,170],[620,330],[380,330],[380,150],[150,150],[150,820]],
   [[250,820],[810,820],[860,620],[700,580],[720,340],[860,180],[540,150],[450,350],[250,200],[130,350],[350,500],[490,680],[130,680],[130,820]],
   [[250,820],[760,820],[870,680],[700,570],[850,410],[760,180],[560,150],[510,400],[340,260],[180,160],[130,420],[300,590],[130,690],[130,820]],
   [[250,820],[840,820],[840,510],[680,510],[680,190],[450,190],[450,390],[150,390],[150,160],[80,160],[80,650],[430,650],[430,740],[130,740],[130,820]],
   [[250,820],[750,820],[870,670],[650,520],[820,300],[690,130],[490,210],[410,430],[240,230],[120,380],[320,600],[130,670],[130,820]],
   [[250,820],[820,820],[820,650],[610,650],[610,450],[820,450],[820,170],[610,170],[610,300],[400,300],[400,160],[140,160],[140,550],[350,550],[350,690],[130,690],[130,820]],
   [[250,820],[820,820],[840,630],[590,630],[590,430],[820,430],[820,170],[550,170],[550,320],[330,320],[330,150],[130,150],[130,510],[360,510],[360,690],[130,690],[130,820]],
   [[250,820],[790,820],[860,680],[700,540],[820,340],[730,160],[510,190],[470,390],[290,260],[160,190],[110,400],[270,570],[130,710],[130,820]],
   [[250,820],[780,820],[860,620],[680,530],[840,340],[650,140],[490,260],[350,140],[120,290],[280,470],[150,600],[130,820]],
   [[250,820],[790,820],[850,640],[670,590],[770,360],[830,180],[540,150],[470,360],[280,220],[130,350],[300,560],[130,660],[130,820]],
   [[250,820],[840,820],[840,610],[650,610],[650,450],[840,450],[840,150],[650,150],[650,280],[460,280],[460,130],[140,130],[140,360],[340,360],[340,560],[140,560],[140,820]],
   [[250,820],[810,820],[840,650],[650,570],[800,410],[820,160],[600,140],[550,320],[390,320],[370,150],[140,150],[140,430],[370,530],[420,680],[130,680],[130,820]],
   [[250,820],[790,820],[860,640],[640,520],[820,320],[650,130],[500,250],[350,130],[120,280],[280,460],[120,610],[130,820]],
   [[250,820],[790,820],[870,630],[660,500],[850,320],[690,130],[470,210],[480,410],[280,260],[130,350],[300,580],[130,670],[130,820]],
   [[250,820],[830,820],[830,610],[610,610],[610,410],[830,410],[830,150],[570,150],[570,290],[350,290],[350,140],[130,140],[130,480],[390,480],[390,680],[130,680],[130,820]],
   [[250,820],[790,820],[870,630],[700,480],[820,290],[620,130],[460,270],[280,140],[110,330],[300,530],[130,650],[130,820]],
   [[250,820],[820,820],[880,630],[650,520],[840,330],[680,130],[490,260],[300,120],[100,300],[270,490],[100,640],[130,820]]
  ];
  const ITEMS=['green','red','banana','feather','mushroom','star','lightning','coin'];
  const LABEL={green:'GUSCIO VERDE',red:'GUSCIO ROSSO',banana:'BANANA',feather:'PIUMA',mushroom:'FUNGO',star:'STELLA',lightning:'FULMINE',coin:'MONETE'};
  let driver=clamp(Number(api.store.get('driver',0))||0,0,7)|0,cup=0,cc=50,mode='gp',courseIndex=0,round=0,retries=3,points=Array(8).fill(0),grid=[];
  let state='menu',resume='race',track=null,racers=[],player=null,entities=[],panels=[],coins=[],scenery=[],ramps=[],finishOrder=[],elapsed=0,countdown=3.5,worldTime=0,flash=0,engineAt=0,musicAt=0,musicStep=0,saveAt=0;
  let wide=api.store.get('wide',true)!==false,music=api.store.get('music',true)!==false,rear=false,buttons=[],focus=0,menuPage=0,toast='',toastAt=0,rev=0;
  const tex=document.createElement('canvas');tex.width=tex.height=1024;const tx=tex.getContext('2d',{willReadFrequently:true});let pixels;
  const plane=document.createElement('canvas'),pg=plane.getContext('2d');let frame,pw=0,ph=0;
  const sprites=DRIVERS.map((d,i)=>makeKart(i)),icons={};ITEMS.forEach(n=>icons[n]=makeItem(n));
  const sound=(n,opts={})=>api.sound?.(n,opts),notify=s=>{toast=s;toastAt=2.5;};
  function cat(a,b,c,d,t){const t2=t*t,t3=t2*t;return .5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t2+(-a+3*b-3*c+d)*t3);}
  function makeTrack(index){const p=ROUTES[index],path=[];for(let i=0;i<p.length;i++)for(let j=0;j<12;j++){const t=j/12,at=k=>p[wrap(k,p.length)];path.push({x:cat(at(i-1)[0],at(i)[0],at(i+1)[0],at(i+2)[0],t),y:cat(at(i-1)[1],at(i)[1],at(i+1)[1],at(i+2)[1],t),d:0});}
   let length=0;path.forEach((a,i)=>{a.d=length;const b=path[(i+1)%path.length];length+=Math.hypot(a.x-b.x,a.y-b.y);a.a=Math.atan2(b.y-a.y,b.x-a.x);});return{index,name:NAMES[index],biome:BIOMES[TYPES[index]],path,length,width:TYPES[index]===7?57:TYPES[index]===2?68:82};
  }
  function at(distance){distance=wrap(distance,track.length);let lo=0,hi=track.path.length-1;while(lo<hi){const m=Math.ceil((lo+hi)/2);if(track.path[m].d>distance)hi=m-1;else lo=m;}const a=track.path[lo],b=track.path[(lo+1)%track.path.length],len=(lo===track.path.length-1?track.length:b.d)-a.d,t=(distance-a.d)/len;return{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,a:a.a,d:distance};}
  function nearest(x,y){let best=Infinity,out;for(let i=0;i<track.path.length;i++){const a=track.path[i],b=track.path[(i+1)%track.path.length],dx=b.x-a.x,dy=b.y-a.y,t=clamp(((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy),0,1),px=a.x+t*dx,py=a.y+t*dy,d=(x-px)**2+(y-py)**2;if(d<best){best=d;out={x:px,y:py,a:a.a,d:a.d+t*Math.hypot(dx,dy),distance:Math.sqrt(d)};}}return out;}
  function decorate(){const b=track.biome;tx.fillStyle=b.ground;tx.fillRect(0,0,1024,1024);
   for(let y=0;y<1024;y+=16)for(let x=0;x<1024;x+=16){tx.fillStyle=(x/16+y/16)%2?'#ffffff09':'#00000007';tx.fillRect(x,y,16,16);}
   const stroke=(width,col)=>{tx.strokeStyle=col;tx.lineWidth=width;tx.lineJoin=tx.lineCap='round';tx.beginPath();track.path.forEach((p,i)=>i?tx.lineTo(p.x,p.y):tx.moveTo(p.x,p.y));tx.closePath();tx.stroke();};
   stroke(track.width+12,b.dark);stroke(track.width+5,b.edge);stroke(track.width,b.road);
   for(let d=0;d<track.length;d+=18){const p=at(d);for(const side of [-1,1]){tx.save();tx.translate(p.x-Math.sin(p.a)*side*(track.width/2+3),p.y+Math.cos(p.a)*side*(track.width/2+3));tx.rotate(p.a);tx.fillStyle=(d/18|0)%2?b.edge:b.dark;tx.fillRect(-9,-3,18,6);tx.restore();}}
   if(TYPES[track.index]===7)for(let d=0;d<track.length;d+=13){const p=at(d);tx.save();tx.translate(p.x,p.y);tx.rotate(p.a);tx.fillStyle=['#ec6988','#f7bf5d','#f3e982','#75d69b','#70c7e8','#a598df'][d/13%6|0];tx.fillRect(-7,-track.width/2,14,track.width);tx.restore();}
   panels=[];coins=[];scenery=[];ramps=[];
   if(mode==='gp')for(let row=0;row<4;row++){const d=track.length*(.12+row*.22),p=at(d);for(let lane=-1;lane<=1;lane++){const x=p.x-Math.sin(p.a)*lane*23,y=p.y+Math.cos(p.a)*lane*23;panels.push({x,y,a:p.a,used:new Set()});tx.save();tx.translate(x,y);tx.rotate(p.a);tx.fillStyle='#f9d354';tx.fillRect(-9,-9,18,18);tx.fillStyle='#98643b';tx.font='bold 15px monospace';tx.textAlign='center';tx.fillText('?',0,5);tx.restore();}}
   if(mode==='gp')for(let d=130;d<track.length;d+=130){const p=at(d),side=(d/130|0)%2?1:-1;coins.push({x:p.x-Math.sin(p.a)*side*18,y:p.y+Math.cos(p.a)*side*18,used:new Set()});}
   if(track.index===4||TYPES[track.index]===3){const p=at(track.length*.58);ramps.push({...p,jump:track.index===4});tx.save();tx.translate(p.x,p.y);tx.rotate(p.a);for(let i=-16;i<16;i+=8){tx.fillStyle=i%16?'#e96b49':'#ffdf70';tx.fillRect(i,-track.width*.4,8,track.width*.8);}tx.restore();}
   for(let d=70;d<track.length;d+=85){const p=at(d),side=(d/85|0)%2?1:-1;scenery.push({x:p.x-Math.sin(p.a)*side*(track.width/2+32),y:p.y+Math.cos(p.a)*side*(track.width/2+32),kind:TYPES[track.index],seed:d});}
   const p=at(0);tx.save();tx.translate(p.x,p.y);tx.rotate(p.a);for(let x=-8;x<8;x+=8)for(let y=-track.width/2;y<track.width/2;y+=8){tx.fillStyle=((x/8+y/8)|0)%2?'#fff5e8':'#273549';tx.fillRect(x,y,8,8);}tx.restore();pixels=new Uint32Array(tx.getImageData(0,0,1024,1024).data.buffer);
  }
  function save(){api.store.set('driver',driver);api.store.set('wide',wide);api.store.set('music',music);if(state==='results'&&mode==='gp'){const qualified=grid.indexOf(driver)<4;api.store.set('cup',qualified&&round===4||!qualified&&retries===0?null:{v:1,driver,cup,cc,round:round+(qualified?1:0),retries:retries-(qualified?0:1),points:points.slice(),grid:grid.slice()});}}
  function startRace(index,newCup=false){courseIndex=index;track=makeTrack(index);if(newCup){round=0;retries=3;points=Array(8).fill(0);grid=DRIVERS.map((_,i)=>i).filter(i=>i!==driver);grid.push(driver);api.store.set('cup',null);}if(!grid.length){grid=DRIVERS.map((_,i)=>i).filter(i=>i!==driver);grid.push(driver);}
   racers=(mode==='tt'?[driver]:grid).map((id,pos)=>{const p=at(-24-Math.floor(pos/2)*24),lane=(pos%2?1:-1)*17;return{id,x:p.x-Math.sin(p.a)*lane,y:p.y+Math.cos(p.a)*lane,a:p.a,velocityAngle:p.a,speed:0,coins:mode==='tt'?0:2+Math.floor(pos/2),lap:0,started:false,checkpoint:0,last:p.d,total:p.d-track.length,spin:0,star:0,boost:0,small:0,hop:0,rescue:0,item:null,roulette:0,finish:0,lapAt:0,laps:[],aiAt:2+pos*.4,panelCooldown:0,padCooldown:0};});player=racers.find(r=>r.id===driver);entities=[];finishOrder=[];elapsed=0;countdown=3.5;rev=0;state='countdown';rear=false;focus=0;musicAt=musicStep=0;decorate();save();
  }
  function rank(r=player){return [...racers].sort((a,b)=>(a.finish&&b.finish?a.finish-b.finish:a.finish?-1:b.finish?1:b.total-a.total)).indexOf(r)+1;}
  function hit(r){if(r.finish||r.star||r.hop>.1||r.rescue||r.spin)return;r.spin=1.05;r.speed*=.25;r.coins=Math.max(0,r.coins-4);if(r===player){sound('pop',{gain:.025});api.haptic(25);}}
  function pickItem(r){const pos=rank(r),pool=pos<=2?['green','banana','coin','feather','mushroom']:pos<=5?['red','green','mushroom','star','banana','feather']:['red','mushroom','star','lightning','mushroom'];return pool[Math.floor(Math.random()*pool.length)];}
  function useItem(r){const n=r.item;if(!n||r.roulette>0||r.rescue||r.finish)return;r.item=null;if(n==='mushroom')r.boost=2;else if(n==='star')r.star=7;else if(n==='coin')r.coins+=2;else if(n==='lightning'){racers.forEach(o=>{if(o!==r&&!o.star){o.small=6;o.speed*=.5;}});flash=.3;}else if(n==='feather')r.hop=1.4;else{const back=n==='banana'||r===player&&held.down,a=r.a+(back?Math.PI:0),offset=n==='banana'?22:19;entities.push({kind:n,owner:r.id,x:r.x+Math.cos(a)*offset,y:r.y+Math.sin(a)*offset,a,speed:n==='banana'?0:310,life:n==='banana'?28:7,age:0});}if(r===player)sound('collect',{gain:.02});}
  function checkpoints(r,p){let delta=p.d-r.last;if(delta>track.length/2)delta-=track.length;if(delta< -track.length/2)delta+=track.length;
   const target=r.checkpoint*track.length/4,ahead=wrap(target-r.last,track.length);
   if(delta>0&&delta<30&&ahead<=delta+.01){if(r.checkpoint===0){if(r.started){r.lap++;r.laps.push(elapsed-r.lapAt);r.lapAt=elapsed;if(r===player){notify(r.lap===4?'ULTIMO GIRO!':'GIRO '+(r.lap+1));sound('collect',{gain:.018});}if(r.lap>=5&&!r.finish){r.finish=elapsed;finishOrder.push(r.id);if(r===player)endRace();}}else{r.started=true;r.lapAt=elapsed;}}r.checkpoint=(r.checkpoint+1)%4;}
   r.last=p.d;r.total=(r.started?r.lap: -1)*track.length+p.d;
  }
  function moveKart(r,dt){if(r.finish)return;for(const k of ['spin','star','boost','small','hop','panelCooldown','padCooldown'])r[k]=Math.max(0,r[k]-dt);
   if(r.rescue>0){r.rescue-=dt;r.speed=0;if(r.rescue<=0){const p=at(r.last);r.x=p.x;r.y=p.y;r.a=r.velocityAngle=p.a;r.coins=Math.max(0,r.coins-2);}return;}
   const p=nearest(r.x,r.y),stats=DRIVERS[r.id],ai=r!==player;let steer=0,gas=ai||held.b,brake=!ai&&held.down,drift=!ai&&held.up,corner=1;
   if(ai){const dest=at(p.d+42+r.speed*.15),want=Math.atan2(dest.y-r.y,dest.x-r.x),turn=angle(want-r.a);steer=clamp(turn*2.1,-1,1);corner=clamp(1-Math.abs(turn)*.35,.3,1);r.aiAt-=dt;if(r.aiAt<=0){if(r.item)useItem(r);r.aiAt=1.5+Math.random()*3;}}
   else steer=(held.right?1:0)-(held.left?1:0);
   if(r.spin){r.a+=dt*9;r.speed=Math.max(0,r.speed-dt*100);steer=0;gas=false;}
   let max=(cc===50?154:cc===100?192:222)*stats[3]*(.9+Math.min(10,r.coins)*.01)*(ai?.87*corner:1);if(r.small)max*=.58;if(r.star)max*=1.25;if(r.boost)max*=1.5;
   const off=p.distance>track.width/2;if(off&&!r.hop&&!r.star&&!r.boost)max*=track.biome.ice?.75:.48;
   r.speed=clamp(r.speed+(gas?90*stats[4]:-65)*dt-(brake?190*dt:0),0,max);
   if(!r.spin)r.a+=steer*(1.25+Math.min(1,r.speed/125)*1.65)*stats[5]*dt*(drift?1.25:1)*(r.speed>2?1:0);
   const grip=track.biome.ice?3.2:drift?4.1:12;r.velocityAngle+=angle(r.a-r.velocityAngle)*Math.min(1,grip*dt);
   r.x+=Math.cos(r.velocityAngle)*r.speed*dt;r.y+=Math.sin(r.velocityAngle)*r.speed*dt;
   const now=nearest(r.x,r.y);if(track.biome.void&&now.distance>track.width/2+24&&r.hop<=0){r.rescue=1.8;r.x=now.x;r.y=now.y;r.last=now.d;if(r===player){notify('LAKITU TI RIPORTA IN PISTA');sound('pop');}return;}
   if(!track.biome.void&&now.distance>track.width/2+100){r.x=now.x;r.y=now.y;r.a=r.velocityAngle=now.a;r.speed*=.4;}
   checkpoints(r,now);
   for(const pad of ramps)if(!r.padCooldown&&Math.hypot(r.x-pad.x,r.y-pad.y)<28){if(pad.jump)r.hop=.9;else r.boost=1.1;r.padCooldown=2;}
   if(mode==='gp'){
    for(const q of panels)if(!q.used.has(r.id)&&!r.item&&!r.panelCooldown&&Math.hypot(r.x-q.x,r.y-q.y)<16){q.used.add(r.id);if(r===player){tx.save();tx.translate(q.x,q.y);tx.rotate(q.a);tx.fillStyle='#bd6655';tx.fillRect(-9,-9,18,18);tx.restore();pixels=new Uint32Array(tx.getImageData(0,0,1024,1024).data.buffer);}r.item=pickItem(r);r.roulette=1.1;r.panelCooldown=2;if(r===player)sound('ui');}
    for(const q of coins)if(!q.used.has(r.id)&&Math.hypot(r.x-q.x,r.y-q.y)<13){q.used.add(r.id);r.coins++;if(r===player)sound('collect',{gain:.012});}
   }
   r.roulette=Math.max(0,r.roulette-dt);
  }
  function endRace(){state='results';const order=[...racers].sort((a,b)=>a.finish&&b.finish?a.finish-b.finish:a.finish?-1:b.finish?1:b.total-a.total);grid=order.map(r=>r.id);const place=grid.indexOf(driver)+1;
   if(mode==='tt'){const key='time:'+courseIndex,old=api.store.get(key,[]),next=[...Array.isArray(old)?old:[],{time:elapsed,driver}].filter(x=>Number.isFinite(x.time)&&x.time>0).sort((a,b)=>a.time-b.time).slice(0,5);api.store.set(key,next);}
   else if(place<=4){order.forEach((r,i)=>points[r.id]+=[9,6,3,1,0,0,0,0][i]);if(round===4){const placing=[...points.keys()].sort((a,b)=>points[b]-points[a]).indexOf(driver)+1;if(placing<=3){api.store.set('trophy:'+cup+':'+cc,Math.min(placing,Number(api.store.get('trophy:'+cup+':'+cc,9))||9));api.store.set('hi',Math.max(Number(api.store.get('hi',0))||0,points[driver]));}}}
   save();sound('celebrate',{gain:.025});
  }
  function nextRace(){if(mode==='tt'){startRace(courseIndex);return;}const place=grid.indexOf(driver)+1;if(place>4){if(retries>0){retries--;startRace(courseIndex);}else{state='menu';api.store.set('cup',null);notify('RIPROVA LA COPPA');}}else if(round<4){round++;startRace(cup*5+round);}else{state='menu';api.store.set('cup',null);}focus=0;}
  function pause(){if(state==='race'||state==='countdown'){resume=state;state='pause';}else if(state==='pause')state=resume;}
  function update(dt){dt=Math.min(.04,dt);worldTime+=dt;toastAt=Math.max(0,toastAt-dt);flash=Math.max(0,flash-dt);if(state==='pause'||state==='menu'||state==='results')return;
   if(music){musicAt-=dt;if(musicAt<=0){const seq=TYPES[courseIndex]===2||TYPES[courseIndex]===3?[60,63,67,72,70,67,63,58,60,65,68,72,70,68,65,62]:[72,76,79,76,74,77,81,77,72,76,79,84,83,79,77,74],n=seq[musicStep++%seq.length];api.beep(440*2**((n-69)/12),.13,'square',.012);if(musicStep%2===0)api.beep(130.81*(musicStep%8<4?1:1.333),.16,'triangle',.02);musicAt+=.18;}}
   if(state==='countdown'){rev=held.b?rev+dt:0;const old=Math.ceil(countdown);countdown-=dt;if(Math.ceil(countdown)!==old){api.beep(countdown>0?440:880,.14,'square',.02);}if(countdown<=0){state='race';if(held.b){if(rev>1.6){player.spin=1.2;notify('TROPPO PRESTO!');}else{player.speed=65;player.boost=.4;notify('VIA!');}}}return;}
   elapsed+=dt;for(const r of racers){moveKart(r,dt);if(state!=='race')return;}
   for(let i=0;i<racers.length;i++)for(let j=i+1;j<racers.length;j++){const a=racers[i],b=racers[j],d=Math.hypot(a.x-b.x,a.y-b.y);if(d>0&&d<17&&!a.finish&&!b.finish&&!a.rescue&&!b.rescue&&!a.hop&&!b.hop){if(a.star)hit(b);else if(b.star)hit(a);else{const dx=(a.x-b.x)/d,dy=(a.y-b.y)/d;a.x+=dx*(17-d)*.5;b.x-=dx*(17-d)*.5;a.y+=dy*(17-d)*.5;b.y-=dy*(17-d)*.5;if(a.coins===0)hit(a);if(b.coins===0)hit(b);a.coins=Math.max(0,a.coins-1);b.coins=Math.max(0,b.coins-1);a.speed*=.96;b.speed*=.96;}}}
   for(const e of entities){e.age+=dt;e.life-=dt;if(e.kind==='red'){const targets=racers.filter(r=>r.id!==e.owner&&!r.finish&&!r.rescue).sort((a,b)=>Math.hypot(a.x-e.x,a.y-e.y)-Math.hypot(b.x-e.x,b.y-e.y));if(targets[0])e.a+=clamp(angle(Math.atan2(targets[0].y-e.y,targets[0].x-e.x)-e.a),-dt*4,dt*4);}
    e.x+=Math.cos(e.a)*e.speed*dt;e.y+=Math.sin(e.a)*e.speed*dt;const p=nearest(e.x,e.y);if(e.speed&&p.distance>track.width/2){if(e.kind==='red')e.life=0;else{e.a=2*p.a-e.a;e.x=p.x+Math.cos(p.a+Math.PI/2)*Math.sign(Math.sin(e.a-p.a))*(track.width/2-2);e.y=p.y+Math.sin(p.a+Math.PI/2)*Math.sign(Math.sin(e.a-p.a))*(track.width/2-2);}}
    for(const r of racers)if(!r.finish&&(r.id!==e.owner||e.age>.7)&&Math.hypot(e.x-r.x,e.y-r.y)<14&&!r.hop&&!r.rescue){hit(r);e.life=0;break;}}
   entities=entities.filter(e=>e.life>0);engineAt-=dt;if(engineAt<=0&&player.speed>3){api.beep(65+player.speed*.7,.07,'sawtooth',.009);engineAt=.12;}
  }
  function makeKart(id){const c=document.createElement('canvas');c.width=c.height=64;const q=c.getContext('2d'),d=DRIVERS[id],r=(x,y,w,h,col)=>{q.fillStyle=col;q.fillRect(x,y,w,h);},circle=(x,y,rad,col)=>{q.fillStyle=col;q.beginPath();q.arc(x,y,rad,0,TAU);q.fill();};
   r(6,43,12,17,'#1d2635');r(46,43,12,17,'#1d2635');r(8,45,3,12,'#637381');r(53,45,3,12,'#637381');r(14,39,36,18,'#d7dce0');r(16,42,32,11,d[1]);r(20,53,24,6,'#485d71');r(25,54,14,3,'#d9e3db');
   if(id<=1){r(22,27,20,19,d[1]);r(22,37,20,9,'#426cb4');r(24,37,4,10,'#e4bd58');r(36,37,4,10,'#e4bd58');circle(32,23,12,'#e7af7d');r(22,18,20,10,'#714a35');circle(32,14,13,d[1]);r(18,18,28,5,d[1]);r(28,5,9,8,'#f7edcf');q.fillStyle=d[1];q.font='bold 8px monospace';q.textAlign='center';q.fillText(d[2],32,12);}
   else if(id===2){r(21,26,22,20,'#ec88b1');circle(32,19,12,'#e9bc7c');r(20,19,24,14,'#eed079');r(20,26,6,10,'#eed079');r(38,26,6,10,'#eed079');r(24,6,16,8,'#f4d761');r(24,3,4,6,'#f4d761');r(36,3,4,6,'#f4d761');r(29,8,5,4,'#e6798c');}
   else if(id===3){circle(32,31,15,'#73c84e');circle(32,19,12,'#73c84e');r(23,26,18,9,'#f6f0c8');r(30,11,5,6,'#e36d44');r(27,33,10,10,'#df654a');}
   else if(id===4){circle(32,29,19,'#dfb850');circle(32,31,14,'#538f55');[[20,22],[32,17],[43,23],[26,34],[39,35]].forEach(([x,y])=>{q.fillStyle='#f6e8ac';q.beginPath();q.moveTo(x,y-5);q.lineTo(x-4,y+3);q.lineTo(x+4,y+3);q.fill();});r(23,7,18,10,'#d96c40');r(19,9,5,9,'#f4dc9c');r(41,9,5,9,'#f4dc9c');}
   else if(id===5){circle(32,27,17,'#a96f45');circle(17,18,5,'#c18a58');circle(47,18,5,'#c18a58');r(21,28,22,17,'#f0e1a4');q.fillStyle='#b55d42';q.font='bold 16px monospace';q.textAlign='center';q.fillText('J',32,43);}
   else if(id===6){circle(32,32,15,'#6bbb82');circle(32,16,11,'#e9d890');circle(32,34,11,'#6caf64');r(21,31,22,3,'#dfefad');r(30,23,3,22,'#dfefad');}
   else{r(24,30,16,15,'#e6cfac');r(21,33,6,11,'#4c8acc');r(38,33,6,11,'#4c8acc');circle(32,19,18,'#f5efdc');r(15,19,34,6,'#e4d4bd');circle(32,10,6,'#e9564e');circle(17,19,5,'#e9564e');circle(47,19,5,'#e9564e');}return c;
  }
  function makeItem(kind){const c=document.createElement('canvas');c.width=c.height=32;const q=c.getContext('2d'),r=(x,y,w,h,col)=>{q.fillStyle=col;q.fillRect(x,y,w,h);};q.lineWidth=2;
   if(kind==='green'||kind==='red'){q.fillStyle=kind==='green'?'#67c96a':'#ef625d';q.beginPath();q.ellipse(16,17,13,11,0,0,TAU);q.fill();q.strokeStyle='#f1edc9';q.stroke();r(3,22,26,5,'#f1edc9');r(14,8,3,14,'#244b4f');r(6,16,20,2,'#244b4f');}
   else if(kind==='mushroom'){r(10,18,12,11,'#f4e5be');q.fillStyle='#ef6056';q.beginPath();q.arc(16,14,13,Math.PI,TAU);q.lineTo(29,19);q.lineTo(3,19);q.fill();r(12,4,7,7,'#fff1d4');r(5,13,5,5,'#fff1d4');r(23,13,5,5,'#fff1d4');r(13,23,2,4,'#253448');r(19,23,2,4,'#253448');}
   else if(kind==='star'){q.fillStyle='#ffe270';q.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?7:15;const x=16+Math.cos(a)*r,y=16+Math.sin(a)*r;i?q.lineTo(x,y):q.moveTo(x,y);}q.closePath();q.fill();r(11,12,3,7,'#34404c');r(19,12,3,7,'#34404c');}
   else if(kind==='coin'){q.fillStyle='#ffd35b';q.beginPath();q.ellipse(16,16,10,14,0,0,TAU);q.fill();r(14,6,4,20,'#b8873d');}
   else if(kind==='lightning'){q.fillStyle='#ffe475';q.beginPath();[[19,1],[7,18],[15,18],[11,31],[27,12],[18,12]].forEach(([x,y],i)=>i?q.lineTo(x,y):q.moveTo(x,y));q.closePath();q.fill();}
   else if(kind==='feather'){q.save();q.translate(16,16);q.rotate(.5);r(-5,-14,11,23,'#f2efdb');r(0,-14,6,13,'#e26e65');r(-1,-7,2,22,'#efd386');q.restore();}
   else{q.strokeStyle='#f6d462';q.lineWidth=7;q.beginPath();q.moveTo(17,5);q.quadraticCurveTo(14,26,4,26);q.moveTo(17,5);q.quadraticCurveTo(19,27,29,26);q.moveTo(17,5);q.lineTo(17,29);q.stroke();}return c;
  }
  const rect=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(x,y,w,h);};
  const text=(s,x,y,size=15,align='left',col='#fff2d9')=>{g.font=`bold ${size}px ui-monospace,monospace`;g.textAlign=align;g.textBaseline='middle';g.fillStyle='#1a2347';g.fillText(s,x+1,y+2);g.fillStyle=col;g.fillText(s,x,y);};
  const time=n=>{const m=Math.floor(n/60),s=Math.floor(n%60),c=Math.floor(n%1*100);return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')+'.'+String(c).padStart(2,'0');};
  function button(id,label,x,y,w,h,action){buttons.push({id,x,y,w,h,action});rect(x,y,w,h,buttons.length-1===focus?'#f4d578':'#537a8c');rect(x+2,y+2,w-4,h-4,'#24475d');text(label,x+w/2,y+h/2,clamp((w-12)/(label.length*.62),11,15),'center');}
  function map(x,y,w,h){rect(x,y,w,h,'#1a2d40e8');const k=Math.min((w-14)/1024,(h-14)/1024),ox=x+(w-1024*k)/2,oy=y+(h-1024*k)/2;g.imageSmoothingEnabled=false;g.drawImage(tex,ox,oy,1024*k,1024*k);for(const r of racers){g.fillStyle=r===player?'#fff4bb':DRIVERS[r.id][1];g.beginPath();g.arc(ox+r.x*k,oy+r.y*k,r===player?4:2.7,0,TAU);g.fill();}text('MAP',x+6,y+10,10);}
  function scene(top,height,reverse=false){const rw=Math.min(420,Math.max(240,Math.round(W*.72))),rh=Math.min(280,Math.max(160,Math.round(height*.7)));if(rw!==pw||rh!==ph){pw=rw;ph=rh;plane.width=pw;plane.height=ph;frame=pg.createImageData(pw,ph);}
   const data=new Uint32Array(frame.data.buffer),a=player.a+(reverse?Math.PI:0),fx=Math.cos(a),fy=Math.sin(a),rx=-fy,ry=fx,cx=player.x-fx*40,cy=player.y-fy*40,horizon=Math.floor(ph*.32),focal=pw*.74,cam=29;
   data.fill(0);for(let y=horizon+1;y<ph;y++){const z=cam*focal/(y-horizon),step=z/focal;let wx=cx+fx*z-rx*pw/2*step,wy=cy+fy*z-ry*pw/2*step;for(let x=0;x<pw;x++){const ix=wx|0,iy=wy|0;data[y*pw+x]=ix>=0&&ix<1024&&iy>=0&&iy<1024?pixels[iy*1024+ix]:pixels[0];wx+=rx*step;wy+=ry*step;}}
   pg.putImageData(frame,0,0);rect(0,top,W,height,track.biome.sky);
   const sy=top+height*.32;g.fillStyle=track.biome.hill;for(let i=-2;i<9;i++){const x=i*W/6-wrap(a*.17,1)*W/2;g.beginPath();g.ellipse(x,sy+15,W/7,height*.16,0,Math.PI,TAU);g.fill();}if(!track.biome.void||TYPES[courseIndex]===5){rect(W*.77,top+height*.08,24,24,'#ffedb5');for(let i=0;i<3;i++){rect(wrap(i*W*.39-a*40,W),top+height*.11+i%2*14,44,9,'#f1f7e0');}}
   g.imageSmoothingEnabled=false;g.drawImage(plane,0,top,W,height);
   function project(x,y,z=0){const dx=x-cx,dy=y-cy,depth=dx*fx+dy*fy;if(depth<12||depth>1600)return null;const s=focal/depth;return{x:(pw/2+(dx*rx+dy*ry)*s)*W/pw,y:top+(horizon+(cam-z)*s)*height/ph,scale:s*W/pw,depth};}
   const list=[];for(const s of scenery){const p=project(s.x,s.y);if(p)list.push({...p,scenery:s});}for(const c of coins){if(c.used.has(player.id))continue;const p=project(c.x,c.y,5+Math.sin(worldTime*4)*2);if(p)list.push({...p,item:'coin'});}for(const e of entities){const p=project(e.x,e.y,3);if(p)list.push({...p,item:e.kind});}
   for(const r of racers){if(r===player||r.rescue)continue;const p=project(r.x,r.y,r.hop>0?Math.sin(Math.min(1,r.hop)*Math.PI)*16:0);if(p)list.push({...p,kart:r});}list.sort((a,b)=>b.depth-a.depth);
   for(const p of list){if(p.x< -100||p.x>W+100)continue;if(p.scenery){const s=clamp(p.scale*28,3,120),kind=p.scenery.kind;if(kind===2){rect(p.x-s*.45,p.y-s,s*.9,s,'#c9c6d1');rect(p.x-s*.2,p.y-s*.7,s*.14,s*.15,'#3b3c53');rect(p.x+s*.14,p.y-s*.7,s*.14,s*.15,'#3b3c53');}else if(kind===3){rect(p.x-s*.5,p.y-s,s,s,'#4d405d');rect(p.x-s*.4,p.y-s*.75,s*.3,s*.24,'#ef8a4d');}else if(kind===6){rect(p.x-s*.5,p.y-s,s,s,'#c8edf4');}else if(kind!==7){rect(p.x-s*.09,p.y-s*.6,s*.18,s*.6,'#886945');g.fillStyle=kind===4?'#a57673':'#479f5c';g.beginPath();g.arc(p.x,p.y-s*.72,s*.43,0,TAU);g.fill();}}
    else if(p.kart){const r=p.kart,s=clamp(p.scale*24*(r.small?.6:1),5,140);g.globalAlpha=r.star&&Math.floor(worldTime*12)%2?.55:1;g.drawImage(sprites[r.id],p.x-s/2,p.y-s,s,s);g.globalAlpha=1;}else{const s=clamp(p.scale*17,4,75);g.drawImage(icons[p.item],p.x-s/2,p.y-s,s,s);}}
   if(!reverse){const s=Math.min(W*.24,height*.38,112)*(player.small?.62:1),hop=player.hop?Math.sin(Math.min(1,player.hop/1.4)*Math.PI)*35:0,px=W/2,py=top+height*.89-hop;
    g.fillStyle='#141d3a66';g.beginPath();g.ellipse(px,py+4+hop,s*.4,s*.12,0,0,TAU);g.fill();g.save();g.translate(px,py);if(player.spin)g.rotate(worldTime*10);g.globalAlpha=player.rescue?.5:player.star&&Math.floor(worldTime*10)%2?.65:1;g.drawImage(sprites[driver],-s/2,-s,s,s);g.restore();
    if(held.up&&player.speed>30){rect(px-s*.48,py-9,5,5,'#a8e5ee');rect(px+s*.4,py-9,5,5,'#f4d37e');}
    if(player.rescue){text('LAKITU',px,py-s-25,13,'center');rect(px-24,py-s-9,48,6,'#fff8d9');}
   }
  }
  function renderMenu(){const bg=g.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#5bbbd3');bg.addColorStop(1,'#244c68');rect(0,0,W,H,bg);for(let i=0;i<12;i++){rect(i*W/12,H-22, W/12,11,i%2?'#e7e6c1':'#24354a');rect(i*W/12,H-11,W/12,11,i%2?'#24354a':'#e7e6c1');}
   const compact=W>H;const titleY=compact?30:43;text('SUPER',W/2,titleY,18,'center','#ffe583');text('MARIO KART',W/2,titleY+34,clamp(W*.075,27,40),'center');text('SNES 1992 · WEB REMAKE',W/2,titleY+62,11,'center','#cae5e2');
   if(menuPage===1){text('SCEGLI IL PILOTA',W/2,compact?116:151,16,'center');const cols=4,bw=Math.min(110,(W-28)/cols),bh=compact?77:86,x0=(W-bw*cols)/2,y0=compact?135:179;DRIVERS.forEach((d,i)=>{const x=x0+i%4*bw,y=y0+Math.floor(i/4)*bh;button('driver'+i,'',x+2,y,bw-4,bh-5,()=>{driver=i;api.store.set('driver',driver);menuPage=0;focus=0;});g.drawImage(sprites[i],x+bw/2-23,y+4,46,46);text(d[0],x+bw/2,y+bh-19,11,'center',driver===i?'#ffe47d':'#fff5d9');});button('back','INDIETRO',W/2-100,H-77,200,42,()=>{menuPage=0;focus=0;});return;}
   if(menuPage===2){const y0=compact?122:160,cols=compact?4:2,bw=(W-24)/cols,bh=Math.min(48,(H-y0-72)/(20/cols));for(let i=0;i<20;i++){button('course'+i,NAMES[i],12+(i%cols)*bw,y0+Math.floor(i/cols)*bh,bw-4,bh-3,()=>{courseIndex=i;menuPage=0;focus=0;});}button('back','INDIETRO',W/2-100,H-65,200,38,()=>{menuPage=0;focus=0;});return;}
   const x=20,w=W-40,top=compact?121:151,space=compact?41:Math.min(48,(H-top-74)/(validCup()?8:7)),h=space-6;
   if(compact){const colW=Math.min(310,(W-60)/2),left=W/2-colW-8,right=W/2+8;button('driver','PILOTA: '+DRIVERS[driver][0],left,top,colW,h,()=>{menuPage=1;focus=0;});button('mode',mode==='gp'?'MARIO KART GP':'TIME TRIAL',right,top,colW,h,()=>mode=mode==='gp'?'tt':'gp');button('cup',mode==='gp'?CUPS[cup]:NAMES[courseIndex],left,top+space,colW,h,()=>{if(mode==='gp')cup=(cup+1)%4;else{menuPage=2;focus=0;}});button('cc',mode==='tt'?'100cc':cc+'cc',right,top+space,colW,h,()=>{if(mode==='gp')cc=cc===50?100:cc===100?150:50;});button('view',wide?'VISTA: AMPIA':'VISTA: CLASSICA',left,top+space*2,colW,h,()=>{wide=!wide;save();});button('music',music?'MUSICA ON':'MUSICA OFF',right,top+space*2,colW,h,()=>{music=!music;save();});button('start','PARTENZA',left,top+space*3,colW,h,()=>{if(mode==='tt'){cc=100;startRace(courseIndex,true);}else startRace(cup*5,true);});if(validCup())button('resume','RIPRENDI COPPA',right,top+space*3,colW,h,restoreCup);}
   else{button('driver','PILOTA: '+DRIVERS[driver][0],x,top,w,h,()=>{menuPage=1;focus=0;});button('mode',mode==='gp'?'MARIO KART GP':'TIME TRIAL',x,top+space,w,h,()=>mode=mode==='gp'?'tt':'gp');button('cup',mode==='gp'?CUPS[cup]:NAMES[courseIndex],x,top+space*2,w,h,()=>{if(mode==='gp')cup=(cup+1)%4;else{menuPage=2;focus=0;}});button('cc',mode==='tt'?'100cc':cc+'cc',x,top+space*3,w,h,()=>{if(mode==='gp')cc=cc===50?100:cc===100?150:50;});button('view',wide?'VISTA: AMPIA':'VISTA: CLASSICA',x,top+space*4,w,h,()=>{wide=!wide;save();});button('music',music?'MUSICA ON':'MUSICA OFF',x,top+space*5,w,h,()=>{music=!music;save();});button('start','PARTENZA',x,top+space*6,w,h,()=>{if(mode==='tt'){cc=100;startRace(courseIndex,true);}else startRace(cup*5,true);});if(validCup())button('resume','RIPRENDI COPPA',x,top+space*7,w,h,restoreCup);}
   text('B GAS · A OGGETTO · ↓ FRENO · ↑ SALTO',W/2,H-43,clamp(W/34,11,14),'center');
  }
  function validCup(){const s=api.store.get('cup',null);return s?.v===1&&Number.isInteger(s.driver)&&s.driver>=0&&s.driver<8&&Number.isInteger(s.cup)&&s.cup>=0&&s.cup<4&&[50,100,150].includes(s.cc)&&Number.isInteger(s.round)&&s.round>=0&&s.round<5&&Number.isInteger(s.retries)&&s.retries>=0&&s.retries<=3&&Array.isArray(s.points)&&s.points.length===8&&s.points.every(n=>Number.isInteger(n)&&n>=0&&n<=45)&&Array.isArray(s.grid)&&s.grid.length===8&&new Set(s.grid).size===8&&s.grid.every(n=>Number.isInteger(n)&&n>=0&&n<8);}
  function restoreCup(){if(!validCup())return;const s=api.store.get('cup');({driver,cup,cc,round,retries}=s);points=s.points.slice();grid=s.grid.slice();mode='gp';startRace(cup*5+round);}
  function render(){buttons=[];if(state==='menu'){renderMenu();return;}rect(0,0,W,H,'#1c3448');const header=46,raceH=wide?H-header:Math.floor((H-header)*.61);scene(header,raceH);text(track.name,10,14,13);text(time(elapsed),W-10,14,14,'right');text('LAP '+Math.min(5,player.lap+1)+'/5',10,34,13);text('COIN '+String(player.coins).padStart(2,'0'),W-10,34,13,'right','#ffe38a');
   if(wide){map(W-Math.min(127,W*.28)-8,H-Math.min(127,W*.28)-8,Math.min(127,W*.28),Math.min(127,W*.28));}else{const y=header+raceH+3,h=H-y;map(0,y,W,h);if(rear){scene(y,h,true);text('REAR VIEW',W/2,y+14,12,'center');}}
   rect(8,header+9,52,49,'#20334adb');if(player.item){const item=player.roulette>0?ITEMS[Math.floor(worldTime*15)%ITEMS.length]:player.item;g.drawImage(icons[item],18,header+14,32,32);text(player.roulette>0?'?':'A',34,header+52,12,'center');}else text('?',34,header+33,26,'center','#c1d0d5');
   text(String(rank()),W-16,header+raceH-33,48,'right','#ffe69b');text('B ACCELERA',12,header+raceH-14,12);
   if(state==='countdown'){text(countdown>.5?String(Math.max(1,Math.ceil(countdown-.5))):'VIA!',W/2,header+raceH*.35,52,'center','#ffe88b');}
   if(toastAt>0)text(toast,W/2,header+78,clamp(W/30,11,18),'center','#ffe58a');if(flash)rect(0,header,W,H-header,'#fff4');
   if(state==='pause'){rect(12,H*.27,W-24,177,'#172a43ed');text('PAUSA',W/2,H*.27+30,28,'center');button('continue','CONTINUA',32,H*.27+63,W-64,43,pause);button('quit','SCELTA GARA',32,H*.27+115,W-64,43,()=>{state='menu';focus=0;});}
   if(state==='results'){rect(10,70,W-20,H-86,'#1b3049f2');const place=grid.indexOf(driver)+1;text(mode==='tt'?'TIME TRIAL':place<=4?'QUALIFICATO!':'FUORI DAI PRIMI 4',W/2,103,clamp(W/21,15,23),'center','#ffe48c');text(time(elapsed)+' · '+place+'° POSTO',W/2,136,17,'center');
    const maxRows=mode==='tt'?5:8,rowH=Math.min(28,(H-320)/maxRows);if(mode==='tt'){const best=api.store.get('time:'+courseIndex,[]);best.forEach((r,i)=>text((i+1)+'. '+time(r.time)+' '+DRIVERS[r.driver]?.[0],W/2,177+i*rowH,14,'center'));}else{[...points.keys()].sort((a,b)=>points[b]-points[a]).forEach((id,i)=>{const compact=W>H,col=compact?Math.floor(i/4):0,x=compact?col*W/2+24:30,y=compact?166+i%4*23:174+i*rowH;text((i+1)+'. '+DRIVERS[id][0],x,y,14,'left',id===driver?'#ffe48c':'#f0e7d1');text(points[id]+' PT',compact?(col+1)*W/2-24:W-32,y,14,'right');});text('GARA '+(round+1)+'/5 · TENTATIVI '+retries,W/2,H-135,13,'center');}
    button('next',mode==='tt'?'RIPROVA':place>4?retries?'RIPROVA LA GARA':'TORNA AL MENU':round<4?'PROSSIMA GARA':'FINE COPPA',28,H-107,W-56,45,nextRace);button('menu','SCELTA GARA',28,H-54,W-56,35,()=>{state='menu';focus=0;});}
  }
  function onPress(k){if(state==='menu'||state==='results'||state==='pause'){if(k==='start'){if(state==='pause')pause();else if(state==='results')nextRace();else{if(mode==='tt')cc=100;startRace(mode==='gp'?cup*5:courseIndex,true);}return;}if(k==='left'||k==='up')focus=wrap(focus-1,Math.max(1,buttons.length));if(k==='right'||k==='down')focus=wrap(focus+1,Math.max(1,buttons.length));if(k==='a'||k==='b')buttons[focus]?.action();return;}
   if(k==='start')pause();else if(k==='a'&&state==='race')useItem(player);else if(k==='select'){if(wide){wide=false;rear=true;}else rear=!rear;}else if(k==='up'&&state==='race'&&!player.hop&&!player.rescue){player.hop=.36;api.beep(340,.05,'triangle',.012);}
  }
  function onPointer(e){if(e.type!=='down')return;const b=buttons.find(b=>e.x>=b.x&&e.x<=b.x+b.w&&e.y>=b.y&&e.y<=b.y+b.h);if(b)b.action();}
  return{update,render,onPress,onPointer,onHide(){if(state==='race'||state==='countdown')pause();},onResize(w,h){W=w;H=h;pw=ph=0;},destroy:save,
   debug:{newGame(){startRace(mode==='gp'?cup*5:courseIndex,true);},startRace,makeTrack,nearest,at,useItem,checkpoints,endRace,nextRace,restoreCup,validCup,get state(){return state;},get player(){return player;},get racers(){return racers;},get track(){return track;},get panels(){return panels;},get coins(){return coins;},get entities(){return entities;},get points(){return points;},get round(){return round;},get retries(){return retries;},get mode(){return mode;},get elapsed(){return elapsed;},get countdown(){return countdown;},get course(){return courseIndex;},get drivers(){return DRIVERS.map(d=>d[0]);},get courses(){return NAMES.slice();},get items(){return ITEMS.slice();},get layout(){return{width:W,height:H};},get buttons(){return buttons.map(({id,x,y,w,h})=>({id,x,y,w,h}));},setMode(m){mode=m==='tt'?'tt':'gp';if(mode==='tt')cc=100;},setDriver(n){driver=clamp(n|0,0,7);},setCup(n){cup=clamp(n|0,0,3);},setCC(n){cc=[50,100,150].includes(n)?n:50;},setWide(v){wide=!!v;}},
  };
 }
});
