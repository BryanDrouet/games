// Devine le nombre — simple game
export function initGuess(container, ctx){
  const root = document.createElement('div');
  root.innerHTML = `
    <h2>Devine le nombre</h2>
    <p>Je choisis un nombre entre 1 et 100, à toi de deviner en le moins d'essais possible.</p>
    <div class="controls">
      <input id="g-name" placeholder="Pseudo (facultatif)" />
      <button id="g-restart">Nouvelle partie</button>
    </div>
    <div id="g-area" class="board"></div>
  `;
  container.appendChild(root);

  let secret = null, attempts = 0;
  const area = root.querySelector('#g-area');
  const nameInput = root.querySelector('#g-name');

  function start(){
    secret = Math.floor(Math.random()*100)+1;
    attempts = 0;
    area.innerHTML = `
      <div class="guess-interface">
        <div class="guess-input-group">
          <input id="g-input" type="number" min="1" max="100" placeholder="Votre nombre..." />
          <button id="g-go">🎯 Essayer</button>
        </div>
        <div class="attempts-counter">Essais: <span id="attempts">0</span></div>
      </div>
      <div id="g-log" class="guess-log"></div>
    `;
    root.querySelector('#g-go').addEventListener('click', tryIt);
    root.querySelector('#g-input').addEventListener('keydown', e=>{if(e.key==='Enter') tryIt();});
  }

  function tryIt(){
    const v = Number(root.querySelector('#g-input').value);
    if (!v || v<1 || v>100) return;
    attempts++;
    
    // Update attempts counter
    root.querySelector('#attempts').textContent = attempts;
    
    const log = root.querySelector('#g-log');
    const result = document.createElement('div');
    result.className = 'guess-result';
    result.style.animationDelay = '0s';
    
    if (v===secret){
      result.innerHTML = `
        <div class="success-message">
          🎉 Bravo ! Trouvé en ${attempts} essai${attempts > 1 ? 's' : ''} !
          <div class="score-display">Score: ${1000 - attempts} points</div>
        </div>
      `;
      result.classList.add('success');
      // submit score
      const score = 1000 - attempts;
      import('../app.js').then(m=>m.submitScore('guess', score, nameInput.value));
    } else {
      const hint = v < secret ? 'plus grand' : 'plus petit';
      const emoji = v < secret ? '⬆️' : '⬇️';
      result.innerHTML = `${emoji} ${v} est trop ${v < secret ? 'petit' : 'grand'}, essayez ${hint} !`;
      result.classList.add(v < secret ? 'too-low' : 'too-high');
    }
    
    log.appendChild(result);
    root.querySelector('#g-input').value = '';
    root.querySelector('#g-input').focus();
  }

  root.querySelector('#g-restart').addEventListener('click', start);
  start();
}
