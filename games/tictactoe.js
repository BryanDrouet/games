// Tic-Tac-Toe with local vs AI and simple multiplayer using Firebase RTDB
export function initTic(container, ctx){
  const root = document.createElement('div');
  root.innerHTML = `
    <h2>Morpion</h2>
    <div class="controls">
      <input id="t-name" placeholder="Pseudo (facultatif)" />
      <button id="t-local">Jouer vs IA</button>
      <button id="t-create">Créer une partie (multijoueur)</button>
      <input id="t-room" placeholder="Room id (rejoindre)" />
      <button id="t-join">Rejoindre</button>
    </div>
    <div id="t-area"></div>
  `;
  container.appendChild(root);

  const area = root.querySelector('#t-area');
  const db = ctx.db;

  // local vs simple random AI
  root.querySelector('#t-local').addEventListener('click', ()=>startLocal());

  function renderBoard(board, onClick){
    area.innerHTML = '';
    const g = document.createElement('div'); g.className='tictactoe-grid';
    board.forEach((v,i)=>{
      const c = document.createElement('div'); c.className='cell'; c.textContent = v||'';
      c.addEventListener('click', ()=>onClick(i));
      g.appendChild(c);
    });
    area.appendChild(g);
  }

  function checkWin(b){
    const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (const L of lines){
      if (b[L[0]] && b[L[0]]===b[L[1]] && b[L[1]]===b[L[2]]) return b[L[0]];
    }
    if (b.every(Boolean)) return 'draw';
    return null;
  }

  function startLocal(){
    let board = Array(9).fill(null); let turn='X';
    function click(i){
      if (board[i]) return; board[i]=turn; const res = checkWin(board); renderBoard(board, click);
      if (res){ finish(res); return; }
      // AI move
      turn = 'O';
      const empties = board.map((v,i)=>v?null:i).filter(x=>x!==null);
      const choice = empties[Math.floor(Math.random()*empties.length)];
      if (choice!==undefined) board[choice]='O';
      const res2 = checkWin(board); renderBoard(board, click);
      if (res2) finish(res2);
      turn='X';
    }
    function finish(r){
      area.insertAdjacentHTML('beforeend', `<p class="center">Résultat: ${r}</p>`);
      if (r==='X'){
        import('../app.js').then(m=>m.submitScore('tictactoe', 1500, root.querySelector('#t-name').value));
      }
    }
    renderBoard(board, click);
  }

  // Multiplayer: create / join
  root.querySelector('#t-create').addEventListener('click', async ()=>{
    const ref = db.ref('ttt-rooms').push({board: Array(9).fill(null), turn:'X', players:{owner:ctx.uid||'anon'}, created:Date.now()});
    const id = ref.key;
    root.querySelector('#t-room').value = id;
    watchRoom(id);
  });
  root.querySelector('#t-join').addEventListener('click', ()=>{ const id = root.querySelector('#t-room').value.trim(); if(id) watchRoom(id); });

  let currentRef = null;
  function watchRoom(id){
    if (currentRef) currentRef.off();
    const r = db.ref(`ttt-rooms/${id}`);
    currentRef = r;
    r.on('value', snap=>{
      const data = snap.val();
      if (!data) return area.innerHTML = '<p>Partie introuvable</p>';
      renderBoard(data.board, i=>{
        // attempt move
        const uid = ctx.uid || 'anon';
        r.transaction(state=>{
          if (!state) return state;
          if (state.board[i]) return state; // occupied
          // find player symbol
          const symbol = state.players && state.players[uid] ? state.players[uid] : (Object.keys(state.players||{}).length===1 && !Object.values(state.players).includes(uid) ? 'O' : (state.players[uid]||'X'));
          if (state.turn!==symbol) return state;
          state.board[i]=symbol; state.turn = symbol==='X'?'O':'X';
          return state;
        });
      });
      // display result if any
      const res = checkWin(data.board);
      if (res){ area.insertAdjacentHTML('beforeend', `<p class="center">Résultat: ${res}</p>`); }
    });
  }

}
