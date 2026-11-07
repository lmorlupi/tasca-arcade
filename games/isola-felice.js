// Un piccolo mondo originale, disegnato interamente a mano sul canvas. Nessuna rete o attesa giornaliera.
registerGame({
  id: 'isola-felice', title: 'ISOLA FELICE', license: 'MIT', color: '#7ebf9e',
  blurb: 'La tua piccola vita sull’isola: animali, pesca, orto e una casa da arredare. Quattro luoghi da scoprire, senza fretta. Tocca per camminare e raccogliere; A agisce, B apre lo zaino, START il diario. Salvataggio automatico.',
  inputs: ['TOCCA ED ESPLORA', '4 AMBIENTI', 'SALVATAGGIO'], size: [400, 640], flexH: true, flexMin: 1.1, bg: '#9cdbd5',
  create(api) {
    const { cv, g, held } = api, W = cv.width, H = cv.height, T = 40, N = 26, WORLD = N * T, YS = 0.76, TAU = Math.PI * 2;
    const clamp = (n, a, b) => Math.max(a, Math.min(b, n)), clone = v => JSON.parse(JSON.stringify(v));
    const num = (n, d = 0, max = 99999) => Number.isFinite(n) ? clamp(Math.floor(n), 0, max) : d;
    const AREAS = [
      { name: 'Baia dei Gelsomini', short: 'LA BAIA', sub: 'La tua casa, il piccolo emporio e l’orto.', grass: '#8ecb7a', light: '#a5d98d', dark: '#69aa69', water: '#60c5c8', sand: '#e9d8a0', path: '#e9cba0', sky: '#b5e8de', roof: '#d98573', night: false },
      { name: 'Bosco delle Lucciole', short: 'IL BOSCO', sub: 'Alberi dorati, farfalle e un laghetto.', grass: '#94b875', light: '#b0c78b', dark: '#65946a', water: '#75b8b8', sand: '#d9c694', path: '#d5bc91', sky: '#cfe3bb', roof: '#a87858', night: false },
      { name: 'Costa Corallina', short: 'LA COSTA', sub: 'Conchiglie, palme e pesci colorati.', grass: '#a3d294', light: '#bce5a4', dark: '#77b88b', water: '#53c6cf', sand: '#f4e1b5', path: '#f0d8aa', sky: '#c4edf0', roof: '#e8987c', night: false },
      { name: 'Colle delle Stelle', short: 'LE STELLE', sub: 'Lavanda, stelle cadenti e una festa.', grass: '#7c9c9d', light: '#a0b4b0', dark: '#637f91', water: '#638da9', sand: '#c3c8bd', path: '#c1b5aa', sky: '#38465f', roof: '#9d92bd', night: true },
    ];
    const ITEMS = {
      fruit: { name: 'Frutta', color: '#e58473', price: 3 }, wood: { name: 'Legno', color: '#b98555', price: 2 }, stone: { name: 'Pietre', color: '#9aadb0', price: 2 },
      flower: { name: 'Fiori', color: '#d38eb6', price: 3 }, fish: { name: 'Pesci', color: '#79b8cb', price: 7 }, bug: { name: 'Farfalle', color: '#d9b576', price: 5 },
      shell: { name: 'Conchiglie', color: '#e7b6a1', price: 4 }, star: { name: 'Stelline', color: '#ead38b', price: 8 }, crop: { name: 'Verdure', color: '#e6a26b', price: 5 }, seeds: { name: 'Semi', color: '#a5bf7a', price: 0 },
    };
    const FURNITURE = [
      { id: 'bed', name: 'Letto a fiorellini', cost: { wood: 6, fruit: 2 }, price: 32, color: '#df9f9e' },
      { id: 'chair', name: 'Sedia di campagna', cost: { wood: 3 }, price: 14, color: '#b99469' },
      { id: 'plant', name: 'Pianta felice', cost: { stone: 2, flower: 2 }, price: 18, color: '#79b47d' },
      { id: 'table', name: 'Tavolino del tè', cost: { wood: 4, stone: 1 }, price: 22, color: '#b99469' },
      { id: 'lamp', name: 'Luce di luna', cost: { wood: 2, stone: 2 }, price: 20, color: '#e9d594' },
      { id: 'rug', name: 'Tappeto marino', cost: { shell: 3 }, price: 16, color: '#8ebec5' },
      { id: 'shelf', name: 'Libreria dei ricordi', cost: { wood: 5, stone: 2 }, price: 26, color: '#bb9b75' },
      { id: 'stars', name: 'Cielo in una stanza', cost: { star: 3, wood: 2 }, price: 28, color: '#e2c987' },
    ];
    const NPCS = [
      { id: 'mila', name: 'Mila', species: 'cat', color: '#eec9a2', shirt: '#94bbb0', area: 0, x: 13, y: 15, line: 'Ho lasciato una sedia e un letto nella tua casetta. Qui ognuno può trovare il suo posto.', love: 'Un frutto per me? Lo dividerò con Pip!' },
      { id: 'pip', name: 'Pip', species: 'rabbit', color: '#cfb8d6', shirt: '#e3b76c', area: 0, x: 8, y: 18, line: 'I semi sono sempre gratis all’emporio! Pianta, annaffia e torna tra un minutino.', love: 'Grazie! Ti porterò una storia da leggere in giardino.' },
      { id: 'bruno', name: 'Bruno', species: 'bear', color: '#b78b69', shirt: '#92ac7a', area: 1, x: 12, y: 14, line: 'Il bosco non ha fretta. Tocca gli alberi per raccogliere legno e frutta. Ricresce tutto!', love: 'Che profumo! I piccoli regali fanno grandi amicizie.' },
      { id: 'dora', name: 'Dora', species: 'deer', color: '#dfb39a', shirt: '#b59db8', area: 1, x: 8, y: 19, line: 'Le farfalle amano i fiori. Avvicinati e toccale: tirerai fuori il retino da sola.', love: 'Un regalo? Sei proprio una bella vicina.' },
      { id: 'lulu', name: 'Lulù', species: 'duck', color: '#f1dc8f', shirt: '#8eb9cd', area: 2, x: 13, y: 15, line: 'La pesca è facile: aspetta i cerchi e tocca PESCA. Se il pesce scappa, si riprova!', love: 'Lo userò per una merenda sulla spiaggia!' },
      { id: 'nino', name: 'Nino', species: 'fox', color: '#d79872', shirt: '#7aa79b', area: 2, x: 8, y: 19, line: 'Le conchiglie vengono portate dalle onde. Con tre puoi fare un bellissimo tappeto.', love: 'Grazie, amica! Ti tengo un posto al tramonto.' },
      { id: 'nora', name: 'Nora', species: 'owl', color: '#bdafc8', shirt: '#e1c680', area: 3, x: 13, y: 14, line: 'Le stelle cadute non sono perdute: basta raccoglierle. Questa sera accendiamo le lanterne!', love: 'Un pensiero gentile brilla più di una stella.' },
      { id: 'lumi', name: 'Lumi', species: 'cat', color: '#a5bfca', shirt: '#d7a3b4', area: 3, x: 9, y: 19, line: 'La tua isola cresce con te. Anche dopo la festa ci saranno sempre cose belle da fare.', love: 'Lo conserverò per la nostra festa!' },
    ];
    const CHAPTERS = [
      { title: 'Benvenuta sull’isola', hint: 'Saluta Mila e raccogli un po’ di frutta e legno.', reward: 30, needs: [['talk', 1, 'Saluta un vicino'], ['fruit', 3, 'Raccogli 3 frutti'], ['wood', 3, 'Raccogli 3 legni']] },
      { title: 'Un sentiero tra gli alberi', hint: 'Il bosco ti aspetta: farfalle, pietre e fiori.', reward: 45, needs: [['wood', 8, 'Raccogli 8 legni'], ['stone', 4, 'Raccogli 4 pietre'], ['bug', 2, 'Trova 2 farfalle'], ['plantedFlowers', 3, 'Pianta 3 fiori']] },
      { title: 'Una merenda sul mare', hint: 'Pesca sulla costa e crea un arredo all’emporio.', reward: 60, needs: [['fish', 3, 'Pesca 3 pesci'], ['shell', 5, 'Trova 5 conchiglie'], ['crafted', 1, 'Crea un arredo']] },
      { title: 'La festa delle lanterne', hint: 'Orto, amici e una casetta pronta per la festa.', reward: 100, needs: [['crop', 3, 'Raccogli 3 verdure'], ['star', 3, 'Trova 3 stelline'], ['talk', 4, 'Conosci 4 vicini'], ['decorated', 3, 'Metti 3 arredi in casa']] },
    ];
    const defaults = () => ({ v: 1, area: 0, chapter: 0, coins: 12, clock: 0, player: { x: 540, y: 720 }, look: { shirt: 0, hair: 0, skin: 0 },
      inv: { fruit: 0, wood: 0, stone: 0, flower: 0, fish: 0, bug: 0, shell: 0, star: 0, crop: 0, seeds: 8 }, stats: {},
      friends: {}, talked: [], gifts: {}, depleted: {}, crops: {}, flowers: [], album: [], owned: { bed: 1, chair: 1, plant: 1 }, room: [{ kind: 'bed', x: 1, y: 1 }], wallpaper: 0, music: true, lastSaved: 0 });
    function restore(raw) {
      const d = defaults(); if (!raw || raw.v !== 1) return d;
      d.chapter = num(raw.chapter, 0, 4); d.area = num(raw.area, 0, Math.min(3, d.chapter)); d.coins = num(raw.coins, 12); d.clock = num(raw.clock, 0, 1e8);
      if (raw.lastSaved > 0) d.clock += clamp((Date.now() - raw.lastSaved) / 1000, 0, 21600);
      for (const k of Object.keys(ITEMS)) { d.inv[k] = num(raw.inv?.[k], d.inv[k], 9999); d.stats[k] = num(raw.stats?.[k]); }
      for (const k of ['talk', 'plantedFlowers', 'crafted', 'crop', 'decorated']) d.stats[k] = num(raw.stats?.[k]);
      for (const k of ['shirt', 'hair', 'skin']) d.look[k] = num(raw.look?.[k], 0, k === 'skin' ? 3 : 4);
      for (const n of NPCS) { d.friends[n.id] = num(raw.friends?.[n.id], 0, 5); d.gifts[n.id] = Number.isFinite(raw.gifts?.[n.id]) ? clamp(raw.gifts[n.id], 0, d.clock) : -999; }
      d.talked = Array.isArray(raw.talked) ? [...new Set(raw.talked.filter(id => NPCS.some(n => n.id === id)))] : [];
      d.stats.talk = d.talked.length;
      if (raw.depleted && typeof raw.depleted === 'object') for (const [id, at] of Object.entries(raw.depleted).slice(0, 500)) if (Number.isFinite(at)) d.depleted[id] = clamp(at, 0, d.clock + 180);
      if (raw.crops && typeof raw.crops === 'object') for (const [id, crop] of Object.entries(raw.crops).slice(0, 12)) if (crop && Number.isFinite(crop.at)) d.crops[id] = { at: clamp(crop.at, 0, d.clock), watered: !!crop.watered };
      d.flowers = Array.isArray(raw.flowers) ? raw.flowers.filter(f => f && Number.isFinite(f.x) && Number.isFinite(f.y) && f.x >= 2 && f.x < 24 && f.y >= 2 && f.y < 24).slice(0, 36).map(f => ({ x: Math.floor(f.x), y: Math.floor(f.y), area: num(f.area, 0, 3), color: num(f.color, 0, 3) })) : [];
      d.album = Array.isArray(raw.album) ? [...new Set(raw.album.filter(s => typeof s === 'string' && s.length < 48))].slice(0, 40) : [];
      for (const f of FURNITURE) d.owned[f.id] = num(raw.owned?.[f.id], d.owned[f.id] || 0, 30);
      const used = {}, taken = new Set(); d.room = [];
      if (Array.isArray(raw.room)) for (const f of raw.room.slice(0, 30)) {
        if (!f || !FURNITURE.some(o => o.id === f.kind) || !Number.isInteger(f.x) || !Number.isInteger(f.y) || f.x < 0 || f.x > 6 || f.y < 0 || f.y > 4) continue;
        const cell = f.x + ',' + f.y; if (taken.has(cell) || (used[f.kind] || 0) >= (d.owned[f.kind] || 0)) continue;
        used[f.kind] = (used[f.kind] || 0) + 1; taken.add(cell); d.room.push({ kind: f.kind, x: f.x, y: f.y });
      }
      d.stats.decorated = Math.max(d.stats.decorated, d.room.length); d.wallpaper = num(raw.wallpaper, 0, 3); d.music = raw.music !== false;
      if (Number.isFinite(raw.player?.x) && Number.isFinite(raw.player?.y)) d.player = { x: clamp(raw.player.x, 60, WORLD - 60), y: clamp(raw.player.y, 60, WORLD - 60) };
      return d;
    }
    const saved = api.store.get('island', null); let data = restore(saved), started = !!saved?.v, state = 'title', returnState = 'play', tab = 'items', page = 0;
    let area = data.area, P = { ...data.player, dir: 1, step: 0, pose: 0 }, camera = { x: 0, y: 0 }, time = 0, autosave = 0, musicAt = 0, musicStep = 0, ambientAt = 2;
    let path = [], destination = null, terrain = null, objects = [], actors = [], grid = [], backdrop = null, backdropScale = 1, buttons = [], pressed = null, dialog = null, selectedFurniture = null, roomFlash = 0, fishing = null, toast = '', toastTime = 0, burst = [];
    const sound = (name, opts = {}) => { if (api.sound) api.sound(name, opts); else if (name !== 'step' && name !== 'wave') api.beep(name === 'collect' ? 784 : name === 'fish' ? 1046 : 523, 0.09, 'triangle', 0.035); };
    const notify = (s, t = 3) => { toast = s; toastTime = t; };
    const progress = () => CHAPTERS[data.chapter];
    const ready = () => !!progress() && progress().needs.every(([k, n]) => (data.stats[k] || 0) >= n);
    const save = () => { if (!started) return; data.area = area; if (state !== 'room' && returnState !== 'room') data.player = { x: P.x, y: P.y }; data.lastSaved = Date.now(); api.store.set('island', data); api.store.set('hi', data.chapter * 100 + data.album.length * 5 + data.talked.length); autosave = 0; };
    const rng = seed => () => { seed = Math.imul(seed, 1664525) + 1013904223 | 0; return (seed >>> 0) / 4294967296; };
    const at = (x, y) => ({ x: (x + 0.5) * T, y: (y + 0.5) * T });
    function ground(x, y, a) {
      if (x < 0 || y < 0 || x >= N || y >= N || Math.pow((x - 12.5) / 12, 4) + Math.pow((y - 12.5) / 12, 4) > 1) return 'water';
      if (a === 0 && x === 19 && y > 4 && y < 22 && y !== 14 && y !== 15) return 'water';
      if (a === 1 && Math.pow((x - 19) / 3.3, 2) + Math.pow((y - 9) / 3.5, 2) < 1) return 'water';
      if (a === 3 && Math.pow((x - 19) / 2.4, 2) + Math.pow((y - 17) / 3, 2) < 1) return 'water';
      if (a === 0 && x === 19 && (y === 14 || y === 15)) return 'bridge';
      if (x < 3 || x > 22 || y > 22 || (a === 2 && (x > 16 || y > 18))) return 'sand';
      if ((x >= 12 && x <= 14) || (y >= 14 && y <= 15 && x > 5 && x < 22) || (a === 0 && x >= 9 && x <= 10 && y >= 11 && y <= 17)) return 'path';
      return 'grass';
    }
    function makeWorld(a) {
      area = a; const random = rng(1007 + a * 7919); objects = []; actors = NPCS.filter(n => n.area === a).map(n => ({ ...n, ...at(n.x, n.y), home: at(n.x, n.y) }));
      const add = (type, x, y, extra = {}) => { if (ground(x, y, a) === 'water') return; objects.push({ id: a + ':' + type + ':' + x + ':' + y, type, ...at(x, y), tx: x, ty: y, phase: random() * TAU, ...extra }); };
      grid = Array.from({ length: N }, (_, y) => Array.from({ length: N }, (_, x) => ground(x, y, a) === 'water' ? 1 : 0));
      if (a === 0) { add('house', 10, 11); add('shop', 17, 9); add('hall', 13, 6); add('sign', 11, 16); add('well', 7, 12); add('bench', 15, 12); for (let y = 17; y < 19; y++) for (let x = 15; x < 18; x++) add('plot', x, y); }
      if (a === 1) { add('cabin', 8, 9); add('well', 12, 10); add('flowerbed', 11, 17); add('bench', 16, 15); add('sign', 14, 19); }
      if (a === 2) { add('hut', 8, 10); add('shop', 13, 8); add('umbrella', 18, 16); add('chair', 20, 18); add('sign', 12, 17); add('bench', 9, 15); }
      if (a === 3) { add('windmill', 9, 9); add('hall', 16, 7); add('well', 13, 11); add('sign', 14, 18); add('bench', 10, 16); for (let x = 7; x < 18; x += 2) add('lantern', x, 13); }
      const building = o => ['house', 'shop', 'hall', 'cabin', 'hut', 'windmill'].includes(o.type);
      for (const o of objects) if (building(o)) for (let y = o.ty - 1; y <= o.ty; y++) for (let x = o.tx - 1; x <= o.tx + 1; x++) if (grid[y]) grid[y][x] = 1;
      const occupied = (x, y) => grid[y]?.[x] || objects.some(o => Math.abs(o.tx - x) <= (building(o) ? 2 : 0) && Math.abs(o.ty - y) <= (building(o) ? 2 : 0)) || actors.some(n => Math.hypot(n.x / T - x, n.y / T - y) < 2);
      for (let y = 3; y < 23; y += 2) for (let x = 3; x < 23; x += 2) {
        if (occupied(x, y) || ground(x, y, a) === 'path' || (a === 0 && x >= 15 && x <= 18 && y >= 16 && y <= 19)) continue;
        if (random() < (a === 1 ? 0.88 : 0.67)) { add(a === 2 ? 'palm' : 'tree', x, y, { variant: (x + y + a) % 3 }); grid[y][x] = 1; }
      }
      [[6, 16], [17, 20], [6, 8], [21, 17]].forEach(([x, y]) => { if (!occupied(x, y)) { add('rock', x, y); grid[y][x] = 1; } });
      [[7, 20], [16, 21], [9, 16]].forEach(([x, y]) => { if (!occupied(x, y)) add('log', x, y); });
      [[6, 14], [10, 20], [16, 16], [21, 14], [5, 18], [18, 6]].forEach(([x, y], i) => { if (!occupied(x, y)) add('flower', x, y, { variant: i % 4 }); });
      [[8, 16], [15, 20], [16, 13], [7, 14]].forEach(([x, y], i) => { if (!occupied(x, y)) add('bug', x, y, { variant: (i + a) % 4 }); });
      if (a === 2) [[18, 19], [20, 20], [21, 17], [17, 22], [15, 23], [10, 23], [22, 14], [21, 11]].forEach(([x, y], i) => add('shell', x, y, { variant: i % 3 }));
      if (a === 3) [[7, 18], [16, 20], [17, 14], [10, 21], [20, 6]].forEach(([x, y]) => { if (!occupied(x, y)) add('star', x, y); });
      const spots = a === 1 ? [[16, 9], [19, 13]] : a === 3 ? [[17, 17], [19, 20]] : [[23, 15], [13, 23]];
      spots.forEach(([x, y]) => { if (!grid[y]?.[x]) add('fish', x, y); });
      // A few nearby resources keep the welcome chapter short and friendly.
      if (a === 0) [[8, 16], [16, 15]].forEach(([x, y], i) => { if (!occupied(x, y)) { add('tree', x, y, { variant: i }); grid[y][x] = 1; } });
      // Keep an open view of neighbors and small collectibles; foliage must never hide a required action.
      const landmarks = [...objects.filter(o => !['tree', 'palm', 'fish'].includes(o.type)), ...actors];
      objects = objects.filter(o => { if (!['tree', 'palm'].includes(o.type)) return true; const hides = landmarks.some(n => Math.abs(n.x - o.x) < (n.species ? 49 : 38) && o.y > n.y && o.y - n.y < 155); if (hides) grid[o.ty][o.tx] = 0; return !hides; });
      objects.filter(o => ['tree', 'palm', 'rock'].includes(o.type)).forEach(o => { grid[o.ty][o.tx] = 1; });
      terrain = Array.from({ length: N }, (_, y) => Array.from({ length: N }, (_, x) => ground(x, y, a))); backdrop = null;
      if (!walkable(P.x, P.y)) { P.x = 540; P.y = 720; }
      path = []; destination = null; snapCamera();
    }
    const walkable = (x, y) => { const tx = Math.floor(x / T), ty = Math.floor(y / T); return tx >= 0 && ty >= 0 && tx < N && ty < N && !grid[ty][tx]; };
    const snapCamera = () => { camera.x = P.x - W / 2; camera.y = P.y * YS - H * 0.54; };
    const available = o => !data.depleted[o.id] || data.depleted[o.id] <= data.clock;
    const nearby = () => [...actors, ...objects.filter(o => !['bench', 'chair', 'umbrella', 'lantern'].includes(o.type))].filter(o => Math.hypot(o.x - P.x, o.y - P.y) < (['house', 'shop', 'hall', 'cabin', 'hut', 'windmill'].includes(o.type) ? 118 : 87)).sort((a, b) => Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(b.x - P.x, b.y - P.y))[0];
    function walkTo(x, y, target = null) {
      const sx = clamp(Math.floor(P.x / T), 0, N - 1), sy = clamp(Math.floor(P.y / T), 0, N - 1);
      const gx = clamp(Math.floor(x / T), 0, N - 1), gy = clamp(Math.floor(y / T), 0, N - 1), candidates = [];
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const tx = gx + dx, ty = gy + dy; if (!grid[ty] || grid[ty][tx] !== 0) continue;
        if (!target && (dx || dy)) continue;
        const p = at(tx, ty); if (target && Math.hypot(p.x - target.x, p.y - target.y) > 82) continue;
        candidates.push({ x: tx, y: ty, score: Math.hypot(p.x - P.x, p.y - P.y) });
      }
      if (!candidates.length) { notify('Tocca un punto sul sentiero'); return; }
      candidates.sort((a, b) => a.score - b.score);
      const queue = [[sx, sy]], prev = new Map([[sx + sy * N, null]]); let goal = null;
      for (let i = 0; i < queue.length; i++) {
        const [qx, qy] = queue[i]; if (candidates.some(p => p.x === qx && p.y === qy)) { goal = qx + qy * N; break; }
        for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) { const nx = qx + dx, ny = qy + dy, key = nx + ny * N; if (nx < 0 || ny < 0 || nx >= N || ny >= N || grid[ny][nx] || prev.has(key)) continue; prev.set(key, qx + qy * N); queue.push([nx, ny]); }
      }
      if (goal === null) { notify('Da qui non si passa. Prova dal sentiero.'); return; }
      const steps = []; for (let key = goal; prev.get(key) !== null; key = prev.get(key)) steps.push(at(key % N, Math.floor(key / N)));
      path = steps.reverse(); destination = target;
      if (!path.length && target) { destination = null; interact(target); }
    }
    function addToBag(kind, count, collection) {
      data.inv[kind] = Math.min(9999, data.inv[kind] + count); data.stats[kind] = (data.stats[kind] || 0) + count;
      if (collection && !data.album.includes(collection)) { data.album.push(collection); notify('Nuova scoperta: ' + collection + '!', 4); }
      sound('collect'); P.pose = 0.5; burst.push({ x: P.x, y: P.y * YS - 44, text: '+' + count + ' ' + ITEMS[kind].name, t: 1.5 }); save();
    }
    const modal = (next, back = state) => { if (state === 'play' || state === 'room') returnState = state; else if (back === 'play' || back === 'room') returnState = back; state = next; path = []; destination = null; pressed = null; page = 0; focus = 1; sound('ui'); };
    const close = () => { state = returnState === 'title' || !started ? 'title' : returnState === 'room' ? 'room' : 'play'; dialog = null; pressed = null; };
    const say = (name, text, choices = [], npc = null) => { dialog = { name, text, choices, npc }; modal('dialog'); };
    function meet(n) {
      if (!data.talked.includes(n.id)) { data.talked.push(n.id); data.stats.talk = data.talked.length; data.friends[n.id] = Math.max(1, data.friends[n.id] || 0); sound('friend'); save(); }
      say(n.name, n.line, [
        { label: 'IL MIO OBIETTIVO', action: () => modal('journal') },
        { label: 'REGALA UN FRUTTO', action: () => {
          if (!data.inv.fruit) { say(n.name, 'Ti basta toccare un albero da frutto per raccogliere una merenda.', [], n); return; }
          if (data.clock - (data.gifts[n.id] ?? -999) < 90) { say(n.name, 'Il tuo regalo mi ha già fatto sorridere! Facciamo due passi e ripassiamo più tardi.', [], n); return; }
          data.inv.fruit--; data.friends[n.id] = Math.min(5, (data.friends[n.id] || 0) + 1); data.gifts[n.id] = data.clock; sound('friend'); save(); say(n.name, n.love, [], n);
        } },
      ], n);
    }
    function enterRoom() { save(); data.player = { x: P.x, y: P.y }; selectedFurniture = null; state = 'room'; returnState = 'room'; path = []; destination = null; sound('door'); save(); }
    function leaveRoom() { selectedFurniture = null; state = 'play'; returnState = 'play'; P = { ...data.player, dir: 1, step: 0, pose: 0 }; makeWorld(data.area); save(); sound('door'); }
    function travel(a) { if (a > Math.min(data.chapter, 3)) return; data.area = a; area = a; P = { x: 540, y: 720, dir: 1, step: 0, pose: 0 }; state = 'play'; returnState = 'play'; makeWorld(a); save(); sound('travel'); notify('Benvenuta: ' + AREAS[a].name, 3); }
    function interact(o) {
      if (!o) { notify('Avvicinati a un animale o a qualcosa da raccogliere.'); return; }
      if (o.species) { meet(o); return; }
      if (o.type === 'house') { enterRoom(); return; }
      if (['shop', 'cabin', 'hut'].includes(o.type)) { modal('shop'); tab = 'craft'; return; }
      if (['hall', 'sign', 'windmill'].includes(o.type)) { modal('journal'); return; }
      if (o.type === 'well') { say('Una pausa al pozzo', 'Un po’ d’acqua fresca, il rumore delle foglie e nessuna fretta. I tuoi progressi sono già salvati.'); sound('water'); return; }
      if (o.type === 'flowerbed') { plantFlower(); return; }
      if (o.type === 'plot') {
        const crop = data.crops[o.id];
        if (!crop) { if (!data.inv.seeds) { data.inv.seeds += 3; notify('Pip ti regala 3 semi. Piantiamoli!'); } data.inv.seeds--; data.crops[o.id] = { at: data.clock, watered: false }; notify('Seme piantato! Tocca ancora per annaffiare.'); sound('plant'); }
        else if (!crop.watered) { crop.watered = true; crop.at = data.clock; notify('Annaffiato! La verdura cresce in un minuto.'); sound('water'); }
        else if (data.clock - crop.at >= 60) { delete data.crops[o.id]; addToBag('crop', 1, 'Carota dell’orto'); notify('Una verdura tutta tua! Puoi piantare ancora.'); }
        else notify('Sta crescendo: ' + Math.ceil(60 - (data.clock - crop.at)) + ' secondi. Esplora, intanto!');
        save(); return;
      }
      if (o.type === 'fish') { fishing = { phase: 'wait', t: 0, ready: 1.3 + (data.stats.fish || 0) % 3 * 0.3, area }; modal('fishing'); sound('water'); return; }
      if (!available(o)) { notify('Ricresce presto. Intanto esplora un altro angolino.'); return; }
      data.depleted[o.id] = data.clock + (['tree', 'palm', 'rock'].includes(o.type) ? 65 : 42);
      if (o.type === 'tree' || o.type === 'palm') { addToBag('wood', 1); addToBag('fruit', 2, area === 2 ? 'Cocco della costa' : o.variant % 2 ? 'Pesca dolce' : 'Mela del giardino'); sound('tree'); }
      else if (o.type === 'rock') { addToBag('stone', 2); sound('stone'); }
      else if (o.type === 'log') addToBag('wood', 2);
      else if (o.type === 'flower') addToBag('flower', 1, ['Margherita', 'Fiore rosa', 'Lavanda', 'Campanula'][o.variant % 4]);
      else if (o.type === 'shell') addToBag('shell', 1, ['Conchiglia rosa', 'Ventaglio di mare', 'Piccola spirale'][o.variant % 3]);
      else if (o.type === 'star') { addToBag('star', 1, 'Frammento di stella'); sound('sparkle'); }
      else if (o.type === 'bug') { addToBag('bug', 1, ['Farfalla limone', 'Farfalla azzurra', 'Farfalla corallo', 'Farfalla lavanda'][o.variant % 4]); sound('flutter'); }
      save();
    }
    function plantFlower() {
      let tx = Math.floor(P.x / T), ty = Math.floor(P.y / T);
      const free = [];
      for (let y = ty - 2; y <= ty + 2; y++) for (let x = tx - 2; x <= tx + 2; x++) if (x > 2 && y > 2 && x < 24 && y < 24 && !grid[y][x] && !data.flowers.some(f => f.area === area && f.x === x && f.y === y) && !objects.some(o => o.tx === x && o.ty === y)) free.push({ x, y });
      if (!free.length || data.flowers.length >= 36) { notify('Questo angolo è già pieno di fiori!'); return; }
      const spot = free[Math.floor(free.length / 2)]; data.flowers.push({ ...spot, area, color: data.flowers.length % 4 }); data.stats.plantedFlowers = (data.stats.plantedFlowers || 0) + 1;
      sound('plant'); notify('Un nuovo fiore per l’isola!'); save();
    }
    function claim() {
      if (!ready()) return;
      const c = progress(); data.coins += c.reward; data.chapter++; sound('celebrate'); save();
      const text = data.chapter < 4 ? 'Che bel lavoro! Hai ricevuto ' + c.reward + ' monetine e sbloccato ' + AREAS[Math.min(data.chapter, 3)].name + '. La tua casetta ti aspetta sempre nella baia.' : 'Le lanterne sono accese e tutti gli amici sono qui! L’isola è casa tua: continua a pescare, piantare, arredare e scoprire ogni angolino.';
      say(data.chapter === 4 ? 'La nostra festa!' : 'Un nuovo luogo ti aspetta', text, [{ label: 'APRI LA MAPPA', action: () => modal('map', 'play') }]);
    }
    const afford = cost => Object.entries(cost).every(([k, n]) => data.inv[k] >= n);
    function craft(f, buy = false) {
      if (buy ? data.coins < f.price : !afford(f.cost)) { notify(buy ? 'Mancano alcune monetine. Puoi vendere i raccolti dallo zaino.' : 'Raccogli prima i materiali indicati.'); return; }
      if (buy) data.coins -= f.price; else for (const [k, n] of Object.entries(f.cost)) data.inv[k] -= n;
      data.owned[f.id] = Math.min(30, (data.owned[f.id] || 0) + 1); if (!buy) data.stats.crafted = (data.stats.crafted || 0) + 1;
      sound('craft'); notify(f.name + ' nello zaino!'); save();
    }
    function catchFish() {
      if (!fishing || fishing.phase !== 'bite') { notify('Aspetta i cerchi sull’acqua…'); return; }
      const species = [['Pesciolino d’argento', 'Carassio dorato', 'Persico allegro'], ['Trota del bosco', 'Carpa fiorita', 'Piccolo persico'], ['Pesce pagliaccio', 'Cavalluccio marino', 'Pesce farfalla'], ['Pesce luna', 'Carpa delle stelle', 'Pesciolino d’argento']][area][(data.stats.fish || 0) % 3];
      state = 'play'; returnState = 'play'; fishing = null; addToBag('fish', 1, species); sound('fish'); say('Una bella pescata!', 'Hai trovato: ' + species + '. È nel tuo album delle scoperte e nello zaino. Vuoi provare ancora?', [{ label: 'CONTINUA A PESCARE', action: () => { fishing = { phase: 'wait', t: 0, ready: 1.6, area }; modal('fishing', 'play'); } }]);
    }
    function begin() { started = true; state = 'play'; returnState = 'play'; makeWorld(area); save(); if (!saved?.v) say('Benvenuta sull’isola!', 'Tocca un punto per camminare. Tocca un albero o un animale: ti avvicinerai da sola! Il diario in alto ti mostra il prossimo piccolo obiettivo.', [], NPCS[0]); }
    function tick(dt) {
      time += dt; toastTime = Math.max(0, toastTime - dt); roomFlash = Math.max(0, roomFlash - dt);
      for (const b of burst) b.t -= dt; burst = burst.filter(b => b.t > 0);
      if (!['play', 'room', 'fishing'].includes(state)) return;
      data.clock += dt; autosave += dt; if (autosave > 8) save();
      if (data.music) {
        musicAt -= dt; if (musicAt <= 0) { musicAt = 0.48; const notes = [72, 76, 79, 76, 74, 72, 67, 0, 69, 72, 76, 79, 76, 72, 69, 0, 71, 74, 79, 74, 72, 71, 67, 0, 69, 72, 76, 74, 72, 0, 67, 0];
          const note = notes[musicStep++ % notes.length]; if (note && api.sound) sound('music', { frequency: 440 * Math.pow(2, (note - 69) / 12), gain: 0.022 });
          if (musicStep % 4 === 1 && api.sound) sound('music', { frequency: [130.81, 174.61, 196, 174.61][Math.floor(musicStep / 8) % 4], gain: 0.022, bass: true });
        }
      }
      ambientAt -= dt; if (ambientAt <= 0) { ambientAt = 7 + Math.sin(time) * 2; if (data.music) sound(area === 2 ? 'wave' : area === 3 ? 'sparkle' : 'bird', { gain: 0.018 }); }
      if (state === 'fishing') {
        fishing.t += dt; if (fishing.phase === 'wait' && fishing.t >= fishing.ready) { fishing.phase = 'bite'; fishing.t = 0; toastTime = 0; sound('bite'); api.haptic(15); }
        else if (fishing.phase === 'bite' && fishing.t > 5) { fishing.phase = 'wait'; fishing.t = 0; fishing.ready = 1.2; notify('Riproviamo, con calma!'); }
        return;
      }
      if (state === 'room') return;
      let dx = (held.right ? 1 : 0) - (held.left ? 1 : 0), dy = (held.down ? 1 : 0) - (held.up ? 1 : 0), moving = !!(dx || dy);
      if (moving) { path = []; destination = null; const len = Math.hypot(dx, dy); dx /= len; dy /= len; }
      else if (path.length) { const next = path[0], distance = Math.hypot(next.x - P.x, next.y - P.y); if (distance <= 120 * dt) { P.x = next.x; P.y = next.y; path.shift(); } else { dx = (next.x - P.x) / distance; dy = (next.y - P.y) / distance; moving = true; } }
      if (moving) {
        const speed = 120 * dt; if (walkable(P.x + dx * speed, P.y)) P.x += dx * speed; if (walkable(P.x, P.y + dy * speed)) P.y += dy * speed;
        if (Math.abs(dx) > 0.05) P.dir = dx < 0 ? -1 : 1; P.step += dt * 10;
        if (Math.floor(P.step) !== Math.floor(P.step - dt * 10) && Math.floor(P.step) % 4 === 0) sound('step', { gain: 0.012, sand: ground(Math.floor(P.x / T), Math.floor(P.y / T), area) === 'sand' });
      } else P.step = 0;
      P.pose = Math.max(0, P.pose - dt);
      if (!path.length && destination) { const o = destination; destination = null; if (Math.hypot(P.x - o.x, P.y - o.y) < 110) interact(o); }
      const k = Math.min(1, dt * 7); camera.x += (P.x - W / 2 - camera.x) * k; camera.y += (P.y * YS - H * 0.54 - camera.y) * k;
      actors.forEach((n, i) => { const x = n.home.x + Math.sin(time * 0.24 + i * 2) * 15, y = n.home.y + Math.cos(time * 0.2 + i) * 10; if (walkable(x, y)) { n.x = x; n.y = y; } });
    }

    // Rounded shapes, warm outlines and tiny highlights give the world its own storybook look.
    const rr = (x, y, w, h, r, color) => { g.fillStyle = color; g.beginPath(); g.roundRect(x, y, w, h, r); g.fill(); };
    const oval = (x, y, rx, ry, color, rotation = 0) => { g.fillStyle = color; g.beginPath(); g.ellipse(x, y, rx, ry, rotation, 0, TAU); g.fill(); };
    const circle = (x, y, r, color) => oval(x, y, r, r, color);
    const line = (points, color, width = 2) => { g.strokeStyle = color; g.lineWidth = width; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); points.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); };
    const poly = (points, color) => { g.fillStyle = color; g.beginPath(); points.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill(); };
    const edge = (color, width = 1) => { g.strokeStyle = color; g.lineWidth = width; g.lineJoin = 'round'; g.stroke(); };
    const txt = (s, x, y, size = 15, color = '#3f6259', align = 'left', weight = 700) => { g.font = `${weight} ${size}px "Trebuchet MS", system-ui, sans-serif`; g.fillStyle = color; g.textAlign = align; g.textBaseline = 'middle'; g.fillText(String(s), x, y); };
    function wrap(s, x, y, width, size = 16, color = '#527369', limit = 10, lineHeight = size * 1.4) {
      g.font = `500 ${size}px "Trebuchet MS", system-ui, sans-serif`; const words = String(s).split(/\s+/), lines = []; let row = '';
      for (const word of words) { if (row && g.measureText(row + ' ' + word).width > width) { lines.push(row); row = word; } else row += (row ? ' ' : '') + word; } if (row) lines.push(row);
      lines.slice(0, limit).forEach((s, i) => txt(s + (i === limit - 1 && lines.length > limit ? '…' : ''), x, y + i * lineHeight, size, color, 'left', 500)); return y + Math.min(lines.length, limit) * lineHeight;
    }
    const starShape = (x, y, r, color) => { const points = []; for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, d = i % 2 ? r * 0.45 : r; points.push([x + Math.cos(a) * d, y + Math.sin(a) * d]); } poly(points, color); };
    function flower(x, y, color = '#f8dfaa', scale = 1) {
      line([[x, y], [x, y - 12 * scale]], '#5a9868', 2 * scale); oval(x - 4 * scale, y - 5 * scale, 5 * scale, 2 * scale, '#78ab70', -0.5);
      for (let i = 0; i < 5; i++) { const a = i * TAU / 5; oval(x + Math.cos(a) * 4 * scale, y - 14 * scale + Math.sin(a) * 4 * scale, 4 * scale, 3 * scale, color, a); }
      circle(x, y - 14 * scale, 2.8 * scale, '#e6b95d');
    }
    function itemIcon(kind, x, y, scale = 1) {
      g.save(); g.translate(x, y); g.scale(scale, scale);
      if (kind === 'fruit') { circle(-5, 1, 10, '#e78778'); edge('#b56d5b'); circle(5, 1, 10, '#e79780'); edge('#b56d5b'); oval(-3, -4, 3, 5, '#f4c6a6', 0.5); line([[0, -7], [2, -14]], '#907151', 3); oval(7, -11, 6, 3, '#79a87a', -0.4); }
      else if (kind === 'wood') { rr(-15, -6, 28, 14, 5, '#ad7f55'); edge('#806346'); oval(13, 1, 5, 7, '#dec493'); edge('#94744e'); oval(13, 1, 2, 4, '#b59163'); line([[-12, -2], [6, -2]], '#d2a878', 2); }
      else if (kind === 'stone') { poly([[-14, 6], [-11, -6], [0, -12], [12, -6], [16, 7], [3, 11]], '#96a5a2'); edge('#6f8580', 1.1); poly([[-11, -6], [0, -12], [8, -4], [1, 1]], '#c3cfbe'); }
      else if (kind === 'flower') flower(0, 13, '#df9dba', 1.35);
      else if (kind === 'fish') { oval(0, 1, 15, 8, '#80b6c7', -0.16); edge('#507f91'); poly([[10, 1], [21, -9], [21, 9]], '#6099b6'); oval(-4, -1, 7, 3, '#b3d8d7', -0.2); circle(-9, -1, 1.5, '#385e66'); }
      else if (kind === 'bug') { oval(-8, -4, 9, 11, '#c2addb', -0.3); oval(8, -4, 9, 11, '#e4bfd8', 0.3); oval(-6, 6, 6, 7, '#e4c38f'); oval(6, 6, 6, 7, '#e7d1ac'); line([[0, 8], [0, -9]], '#695a70', 3); }
      else if (kind === 'shell') { g.fillStyle = '#f0c6b4'; g.beginPath(); g.moveTo(0, 12); g.bezierCurveTo(-30, -8, -9, -20, 0, -12); g.bezierCurveTo(9, -20, 30, -8, 0, 12); g.fill(); edge('#bc8d77'); for (let i = -2; i <= 2; i++) line([[i * 5, -8], [0, 10]], '#dca994', 1.2); }
      else if (kind === 'star') { starShape(0, 0, 17, '#edce7c'); edge('#b3914c'); starShape(-2, -3, 9, '#f9e8ae'); }
      else if (kind === 'crop') { poly([[-8, -8], [9, -8], [1, 18]], '#df985a'); line([[-5, -3], [4, -3]], '#efb780', 2); line([[0, -7], [-7, -16]], '#75a36c', 4); line([[0, -7], [5, -18]], '#89b476', 4); }
      else if (kind === 'seeds') { rr(-11, -15, 22, 30, 4, '#dfc898'); rr(-9, -6, 18, 18, 3, '#faf0cf'); oval(0, 3, 4, 7, '#92af74', 0.4); }
      else if (kind === 'coin') { circle(0, 0, 14, '#e8bf6b'); edge('#b18c43'); circle(-1, -1, 10, '#f5dc98'); txt('•', 0, -1, 18, '#c29952', 'center'); }
      g.restore();
    }
    function animal(n, x, y, scale = 1, walk = 0) {
      g.save(); g.translate(x, y); g.scale(scale, scale); const bob = Math.sin(walk) * 1.7;
      oval(0, 0, 16, 5, '#365d4b25');
      if (n.species === 'fox') oval(15, -16, 13, 6, '#d69874', -0.8);
      if (n.species === 'rabbit') circle(13, -12, 6, '#f5e4dc');
      oval(-7, -3, 5, 4, '#7b695d'); oval(7, -3, 5, 4, '#7b695d');
      oval(0, -15 + bob, 13, 17, n.shirt); edge('#657460', 1.1); line([[-9, -21 + bob], [-16, -12 + bob]], n.color, 7); line([[9, -21 + bob], [16, -12 + bob]], n.color, 7);
      const hy = -39 + bob;
      if (n.species === 'rabbit') { oval(-9, hy - 19, 6, 18, n.color, -0.15); oval(9, hy - 19, 6, 18, n.color, 0.15); oval(-9, hy - 19, 2.5, 12, '#e6a4ac', -0.15); oval(9, hy - 19, 2.5, 12, '#e6a4ac', 0.15); }
      else if (['cat', 'fox'].includes(n.species)) { poly([[-18, hy], [-17, hy - 24], [-2, hy - 12]], n.color); edge('#827562', 1.1); poly([[18, hy], [17, hy - 24], [2, hy - 12]], n.color); edge('#827562', 1.1); poly([[-14, hy - 9], [-14, hy - 18], [-7, hy - 11]], '#dfa7a0'); poly([[14, hy - 9], [14, hy - 18], [7, hy - 11]], '#dfa7a0'); }
      else if (['bear', 'deer'].includes(n.species)) { circle(-15, hy - 14, 8, n.color); circle(15, hy - 14, 8, n.color); circle(-15, hy - 14, 4, '#d8a58f'); circle(15, hy - 14, 4, '#d8a58f'); }
      oval(0, hy, 21, 20, n.color); edge('#827562', 1.1); oval(-4, hy - 5, 12, 10, '#fff2d327');
      if (n.species === 'fox') { oval(-10, hy + 6, 10, 8, '#fff1d9'); oval(10, hy + 6, 10, 8, '#fff1d9'); }
      if (n.species === 'owl') { oval(-9, hy, 9, 12, '#efe7d5'); oval(9, hy, 9, 12, '#efe7d5'); }
      const blink = Math.sin(time * 0.67 + n.x) > 0.995;
      for (const ex of [-8, 8]) { if (blink) line([[ex - 2, hy], [ex + 2, hy]], '#4b514d', 2); else { oval(ex, hy, 2.5, 3.5, '#46534d'); circle(ex - 0.6, hy - 1, 0.8, '#fff9e8'); } }
      oval(-14, hy + 7, 4, 2.3, '#e49d9777'); oval(14, hy + 7, 4, 2.3, '#e49d9777');
      if (n.species === 'duck') oval(0, hy + 7, 8, 4, '#da9f5d'); else { poly([[-3, hy + 5], [3, hy + 5], [0, hy + 8]], '#8a6c68'); line([[-3, hy + 11], [0, hy + 12], [3, hy + 11]], '#9e7a70', 1.1); }
      circle(0, -17 + bob, 1.5, '#f5e8be'); g.restore();
    }
    const SHIRTS = ['#da9a94', '#8eb8b2', '#cfba76', '#ada0c4', '#8ba88c'], HAIR = ['#805d47', '#c18c59', '#554d4b', '#b16f58', '#d4b783'], SKIN = ['#efd2b1', '#e1b68e', '#bf8e6c', '#976f58'];
    function human(x, y, scale = 1, step = 0) {
      g.save(); g.translate(x, y); g.scale(scale, scale); const bob = Math.abs(Math.sin(step)) * 2, skin = SKIN[data.look.skin], hair = HAIR[data.look.hair];
      oval(0, 0, 14, 5, '#3c66532a');
      oval(-6, -3 + Math.sin(step) * 2, 5, 4, '#8c7866'); oval(6, -3 - Math.sin(step) * 2, 5, 4, '#8c7866');
      rr(-10, -23 + bob, 20, 17, 6, SHIRTS[data.look.shirt]); edge('#657460', 1.1); rr(-10, -10 + bob, 20, 4, 2, '#eee3c7');
      line([[-10, -20 + bob], [-15, -10 + bob + Math.sin(step) * 3]], skin, 6); line([[10, -20 + bob], [15, -10 + bob - Math.sin(step) * 3]], skin, 6);
      oval(0, -38 + bob, 19, 21, hair); circle(-16, -34 + bob, 4, skin); circle(16, -34 + bob, 4, skin); oval(0, -35 + bob, 17, 17, skin); edge('#997758', 1);
      oval(-8, -46 + bob, 10, 7, hair, -0.4); oval(7, -47 + bob, 12, 6, hair, 0.35); oval(18, -38 + bob, 6, 9, hair, -0.25);
      if (Math.sin(time * 0.7) > 0.995) { line([[-9, -35 + bob], [-5, -35 + bob]], '#454e45', 2); line([[5, -35 + bob], [9, -35 + bob]], '#454e45', 2); }
      else { oval(-7, -35 + bob, 2.2, 3, '#414e47'); oval(7, -35 + bob, 2.2, 3, '#414e47'); circle(-7.5, -36 + bob, 0.7, '#fff8e1'); circle(6.5, -36 + bob, 0.7, '#fff8e1'); }
      oval(-11, -28 + bob, 4, 2, '#dd9c9277'); oval(11, -28 + bob, 4, 2, '#dd9c9277'); line([[-3, -26 + bob], [0, -25 + bob], [3, -26 + bob]], '#aa7d6b', 1.2);
      oval(0, -53 + bob, 26, 5, '#d8b976'); edge('#a1844e'); rr(-16, -66 + bob, 32, 15, [12, 12, 3, 3], '#e8cf93'); edge('#a1844e'); rr(-16, -56 + bob, 32, 4, 1, SHIRTS[data.look.shirt]); flower(19, -54 + bob, '#f8e4b3', 0.5);
      if (P.pose > 0 && scale === 1) { line([[13, -16], [21, -41]], '#967450', 3); oval(23, -48, 10, 13, '#e8eee780', -0.25); }
      g.restore();
    }
    function furniture(kind, x, y, scale = 1) {
      g.save(); g.translate(x, y); g.scale(scale, scale); oval(0, 3, 21, 7, '#4f645222');
      if (kind === 'bed') { rr(-20, -36, 40, 41, 5, '#a88360'); rr(-17, -41, 34, 12, 5, '#e9d7b4'); rr(-17, -29, 34, 30, 3, '#db9e9a'); rr(-14, -37, 28, 10, 4, '#fff3da'); for (let i = 0; i < 6; i++) flower(-10 + i % 3 * 10, -13 + Math.floor(i / 3) * 11, '#f3d5b9', 0.22); }
      else if (kind === 'chair') { rr(-15, -35, 30, 25, 5, '#ae855c'); line([[-11, -2], [-11, 10]], '#86684f', 4); line([[11, -2], [11, 10]], '#86684f', 4); rr(-18, -15, 36, 17, 5, '#d5b183'); rr(-11, -30, 22, 14, 3, '#e7c89e'); }
      else if (kind === 'plant') { poly([[-12, -9], [12, -9], [9, 11], [-9, 11]], '#ca987f'); oval(0, -9, 14, 5, '#e2b39c'); line([[0, -10], [0, -44]], '#6f9973', 3); for (const [dx, dy, rot] of [[-12, -33, -.5], [12, -27, .5], [-9, -17, -.3], [8, -42, .6]]) oval(dx, dy, 12, 6, '#84b486', rot); }
      else if (kind === 'table') { line([[-17, -5], [-17, 11]], '#9a795b', 4); line([[17, -5], [17, 11]], '#9a795b', 4); oval(0, -11, 29, 14, '#b18c68'); oval(0, -15, 29, 13, '#d8b991'); circle(-7, -19, 5, '#fff1d4'); line([[0, -20], [3, -20]], '#f7e7c6', 2); flower(9, -15, '#dfafbe', 0.6); }
      else if (kind === 'lamp') { oval(0, 3, 13, 5, '#8b9a82'); line([[0, 0], [0, -34]], '#b8a172', 4); poly([[-21, -28], [-12, -51], [12, -51], [21, -28]], '#efdda1'); oval(0, -28, 21, 5, '#f8eab9'); }
      else if (kind === 'rug') { oval(0, 0, 31, 18, '#8ab7ba'); oval(0, -1, 25, 13, '#c8dad0'); oval(0, -1, 16, 7, '#9abfc0'); }
      else if (kind === 'shelf') { rr(-24, -55, 48, 61, 3, '#b89570'); rr(-19, -49, 38, 48, 2, '#8c735b'); for (let row = 0; row < 2; row++) { for (let i = 0; i < 5; i++) rr(-16 + i * 7, -45 + row * 25, 5, 19, 1, ['#a1b6a0', '#d5a39a', '#e2c58e', '#91adb9', '#bba9c8'][i]); rr(-22, -23 + row * 25, 44, 4, 1, '#dab892'); } }
      else if (kind === 'stars') { line([[-20, -43], [20, -43]], '#ae9069', 2); for (let i = 0; i < 3; i++) { line([[-16 + i * 16, -43], [-16 + i * 16, -26 + i % 2 * 10]], '#c7b28b', 1); starShape(-16 + i * 16, -22 + i % 2 * 10, 9, '#e8cd83'); } }
      g.restore();
    }
    function building(o, x, y) {
      const shop = o.type === 'shop', hall = o.type === 'hall', roof = hall ? '#8baea9' : shop ? '#a1b681' : AREAS[area].roof;
      oval(x, y + 8, 69, 16, '#4c77552c'); rr(x - 51, y - 62, 102, 69, 6, '#d4c8a7'); edge('#a39876', 1.2); rr(x - 47, y - 64, 94, 64, 4, '#f3e5bd');
      for (let i = 0; i < 5; i++) line([[x - 46, y - 53 + i * 12], [x + 46, y - 53 + i * 12]], '#d7c6a44a', 1);
      rr(x + 24, y - 109, 15, 37, 2, '#b3a389'); rr(x + 21, y - 112, 21, 7, 2, '#d2bba0');
      poly([[x - 65, y - 64], [x - 44, y - 108], [x + 39, y - 108], [x + 64, y - 64]], '#7c8d6b');
      poly([[x - 65, y - 69], [x - 40, y - 112], [x + 40, y - 112], [x + 65, y - 69]], roof); edge('#657e64', 1.2);
      for (let row = 0; row < 4; row++) line([[x - 59 + row * 6, y - 75 - row * 10], [x + 59 - row * 6, y - 75 - row * 10]], '#f5e8c738', 1.2);
      line([[x - 65, y - 67], [x + 65, y - 67]], '#f7ddae', 5);
      const window = wx => { rr(wx - 13, y - 51, 26, 29, 4, '#bb9f74'); edge('#927a55'); rr(wx - 10, y - 48, 20, 23, 3, '#b4d5cc'); line([[wx - 9, y - 43], [wx + 8, y - 43]], '#f6ebca', 2); line([[wx, y - 48], [wx, y - 25]], '#f6ebca', 2); poly([[wx - 8, y - 46], [wx - 3, y - 46], [wx - 8, y - 36]], '#fff4d077'); rr(wx - 16, y - 21, 32, 6, 2, '#bba77d'); flower(wx - 7, y - 24, '#e4a4b0', .45); flower(wx + 6, y - 25, '#f6d990', .5); };
      window(x - 32); window(x + 32); rr(x - 14, y - 42, 28, 47, [13, 13, 2, 2], '#ab8a66'); edge('#866a4d'); rr(x - 10, y - 37, 20, 36, [9, 9, 1, 1], '#cba87c'); circle(x + 7, y - 14, 2, '#f1db9f'); rr(x - 22, y + 4, 44, 6, 2, '#c4b595'); rr(x - 27, y + 9, 54, 5, 2, '#ded0a9');
      if (shop) { rr(x - 38, y - 64, 76, 15, 4, '#fff0c9'); txt('EMPORIO', x, y - 56, 10, '#4e6c4b', 'center'); for (let i = 0; i < 6; i++) rr(x - 42 + i * 14, y - 65, 14, 9, [0, 0, 5, 5], i % 2 ? '#f5e9c7' : '#b3c68d'); }
      if (hall) { circle(x, y - 90, 12, '#f6e8bf'); line([[x, y - 97], [x, y - 90], [x + 5, y - 87]], '#7c9a86', 2); }
      if (o.type === 'house') { rr(x - 73, y - 17, 5, 32, 2, '#ba9b72'); rr(x - 81, y - 24, 21, 17, 4, '#9bb7a1'); poly([[x - 83, y - 24], [x - 70, y - 31], [x - 58, y - 24]], '#d7a584'); circle(x - 65, y - 15, 2, '#f7e8c5'); }
      if (o.type === 'windmill') { const angle = time * .25; circle(x, y - 91, 5, '#bda583'); for (let i = 0; i < 4; i++) { const a = angle + i * Math.PI / 2; line([[x, y - 91], [x + Math.cos(a) * 47, y - 91 + Math.sin(a) * 47]], '#d5c29c', 5); } }
    }
    function tree(o, x, y) {
      oval(x, y + 1, 30, 9, '#447a5330'); rr(x - 7, y - 51, 14, 53, 5, '#9c8258'); edge('#776746'); rr(x - 2, y - 46, 4, 43, 2, '#c0a276');
      const sway = Math.sin(time * 1.1 + o.phase) * 1.4;
      const colors = area === 1 ? ['#a3b66e', '#c0c47f', '#d2c887'] : area === 3 ? ['#729b9b', '#94b6ac', '#a7c7af'] : ['#74b27b', '#91c789', '#b2d897'];
      const tx = x + sway;
      oval(tx, y - 70, 36, 35, colors[0]); edge('#64865d', 1.1); oval(tx - 22, y - 51, 25, 26, colors[0]); edge('#64865d', 1.1); oval(tx + 23, y - 52, 26, 26, colors[0]); edge('#64865d', 1.1); oval(tx, y - 50, 34, 28, colors[1]); oval(tx - 10, y - 76, 25, 23, colors[1]); oval(tx - 14, y - 83, 15, 11, colors[2]); oval(tx + 22, y - 62, 12, 10, colors[2]);
      for (let i = 0; i < 7; i++) { const a = i * 2.399 + o.phase; oval(tx + Math.cos(a) * 25, y - 62 + Math.sin(a) * 21, 4, 2, '#d2e6a955', a); }
      if (available(o)) for (const [dx, dy] of [[-20, -60], [15, -49], [4, -81]]) { circle(tx + dx, y + dy, 6.5, o.variant % 2 ? '#e9b080' : '#dc8b77'); edge('#af7858', .9); circle(tx + dx - 2, y + dy - 2, 2, '#f5d5a4'); line([[tx + dx, y + dy - 5], [tx + dx + 1, y + dy - 9]], '#6b8c5b', 1.5); }
    }
    function drawObject(o, x, y) {
      if (['house', 'shop', 'hall', 'cabin', 'hut', 'windmill'].includes(o.type)) { building(o, x, y); return; }
      if (o.type === 'tree') { tree(o, x, y); return; }
      if (o.type === 'palm') { oval(x, y, 30, 7, '#548f6730'); line([[x, y], [x - 5, y - 35], [x + 4, y - 78]], '#b4a076', 10); for (let i = 0; i < 5; i++) { const a = i * 1.25; g.save(); g.translate(x + 4, y - 78); g.rotate(a); oval(20, 2, 30, 9, i % 2 ? '#82ba84' : '#68a783', .2); line([[0, 0], [43, 2]], '#a9cd90', 1); g.restore(); } if (available(o)) { circle(x, y - 69, 7, '#a48a61'); circle(x + 12, y - 68, 6, '#bea272'); } return; }
      if (o.type === 'rock') { itemIcon('stone', x, y - 7, 1.5); if (!available(o)) oval(x + 6, y, 4, 2, '#d2d6bf'); }
      else if (o.type === 'log') { if (available(o)) itemIcon('wood', x, y - 4, 1.2); }
      else if (o.type === 'flower') { if (available(o)) { const col = ['#f6e3b4', '#e7a4b9', '#baabd2', '#a4c8db'][o.variant % 4]; flower(x - 6, y, col, .9); flower(x + 6, y + 3, col, 1.1); } }
      else if (o.type === 'shell') { if (available(o)) itemIcon('shell', x, y - 3, .72); }
      else if (o.type === 'star') { if (available(o)) { oval(x, y + 1, 16, 6, '#ffe6a226'); starShape(x, y - 9 + Math.sin(time * 2 + o.phase) * 2, 12, '#f5df9c'); circle(x + 13, y - 20, 2, '#fff2be'); } }
      else if (o.type === 'bug') { if (available(o)) { const yy = y - 30 + Math.sin(time * 2 + o.phase) * 8, xx = x + Math.cos(time * 1.4 + o.phase) * 12; g.save(); g.translate(xx, yy); g.scale(.5 + Math.abs(Math.sin(time * 7)) * .3, .7); itemIcon('bug', 0, 0, .7); g.restore(); } }
      else if (o.type === 'fish') { oval(x, y, 22 + Math.sin(time * 2) * 3, 8, '#d4f4e680'); line([[x - 12, y], [x - 4, y - 2], [x + 10, y]], '#effff1b0', 1.5); poly([[x - 9, y + 4], [x + 8, y], [x + 7, y + 7]], '#497e8c50'); }
      else if (o.type === 'well') { oval(x, y, 24, 13, '#b3b397'); rr(x - 22, y - 15, 44, 15, 3, '#c4c1a0'); oval(x, y - 15, 22, 9, '#e3d9b1'); oval(x, y - 15, 15, 6, '#76a5a1'); line([[x - 17, y - 12], [x - 17, y - 49]], '#a68c61', 5); line([[x + 17, y - 12], [x + 17, y - 49]], '#a68c61', 5); poly([[x - 29, y - 45], [x, y - 63], [x + 29, y - 45]], '#9cb69a'); line([[x, y - 46], [x, y - 23]], '#ba9b72', 2); }
      else if (o.type === 'sign') { rr(x - 3, y - 26, 6, 30, 2, '#a08b65'); rr(x - 22, y - 42, 44, 23, 4, '#e1cca0'); txt('➜', x, y - 31, 20, '#71987e', 'center'); }
      else if (o.type === 'bench' || o.type === 'chair') { line([[x - 22, y - 5], [x - 22, y + 8]], '#8c785b', 4); line([[x + 22, y - 5], [x + 22, y + 8]], '#8c785b', 4); rr(x - 29, y - 31, 58, 18, 3, '#ba9a70'); rr(x - 31, y - 13, 62, 11, 3, '#d7b787'); line([[x - 26, y - 24], [x + 26, y - 24]], '#dfc49b', 2); }
      else if (o.type === 'umbrella') { line([[x, y], [x, y - 66]], '#bb9e75', 4); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; poly([[x, y - 82], [x + Math.cos(a) * 44, y - 60 + Math.sin(a) * 15], [x + Math.cos(a + Math.PI / 3) * 44, y - 60 + Math.sin(a + Math.PI / 3) * 15]], i % 2 ? '#f6e6bd' : '#df9d8f'); } }
      else if (o.type === 'lantern') { line([[x, y], [x, y - 53]], '#8d927e', 3); oval(x, y - 40, 14, 18, '#f1d992'); line([[x - 10, y - 49], [x + 10, y - 49]], '#c0a97d', 2); if (data.chapter === 4 || area === 3) { g.globalAlpha = .14; circle(x, y - 40, 30, '#fff4b9'); g.globalAlpha = 1; } }
      else if (o.type === 'flowerbed') { oval(x, y, 30, 12, '#a78f69'); for (let i = 0; i < 5; i++) flower(x - 21 + i * 10, y + i % 2 * 4, ['#e6aab8', '#f3d797', '#b2acd1'][i % 3], .8); }
      else if (o.type === 'plot') { const c = data.crops[o.id]; rr(x - 18, y - 10, 36, 22, 6, c?.watered ? '#9b8062' : '#bd9c70'); for (let i = 0; i < 3; i++) line([[x - 12, y - 5 + i * 6], [x + 12, y - 5 + i * 6]], '#886f5438', 1); if (c) { const grown = c.watered && data.clock - c.at >= 60; if (grown) itemIcon('crop', x, y - 13, .8); else { line([[x, y - 2], [x, y - 14]], '#83ab74', 3); oval(x - 5, y - 10, 7, 3, '#9bc582', .4); oval(x + 5, y - 15, 7, 3, '#acd48b', -.4); } } }
    }
    const outputScale = () => { const pixels = typeof cv.getAttribute === 'function' ? Number(cv.getAttribute('width')) : W; return Math.max(1, Number.isFinite(pixels) && pixels > 0 ? pixels / W : 1); };
    const terrainScale = () => Math.min(outputScale(), Math.sqrt(4.6e6 / (WORLD * Math.ceil(WORLD * YS))));
    function makeBackdrop(scale) {
      const c = document.createElement('canvas'); c.width = Math.ceil(WORLD * scale); c.height = Math.ceil(WORLD * YS * scale); const cg = c.getContext('2d'), random = rng(area * 7919 + 17), pal = AREAS[area];
      cg.setTransform(scale, 0, 0, scale, 0, 0); backdropScale = scale;
      // Terrain is painted once; animated characters, water and foliage remain separate.
      // Match the actual display density (including automatic quality changes), within a mobile-sized cache budget.
      cg.fillStyle = pal.water; cg.fillRect(0, 0, WORLD, WORLD * YS);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const kind = terrain[y][x], px = x * T, py = y * T * YS; if (kind === 'water') continue;
        const coast = [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => !terrain[y + dy] || terrain[y + dy][x + dx] === 'water');
        if (coast) { cg.fillStyle = '#3e929533'; cg.beginPath(); cg.roundRect(px - 3, py + 7, T + 6, T * YS + 4, 9); cg.fill(); cg.fillStyle = pal.sand; cg.beginPath(); cg.roundRect(px - 1, py - 1, T + 2, T * YS + 2, 8); cg.fill(); }
        cg.fillStyle = kind === 'sand' ? pal.sand : kind === 'path' ? pal.path : kind === 'bridge' ? '#bfa67d' : pal.grass;
        cg.beginPath(); cg.roundRect(px, py, T + .6, T * YS + .6, coast ? 5 : 0); cg.fill();
        if (kind === 'grass') {
          cg.fillStyle = random() > .5 ? pal.light + '66' : pal.dark + '32'; for (let i = 0; i < 4; i++) { const xx = px + random() * T, yy = py + random() * T * YS; cg.beginPath(); cg.ellipse(xx, yy, 2 + random() * 3, 1.2, 0, 0, TAU); cg.fill(); }
          if (random() < .13) { cg.fillStyle = '#f3e8ba'; for (let i = 0; i < 3; i++) { cg.beginPath(); cg.arc(px + 10 + i * 5, py + 12 + i % 2 * 5, 1.2, 0, TAU); cg.fill(); } }
        } else if (kind === 'path' || kind === 'sand') { cg.fillStyle = '#fff1c937'; for (let i = 0; i < 4; i++) { cg.beginPath(); cg.ellipse(px + random() * T, py + random() * T * YS, 2, .8, 0, 0, TAU); cg.fill(); } }
        else if (kind === 'bridge') { for (let i = 0; i < 5; i++) { cg.fillStyle = i % 2 ? '#d6bf96' : '#cdb38b'; cg.fillRect(px + 2, py + i * 6, T - 4, 4); } }
      }
      return c;
    }
    function drawWorld() {
      const pal = AREAS[area]; g.fillStyle = pal.water; g.fillRect(0, 0, W, H); const density = terrainScale(); if (!backdrop || Math.abs(backdropScale - density) > .015) backdrop = makeBackdrop(density);
      g.save(); g.translate(-camera.x, -camera.y); g.drawImage(backdrop, 0, 0, WORLD, WORLD * YS);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (terrain[y][x] === 'water' && x * T > camera.x - T && x * T < camera.x + W + T && y * T * YS > camera.y - T && y * T * YS < camera.y + H + T) {
        const yy = y * T * YS + 12 + Math.sin(time + x) * 2; line([[x * T + 7, yy], [x * T + 16, yy + 1], [x * T + 25, yy]], '#e5f6df55', 1.4);
      }
      data.flowers.filter(f => f.area === area).forEach(f => flower((f.x + .5) * T, (f.y + .5) * T * YS, ['#f5dca6', '#e5a5b9', '#b5a2d0', '#a9c9dd'][f.color], 1));
      if (path.length) { g.globalAlpha = .7; for (let i = 1; i < path.length; i += 2) circle(path[i].x, path[i].y * YS, 2.2, '#fff5d4'); g.globalAlpha = 1; }
      const drawables = [...objects.map(o => ({ y: o.y, type: 'object', o })), ...actors.map(o => ({ y: o.y, type: 'animal', o })), { y: P.y, type: 'player' }].sort((a, b) => a.y - b.y);
      const near = nearby();
      for (const d of drawables) {
        if (d.type === 'player') { human(P.x, P.y * YS, 1, P.step); continue; }
        const o = d.o, x = o.x, y = o.y * YS; if (x < camera.x - 100 || x > camera.x + W + 100 || y < camera.y - 30 || y > camera.y + H + 140) continue;
        if (d.type === 'animal') animal(o, x, y, 1, time * 2 + o.x);
        else { const hidesNeighbor = ['tree', 'palm'].includes(o.type) && [P, ...actors.filter(n => Math.hypot(n.x - P.x, n.y - P.y) < 170)].some(n => Math.abs(n.x - o.x) < 48 && o.y - n.y > -12 && o.y - n.y < 150); if (hidesNeighbor) g.globalAlpha = .4; drawObject(o, x, y); g.globalAlpha = 1; }
        if (o === near && state === 'play') { const yy = y - (o.species ? 75 : ['tree', 'palm', 'house', 'shop', 'hall', 'windmill', 'cabin', 'hut'].includes(o.type) ? 122 : 43); oval(x, yy + Math.sin(time * 3) * 2, 12, 10, '#fff4d9'); txt('A', x, yy + Math.sin(time * 3) * 2, 12, '#6a8c72', 'center'); }
      }
      for (const b of burst) { g.globalAlpha = Math.min(1, b.t); txt(b.text, b.x, b.y - (1.5 - b.t) * 20, 14, '#fff9df', 'center'); g.globalAlpha = 1; }
      g.restore();
      const dusk = area === 3 ? .08 : Math.max(0, Math.sin(data.clock / 320)) * .05; if (dusk) { g.fillStyle = `rgba(83,73,111,${dusk})`; g.fillRect(0, 0, W, H); }
      if (area === 3 || area === 1) for (let i = 0; i < 14; i++) { const xx = (i * 137 + Math.sin(time * .4 + i) * 15 - camera.x * .2 + WORLD) % (W + 40), yy = (i * 79 + Math.cos(time * .5 + i) * 20 - camera.y * .15 + WORLD) % (H + 30); g.globalAlpha = .3 + Math.sin(time * 2 + i) * .2; circle(xx, yy, area === 3 ? 2 : 1.5, '#ffedb2'); g.globalAlpha = 1; }
      if (data.chapter === 4) { for (let i = 0; i < 12; i++) { const xx = (i * 89 + time * (6 + i % 3)) % (W + 20) - 10, yy = (i * 41 + Math.sin(time + i) * 8) % H; oval(xx, yy, 3, 1.5, ['#f5d28e', '#e7adbc', '#d5dbad'][i % 3], time + i); } }
    }
    const hit = (e, b) => e.x >= b.x && e.x <= b.x + b.w && e.y >= b.y && e.y <= b.y + b.h;
    let focus = 0, focusVisible = false, roomCursor = { x: 3, y: 4 };
    function button(id, label, x, y, w, h, action, style = 'green') {
      const palette = style === 'cream' ? ['#f4e7c7', '#577466'] : style === 'rose' ? ['#dca79f', '#fff6e6'] : style === 'muted' ? ['#e0e7d5', '#8b9c87'] : ['#78a791', '#fff8e6'];
      rr(x, y + 3, w, h, 13, '#435f5320'); rr(x, y, w, h, 13, pressed?.id === id ? '#a9c1a4' : palette[0]);
      if (focusVisible && buttons.length === focus) { g.strokeStyle = '#b58f5b'; g.lineWidth = 3; g.beginPath(); g.roundRect(x + 2, y + 2, w - 4, h - 4, 11); g.stroke(); }
      txt(label, x + w / 2, y + h / 2, label.length > 24 ? 12 : label.length > 17 ? 13 : 15, palette[1], 'center');
      buttons.push({ id, x, y, w, h, action });
    }
    function panel(title, subtitle = '') {
      g.fillStyle = '#36584c55'; g.fillRect(0, 0, W, H); rr(12, 18, W - 24, H - 36, 22, '#fff5dc');
      txt(title, 32, 53, title.length > 22 ? 19 : 23, '#557c68'); if (subtitle) txt(subtitle, 32, 82, 13, '#8b987d', 'left', 500);
      button('close', '×', W - 74, 26, 54, 54, close, 'cream');
    }
    function titleScreen() {
      const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#b5e4db'); bg.addColorStop(.6, '#85c9c6'); bg.addColorStop(1, '#dce7c3'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
      for (let i = 0; i < 10; i++) { const xx = (i * 71 + time * (i % 2 ? 2 : -2) + W * 2) % (W + 70) - 35; oval(xx, 42 + i % 3 * 38, 37, 9, '#f4f3d580'); }
      txt('UN POSTO TUTTO TUO', W / 2, 34, 11, '#5a8a7d', 'center');
      g.save(); g.translate(W / 2, Math.max(82, H * .18)); g.rotate(-.035); txt('ISOLA FELICE', 1, 3, 38, '#477c6b', 'center', 900); txt('ISOLA FELICE', 0, 0, 38, '#fff4d5', 'center', 900); g.restore();
      txt('Piccole scoperte. Grandi amicizie.', W / 2, Math.max(116, H * .18 + 39), 14, '#4e8677', 'center', 500);
      const cy = H * .51, k = Math.min(1, (H - 240) / 280);
      g.save(); g.translate(W / 2, cy); g.scale(k, k); oval(0, 36, 167, 49, '#5dafad66'); oval(0, 22, 155, 54, '#d9bf8a'); oval(0, 12, 155, 54, '#f1dfad'); oval(0, 2, 143, 50, '#95c786');
      rr(-80, 6, 138, 22, 12, '#e5c79c'); building({ type: 'house' }, -5, 2); tree({ phase: 0, variant: 1, id: 'title-tree' }, -112, 30); drawObject({ type: 'palm', id: 'title-palm' }, 110, 26);
      human(13, 61, 1.2, time * 1.4); animal(NPCS[0], -49, 57, .95, time * 1.2); animal(NPCS[1], 73, 54, .95, time * 1.3); flower(-76, 46, '#efd1a0', 1); flower(96, 43, '#e5abc0', 1.1); itemIcon('shell', -113, 62, .6);
      for (let i = 0; i < 5; i++) { const xx = -110 + i * 57, yy = 92 + Math.sin(time + i) * 3; line([[xx - 9, yy], [xx, yy + 2], [xx + 9, yy]], '#e0f2db99', 2); } g.restore();
      button('begin', started ? 'TORNA SULL’ISOLA' : 'COMINCIA L’AVVENTURA', 30, H - 145, W - 60, 62, begin);
      button('look', 'SCEGLI IL TUO PERSONAGGIO', 54, H - 72, W - 108, 49, () => { state = 'look'; returnState = 'title'; focus = 0; }, 'cream');
    }
    function hud(room = false) {
      rr(12, 10, W - 24, 59, 18, '#fff6dfec');
      txt(room ? 'La tua casetta' : AREAS[area].name, 29, 30, 17, '#4b7664'); txt(room ? 'Ogni angolo parla di te' : 'CAPITOLO ' + Math.min(4, data.chapter + 1) + ' DI 4', 29, 51, 10, '#8a9f83');
      itemIcon('coin', W - 72, 37, .65); txt(data.coins, W - 53, 37, 14, '#9f8754');
      if (!room) { const goal = progress(), next = goal?.needs.find(([k, n]) => (data.stats[k] || 0) < n); const label = !goal ? 'LA FESTA È COMINCIATA! ESPLORA CON CALMA' : ready() ? 'OBIETTIVO COMPLETATO · RITIRA IL PREMIO' : next[2] + '  ' + Math.min(next[1], data.stats[next[0]] || 0) + '/' + next[1];
        button('goal', label, 12, 77, W - 24, 46, () => modal('journal'), 'cream');
        button('map', 'MAPPA', 12, H - 73, 107, 61, () => modal('map'), 'cream'); button('bag', 'ZAINO', 127, H - 73, 107, 61, () => { tab = 'items'; modal('bag'); }, 'cream');
        const n = nearby(), label2 = !n ? 'GUARDA' : n.species ? 'PARLA' : n.type === 'fish' ? 'PESCA' : n.type === 'house' ? 'ENTRA' : ['shop', 'cabin', 'hut'].includes(n.type) ? 'EMPORIO' : ['hall', 'sign', 'windmill'].includes(n.type) ? 'DIARIO' : n.type === 'plot' ? 'COLTIVA' : 'RACCOGLI';
        button('act', label2, 242, H - 73, W - 254, 61, () => interact(nearby()));
      }
    }
    const roomFloor = () => { const y = Math.max(155, H * .39); return { x: 46, y, cell: (W - 92) / 7, row: (H - 104 - y) / 5 }; };
    function putFurniture(x, y) {
      if (!selectedFurniture) return;
      if (x < 0 || x > 6 || y < 0 || y > 4 || data.room.some(f => f.x === x && f.y === y)) { notify('Scegli una casella libera.'); return; }
      const count = data.room.filter(f => f.kind === selectedFurniture).length;
      if (count >= (data.owned[selectedFurniture] || 0)) { selectedFurniture = null; notify('Hai sistemato tutti gli arredi di questo tipo.'); return; }
      data.room.push({ kind: selectedFurniture, x, y }); data.stats.decorated = Math.max(data.stats.decorated || 0, data.room.length); selectedFurniture = null;
      const empty = []; for (let row = 4; row >= 0; row--) for (const col of [3, 2, 4, 1, 5, 0, 6]) if (!data.room.some(f => f.x === col && f.y === row)) empty.push({ x: col, y: row }); roomCursor = empty[0] || { x: 3, y: 4 };
      roomFlash = 1; sound('craft'); save(); notify('Ecco, proprio al posto giusto!');
    }
    function drawRoom() {
      const wall = ['#e2d9bd', '#c9dccb', '#ded2df', '#cbdce0'][data.wallpaper], floor = roomFloor(), { x, y, cell, row: cellY } = floor;
      g.fillStyle = '#b4c5ad'; g.fillRect(0, 0, W, H); rr(23, 88, W - 46, H - 174, 13, '#9b967c'); rr(28, 88, W - 56, y - 70, 6, wall);
      for (let xx = 38; xx < W - 30; xx += 16) { g.fillStyle = '#fff6dc25'; g.fillRect(xx, 91, 5, y - 72); }
      rr(W - 126, y - 85, 69, 62, 7, '#f4e9cc'); rr(W - 120, y - 79, 57, 50, 4, AREAS[area].night ? '#6985a1' : '#afd5cd'); line([[W - 92, y - 78], [W - 92, y - 30]], '#f3e7c6', 4); line([[W - 120, y - 55], [W - 64, y - 55]], '#f3e7c6', 4); poly([[W - 124, y - 84], [W - 107, y - 84], [W - 116, y - 29], [W - 126, y - 29]], '#dfa9a0'); poly([[W - 58, y - 84], [W - 75, y - 84], [W - 66, y - 29], [W - 56, y - 29]], '#dfa9a0');
      rr(57, y - 67, 39, 43, 4, '#b89770'); rr(62, y - 62, 29, 33, 2, '#fff0c7'); flower(76, y - 33, '#bca9c9', 1.1);
      for (let row = 0; row < 5; row++) for (let col = 0; col < 7; col++) { rr(x + col * cell, y + row * cellY, cell, cellY, 1, (row + col) % 2 ? '#d6bc91' : '#dfc69e'); line([[x + col * cell + 4, y + row * cellY + 8], [x + (col + 1) * cell - 4, y + row * cellY + 8]], '#bfa78055', 1); }
      const placed = data.room.slice().sort((a, b) => a.y - b.y);
      placed.filter(f => f.kind === 'rug').forEach(f => furniture(f.kind, x + (f.x + .5) * cell, y + (f.y + .7) * cellY, .85));
      placed.filter(f => f.kind !== 'rug').forEach(f => furniture(f.kind, x + (f.x + .5) * cell, y + (f.y + .7) * cellY, .85));
      if (selectedFurniture) { for (let row = 0; row < 5; row++) for (let col = 0; col < 7; col++) if (!data.room.some(f => f.x === col && f.y === row)) rr(x + col * cell + 3, y + row * cellY + 3, cell - 6, cellY - 6, 5, '#fff6ca40'); g.globalAlpha = .6; furniture(selectedFurniture, x + (roomCursor.x + .5) * cell, y + (roomCursor.y + .7) * cellY, .85); g.globalAlpha = 1; }
      else human(x + (roomCursor.x + .5) * cell, y + (roomCursor.y + .7) * cellY, .85);
      hud(true); txt(selectedFurniture ? 'TOCCA UNA CASELLA LIBERA PER POSARE' : 'TOCCA UN ARREDO PER SPOSTARLO', W / 2, H - 94, 11, '#fff6db', 'center');
      button('outside', 'CORTILE', 12, H - 73, 112, 61, leaveRoom, 'cream'); button('decorate', 'ARREDA', 134, H - 73, 112, 61, () => { tab = 'furniture'; modal('bag', 'room'); }); button('walls', 'PARETI', 256, H - 73, W - 268, 61, () => { data.wallpaper = (data.wallpaper + 1) % 4; sound('ui'); save(); }, 'cream');
    }
    function drawMap() {
      panel('La tua isola', 'Tocca un luogo per raggiungerlo.'); const h = Math.min(94, (H - 141) / 4 - 6);
      AREAS.forEach((a, i) => { const y = 108 + i * (h + 6), unlocked = i <= Math.min(3, data.chapter); button('travel-' + i, '', 28, y, W - 56, h, () => { if (unlocked) travel(i); else notify('Completa il capitolo precedente per scoprire questo luogo.'); }, unlocked ? 'cream' : 'muted');
        oval(62, y + h / 2 + 8, 24, 12, a.sand); oval(62, y + h / 2 + 3, 21, 11, a.grass); if (i === 3) starShape(62, y + h / 2 - 9, 10, '#e4c77b'); else { rr(57, y + h / 2 - 12, 12, 15, 2, a.roof); circle(58, y + h / 2 - 17, 10, a.dark); }
        txt(unlocked ? a.name : 'Un luogo da scoprire', 98, y + h / 2 - 9, 15, unlocked ? '#4f7664' : '#8a9b88'); txt(unlocked ? a.short : 'DOPO IL CAPITOLO ' + i, 98, y + h / 2 + 13, 10, '#99a185');
      });
    }
    function drawJournal() {
      const c = progress(); panel('Il diario dell’isola', c ? 'CAPITOLO ' + (data.chapter + 1) + ' DI 4' : 'QUATTRO CAPITOLI, UNA NUOVA CASA');
      if (!c) { txt('La festa delle lanterne', 32, 121, 22, '#a99461'); wrap('Hai reso l’isola un posto felice. Ora puoi esplorare tutti i luoghi, completare l’album e arredare la casa come piace a te.', 32, 163, W - 64, 17); button('journal-settings', 'MUSICA E PERSONAGGIO', 30, H - 165, W - 60, 53, () => modal('pause'), 'cream'); button('festival-map', 'ESPLORA L’ISOLA', 30, H - 101, W - 60, 61, () => modal('map')); return; }
      txt(c.title, 32, 116, 19, '#6e8b6a'); const rowH = Math.min(57, (H - 255) / c.needs.length);
      c.needs.forEach(([k, n, label], i) => { const y = 154 + i * rowH, value = Math.min(n, data.stats[k] || 0), done = value >= n; circle(47, y + 8, 13, done ? '#8db293' : '#e7dec0'); txt(done ? '✓' : '•', 47, y + 8, 17, '#fff6df', 'center'); txt(label, 71, y + 1, 14, '#627c64'); rr(71, y + 15, W - 140, 5, 3, '#e2ddc3'); if (value) rr(71, y + 15, (W - 140) * value / n, 5, 3, '#a7bc8d'); txt(value + '/' + n, W - 43, y + 8, 12, '#8a9b7e', 'right'); });
      button('journal-settings', 'OPZIONI', 30, H - 165, 108, 53, () => modal('pause'), 'cream');
      const current = c.needs.find(([k, n]) => (data.stats[k] || 0) < n); if (current?.[0] === 'plantedFlowers') button('plant-goal', 'PIANTA UN FIORE', 148, H - 165, W - 178, 53, () => { close(); if (state === 'room') leaveRoom(); plantFlower(); }, 'cream');
      else if (current?.[0] === 'decorated') button('house-goal', 'VAI ALLA CASETTA', 148, H - 165, W - 178, 53, () => { travel(0); enterRoom(); }, 'cream');
      else button('album-goal', 'IL MIO ALBUM', 148, H - 165, W - 178, 53, () => { tab = 'album'; modal('bag'); }, 'cream');
      button('claim', ready() ? 'RITIRA IL PREMIO · +' + c.reward : 'ESPLORA CON CALMA', 30, H - 101, W - 60, 61, ready() ? claim : close, ready() ? 'green' : 'cream');
    }
    function itemDetail(kind) {
      if (kind === 'seeds') { say('Semi per il tuo orto', 'Vai ai piccoli riquadri di terra vicino a casa. Tocca per piantare, tocca ancora per annaffiare. I semi non finiscono mai davvero: Pip ti aiuterà.'); return; }
      const sell = () => { if (!data.inv[kind]) { notify('Non ne hai più nello zaino.'); return; } data.inv[kind]--; data.coins += ITEMS[kind].price; sound('coin'); save(); notify('Venduto! +' + ITEMS[kind].price + ' monetine'); close(); };
      const choices = [{ label: 'VENDI 1 · +' + ITEMS[kind].price + ' MONETE', action: sell }];
      if (kind === 'flower' && returnState !== 'room') choices.push({ label: 'PIANTA UN FIORE', action: () => { close(); plantFlower(); } });
      say(ITEMS[kind].name, 'Nello zaino: ' + data.inv[kind] + '. Puoi tenere i tuoi raccolti per creare arredi oppure venderli per qualche monetina.', choices);
    }
    function drawBag() {
      panel(tab === 'furniture' ? 'I tuoi arredi' : tab === 'album' ? 'Album delle scoperte' : 'Il tuo zainetto', tab === 'furniture' ? 'Scegli un arredo, poi tocca il pavimento.' : 'Le piccole cose rendono bella l’isola.');
      const tabs = [['items', 'OGGETTI'], ['furniture', 'ARREDI'], ['album', 'ALBUM']]; tabs.forEach(([id, name], i) => button('tab-' + id, name, 28 + i * (W - 56) / 3, 103, (W - 68) / 3, 48, () => { tab = id; page = 0; }, tab === id ? 'green' : 'cream'));
      const entries = tab === 'items' ? Object.keys(ITEMS).filter(k => data.inv[k] > 0).map(k => ({ id: k, name: ITEMS[k].name, count: data.inv[k] })) : tab === 'furniture' ? FURNITURE.filter(f => data.owned[f.id]).map(f => ({ ...f, count: data.owned[f.id] - data.room.filter(p => p.kind === f.id).length })) : data.album.map((name, i) => ({ id: 'discovery-' + i, name }));
      const perPage = 6, pages = Math.max(1, Math.ceil(entries.length / perPage)), h = Math.min(86, (H - 250) / 3), w = (W - 66) / 2; page = clamp(page, 0, pages - 1);
      entries.slice(page * perPage, page * perPage + perPage).forEach((e, i) => { const x = 28 + i % 2 * (w + 10), y = 165 + Math.floor(i / 2) * (h + 5); button('entry-' + e.id, '', x, y, w, h, () => {
          if (tab === 'items') itemDetail(e.id);
          else if (tab === 'furniture') { if (!e.count) { notify('È già nella tua casetta. Toccalo in casa per spostarlo.'); return; } if (returnState !== 'room') { say(e.name, 'È pronto per la tua casa. Vuoi andarci per scegliere il posto perfetto?', [{ label: 'VAI A CASA E ARREDA', action: () => { travel(0); enterRoom(); selectedFurniture = e.id; } }]); return; } selectedFurniture = e.id; close(); }
          else say('Una piccola scoperta', e.name + '. Puoi ritrovarla sull’isola: il tuo album conserva il ricordo, anche se vendi ciò che hai raccolto.');
        }, 'cream');
        if (tab === 'furniture') furniture(e.id, x + 27, y + h / 2 + 8, .45); else itemIcon(tab === 'items' ? e.id : /farfalla/i.test(e.name) ? 'bug' : /pesce|trota|carpa|persico|carassio|cavalluccio/i.test(e.name) ? 'fish' : /stella/i.test(e.name) ? 'star' : /conchiglia|mare|spirale/i.test(e.name) ? 'shell' : 'flower', x + 26, y + h / 2, .65);
        wrap(e.name, x + 51, y + h / 2 - 8, w - 61, 12, '#67816c', 2, 15); if (e.count !== undefined) txt('×' + e.count, x + w - 10, y + h - 12, 11, '#a19772', 'right');
      });
      if (!entries.length) wrap('Il tuo album si riempirà con i primi incontri e raccolti. Ogni scoperta resta qui.', 36, 190, W - 72, 16);
      button('page-back', '‹', 28, H - 79, 55, 48, () => { page = (page + pages - 1) % pages; }, 'cream'); txt((page + 1) + '/' + pages, 109, H - 55, 12, '#819274', 'center');
      button('bag-extra', tab === 'items' ? 'PIANTA UN FIORE' : tab === 'furniture' ? 'LA TUA CASA' : 'CHE BELLE SCOPERTE!', 143, H - 79, W - 226, 48, () => { if (tab === 'items' && returnState !== 'room') { close(); plantFlower(); } else if (tab === 'furniture') { travel(0); enterRoom(); } }, 'cream');
      button('page-next', '›', W - 83, H - 79, 55, 48, () => { page = (page + 1) % pages; }, 'cream');
    }
    function drawShop() {
      panel('L’emporio di Foglia', 'Materiali semplici, piccole cose fatte con cura.');
      const list = FURNITURE.slice(page * 3, page * 3 + 3), rowH = Math.min(92, (H - 221) / 3);
      list.forEach((f, i) => { const y = 111 + i * (rowH + 6); button('recipe-' + f.id, '', 28, y, W - 56, rowH, () => {
          say(f.name, 'Per crearlo: ' + Object.entries(f.cost).map(([k, n]) => n + ' ' + ITEMS[k].name.toLowerCase()).join(', ') + '. Oppure puoi comprarlo per ' + f.price + ' monetine.', [{ label: 'CREA CON I MATERIALI', action: () => { craft(f); modal('shop'); } }, { label: 'COMPRA · ' + f.price + ' MONETE', action: () => { craft(f, true); modal('shop'); } }]);
        }, 'cream'); furniture(f.id, 65, y + rowH / 2 + 14, .62); txt(f.name, 105, y + rowH / 2 - 10, 15, '#62816a'); txt(Object.entries(f.cost).map(([k, n]) => n + ' ' + ITEMS[k].name.toLowerCase()).join(' · '), 105, y + rowH / 2 + 13, 11, afford(f.cost) ? '#73a181' : '#a79a78'); });
      button('shop-prev', '‹', 28, H - 81, 54, 48, () => { page = (page + 2) % 3; }, 'cream');
      button('free-seeds', '6 SEMI IN REGALO', 92, H - 81, W - 184, 48, () => { data.inv.seeds = Math.min(9999, data.inv.seeds + 6); sound('collect'); save(); notify('Sei semi in più nel tuo zaino!'); }, 'green');
      button('shop-next', '›', W - 82, H - 81, 54, 48, () => { page = (page + 1) % 3; }, 'cream');
    }
    function drawDialog() {
      panel(dialog?.name || 'Una piccola pausa'); if (!dialog) return;
      if (dialog.npc) { circle(53, 88, 25, '#e1e6c9'); animal(dialog.npc, 53, 111, .62, 0); const hearts = data.friends[dialog.npc.id] || 1; txt('♥'.repeat(hearts) + '♡'.repeat(5 - hearts), 91, 87, 15, '#d49a9a'); }
      const choices = [...dialog.choices, { label: 'VA BENE!', action: close }], first = H - 32 - choices.length * 59;
      wrap(dialog.text, 34, 130, W - 68, 16, '#607b67', Math.max(2, Math.floor((first - 142) / 23)), 23);
      choices.forEach((c, i) => button('dialog-' + i, c.label, 30, first + i * 59, W - 60, 51, c.action, i === choices.length - 1 ? 'cream' : 'green'));
    }
    function drawFishing() {
      panel('Un momento sul molo', 'Niente esche da comprare, nessuna fretta.');
      const cy = Math.min(H * .48, H - 180); rr(31, 109, W - 62, H - 234, 18, '#afd6d0');
      for (let i = 0; i < 5; i++) line([[49, 130 + i * 40], [90, 132 + i * 40], [123, 130 + i * 40]], '#e9f6d95c', 2);
      for (let i = 0; i < 5; i++) rr(54 + i * 20, cy - 10, 18, 50, 2, i % 2 ? '#c8aa7f' : '#d8bc92');
      human(95, cy + 20, 1.1, 0); line([[109, cy - 8], [150, cy - 71]], '#907b57', 3); line([[150, cy - 71], [230, cy + 15]], '#f7efce', 1);
      const bite = fishing?.phase === 'bite'; circle(230, cy + 15, 5, '#e69f89'); for (let i = 0; i < (bite ? 3 : 1); i++) { g.strokeStyle = bite ? '#fff3bc' : '#e4edcc'; g.lineWidth = 2; g.beginPath(); g.ellipse(230, cy + 17, 13 + i * 10 + Math.sin(time * (bite ? 6 : 2)) * 3, 4 + i * 4, 0, 0, TAU); g.stroke(); }
      if (bite) txt('ECCOLO!', 230, cy - 30, 22, '#fff6d5', 'center');
      txt(bite ? 'I CERCHI! TOCCA PESCA' : 'ASPETTA I CERCHI SULL’ACQUA…', W / 2, H - 150, 13, '#739383', 'center');
      button('reel', bite ? 'PESCA!' : 'ASPETTA UN ATTIMO…', 31, H - 117, W - 62, 62, catchFish, bite ? 'green' : 'cream');
    }
    function drawLook() {
      g.fillStyle = '#b5d5be'; g.fillRect(0, 0, W, H); panel('Il tuo personaggio', 'Puoi cambiarlo quando vuoi.');
      const portraitY = Math.min(218, H * .39); circle(W / 2, portraitY - 20, 62, '#e7e6bd'); human(W / 2, portraitY + 35, 1.8, time * 1.3);
      const startY = H - 224, bw = (W - 70) / 3;
      [['skin', 'INCARNATO', 4], ['hair', 'CAPELLI', 5], ['shirt', 'VESTITO', 5]].forEach(([key, label, count], i) => button('look-' + key, label, 27 + i * (bw + 8), startY, bw, 58, () => { data.look[key] = (data.look[key] + 1) % count; sound('ui'); save(); }, 'cream'));
      button('look-done', 'MI PIACCIO COSÌ!', 30, H - 146, W - 60, 60, () => { state = started ? returnState === 'title' ? 'title' : returnState === 'room' ? 'room' : 'play' : 'title'; save(); });
      txt('Il cappello porta sempre un po’ di sole.', W / 2, H - 57, 12, '#8a9c7c', 'center', 500);
    }
    function drawPause() {
      panel('La tua pausa', 'I tuoi progressi sono salvati.'); animal(NPCS[0], W / 2 - 35, H * .44, 1.5); animal(NPCS[1], W / 2 + 38, H * .44, 1.5);
      button('resume', 'TORNA SULL’ISOLA', 30, H - 230, W - 60, 60, close);
      button('music', data.music ? 'MUSICA ON · TOCCA PER SPEGNERE' : 'MUSICA OFF · TOCCA PER ACCENDERE', 30, H - 158, W - 60, 54, () => { data.music = !data.music; save(); }, 'cream');
      button('wardrobe', 'CAMBIA PERSONAGGIO', 30, H - 92, W - 60, 54, () => { state = 'look'; focus = 1; }, 'cream');
    }
    function render() {
      buttons = [];
      if (state === 'title') { titleScreen(); return; } if (state === 'look') { drawLook(); return; }
      if (state === 'room' || returnState === 'room') drawRoom(); else { drawWorld(); if (state === 'play') hud(); }
      if (!['play', 'room'].includes(state)) { buttons = []; if (state === 'map') drawMap(); else if (state === 'journal') drawJournal(); else if (state === 'bag') drawBag(); else if (state === 'shop') drawShop(); else if (state === 'dialog') drawDialog(); else if (state === 'fishing') drawFishing(); else if (state === 'pause') drawPause(); }
      if (toastTime > 0) { const y = state === 'play' || state === 'room' ? H - 120 : 91; rr(20, y, W - 40, 39, 12, '#486b5eed'); wrap(toast, 32, y + 13, W - 64, 12, '#fff8dc', 2, 14); }
    }
    function worldTap(e) {
      if (state === 'room') { const f = roomFloor(), tx = Math.floor((e.x - f.x) / f.cell), ty = Math.floor((e.y - f.y) / f.row); if (tx < 0 || tx > 6 || ty < 0 || ty > 4) return; roomCursor = { x: tx, y: ty }; if (selectedFurniture) putFurniture(tx, ty); else { const placed = data.room.find(o => o.x === tx && o.y === ty); if (placed) say('Un posto diverso?', 'Puoi rimettere questo arredo nello zaino e scegliere un’altra casella.', [{ label: 'RIMETTI NELLO ZAINO', action: () => { data.room = data.room.filter(o => o !== placed); selectedFurniture = placed.kind; close(); save(); sound('ui'); } }]); } return; }
      if (state !== 'play' || e.y < 125 || e.y > H - 80) return;
      const x = e.x + camera.x, py = e.y + camera.y;
      const hits = [...objects, ...actors].map(o => {
        const tree = ['tree', 'palm'].includes(o.type), building = ['house', 'shop', 'hall', 'cabin', 'hut', 'windmill'].includes(o.type);
        const height = tree || building ? 112 : o.species ? 70 : o.type === 'log' || o.type === 'fish' ? 18 : 42, width = building ? 65 : tree ? 44 : o.species ? 24 : 23;
        const center = tree ? 63 : building ? 65 : o.species ? 35 : o.type === 'log' || o.type === 'fish' ? 4 : o.type === 'bug' ? 30 : 12;
        return { o, inside: Math.abs(x - o.x) < width && py >= o.y * YS - height && py <= o.y * YS + 12, score: Math.abs(x - o.x) + Math.abs(py - (o.y * YS - center)) * 1.3 + (tree ? 9 : 0) };
      }).filter(h => h.inside).sort((a, b) => a.score - b.score);
      const target = hits[0]?.o;
      if (target) { if (Math.hypot(target.x - P.x, target.y - P.y) < (['house', 'shop', 'hall'].includes(target.type) ? 118 : 87)) interact(target); else walkTo(target.x, target.y, target); }
      else walkTo(x, py / YS);
    }
    makeWorld(area);
    return {
      render, update: tick,
      onPointer(e) {
        if (e.type === 'down') { focusVisible = false; const b = buttons.find(b => hit(e, b)); pressed = { id: b?.id || null, state, x: e.x, y: e.y, pointer: e.id }; return; }
        if (e.type !== 'up' || !pressed || pressed.pointer !== e.id) return;
        const p = pressed; pressed = null; if (e.cancelled || p.state !== state || Math.hypot(e.x - p.x, e.y - p.y) > 24) return;
        if (p.id) { const b = buttons.find(b => b.id === p.id && hit(e, b)); if (b) { focus = 0; sound('ui'); b.action(); } }
        else worldTap(e);
      },
      onPress(k) {
        if (k === 'start') { if (state === 'title') begin(); else if (state === 'play' || state === 'room') modal('journal'); else close(); return; }
        if (k === 'select') { if (state === 'title') return; if (state === 'play') modal('map'); else { if (state === 'fishing') fishing = null; close(); } return; }
        if (k === 'b') { if (state === 'play' || state === 'room') { tab = state === 'room' ? 'furniture' : 'items'; modal('bag'); } else if (state !== 'title') { if (state === 'look') state = started ? returnState === 'room' ? 'room' : 'play' : 'title'; else { if (state === 'fishing') fishing = null; close(); } } return; }
        if (k === 'a') { if (state === 'title') begin(); else if (state === 'play') interact(nearby()); else if (state === 'room') { if (selectedFurniture) putFurniture(roomCursor.x, roomCursor.y); else { tab = 'furniture'; modal('bag'); } } else if (state === 'fishing') catchFish(); else if (buttons.length) { const b = buttons[clamp(focus, 0, buttons.length - 1)]; b.action(); } return; }
        if (['left', 'right', 'up', 'down'].includes(k) && state !== 'play') { focusVisible = true; if (state === 'room') { roomCursor.x = clamp(roomCursor.x + (k === 'right' ? 1 : k === 'left' ? -1 : 0), 0, 6); roomCursor.y = clamp(roomCursor.y + (k === 'down' ? 1 : k === 'up' ? -1 : 0), 0, 4); } else focus = (focus + (k === 'left' || k === 'up' ? -1 : 1) + buttons.length) % Math.max(1, buttons.length); }
      },
      onHide() { if (started && state !== 'title' && state !== 'pause') { if (state === 'play' || state === 'room') returnState = state; fishing = null; state = 'pause'; path = []; destination = null; pressed = null; save(); } },
      destroy: save,
      debug: {
        get state() { return state; }, get data() { return clone(data); }, get player() { return { ...P }; }, get camera() { return { ...camera }; }, get area() { return area; }, get path() { return clone(path); },
        get objects() { return clone(objects); }, get actors() { return clone(actors); }, get grid() { return clone(grid); }, get fishing() { return fishing && { ...fishing }; }, get buttons() { return buttons.map(({ id, x, y, w, h }) => ({ id, x, y, w, h })); },
        get layout() { return { width: W, height: H, tile: T, yScale: YS, room: roomFloor() }; }, get rendering() { return { outputScale: outputScale(), terrainScale: backdropScale, terrainWidth: backdrop?.width || 0, terrainHeight: backdrop?.height || 0, terrainPixels: backdrop ? backdrop.width * backdrop.height : 0 }; }, get goalReady() { return ready(); }, get selectedFurniture() { return selectedFurniture; }, get focusedButton() { return buttons[focus]?.id || null; },
      },
    };
  },
});
