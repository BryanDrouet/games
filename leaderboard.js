// Advanced Leaderboard System - Multi-period, friends filter, search

let db, auth, currentUserId;
let currentPeriod = 'all';
let currentScope = 'global';
let searchQuery = '';
let friendsList = [];

export function initLeaderboard(firebaseDb, firebaseAuth) {
  db = firebaseDb;
  auth = firebaseAuth;
  
  auth.onAuthStateChanged(async user => {
    if (user) {
      currentUserId = user.uid;
      
      // Load friends list
      const friendsSnap = await db.ref(`friends/${user.uid}`).once('value');
      friendsList = [];
      friendsSnap.forEach(child => {
        friendsList.push(child.key);
      });
      
      setupLeaderboardFilters();
      loadLeaderboards();
    }
  });
}

function setupLeaderboardFilters() {
  // Period filter
  const periodFilter = document.getElementById('period-filter');
  if (periodFilter) {
    periodFilter.addEventListener('change', (e) => {
      currentPeriod = e.target.value;
      loadLeaderboards();
    });
  }
  
  // Scope filter
  const scopeFilter = document.getElementById('scope-filter');
  if (scopeFilter) {
    scopeFilter.addEventListener('change', (e) => {
      currentScope = e.target.value;
      loadLeaderboards();
    });
  }
  
  // Search
  const searchInput = document.getElementById('player-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase();
      loadLeaderboards();
    });
  }
  
  // Settings toggle
  const settingsBtn = document.getElementById('leaderboard-settings');
  const filtersDiv = document.getElementById('leaderboard-filters');
  if (settingsBtn && filtersDiv) {
    settingsBtn.addEventListener('click', () => {
      filtersDiv.classList.toggle('hidden');
    });
  }
}

export async function loadLeaderboards() {
  const boardsContainer = document.getElementById('boards');
  if (!boardsContainer) return;
  
  boardsContainer.innerHTML = '<div class="loading-animation"><div class="spinner"></div><span>Chargement...</span></div>';
  
  const games = ['guess', 'memory', 'tictactoe'];
  const boardsHtml = [];
  
  for (const game of games) {
    const scores = await getGameScores(game);
    const filteredScores = filterScores(scores);
    const sortedScores = sortScores(filteredScores);
    const topScores = sortedScores.slice(0, 10);
    
    boardsHtml.push(createBoardHtml(game, topScores));
  }
  
  boardsContainer.innerHTML = boardsHtml.join('');
}

async function getGameScores(game) {
  const now = Date.now();
  const timeRanges = {
    all: 0,
    daily: now - (24 * 60 * 60 * 1000),
    weekly: now - (7 * 24 * 60 * 60 * 1000),
    monthly: now - (30 * 24 * 60 * 60 * 1000),
    yearly: now - (365 * 24 * 60 * 60 * 1000)
  };
  
  const minTime = timeRanges[currentPeriod] || 0;
  
  const snapshot = await db.ref(`leaderboards/${game}`)
    .orderByChild('ts')
    .startAt(minTime)
    .once('value');
  
  const scores = [];
  snapshot.forEach(child => {
    scores.push({
      id: child.key,
      ...child.val()
    });
  });
  
  return scores;
}

function filterScores(scores) {
  let filtered = scores;
  
  // Filter by scope (friends only)
  if (currentScope === 'friends') {
    filtered = filtered.filter(score => 
      score.userId === currentUserId || friendsList.includes(score.userId)
    );
  }
  
  // Filter by search query
  if (searchQuery) {
    filtered = filtered.filter(score => 
      score.name?.toLowerCase().includes(searchQuery) ||
      score.userId?.toLowerCase().includes(searchQuery)
    );
  }
  
  return filtered;
}

function sortScores(scores) {
  // Group by user and keep best score
  const userBestScores = {};
  
  scores.forEach(score => {
    const userId = score.userId || 'anonymous';
    if (!userBestScores[userId] || score.score > userBestScores[userId].score) {
      userBestScores[userId] = score;
    }
  });
  
  // Convert to array and sort
  return Object.values(userBestScores).sort((a, b) => b.score - a.score);
}

