// Ricostruzione web: regole e cadenze del gioco portatile del 1989, disegno LCD nuovo.
registerGame({
  id: 'tetris-classico', title: 'TETRIS CLASSICO', license: 'MIT', color: '#a6b57c',
  blurb: 'Il classico dei blocchi cadenti: sette pezzi, dieci colonne, A-TYPE e sfida B-TYPE da 25 linee. Aspetto LCD, velocità classiche e Korobeiniki. Trascina per spostare, tocca per ruotare; frecce e rotazioni sono anche sullo schermo. Salva la partita.',
  inputs: ['TOCCO E TRASCINA', 'MUSICA A', 'A/B ROTAZIONE'], size: [360, 640], flexH: true, flexMin: 1.35, bg: '#a8b585',
  create(api) {
    const { cv, g, held } = api, W = cv.width, H = cv.height, COLS = 10, ROWS = 18, FPS = 59.7275;
    const PAL = ['#c5d29b', '#9eae79', '#627348', '#263b2c'];
    // Numero di frame fra due cadute, dalla tabella del classico portatile.
    const GRAVITY = [53,49,45,41,37,33,28,22,17,11,10,9,8,7,6,6,5,5,4,4,3];
    const BASE = [ ['0000','1111','0000','0000'], ['11','11'], ['010','111','000'], ['100','111','000'], ['001','111','000'], ['011','110','000'], ['110','011','000'] ];
    const SHAPES = BASE.map(rows => { const out = [rows.map(r => [...r].map(Number))]; for (let i=1;i<4;i++) { const a=out[i-1],n=a.length; out.push(Array.from({length:n},(_,y)=>Array.from({length:n},(_,x)=>a[n-1-x][y]))); } return out; });
    const MELODY = [[76,1],[71,.5],[72,.5],[74,1],[72,.5],[71,.5],[69,1],[69,.5],[72,.5],[76,1],[74,.5],[72,.5],[71,1.5],[72,.5],[74,1],[76,1],[72,1],[69,1],[69,2],[0,.5],[74,1],[77,.5],[81,1],[79,.5],[77,.5],[76,1.5],[72,.5],[76,1],[74,.5],[72,.5],[71,1],[71,.5],[72,.5],[74,1],[76,1],[72,1],[69,1],[69,2],[0,1],[76,2],[72,2],[74,2],[71,2],[72,2],[69,2],[68,2],[71,1],[0,1],[76,2],[72,2],[74,2],[71,2],[72,1],[76,1],[81,2],[80,2],[0,2]];
    const cell = Math.floor(Math.min((W-24)/COLS,(H-152)/ROWS)), BX = Math.round((W-cell*COLS)/2), BY = 84;
    let type = api.store.get('type','A') === 'B' ? 'B' : 'A', startLevel = Math.max(0,Math.min(9,Math.floor(Number(api.store.get('level',0))||0))), height = 0;
    let music = api.store.get('music',true) !== false, best = Math.max(0,Number(api.store.get('hi',0))||0), board=[], piece=null, next=0, score=0, lines=0, level=0, state='title', resume='play';
    let seed = (Date.now()>>>0)||37, last=-1, fall=0, entry=0, clearRows=[], clearAt=0, time=0, musicAt=0, musicStep=0, bassAt=0, bassStep=0, side=0, das=0, repeat=0;
    let buttons=[], gesture=null, touchKeys=new Map(), dirty=0;
    const key = k => !!held[k] || [...touchKeys.values()].includes(k);
    const sound = (n,opts={}) => api.sound ? api.sound(n,opts) : api.beep(660,.08,'triangle',.03);
    const random = () => { seed ^= seed<<13;seed ^= seed>>>17;seed ^= seed<<5;seed=seed>>>0;return seed/4294967296; };
    function pick(){let n=Math.floor(random()*7);if(n===last)n=Math.floor(random()*7);last=n;return n;}
    function cells(p=piece){const a=SHAPES[p.type][p.rot];return a.flatMap((row,y)=>row.flatMap((v,x)=>v?[{x:p.x+x,y:p.y+y}]:[]));}
    function fits(p){return cells(p).every(({x,y})=>x>=0&&x<COLS&&y<ROWS&&(y<0||!board[y][x]));}
    function record(){if(score>best){best=score;api.store.set('hi',best);}}
    function save(){record();if(!piece||!['play','clear','pause'].includes(state)){if(state==='over'||state==='won')api.store.set('save',null);return;}
      api.store.set('save',{v:1,type,startLevel,height,board:board.map(r=>r.slice()),piece:{...piece},next,score,lines,level,seed,last,fall,phase:state==='pause'?resume:state,clearRows:clearRows.slice(),clearAt,entry});dirty=0;
    }
    function spawn(){piece={type:next,rot:0,x:3,y:-1};next=pick();fall=0;entry=13/FPS;if(!fits(piece)){state='over';record();save();sound('pop',{frequency:180,gain:.04});}else{state='play';save();}}
    function newGame(){board=Array.from({length:ROWS},()=>Array(COLS).fill(0));score=0;lines=0;level=startLevel;clearRows=[];clearAt=0;last=-1;next=pick();gesture=null;touchKeys.clear();fall=0;musicAt=bassAt=0;musicStep=bassStep=0;
      if(type==='B')for(let y=ROWS-(height+1)*2;y<ROWS;y++){const hole=Math.floor(random()*COLS);for(let x=0;x<COLS;x++)board[y][x]=x===hole||random()<.28?0:1+Math.floor(random()*7);}
      spawn();api.store.set('type',type);api.store.set('level',startLevel);
    }
    function restore(){const s=api.store.get('save',null);try{
      if(!s||s.v!==1||!['A','B'].includes(s.type)||!Array.isArray(s.board)||s.board.length!==ROWS||!s.board.every(r=>Array.isArray(r)&&r.length===COLS&&r.every(v=>Number.isInteger(v)&&v>=0&&v<=7)))return false;
      const p=s.piece;if(!p||!Number.isInteger(p.type)||p.type<0||p.type>6||!Number.isInteger(p.rot)||p.rot<0||p.rot>3||!Number.isInteger(p.x)||p.x< -3||p.x>9||!Number.isInteger(p.y)||p.y< -4||p.y>=ROWS)return false;
      for(const k of ['next','score','lines','level','startLevel','height','seed'])if(!Number.isFinite(s[k])||!Number.isInteger(s[k])||s[k]<0)return false;
      if(s.next>6||s.level>20||s.startLevel>9||s.height>5||s.score>999999||s.lines>9999||!['play','clear'].includes(s.phase))return false;
      board=s.board.map(r=>r.slice());piece={...p};if(s.phase==='play'&&!fits(piece))return false;
      clearRows=Array.isArray(s.clearRows)?s.clearRows.filter(y=>Number.isInteger(y)&&y>=0&&y<ROWS&&board[y].every(Boolean)):[];
      if(s.phase==='clear'&&(!clearRows.length||clearRows.length>4))return false;
      ({type,startLevel,height,next,score,lines,level,seed}=s);last=Number.isInteger(s.last)&&s.last>=0&&s.last<7?s.last:next;
      fall=Math.max(0,Math.min(1,Number(s.fall)||0));entry=Math.max(0,Math.min(1,Number(s.entry)||0));clearAt=Math.max(0,Math.min(2,Number(s.clearAt)||0));state=s.phase;return true;
    }catch(_){return false;}}
    function begin(){if(!restore())newGame();}
    function move(dx){if(state!=='play'||entry>0)return false;const p={...piece,x:piece.x+dx};if(!fits(p))return false;piece=p;dirty+=.2;return true;}
    function rotate(dir){if(state!=='play'||entry>0)return;const p={...piece,rot:(piece.rot+dir+4)%4};if(fits(p)){piece=p;sound('ui',{gain:.015});api.haptic(5);dirty+=.2;}}
    function lock(){for(const{x,y}of cells()){if(y<0){state='over';save();return;}board[y][x]=piece.type+1;}
      clearRows=board.flatMap((row,y)=>row.every(Boolean)?[y]:[]);
      if(clearRows.length){state='clear';clearAt=0;sound(clearRows.length===4?'celebrate':'collect',{gain:.025});}
      else{api.beep(160,.035,'triangle',.025);spawn();}save();
    }
    function down(soft=false){if(state!=='play'||entry>0)return;const p={...piece,y:piece.y+1};if(fits(p)){piece=p;if(soft){score=Math.min(999999,score+1);record();}dirty+=.1;}else lock();}
    function pause(){if(state==='play'||state==='clear'){resume=state;state='pause';save();}else if(state==='pause')state=resume;gesture=null;touchKeys.clear();side=0;}
    function update(dt){time+=dt;if(!['play','clear'].includes(state))return;
      if(music){musicAt-=dt;bassAt-=dt;if(musicAt<=0){const[n,d]=MELODY[musicStep++%MELODY.length];musicAt+=d*.4;if(n)api.beep(440*2**((n-69)/12),Math.min(.8,d*.34),'square',.018);}if(bassAt<=0){bassAt+=.4;const roots=[45,45,40,40,45,45,40,40,50,50,45,45,47,40,45,45],root=roots[Math.floor(bassStep/2)%roots.length]+(bassStep++%2?7:0);api.beep(440*2**((root-69)/12),.28,'triangle',.026);}}
      dirty+=dt;
      if(state==='clear'){clearAt+=dt;if(clearAt>83/FPS){const count=clearRows.length;board=board.filter((_,y)=>!clearRows.includes(y));while(board.length<ROWS)board.unshift(Array(COLS).fill(0));score=Math.min(999999,score+[0,40,100,300,1200][count]*(level+1));lines=Math.min(9999,lines+count);level=Math.min(20,startLevel+Math.floor(lines/10));clearRows=[];record();if(type==='B'&&lines>=25){state='won';save();sound('celebrate');}else spawn();}return;}
      entry=Math.max(0,entry-dt);if(entry>0)return;
      const dir=key('left')?-1:key('right')?1:0;if(dir!==side){side=dir;das=0;repeat=0;if(dir)move(dir);}else if(dir){das+=dt;if(das>=23/FPS){repeat+=dt;while(repeat>=9/FPS){repeat-=9/FPS;move(dir);}}}
      fall+=dt;const interval=key('down')?3/FPS:GRAVITY[level]/FPS;
      if(fall>=interval){fall-=interval;down(key('down'));}
      if(dirty>2)save();
    }
    function onPress(k){if(k==='start'){if(state==='title')begin();else if(state==='over'||state==='won')newGame();else pause();}
      else if(k==='select'){if(state==='title'){type=type==='A'?'B':'A';api.store.set('type',type);}else{hideNext=!hideNext;}}
      else if(k==='a'){if(state==='title')begin();else if(state==='over'||state==='won')newGame();else rotate(1);}
      else if(k==='b')rotate(-1);
    }
    let hideNext=false;
    function onPointer(e){if(e.type==='down'){
      const b=buttons.find(b=>e.x>=b.x&&e.x<=b.x+b.w&&e.y>=b.y&&e.y<=b.y+b.h);
      if(b){if(b.key){touchKeys.set(e.id,b.key);if(b.key==='cw')rotate(1);if(b.key==='ccw')rotate(-1);}else b.action();return;}
      if(state==='pause'){pause();return;}if(state==='over'||state==='won'){newGame();return;}
      if(state==='play'&&!gesture)gesture={id:e.id,x:e.x,y:e.y,moved:false};
    }else if(e.type==='up'||e.type==='cancel'){touchKeys.delete(e.id);if(gesture?.id===e.id){if(!e.cancelled&&!gesture.moved)rotate(1);gesture=null;}}
    else if(e.type==='move'&&gesture?.id===e.id){let dx=e.x-gesture.x,dy=e.y-gesture.y;if(Math.abs(dx)>=cell){const n=Math.trunc(dx/cell);for(let i=0;i<Math.abs(n);i++)move(Math.sign(n));gesture.x+=n*cell;gesture.moved=true;}if(dy>cell*.7){touchKeys.set(e.id,'down');gesture.moved=true;}else if(dy< -cell*.5)touchKeys.delete(e.id);}}
    const rect=(x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
    const text=(s,x,y,size=13,align='left',color=PAL[3])=>{g.fillStyle=color;g.font=`bold ${size}px ui-monospace,monospace`;g.textAlign=align;g.textBaseline='middle';g.fillText(s,x,y);};
    function block(x,y,n,size=cell){rect(x,y,size,size,PAL[3]);rect(x+1,y+1,size-2,size-2,PAL[0]);if(n%3===0)rect(x+3,y+3,size-6,size-6,PAL[2]);else if(n%3===1){rect(x+3,y+3,size-6,size-6,PAL[3]);rect(x+5,y+5,size-10,size-10,PAL[1]);}else{rect(x+3,y+3,size-6,size-6,PAL[1]);for(let yy=4;yy<size-3;yy+=5)rect(x+4,y+yy,size-8,1,PAL[2]);}}
    function button(id,label,x,y,w,h,action,keyName){buttons.push({id,x,y,w,h,action,key:keyName});rect(x,y,w,h,PAL[3]);rect(x+2,y+2,w-4,h-4,PAL[0]);text(label,x+w/2,y+h/2,label.length>20?11:13,'center');}
    function render(){buttons=[];rect(0,0,W,H,PAL[1]);rect(5,5,W-10,H-10,PAL[0]);
      if(state==='title'){
        text('TETRIS',W/2,65,46,'center');text('CLASSICO · 1989',W/2,102,13,'center');
        const y=Math.max(135,H*.29);button('type',type+'-TYPE',22,y,(W-54)/2,52,()=>{type=type==='A'?'B':'A';api.store.set('type',type);});button('music',music?'MUSIC A':'MUSIC OFF',W/2+5,y,(W-54)/2,52,()=>{music=!music;api.store.set('music',music);});
        text('LEVEL',W/2,y+83,14,'center');button('less','−',32,y+105,58,48,()=>{startLevel=(startLevel+9)%10;});text(String(startLevel),W/2,y+130,28,'center');button('more','+',W-90,y+105,58,48,()=>{startLevel=(startLevel+1)%10;});
        if(type==='B')button('height','HEIGHT '+height,58,y+166,W-116,46,()=>{height=(height+1)%6;});
        text('TOP '+String(best).padStart(6,'0'),W/2,H-158,16,'center');
        button('begin',api.store.get('save',null)?'CONTINUA':'START',26,H-124,W-52,54,begin);
        button('new','NUOVA PARTITA',48,H-60,W-96,42,newGame);return;
      }
      text('TETRIS',12,22,18);text(type+'-TYPE',W-12,21,12,'right');text('SCORE '+String(score).padStart(6,'0'),12,48,12);text('LV '+String(level).padStart(2,'0'),12,68,12);text('LINES '+(type==='B'?Math.max(0,25-lines):lines),W*.43,68,12);
      text('NEXT',W-58,45,11,'center');if(!hideNext){const a=SHAPES[next][0];a.forEach((row,y)=>row.forEach((v,x)=>{if(v)block(W-88+x*11,54+y*11,next+1,10);}));}
      rect(BX-4,BY-4,COLS*cell+8,ROWS*cell+8,PAL[3]);rect(BX,BY,COLS*cell,ROWS*cell,PAL[0]);
      board.forEach((row,y)=>row.forEach((n,x)=>{if(n){if(clearRows.includes(y)&&state!=='over'&&Math.floor(clearAt*FPS/10)%2===0)rect(BX+x*cell,BY+y*cell,cell,cell,PAL[0]);else block(BX+x*cell,BY+y*cell,n);}}));
      if(state==='play'||state==='pause'&&resume==='play')for(const{x,y}of cells())if(y>=0)block(BX+x*cell,BY+y*cell,piece.type+1);
      const labels=['◀','▶','▼','B ↶','A ↷'],keys=['left','right','down','ccw','cw'],bw=(W-32)/5;
      labels.forEach((label,i)=>button(keys[i],label,8+i*(bw+4),H-61,bw,52,null,keys[i]));
      if(['pause','over','won'].includes(state)){const y=BY+ROWS*cell*.38;rect(18,y,W-36,132,PAL[3]);rect(21,y+3,W-42,126,PAL[0]);text(state==='pause'?'PAUSE':state==='won'?'25 LINES!':'GAME OVER',W/2,y+30,25,'center');text('SCORE '+score,W/2,y+64,14,'center');button('resume',state==='pause'?'CONTINUA':'RIPROVA',38,y+86,W-76,36,()=>state==='pause'?pause():newGame());}
    }
    board=Array.from({length:ROWS},()=>Array(COLS).fill(0));piece={type:0,rot:0,x:3,y:-1};next=pick();
    return{update,render,onPress,onPointer,onHide(){if(state==='play'||state==='clear')pause();},destroy:save,
      debug:{newGame,get state(){return state;},get board(){return board;},get piece(){return piece;},get next(){return next;},get score(){return score;},get lines(){return lines;},get level(){return level;},get type(){return type;},get clearRows(){return clearRows;},get buttons(){return buttons.map(({id,x,y,w,h})=>({id,x,y,w,h}));},get layout(){return{width:W,height:H,x:BX,y:BY,cell,columns:COLS,rows:ROWS};},get gravity(){return GRAVITY.slice();},rotate,move,down,save,restore},
    };
  },
});
