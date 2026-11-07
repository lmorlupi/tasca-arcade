// Tetris a colori: controlli espliciti, caduta lenta e aiuti moderni.
registerGame({
  id:'tetris-color',title:'TETRIS COLOR',license:'MIT',color:'#54d5ea',bg:'#111a30',
  blurb:'Tetris moderno a colori, più facile e con tutti i tasti. Croce sinistra/destra: sposta. Giù: scendi. A e B: ruota. Su: posa subito. Ombra di atterraggio, partenza lenta, riserva con SELECT e salvataggio automatico.',
  inputs:['CROCE SPOSTA','A/B RUOTA','PARTENZA LENTA'],size:[360,660],flexH:true,flexMin:1.6,
  create(api){
    const {cv,g,held}=api,W=cv.width,H=cv.height,C=10,R=20;
    const colors=['','#4ddcee','#ffda61','#ba8aff','#6799ff','#ffb568','#6ae0a2','#ff7799'];
    const base=[['0000','1111','0000','0000'],['11','11'],['010','111','000'],['100','111','000'],['001','111','000'],['011','110','000'],['110','011','000']];
    const shapes=base.map(rows=>{const a=[rows.map(r=>[...r].map(Number))];for(let i=1;i<4;i++){const p=a[i-1],n=p.length;a.push(Array.from({length:n},(_,y)=>Array.from({length:n},(_,x)=>p[n-1-x][y])));}return a;});
    const cell=Math.floor(Math.min((W-72)/C,(H-144)/R)),bx=Math.round((W-cell*C)/2),by=88;
    let state='title',board=Array.from({length:R},()=>Array(C).fill(0)),piece={type:0,rot:0,x:3,y:-1},queue=[],bag=[],reserve=null,swapped=false;
    let score=0,lines=0,best=Math.max(0,Number(api.store.get('hi',0))||0),fall=0,lock=0,resets=0,side=0,das=0,repeat=0,elapsed=0,clearRows=[],clearAt=0,combo=-1;
    let slow=api.store.get('slow',true)!==false,music=api.store.get('music',true)!==false,musicAt=0,musicStep=0,saveAt=0,buttons=[],gesture=null;
    const sound=(name,opts={})=>api.sound?.(name,opts);
    const text=(s,x,y,size=13,align='left',col='#e6f3ff')=>{g.fillStyle=col;g.font=`bold ${size}px ui-sans-serif,system-ui,sans-serif`;g.textAlign=align;g.textBaseline='middle';g.fillText(s,x,y);};
    const rect=(x,y,w,h,col,r=0)=>{g.fillStyle=col;if(r){g.beginPath();g.roundRect(x,y,w,h,r);g.fill();}else g.fillRect(x,y,w,h);};
    function cells(p=piece){return shapes[p.type][p.rot].flatMap((row,y)=>row.flatMap((n,x)=>n?[{x:p.x+x,y:p.y+y}]:[]));}
    function fits(p){return cells(p).every(({x,y})=>x>=0&&x<C&&y<R&&(y<0||!board[y][x]));}
    function take(){if(!bag.length){bag=[0,1,2,3,4,5,6];for(let i=6;i>0;i--){const j=Math.floor(Math.random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}}return bag.pop();}
    function refill(){while(queue.length<4)queue.push(take());}
    const level=()=>1+Math.floor(lines/10);
    const gravity=()=>Math.max(.09,(slow?1.25:.8)*Math.pow(.82,level()-1));
    function record(){if(score>best){best=score;api.store.set('hi',best);}}
    function save(){record();if(state==='over'){api.store.set('save',null);return;}if(!['play','clear','pause'].includes(state))return;
      api.store.set('save',{v:1,board:board.map(r=>r.slice()),piece:{...piece},queue:queue.slice(),bag:bag.slice(),reserve,swapped,score,lines,elapsed,slow,phase:clearRows.length?'clear':'play',clearRows:clearRows.slice(),clearAt,combo});saveAt=0;
    }
    function spawn(type){refill();piece={type:type??queue.shift(),rot:0,x:3,y:-1};refill();fall=lock=resets=0;if(!fits(piece)){state='over';save();sound('pop');}else state='play';}
    function newGame(){board=Array.from({length:R},()=>Array(C).fill(0));queue=[];bag=[];reserve=null;swapped=false;score=lines=elapsed=0;combo=-1;clearRows=[];clearAt=0;gesture=null;side=0;musicAt=musicStep=0;spawn();save();}
    function restore(){const s=api.store.get('save',null);try{
      if(!s||s.v!==1||!Array.isArray(s.board)||s.board.length!==R||!s.board.every(r=>Array.isArray(r)&&r.length===C&&r.every(n=>Number.isInteger(n)&&n>=0&&n<=7)))return false;
      const p=s.piece,valid=n=>Number.isInteger(n)&&n>=0&&n<7;
      if(!p||!valid(p.type)||!Number.isInteger(p.rot)||p.rot<0||p.rot>3||!Number.isInteger(p.x)||p.x< -3||p.x>9||!Number.isInteger(p.y)||p.y< -4||p.y>=R)return false;
      if(!Array.isArray(s.queue)||s.queue.length<3||s.queue.length>4||!s.queue.every(valid)||!Array.isArray(s.bag)||s.bag.length>7||!s.bag.every(valid)||new Set(s.bag).size!==s.bag.length)return false;
      if(s.reserve!==null&&!valid(s.reserve))return false;
      for(const k of ['score','lines','elapsed'])if(!Number.isFinite(s[k])||s[k]<0||s[k]>1e9)return false;
      if(!Number.isInteger(s.score)||!Number.isInteger(s.lines)||!['play','clear'].includes(s.phase))return false;
      const rows=Array.isArray(s.clearRows)?s.clearRows:[];if(rows.some(y=>!Number.isInteger(y)||y<0||y>=R)||new Set(rows).size!==rows.length||rows.length>4)return false;
      if(s.phase==='clear'&&(!rows.length||rows.some(y=>!s.board[y].every(Boolean))))return false;
      if(s.phase==='play'&&rows.length)return false;
      const prior=board;board=s.board.map(r=>r.slice());if(s.phase==='play'&&!fits(p)){board=prior;return false;}
      piece={...p};queue=s.queue.slice();bag=s.bag.slice();reserve=s.reserve;swapped=!!s.swapped;score=s.score;lines=s.lines;elapsed=s.elapsed;slow=s.slow!==false;clearRows=rows.slice();clearAt=Math.max(0,Math.min(.3,Number(s.clearAt)||0));combo=Number.isInteger(s.combo)?s.combo:-1;fall=lock=resets=0;state=s.phase;return true;
    }catch(_){return false;}}
    function begin(){if(!restore())newGame();}
    function shift(dx){if(state!=='play')return false;const p={...piece,x:piece.x+dx};if(!fits(p))return false;piece=p;if(resets++<15)lock=0;return true;}
    function rotate(dir){if(state!=='play')return false;const p={...piece,rot:(piece.rot+dir+4)%4};
      // Calci permissivi: un principiante può ancora ruotare presso pareti e pavimento.
      for(const[x,y]of [[0,0],[-1,0],[1,0],[-2,0],[2,0],[0,-1],[-1,-1],[1,-1],[0,-2]]){const q={...p,x:p.x+x,y:p.y+y};if(fits(q)){piece=q;if(resets++<15)lock=0;sound('ui',{gain:.012});return true;}}return false;
    }
    function ghost(){const p={...piece};while(fits({...p,y:p.y+1}))p.y++;return p;}
    function land(){for(const{x,y}of cells()){if(y<0){state='over';save();return;}board[y][x]=piece.type+1;}clearRows=board.flatMap((r,y)=>r.every(Boolean)?[y]:[]);swapped=false;
      if(clearRows.length){state='clear';clearAt=0;sound(clearRows.length===4?'celebrate':'collect',{gain:.025});}else{combo=-1;sound('ui',{gain:.015});spawn();}save();
    }
    function down(soft=false){if(state!=='play')return false;const p={...piece,y:piece.y+1};if(!fits(p))return false;piece=p;lock=0;if(soft)score++;return true;}
    function drop(){if(state!=='play')return;const p=ghost();score+=(p.y-piece.y)*2;piece=p;land();api.haptic(12);}
    function hold(){if(state!=='play'||swapped)return;const n=piece.type;if(reserve===null)spawn();else spawn(reserve);reserve=n;swapped=true;sound('ui');save();}
    function pause(){if(state==='play'||state==='clear'){state='pause';save();}else if(state==='pause')state=clearRows.length?'clear':'play';gesture=null;side=0;}
    function update(dt){if(!['play','clear'].includes(state))return;dt=Math.min(.05,dt);elapsed+=dt;saveAt+=dt;
      if(music){musicAt-=dt;if(musicAt<=0){const notes=[64,67,71,74,72,71,67,64,62,66,69,74,72,69,66,62];api.beep(440*2**((notes[musicStep++%notes.length]-69)/12),.18,'triangle',.016);musicAt+=.24;}}
      if(state==='clear'){clearAt+=dt;if(clearAt>=.3){const n=clearRows.length;score+=[0,100,300,500,800][n]*level()+Math.max(0,++combo)*50*level();lines+=n;board=board.filter((_,y)=>!clearRows.includes(y));while(board.length<R)board.unshift(Array(C).fill(0));clearRows=[];record();spawn();save();}return;}
      const dir=held.left?-1:held.right?1:0;if(dir!==side){side=dir;das=repeat=0;if(dir)shift(dir);}else if(dir){das+=dt;if(das>.2){repeat+=dt;while(repeat>=.075){repeat-=.075;shift(dir);}}}
      fall+=dt;const interval=held.down?.055:gravity();while(fall>=interval){fall-=interval;if(!down(!!held.down))break;}
      if(!fits({...piece,y:piece.y+1})){lock+=dt;if(lock>=.6)land();}else lock=0;
      if(saveAt>=2)save();
    }
    function onPress(k){if(k==='start'){if(state==='title')begin();else if(state==='over')newGame();else pause();}
      else if(k==='a'){if(state==='title')begin();else if(state==='over')newGame();else rotate(1);}
      else if(k==='b')rotate(-1);else if(k==='up')drop();else if(k==='select')hold();
      else if(k==='left'||k==='right'){side=k==='left'?-1:1;das=repeat=0;shift(side);}
      else if(k==='down'){down(true);fall=0;}
    }
    function button(id,label,x,y,w,h,action,accent='#24364f'){buttons.push({id,x,y,w,h,action});rect(x,y,w,h,accent,9);text(label,x+w/2,y+h/2,14,'center');}
    function block(x,y,n,s=cell,outline=false){const col=colors[n];if(outline){g.strokeStyle=col+'99';g.lineWidth=1.5;g.strokeRect(x+2,y+2,s-4,s-4);return;}
      rect(x+1,y+1,s-2,s-2,col,Math.max(1,s*.12));rect(x+3,y+3,s-6,Math.max(2,s*.12),'#ffffff55',1);rect(x+3,y+s-5,s-6,2,'#00000022');
    }
    function mini(type,x,y,s=9){shapes[type][0].forEach((r,yy)=>r.forEach((v,xx)=>{if(v)block(x+xx*s,y+yy*s,type+1,s);}));}
    function render(){buttons=[];const bg=g.createLinearGradient(0,0,W,H);bg.addColorStop(0,'#1e2a4b');bg.addColorStop(1,'#0b1529');rect(0,0,W,H,bg);
      if(state==='title'){
        text('TETRIS',W/2,52,40,'center');text('COLOR',W/2,91,27,'center','#6ce2df');
        [0,2,1,5].forEach((n,i)=>mini(n,38+i*76,130,14));
        text('Semplice. A colori. Con tutti i tasti.',W/2,196,15,'center');
        const y=Math.max(230,H*.41);button('slow',slow?'VELOCITÀ: TRANQUILLA':'VELOCITÀ: NORMALE',22,y,W-44,48,()=>{slow=!slow;api.store.set('slow',slow);});
        text('← → sposta     ↓ scendi',W/2,y+77,16,'center');text('A ↻ ruota     B ↺ ruota',W/2,y+106,16,'center');text('↑ posa subito · SELECT riserva',W/2,y+135,13,'center','#acbed8');
        button('begin',api.store.get('save',null)?'CONTINUA':'GIOCA',22,H-121,W-44,52,begin,'#247d86');
        button('new','NUOVA PARTITA',22,H-59,(W-54)*.68,43,newGame);button('music',music?'♫ ON':'♫ OFF',32+(W-54)*.68,H-59,(W-54)*.32,43,()=>{music=!music;api.store.set('music',music);});return;
      }
      text('TETRIS COLOR',12,19,16);text('PUNTI '+score,W-12,19,14,'right');text('LIVELLO '+level(),12,44,12);text('LINEE '+lines,W-12,44,12,'right');
      rect(bx-3,by-3,C*cell+6,R*cell+6,'#52617f',4);rect(bx,by,C*cell,R*cell,'#0b1427');
      for(let y=0;y<R;y++)for(let x=0;x<C;x++){rect(bx+x*cell+1,by+y*cell+1,cell-2,cell-2,'#152039');if(board[y][x])block(bx+x*cell,by+y*cell,board[y][x]);}
      if(state==='play'||state==='pause'&&!clearRows.length){for(const{x,y}of cells(ghost()))if(y>=0)block(bx+x*cell,by+y*cell,piece.type+1,cell,true);for(const{x,y}of cells())if(y>=0)block(bx+x*cell,by+y*cell,piece.type+1);}
      for(const y of clearRows)rect(bx,by+y*cell,C*cell,cell,`rgba(255,255,255,${.3+.5*Math.sin(clearAt*30)**2})`);
      text('RISERVA',7,69,10);if(reserve!==null)mini(reserve,7,by+4,6);text('DOPO',W-7,69,10,'right');queue.slice(0,3).forEach((n,i)=>mini(n,W-30,by+4+i*39,6));
      text('← → SPOSTA     A ↻   B ↺',W/2,H-37,14,'center');text('↓ scendi · ↑ posa · START pausa',W/2,H-15,12,'center','#b3c6de');
      if(state==='pause'||state==='over'){const y=by+R*cell*.32;rect(14,y,W-28,173,'#0e1a32ed',12);text(state==='pause'?'PAUSA':'PARTITA FINITA',W/2,y+30,24,'center');text('Punti '+score+' · Record '+best,W/2,y+66,14,'center');button('resume',state==='pause'?'CONTINUA':'RIPROVA',34,y+96,W-68,49,()=>state==='pause'?pause():newGame(),'#247d86');}
    }
    function onPointer(e){if(e.type==='down'){const b=buttons.find(b=>e.x>=b.x&&e.x<b.x+b.w&&e.y>=b.y&&e.y<b.y+b.h);if(b){b.action();return;}if(state==='play')gesture={id:e.id,x:e.x,y:e.y,moved:false};}
      else if(e.type==='move'&&gesture?.id===e.id){const dx=e.x-gesture.x,dy=e.y-gesture.y;if(Math.abs(dx)>=cell){const n=Math.trunc(dx/cell);for(let i=0;i<Math.abs(n);i++)shift(Math.sign(n));gesture.x+=n*cell;gesture.moved=true;}if(dy>=cell){down(true);gesture.y=e.y;gesture.moved=true;}}
      else if((e.type==='up'||e.type==='cancel')&&gesture?.id===e.id){if(e.type==='up'&&!e.cancelled&&!gesture.moved)rotate(1);gesture=null;}}
    return{update,render,onPress,onPointer,onHide(){if(state==='play'||state==='clear')pause();},destroy:save,
      debug:{newGame,restore,save,rotate,shift,down,drop,hold,ghost,get state(){return state;},get board(){return board;},get piece(){return piece;},get queue(){return queue;},get reserve(){return reserve;},get score(){return score;},get lines(){return lines;},get level(){return level();},get gravity(){return gravity();},get clearRows(){return clearRows;},get layout(){return{width:W,height:H,cell,x:bx,y:by,columns:C,rows:R};},get buttons(){return buttons.map(({id,x,y,w,h})=>({id,x,y,w,h}));}},
    };
  },
});
