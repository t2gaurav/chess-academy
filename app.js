(function () {
  'use strict';

  const { parse, legalMoves, make, status, inCheck, kingSquare, mateMoves, chooseDefence, squareName } = Chess;
  const GLYPH = { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟' };
  const TEXT_STYLE = '︎';
  const STORE_KEY = 'checkmateAcademy.v1';
  const $ = id => document.getElementById(id);

  let progress = loadProgress();
  let li = 0, ti = 0, task, pos;
  let sel = null, targets = [], last = null, history = [];
  let locked = false, done = false, moves = 0;
  let hintMove = null, hintShow = 0, hintCount = 0;
  let mode = 'lessons'; // 'lessons', 'game' (Checkmate mode), 'local' (two players) or 'online'
  let flipped = false;  // true when Black is at the bottom (the Black player online)
  let level = 'hard';   // computer strength in 'game' mode: 'normal' (Play computer) or 'hard' (Checkmate mode)

  // Online play: 'idle' (not connected), 'waiting' (host waiting for a friend) or 'playing'
  const ONLINE_PREFIX = 'chessacademy-';
  const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I or O, which look like 1 and 0
  let peer = null, conn = null, online = 'idle', myColor = 'w';

  function loadProgress() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { return {}; }
  }
  function saveProgress() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(progress)); } catch (e) { /* private mode */ }
  }
  const key = (l, t) => LESSONS[l].id + ':' + t;
  const lessonDone = l => LESSONS[l].tasks.every((_, t) => progress[key(l, t)]);
  const firstOpenTask = l => {
    const t = LESSONS[l].tasks.findIndex((_, i) => !progress[key(l, i)]);
    return t < 0 ? 0 : t;
  };

  function loadTask() {
    task = LESSONS[li].tasks[ti];
    pos = parse(task.fen);
    sel = null; targets = []; last = null; history = [];
    locked = false; done = false; moves = 0;
    clearHint(); hintCount = 0;
    setMsg(task.type === 'practice' ? 'Take your time. Press Hint if you get stuck.' : 'Click a piece, then click where it should go.', 'info');
    render();
  }

  function setMsg(text, kind) {
    const el = $('message');
    el.textContent = text;
    el.className = kind || 'info';
  }

  function clearHint() { hintMove = null; hintShow = 0; }

  /* ---------- rendering ---------- */

  function render() {
    renderNav();
    renderCoach();
    renderBoard();
    renderStars();
  }

  function renderStars() {
    const total = LESSONS.reduce((n, l) => n + l.tasks.length, 0);
    const got = LESSONS.reduce((n, l, li2) => n + l.tasks.filter((_, t) => progress[key(li2, t)]).length, 0);
    $('stars').textContent = '⭐ ' + got + ' / ' + total;
  }

  function renderNav() {
    const nav = $('lessons');
    nav.innerHTML = '';
    LESSONS.forEach((lesson, l) => {
      const b = document.createElement('button');
      const n = lesson.tasks.filter((_, t) => progress[key(l, t)]).length;
      b.className = (l === li ? 'active ' : '') + (lessonDone(l) ? 'complete' : '');
      const label = document.createElement('span');
      label.textContent = (l + 1) + '. ' + lesson.title;
      const tick = document.createElement('span');
      tick.className = 'tick';
      tick.textContent = lessonDone(l) ? '✓' : n + '/' + lesson.tasks.length;
      b.append(label, tick);
      b.addEventListener('click', () => { li = l; ti = firstOpenTask(l); loadTask(); });
      nav.append(b);
    });
  }

  function goalText() {
    if (task.type === 'check') return 'Give check to the black king.';
    if (task.type === 'mate') return 'White to move. Checkmate in ' + task.n + '.';
    return 'Checkmate the black king.';
  }

  function renderCoach() {
    $('hintBtn').hidden = mode === 'local' || mode === 'online';
    $('lobby').hidden = mode !== 'online' || online === 'playing';
    $('lobbyChoices').hidden = online === 'waiting';
    $('codeShow').hidden = online !== 'waiting';
    if (mode === 'online') {
      const playing = online === 'playing';
      $('lessonTitle').textContent = 'Play online';
      $('teach').textContent = 'Play a friend on their own iPad. One of you creates a game and shares the 4-letter code, and the other joins with it. ' +
        'Whoever creates the game plays White first. Pawns promote to queens automatically.';
      $('taskCount').textContent = playing ? 'You are ' + (myColor === 'w' ? 'White' : 'Black') : 'Not connected';
      $('goal').textContent = !playing ? 'Create or join a game' : done ? 'Game over' : pos.turn === myColor ? 'Your move' : 'Waiting for your friend';
      $('moves').textContent = playing ? 'Moves played: ' + Math.ceil(moves / 2) : '';
      $('nextBtn').hidden = true;
      $('restartBtn').textContent = 'New game';
      $('restartBtn').disabled = !playing;
      $('undoBtn').disabled = true;
      return;
    }
    $('restartBtn').disabled = false;
    if (mode === 'game') {
      const wins = progress[level + ':wins'] || (level === 'hard' ? progress['game:wins'] : 0) || 0;
      $('lessonTitle').textContent = level === 'hard' ? 'Checkmate mode (hard)' : 'Play the computer';
      $('teach').textContent = level === 'hard'
        ? 'You play White. The computer plays Black and goes all out to checkmate you in as few moves as it can. ' +
          'Look after your king and checkmate it first! Pawns promote to queens automatically. Games won: ' + wins + '.'
        : 'You play White. This computer plays sensibly but makes mistakes, so look for chances to win its pieces and then checkmate. ' +
          'Ready for a real fight? Try Checkmate mode. Pawns promote to queens automatically. Games won: ' + wins + '.';
      $('taskCount').textContent = 'Full game';
      $('goal').textContent = 'Checkmate the black king.';
      $('moves').textContent = 'Your moves: ' + moves;
      $('nextBtn').hidden = true;
      $('restartBtn').textContent = 'New game';
      $('hintBtn').disabled = done || locked;
      $('undoBtn').disabled = locked || !history.length;
      return;
    }
    if (mode === 'local') {
      $('lessonTitle').textContent = 'Two players';
      $('teach').textContent = 'Play a friend on this screen. White is at the bottom and goes first, then pass the iPad. ' +
        'Pawns promote to queens automatically.';
      $('taskCount').textContent = 'Full game';
      $('goal').textContent = done ? 'Game over' : (pos.turn === 'w' ? 'White to move' : 'Black to move');
      $('moves').textContent = 'Moves played: ' + Math.ceil(moves / 2);
      $('nextBtn').hidden = true;
      $('restartBtn').textContent = 'New game';
      $('undoBtn').disabled = !history.length;
      return;
    }
    $('restartBtn').textContent = 'Restart';
    const lesson = LESSONS[li];
    $('lessonTitle').textContent = lesson.title;
    $('teach').textContent = lesson.teach;
    $('taskCount').textContent = 'Puzzle ' + (ti + 1) + ' of ' + lesson.tasks.length;
    $('goal').textContent = goalText();
    $('moves').textContent = task.type === 'practice' ? 'Moves so far: ' + moves : '';
    $('nextBtn').hidden = !done;
    $('hintBtn').disabled = done || locked;
    $('undoBtn').disabled = done || locked || !history.length;
  }

  function renderBoard() {
    const el = $('board');
    el.innerHTML = '';
    const checkSq = inCheck(pos) ? kingSquare(pos.b, pos.turn) : -1;
    for (let k = 0; k < 64; k++) {
      const i = flipped ? 63 - k : k;
      const r = i >> 3, c = i & 7;
      const p = pos.b[i];
      const sq = document.createElement('button');
      sq.className = 'sq ' + ((r + c) % 2 ? 'dark' : 'light');
      if (last && (last[0] === i || last[1] === i)) sq.classList.add('last');
      if (i === sel) sq.classList.add('sel');
      if (targets.includes(i)) sq.classList.add('target', ...(p ? ['cap'] : []));
      if (i === checkSq) sq.classList.add('check');
      if (hintMove && ((hintShow >= 1 && i === hintMove[0]) || (hintShow >= 2 && i === hintMove[1]))) sq.classList.add('hint');
      sq.setAttribute('aria-label', squareName(i) + (p ? ' ' + (p === p.toUpperCase() ? 'white ' : 'black ') + p.toUpperCase() : ''));
      if ((k & 7) === 0) sq.insertAdjacentHTML('beforeend', '<span class="coord rank">' + (8 - r) + '</span>');
      if (k >> 3 === 7) sq.insertAdjacentHTML('beforeend', '<span class="coord file">' + 'abcdefgh'[c] + '</span>');
      if (p) {
        const span = document.createElement('span');
        span.className = 'piece ' + (p === p.toUpperCase() ? 'w' : 'b');
        span.textContent = GLYPH[p.toUpperCase()] + TEXT_STYLE;
        sq.append(span);
      }
      sq.addEventListener('click', () => onSquare(i));
      el.append(sq);
    }
  }

  /* ---------- playing ---------- */

  function onSquare(i) {
    if (locked || done) return;
    if (mode === 'online' && (online !== 'playing' || pos.turn !== myColor)) return;
    if (sel !== null && targets.includes(i)) { tryMove(sel, i); return; }
    const p = pos.b[i];
    const mine = mode === 'local' ? pos.turn : mode === 'online' ? myColor : 'w';
    if (p && Chess.colorOf(p) === mine) {
      sel = i;
      targets = legalMoves(pos).filter(m => m[0] === i).map(m => m[1]);
    } else {
      sel = null; targets = [];
    }
    renderBoard();
  }

  const whiteMaterial = p => p.b.filter(x => x && x !== 'K' && x === x.toUpperCase()).length;

  function tryMove(from, to) {
    if (mode === 'game') return gameMove(from, to);
    if (mode === 'local') return localMove(from, to);
    if (mode === 'online') return onlineMove(from, to);
    const before = pos;
    history.push({ pos: before, last, moves });
    pos = make(before, [from, to]);
    last = [from, to];
    sel = null; targets = [];
    moves++;
    clearHint();
    const st = status(pos);

    if (st === 'checkmate') return win();
    if (task.type === 'check') {
      if (st === 'check') return win();
      return reject('That move does not attack the black king. Look for a piece that can see him.');
    }
    if (st === 'stalemate') {
      return reject('Stalemate! Black has no moves but is not in check, so it is a draw. Let us take that back.');
    }
    if (task.type === 'mate') {
      const left = task.n - (moves - 1);
      const forcing = mateMoves(before, left).some(m => m[0] === from && m[1] === to);
      if (!forcing) {
        return reject('Good try, but the black king can still escape. Look for a move that leaves him nowhere to go.');
      }
    }
    // Black replies
    locked = true;
    setMsg('Black is thinking...', 'info');
    render();
    setTimeout(() => reply(), 600);
  }

  function reply() {
    const m = chooseDefence(pos);
    const had = whiteMaterial(pos);
    pos = make(pos, m);
    last = m;
    locked = false;
    if (whiteMaterial(pos) < had) {
      setMsg('Oh no, Black captured one of your pieces! Press Undo to take your move back.', 'bad');
    } else if (task.type === 'mate') {
      setMsg('Black had to move there. Now finish it with checkmate!', 'info');
    } else {
      setMsg('Black moved. Your turn.', 'info');
    }
    render();
  }

  function reject(text) {
    locked = true;
    setMsg(text, 'bad');
    render();
    const t = task;
    setTimeout(() => { if (mode === 'lessons' && task === t) { locked = false; popHistory(); render(); } }, 1400);
  }

  function popHistory() {
    const h = history.pop();
    if (!h) return;
    pos = h.pos; last = h.last; moves = h.moves;
    sel = null; targets = []; clearHint();
  }

  function win() {
    done = true;
    locked = false;
    progress[key(li, ti)] = true;
    saveProgress();
    const mated = status(pos) === 'checkmate';
    setMsg((mated ? '♚ Checkmate! ' : 'Check! ') + (task.explain || 'Well done!'), 'good');
    render();
  }

  /* ---------- hints ---------- */

  function findHintMove() {
    if (task.type === 'check') {
      return legalMoves(pos).find(m => ['check', 'checkmate'].includes(status(make(pos, m)))) || null;
    }
    if (task.type === 'mate') {
      return mateMoves(pos, task.n - moves)[0] || null;
    }
    return mateMoves(pos, 1)[0] || mateMoves(pos, 2)[0] || null;
  }

  function hint() {
    if (done || locked) return;
    if (mode === 'game' && !hintMove) {
      const r = AI.bestMove(pos, 1200);
      hintMove = r && r.move;
    }
    if (!hintMove) hintMove = findHintMove();
    if (hintMove) {
      hintShow = Math.min(hintShow + 1, 2);
      sel = null; targets = [];
      setMsg(hintShow === 1 ? (task.hint || 'Look at the glowing piece.') + ' (The glowing piece is the one to move. Press Hint again to see where.)' : 'Move the glowing piece to the other glowing square.', 'info');
    } else {
      const tips = task.tips || [task.hint || 'Think about which squares the king can still use.'];
      setMsg(tips[hintCount % tips.length], 'info');
      hintCount++;
    }
    renderBoard();
  }

  /* ---------- Checkmate mode: a full game against the computer ---------- */

  let gameId = 0; // lets a stale computer reply be ignored after New game or a mode switch

  function newGame() {
    gameId++;
    pos = parse(Chess.START_FEN);
    sel = null; targets = []; last = null; history = [];
    locked = false; done = false; moves = 0;
    clearHint(); hintCount = 0;
    setMsg('You are White. Your move.', 'info');
    render();
  }

  const bareKings = p => p.b.every(x => !x || x.toUpperCase() === 'K');

  function gameMove(from, to) {
    history.push({ pos, last, moves });
    pos = make(pos, [from, to]);
    last = [from, to];
    sel = null; targets = [];
    moves++;
    clearHint();
    const st = status(pos);
    if (st === 'checkmate') return endGame('win');
    if (st === 'stalemate' || bareKings(pos)) return endGame('draw');
    computerTurn();
  }

  function computerTurn() {
    locked = true;
    setMsg('The computer is thinking...', 'info');
    render();
    const id = gameId;
    setTimeout(() => {
      if (id !== gameId || mode !== 'game') return;
      const r = level === 'hard' ? AI.bestMove(pos, 2000) : AI.casualMove(pos);
      pos = make(pos, r.move);
      last = r.move;
      locked = false;
      const st = status(pos);
      if (st === 'checkmate') return endGame('lose');
      if (st === 'stalemate' || bareKings(pos)) return endGame('draw');
      const danger = level === 'hard' && r.score > AI.MATE - 100;
      let text = st === 'check' ? 'Check! Move your king to safety, block, or capture the attacker.' : 'Your move.';
      if (danger) text += ' Careful, the computer can see a forced checkmate!';
      setMsg(text, st === 'check' || danger ? 'bad' : 'info');
      render();
    }, 60);
  }

  function endGame(result) {
    done = true;
    locked = false;
    if (result === 'win') {
      const wk = level + ':wins';
      progress[wk] = (progress[wk] || (level === 'hard' ? progress['game:wins'] : 0) || 0) + 1;
      saveProgress();
      setMsg('♚ Checkmate! You beat the computer in ' + moves + ' moves. Brilliant!', 'good');
    } else if (result === 'lose') {
      setMsg('The computer checkmated you on move ' + moves + '. Press Undo to try a different move, or New game.', 'bad');
    } else {
      setMsg('It is a draw. Press Undo to try a different move, or New game.', 'info');
    }
    render();
  }

  /* ---------- Two players on one screen ---------- */

  function newLocal() {
    pos = parse(Chess.START_FEN);
    sel = null; targets = []; last = null; history = [];
    locked = false; done = false; moves = 0;
    clearHint();
    setMsg('White to move. Click a piece, then click where it should go.', 'info');
    render();
  }

  function localMove(from, to) {
    history.push({ pos, last, moves });
    const mover = pos.turn === 'w' ? 'White' : 'Black';
    pos = make(pos, [from, to]);
    last = [from, to];
    sel = null; targets = [];
    moves++;
    const st = status(pos);
    if (st === 'checkmate') {
      done = true;
      setMsg('♚ Checkmate! ' + mover + ' wins in ' + Math.ceil(moves / 2) + ' moves. Well played both!', 'good');
    } else if (st === 'stalemate' || bareKings(pos)) {
      done = true;
      setMsg('It is a draw. Well played both! Press Undo to take back the last move, or New game.', 'info');
    } else {
      const next = pos.turn === 'w' ? 'White' : 'Black';
      setMsg((st === 'check' ? 'Check! ' : '') + next + ' to move.', st === 'check' ? 'bad' : 'info');
    }
    render();
  }

  /* ---------- Online: two iPads, one move at a time, through PeerJS ---------- */

  const PeerLib = () => window.Peer || (window.peerjs && window.peerjs.Peer);
  const colourName = c => (c === 'w' ? 'White' : 'Black');

  // Heartbeat: a closed tab or a lost connection does not always say goodbye
  let beat = null, lastSeen = 0, quiet = false;

  function startBeat() {
    stopBeat();
    lastSeen = Date.now(); quiet = false;
    beat = setInterval(() => {
      sendToFriend({ t: 'ping' });
      if (!quiet && online === 'playing' && Date.now() - lastSeen > 20000) {
        quiet = true;
        setMsg('Your friend seems to have gone quiet. Waiting for them...', 'bad');
      }
    }, 4000);
  }

  function stopBeat() {
    if (beat) clearInterval(beat);
    beat = null;
  }

  function closeOnline() {
    stopBeat();
    const p = peer, c = conn;
    peer = null; conn = null; online = 'idle';
    try { if (c) c.close(); } catch (e) { /* already closed */ }
    try { if (p) p.destroy(); } catch (e) { /* already closed */ }
  }

  function startOnline() {
    closeOnline();
    flipped = false;
    pos = parse(Chess.START_FEN);
    sel = null; targets = []; last = null; history = [];
    locked = false; done = false; moves = 0;
    setMsg('Tap Create a game and share the code, or type your friend\'s code and tap Join.', 'info');
    render();
  }

  function onlineProblem(err) {
    const type = err && err.type;
    closeOnline();
    if (type === 'peer-unavailable') setMsg('There is no game with that code. Check the code and try again.', 'bad');
    else if (type === 'network' || type === 'server-error' || type === 'socket-error' || type === 'socket-closed') {
      setMsg('Could not reach the online service. Check the internet connection and try again.', 'bad');
    } else setMsg('Something went wrong with the connection. Please try again.', 'bad');
    render();
  }

  function adopt(c) {
    conn = c;
    startBeat();
    c.on('data', onOnlineData);
    c.on('close', () => { if (conn === c) onFriendLeft(); });
    c.on('error', () => { if (conn === c) onFriendLeft(); });
  }

  function onFriendLeft() {
    if (mode !== 'online') return;
    closeOnline();
    done = true;
    setMsg('Your friend has left the game. Create or join another one.', 'bad');
    render();
  }

  function createGame(tries = 0) {
    const Lib = PeerLib();
    if (!Lib) { setMsg('Online play could not load. Check the internet connection and reload the page.', 'bad'); return; }
    closeOnline();
    let code = '';
    for (let i = 0; i < 4; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    setMsg('Setting up your game...', 'info');
    const p = new Lib(ONLINE_PREFIX + code);
    peer = p;
    p.on('open', () => {
      if (peer !== p) return;
      online = 'waiting';
      $('code').textContent = code;
      setMsg('Share the code with your friend. Waiting for them to join...', 'info');
      render();
    });
    p.on('connection', c => {
      if (peer !== p || conn) { c.close(); return; }
      adopt(c);
      if (c.open) beginOnlineGame('w'); else c.on('open', () => { if (conn === c) beginOnlineGame('w'); });
    });
    p.on('error', err => {
      if (peer !== p) return;
      if (err && err.type === 'unavailable-id' && tries < 5) createGame(tries + 1);
      else onlineProblem(err);
    });
  }

  function joinGame() {
    const Lib = PeerLib();
    if (!Lib) { setMsg('Online play could not load. Check the internet connection and reload the page.', 'bad'); return; }
    const code = $('codeInput').value.trim().toUpperCase();
    if (!/^[A-Z]{4}$/.test(code)) { setMsg('Type the 4 letters of your friend\'s code, then tap Join.', 'bad'); return; }
    closeOnline();
    setMsg('Joining...', 'info');
    const p = new Lib();
    peer = p;
    p.on('open', () => {
      if (peer !== p) return;
      const c = p.connect(ONLINE_PREFIX + code, { reliable: true });
      adopt(c);
      c.on('open', () => { if (conn === c) beginOnlineGame('b'); });
    });
    p.on('error', err => { if (peer === p) onlineProblem(err); });
  }

  function beginOnlineGame(color) {
    online = 'playing';
    myColor = color;
    flipped = color === 'b';
    pos = parse(Chess.START_FEN);
    sel = null; targets = []; last = null; history = [];
    locked = false; done = false; moves = 0;
    setMsg('You are ' + colourName(color) + '. ' + (color === 'w' ? 'You move first!' : 'White moves first.'), 'info');
    render();
  }

  function sendToFriend(data) {
    try { if (conn && conn.open) conn.send(data); } catch (e) { onFriendLeft(); }
  }

  function afterOnlineMove(mover) {
    const st = status(pos);
    if (st === 'checkmate') {
      done = true;
      setMsg(mover === myColor
        ? '♚ Checkmate! You win in ' + Math.ceil(moves / 2) + ' moves. Brilliant!'
        : 'Checkmate. Your friend wins this time. Press New game for a rematch.', mover === myColor ? 'good' : 'bad');
    } else if (st === 'stalemate' || bareKings(pos)) {
      done = true;
      setMsg('It is a draw. Well played both! Press New game for a rematch.', 'info');
    } else if (pos.turn === myColor) {
      setMsg((st === 'check' ? 'Check! ' : '') + 'Your move.', st === 'check' ? 'bad' : 'info');
    } else {
      setMsg('Waiting for your friend to move...', 'info');
    }
    render();
  }

  function onlineMove(from, to) {
    pos = make(pos, [from, to]);
    last = [from, to];
    sel = null; targets = [];
    moves++;
    sendToFriend({ t: 'move', from, to });
    afterOnlineMove(myColor);
  }

  function onOnlineData(d) {
    if (mode !== 'online' || online !== 'playing' || !d || typeof d !== 'object') return;
    lastSeen = Date.now();
    if (quiet) {
      quiet = false;
      setMsg('Your friend is back!', 'info');
      render();
    }
    if (d.t === 'move') {
      if (done || pos.turn === myColor) return;
      const ok = Number.isInteger(d.from) && Number.isInteger(d.to) &&
        legalMoves(pos).some(m => m[0] === d.from && m[1] === d.to);
      if (!ok) return; // ignore anything that is not a legal move
      pos = make(pos, [d.from, d.to]);
      last = [d.from, d.to];
      sel = null; targets = [];
      moves++;
      afterOnlineMove(myColor === 'w' ? 'b' : 'w');
    } else if (d.t === 'new') {
      beginOnlineGame(myColor === 'w' ? 'b' : 'w');
      setMsg('New game! Colours swapped: you are ' + colourName(myColor) + '.', 'info');
    }
  }

  function newOnlineGame() {
    if (online !== 'playing') return;
    sendToFriend({ t: 'new' });
    beginOnlineGame(myColor === 'w' ? 'b' : 'w');
    setMsg('New game! Colours swapped: you are ' + colourName(myColor) + '.', 'info');
  }

  function setMode(m, lvl = 'hard') {
    if (mode === 'online' && m !== 'online') closeOnline();
    mode = m;
    flipped = false;
    if (m === 'game') level = lvl;
    $('modeLessons').classList.toggle('active', m === 'lessons');
    $('modeGame').classList.toggle('active', m === 'game' && level === 'hard');
    $('modeNormal').classList.toggle('active', m === 'game' && level === 'normal');
    $('modeLocal').classList.toggle('active', m === 'local');
    $('modeOnline').classList.toggle('active', m === 'online');
    document.querySelector('main').classList.toggle('game', m !== 'lessons');
    gameId++;
    if (m === 'game') newGame();
    else if (m === 'local') newLocal();
    else if (m === 'online') startOnline();
    else loadTask();
  }

  /* ---------- navigation ---------- */

  function next() {
    if (ti + 1 < LESSONS[li].tasks.length) ti++;
    else if (li + 1 < LESSONS.length) { li++; ti = firstOpenTask(li); }
    else {
      loadTask();
      setMsg('You finished every lesson. Amazing! Pick any lesson to practise again.', 'good');
      return;
    }
    loadTask();
  }

  $('hintBtn').addEventListener('click', hint);
  $('undoBtn').addEventListener('click', () => {
    if (locked || (done && mode === 'lessons')) return;
    popHistory();
    done = false;
    setMsg('Move taken back. Try a different one.', 'info');
    render();
  });
  $('restartBtn').addEventListener('click', () => (mode === 'game' ? newGame() : mode === 'local' ? newLocal() : mode === 'online' ? newOnlineGame() : loadTask()));
  $('modeOnline').addEventListener('click', () => setMode('online'));
  window.addEventListener('pagehide', closeOnline); // tell the friend straight away when the page closes
  $('createBtn').addEventListener('click', () => createGame());
  $('joinBtn').addEventListener('click', joinGame);
  $('codeInput').addEventListener('keydown', e => { if (e.key === 'Enter') joinGame(); });
  $('modeLessons').addEventListener('click', () => setMode('lessons'));
  $('modeGame').addEventListener('click', () => setMode('game', 'hard'));
  $('modeNormal').addEventListener('click', () => setMode('game', 'normal'));
  $('modeLocal').addEventListener('click', () => setMode('local'));
  $('nextBtn').addEventListener('click', next);
  $('resetBtn').addEventListener('click', () => {
    if (confirm('Clear all stars and start from the beginning?')) {
      progress = {}; saveProgress(); li = 0; ti = 0; loadTask();
    }
  });

  // Start on the first lesson that is not finished yet
  // (the first two lessons are a warm-up, so a fresh start begins at lesson 3)
  const started = LESSONS.some((l, l2) => l.tasks.some((_, t) => progress[key(l2, t)]));
  li = started ? Math.max(0, LESSONS.findIndex((_, l) => !lessonDone(l))) : 2;
  ti = firstOpenTask(li);
  loadTask();
})();
