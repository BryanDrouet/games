// Memory matching pairs
export function initMemory(container, ctx){
  const root = document.createElement('div');
  root.innerHTML = `
    <h2>Memory</h2>
    <p>Retourne les paires le plus vite possible.</p>
    <div class="controls">
      <input id="m-name" placeholder="Pseudo (facultatif)" />
      <button id="m-start">Démarrer</button>
    </div>
    <div id="m-area" class="cards"></div>
  `;
  container.appendChild(root);

  const area = root.querySelector('#m-area');
  let cards = [], flipped = [], matches = 0, moves = 0;

  function makeCards(){
    const icons = ['🍎','🍌','🍇','🍓','🍒','🍍','🥝','🍑'];
    cards = icons.concat(icons).sort(()=>Math.random()-0.5).map((v,i)=>({id:i,val:v,flipped:false,found:false}));
  }

  function render(){
    area.innerHTML = '';
    cards.forEach((c, index)=>{
      const el = document.createElement('div');
      el.className = 'card';
      el.style.animationDelay = `${index * 0.1}s`;
      el.classList.add('card-entrance');
      
      if (c.flipped || c.found) {
        el.textContent = c.val;
        el.classList.add(c.found ? 'card-found' : 'card-flipped');
      }
      
      el.addEventListener('click', ()=>onClick(c.id));
      area.appendChild(el);
    });
  }

  function onClick(id){
    const c = cards.find(x=>x.id===id);
    if (!c || c.flipped || c.found || flipped.length===2) return;
    c.flipped = true; flipped.push(c); render();
    if (flipped.length===2){
      moves++;
      if (flipped[0].val===flipped[1].val){
        flipped[0].found = flipped[1].found = true; matches +=1; flipped = [];
        if (matches===8){
          // Win
          const score = 2000 - moves*10;
          import('../app.js').then(m=>m.submitScore('memory', score, root.querySelector('#m-name').value));
        }
      } else {
        setTimeout(()=>{flipped.forEach(x=>x.flipped=false); flipped=[]; render();},600);
      }
    }
  }

  root.querySelector('#m-start').addEventListener('click', ()=>{makeCards(); matches=0; moves=0; render();});
  // auto start
  makeCards(); render();
}