function createBoardHtml(game, scores) {
  const gameNames = {
    guess: '🎯 Devine le nombre',
    memory: '🧠 Memory',
    tictactoe: '⚔️ Morpion'
  };
  
  if (scores.length === 0) {
    return `
      <div class="board">
        <h3>${gameNames[game]}</h3>
        <div class="board-content">
          <p class="empty-state">Aucun score pour cette période</p>
        </div>
      </div>
    `;
  }
  
  const scoresHtml = scores.map((score, index) => {
    const isCurrentUser = score.userId === currentUserId;
    const rank = index + 1;
    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
    
    return `
      <div class="score-item ${isCurrentUser ? 'highlight' : ''}">
        <span class="rank">${medal}</span>
        <span class="player-name">${escapeHtml(score.name || 'Anonyme')}${isCurrentUser ? ' (Vous)' : ''}</span>
        <span class="player-score">${score.score}</span>
      </div>
    `;
  }).join('');
  
  return `
    <div class="board">
      <h3>${gameNames[game]}</h3>
      <div class="board-content">
        ${scoresHtml}
      </div>
    </div>
  `;
}

// Submit score with period tracking
export async function submitScore(game, score) {
  if (!currentUserId) {
    throw new Error('Vous devez être connecté pour sauvegarder votre score');
  }
  
  // Get username
  const userSnap = await db.ref(`users/${currentUserId}/username`).once('value');
  const username = userSnap.val() || 'Joueur';
  
  const payload = {
    score,
    name: username,
    userId: currentUserId,
    ts: Date.now()
  };
  
  // Add to leaderboard
  await db.ref(`leaderboards/${game}`).push(payload);
  
  // Update user stats
  await db.ref(`users/${currentUserId}/stats`).transaction(stats => {
    if (!stats) stats = { gamesPlayed: 0, totalScore: 0, games: {} };
    
    stats.gamesPlayed = (stats.gamesPlayed || 0) + 1;
    stats.totalScore = (stats.totalScore || 0) + score;
    
    if (!stats.games) stats.games = {};
    if (!stats.games[game]) stats.games[game] = { played: 0, bestScore: 0 };
    
    stats.games[game].played++;
    if (score > stats.games[game].bestScore) {
      stats.games[game].bestScore = score;
    }
    
    return stats;
  });
  
  // Update last played
  await db.ref(`users/${currentUserId}/lastPlayed`).set({
    game,
    timestamp: Date.now()
  });
  
  // Reload leaderboards
  loadLeaderboards();
  
  return { success: true };
}

// Get user rank in a game
export async function getUserRank(game) {
  if (!currentUserId) return null;
  
  const scores = await getGameScores(game);
  const sortedScores = sortScores(scores);
  
  const userIndex = sortedScores.findIndex(score => score.userId === currentUserId);
  
  if (userIndex === -1) return null;
  
  return {
    rank: userIndex + 1,
    total: sortedScores.length,
    score: sortedScores[userIndex].score,
    percentile: Math.round(((sortedScores.length - userIndex) / sortedScores.length) * 100)
  };
}

// Get global statistics
export async function getGlobalStats() {
  const stats = {
    totalPlayers: 0,
    totalGames: 0,
    topPlayer: null,
    mostPlayedGame: null
  };
  
  // Get total players
  const usersSnap = await db.ref('users').once('value');
  stats.totalPlayers = usersSnap.numChildren();
  
  // Get total games and most played
  const gameStats = { guess: 0, memory: 0, tictactoe: 0 };
  
  for (const game of ['guess', 'memory', 'tictactoe']) {
    const gameSnap = await db.ref(`leaderboards/${game}`).once('value');
    const count = gameSnap.numChildren();
    gameStats[game] = count;
    stats.totalGames += count;
  }
  
  stats.mostPlayedGame = Object.entries(gameStats)
    .sort((a, b) => b[1] - a[1])[0][0];
  
  // Get top player (by total score across all games)
  const playerScores = {};
  
  for (const game of ['guess', 'memory', 'tictactoe']) {
    const scores = await getGameScores(game);
    scores.forEach(score => {
      if (score.userId) {
        playerScores[score.userId] = (playerScores[score.userId] || 0) + score.score;
      }
    });
  }
  
  const topPlayerId = Object.entries(playerScores)
    .sort((a, b) => b[1] - a[1])[0]?.[0];
  
  if (topPlayerId) {
    const topPlayerSnap = await db.ref(`users/${topPlayerId}/username`).once('value');
    stats.topPlayer = {
      id: topPlayerId,
      username: topPlayerSnap.val(),
      totalScore: playerScores[topPlayerId]
    };
  }
  
  return stats;
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Export for global access
window.loadLeaderboards = loadLeaderboards;
