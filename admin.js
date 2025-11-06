// Admin Panel - Database management and user moderation for Bryan_Drouet

import { ADMIN_USERNAME } from './config.js';

let db, auth, currentUserId, isAdmin = false;

export function initAdmin(firebaseDb, firebaseAuth) {
  db = firebaseDb;
  auth = firebaseAuth;
  
  auth.onAuthStateChanged(async user => {
    if (user) {
      currentUserId = user.uid;
      
      // Check if user is admin
      const userSnap = await db.ref(`users/${user.uid}/username`).once('value');
      const username = userSnap.val();
      
      if (username === ADMIN_USERNAME) {
        isAdmin = true;
        showAdminButton();
      }
    } else {
      isAdmin = false;
      hideAdminButton();
    }
  });
}

function showAdminButton() {
  const header = document.querySelector('.user-actions');
  if (!header || document.getElementById('admin-btn')) return;
  
  const adminBtn = document.createElement('button');
  adminBtn.id = 'admin-btn';
  adminBtn.className = 'action-btn';
  adminBtn.innerHTML = '🔨 Admin';
  adminBtn.onclick = openAdminPanel;
  
  header.insertBefore(adminBtn, header.firstChild);
}

function hideAdminButton() {
  const btn = document.getElementById('admin-btn');
  if (btn) btn.remove();
}

// Open admin panel modal
export function openAdminPanel() {
  if (!isAdmin) {
    alert('Accès refusé: vous n\'êtes pas administrateur');
    return;
  }
  
  const modal = document.createElement('div');
  modal.id = 'admin-modal';
  modal.className = 'admin-modal';
  modal.innerHTML = `
    <div class="admin-container">
      <div class="admin-header">
        <h2>🔨 Panel d'Administration</h2>
        <button class="close-btn" onclick="this.closest('.admin-modal').remove()">✕</button>
      </div>
      
      <div class="admin-tabs">
        <button class="admin-tab active" data-tab="users">Utilisateurs</button>
        <button class="admin-tab" data-tab="database">Base de données</button>
        <button class="admin-tab" data-tab="moderation">Modération</button>
        <button class="admin-tab" data-tab="stats">Statistiques</button>
      </div>
      
      <div class="admin-content">
        <!-- Users Tab -->
        <div id="admin-users" class="admin-panel active">
          <div class="admin-search">
            <input type="text" id="user-search" placeholder="Rechercher un utilisateur..." class="admin-input">
            <button onclick="window.searchUsersAdmin()" class="admin-btn">Rechercher</button>
          </div>
          <div id="users-list" class="admin-list"></div>
        </div>
        
        <!-- Database Tab -->
        <div id="admin-database" class="admin-panel">
          <div class="db-browser">
            <div class="db-path">
              <input type="text" id="db-path" placeholder="users/" class="admin-input" value="users/">
              <button onclick="window.loadDbPath()" class="admin-btn">Charger</button>
            </div>
            <div id="db-content" class="db-content"></div>
          </div>
        </div>
        
        <!-- Moderation Tab -->
        <div id="admin-moderation" class="admin-panel">
          <h3>Messages signalés</h3>
          <div id="reported-messages" class="admin-list"></div>
          
          <h3>Utilisateurs bannis</h3>
          <div id="banned-users" class="admin-list"></div>
        </div>
        
        <!-- Stats Tab -->
        <div id="admin-stats" class="admin-panel">
          <div class="stats-grid">
            <div class="stat-card-admin">
              <div class="stat-number" id="total-users">-</div>
              <div class="stat-label">Utilisateurs</div>
            </div>
            <div class="stat-card-admin">
              <div class="stat-number" id="total-games">-</div>
              <div class="stat-label">Parties jouées</div>
            </div>
            <div class="stat-card-admin">
              <div class="stat-number" id="online-users">-</div>
              <div class="stat-label">En ligne</div>
            </div>
            <div class="stat-card-admin">
              <div class="stat-number" id="total-messages">-</div>
              <div class="stat-label">Messages</div>
            </div>
          </div>
          
          <h3>Activité récente</h3>
          <div id="recent-activity" class="admin-list"></div>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  setupAdminEvents();
  loadAllUsers();
  loadAdminStats();
}

function setupAdminEvents() {
  // Tab switching
  document.querySelectorAll('.admin-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      
      document.querySelectorAll('.admin-tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
      
      btn.classList.add('active');
      document.getElementById(`admin-${tab}`).classList.add('active');
      
      if (tab === 'database') {
        loadDbPath();
      } else if (tab === 'moderation') {
        loadReportedContent();
      } else if (tab === 'stats') {
        loadAdminStats();
      }
    });
  });
}

// Load all users
async function loadAllUsers() {
  const snapshot = await db.ref('users').once('value');
  const users = [];
  
  snapshot.forEach(child => {
    users.push({
      id: child.key,
      ...child.val()
    });
  });
  
  displayUsers(users);
}

function displayUsers(users) {
  const container = document.getElementById('users-list');
  if (!container) return;
  
  if (users.length === 0) {
    container.innerHTML = '<p class="empty-state">Aucun utilisateur trouvé</p>';
    return;
  }
  
  container.innerHTML = users.map(user => `
    <div class="user-item-admin">
      <div class="user-info">
        <div class="user-name">${escapeHtml(user.username || 'Sans nom')}</div>
        <div class="user-email">${escapeHtml(user.email || 'N/A')}</div>
        <div class="user-meta">
          ID: ${user.id} | 
          Inscrit: ${new Date(user.createdAt || Date.now()).toLocaleDateString('fr-FR')} |
          Status: ${user.status === 'online' ? '🟢 En ligne' : '⚫ Hors ligne'} |
          ${user.banned ? '🚫 BANNI' : ''}
        </div>
      </div>
      <div class="user-actions-admin">
        <button onclick="window.viewUserDetails('${user.id}')" class="admin-btn-sm">👁️ Voir</button>
        ${!user.banned ? 
          `<button onclick="window.banUser('${user.id}')" class="admin-btn-sm danger">🚫 Bannir</button>` :
          `<button onclick="window.unbanUser('${user.id}')" class="admin-btn-sm success">✅ Débannir</button>`
        }
        <button onclick="window.deleteUserData('${user.id}')" class="admin-btn-sm danger">🗑️ Supprimer</button>
      </div>
    </div>
  `).join('');
}

// Search users
window.searchUsersAdmin = async function() {
  const query = document.getElementById('user-search').value.trim().toLowerCase();
  if (!query) {
    loadAllUsers();
    return;
  }
  
  const snapshot = await db.ref('users').once('value');
  const users = [];
  
  snapshot.forEach(child => {
    const user = child.val();
    if (
      user.username?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      child.key.includes(query)
    ) {
      users.push({
        id: child.key,
        ...user
      });
    }
  });
  
  displayUsers(users);
};

// View user details
window.viewUserDetails = async function(userId) {
  const snapshot = await db.ref(`users/${userId}`).once('value');
  const user = snapshot.val();
  
  if (!user) {
    alert('Utilisateur introuvable');
    return;
  }
  
  // Get user stats
  const friendsSnap = await db.ref(`friends/${userId}`).once('value');
  const friendsCount = friendsSnap.numChildren();
  
  const stats = user.stats || {};
  
  alert(`
Détails de l'utilisateur:

Pseudo: ${user.username}
Email: ${user.email}
ID: ${userId}
Inscrit le: ${new Date(user.createdAt).toLocaleString('fr-FR')}
Status: ${user.status || 'offline'}

Statistiques:
- Parties jouées: ${stats.gamesPlayed || 0}
- Score total: ${stats.totalScore || 0}
- Amis: ${friendsCount}

${user.banned ? '🚫 UTILISATEUR BANNI' : ''}
  `);
};

// Ban user
window.banUser = async function(userId) {
  if (!confirm('Êtes-vous sûr de vouloir bannir cet utilisateur ?')) return;
  
  try {
    await db.ref(`users/${userId}/banned`).set(true);
    await db.ref(`users/${userId}/bannedAt`).set(Date.now());
    await db.ref(`users/${userId}/bannedBy`).set(currentUserId);
    
    // Log action
    await db.ref('admin_logs').push({
      action: 'ban_user',
      targetUserId: userId,
      adminId: currentUserId,
      timestamp: Date.now()
    });
    
    alert('Utilisateur banni avec succès');
    loadAllUsers();
  } catch (error) {
    alert('Erreur: ' + error.message);
  }
};

// Unban user
window.unbanUser = async function(userId) {
  try {
    await db.ref(`users/${userId}/banned`).remove();
    await db.ref(`users/${userId}/bannedAt`).remove();
    await db.ref(`users/${userId}/bannedBy`).remove();
    
    // Log action
    await db.ref('admin_logs').push({
      action: 'unban_user',
      targetUserId: userId,
      adminId: currentUserId,
      timestamp: Date.now()
    });
    
    alert('Utilisateur débanni avec succès');
    loadAllUsers();
  } catch (error) {
    alert('Erreur: ' + error.message);
  }
};

// Delete user data
window.deleteUserData = async function(userId) {
  if (!confirm('⚠️ ATTENTION: Cette action supprimera TOUTES les données de cet utilisateur de façon IRRÉVERSIBLE. Continuer ?')) return;
  
  try {
    const updates = {};
    
    // Delete user account
    updates[`users/${userId}`] = null;
    
    // Delete friends relationships
    updates[`friends/${userId}`] = null;
    
    // Delete friend requests
    updates[`friendRequests/${userId}`] = null;
    
    // Delete messages (keep in chats for other users)
    // Note: This is simplified, in production you'd want to handle this more carefully
    
    // Delete notifications
    updates[`notifications/${userId}`] = null;
    
    // Delete blocked list
    updates[`blocked/${userId}`] = null;
    
    await db.ref().update(updates);
    
    // Log action
    await db.ref('admin_logs').push({
      action: 'delete_user',
      targetUserId: userId,
      adminId: currentUserId,
      timestamp: Date.now()
    });
    
    alert('Utilisateur supprimé avec succès');
    loadAllUsers();
  } catch (error) {
    alert('Erreur: ' + error.message);
  }
};

// Load database path
window.loadDbPath = async function() {
  const path = document.getElementById('db-path').value.trim();
  const container = document.getElementById('db-content');
  
  try {
    const snapshot = await db.ref(path).once('value');
    const data = snapshot.val();
    
    if (!data) {
      container.innerHTML = '<p class="empty-state">Aucune donnée à cet emplacement</p>';
      return;
    }
    
    // Display as formatted JSON
    container.innerHTML = `<pre class="json-viewer">${JSON.stringify(data, null, 2)}</pre>`;
  } catch (error) {
    container.innerHTML = `<p class="error-state">Erreur: ${error.message}</p>`;
  }
};

// Load reported content
async function loadReportedContent() {
  // Load reported messages
  const reportsSnap = await db.ref('reports').once('value');
  const reports = [];
  
  reportsSnap.forEach(child => {
    reports.push({
      id: child.key,
      ...child.val()
    });
  });
  
  const reportsContainer = document.getElementById('reported-messages');
  if (reports.length === 0) {
    reportsContainer.innerHTML = '<p class="empty-state">Aucun message signalé</p>';
  } else {
    reportsContainer.innerHTML = reports.map(report => `
      <div class="report-item">
        <div>Message: "${escapeHtml(report.message)}"</div>
        <div>Par: ${report.reportedBy} | Le: ${new Date(report.timestamp).toLocaleString('fr-FR')}</div>
        <button onclick="window.deleteReport('${report.id}')" class="admin-btn-sm">Supprimer</button>
      </div>
    `).join('');
  }
  
  // Load banned users
  const usersSnap = await db.ref('users').orderByChild('banned').equalTo(true).once('value');
  const bannedUsers = [];
  
  usersSnap.forEach(child => {
    bannedUsers.push({
      id: child.key,
      ...child.val()
    });
  });
  
  const bannedContainer = document.getElementById('banned-users');
  if (bannedUsers.length === 0) {
    bannedContainer.innerHTML = '<p class="empty-state">Aucun utilisateur banni</p>';
  } else {
    bannedContainer.innerHTML = bannedUsers.map(user => `
      <div class="banned-item">
        <div>${escapeHtml(user.username)} (${user.email})</div>
        <div>Banni le: ${new Date(user.bannedAt).toLocaleString('fr-FR')}</div>
        <button onclick="window.unbanUser('${user.id}')" class="admin-btn-sm success">Débannir</button>
      </div>
    `).join('');
  }
}

// Load admin statistics
async function loadAdminStats() {
  // Total users
  const usersSnap = await db.ref('users').once('value');
  document.getElementById('total-users').textContent = usersSnap.numChildren();
  
  // Total games played
  let totalGames = 0;
  usersSnap.forEach(child => {
    const stats = child.val().stats;
    if (stats) {
      totalGames += stats.gamesPlayed || 0;
    }
  });
  document.getElementById('total-games').textContent = totalGames;
  
  // Online users
  let onlineCount = 0;
  usersSnap.forEach(child => {
    if (child.val().status === 'online') {
      onlineCount++;
    }
  });
  document.getElementById('online-users').textContent = onlineCount;
  
  // Total messages
  const chatsSnap = await db.ref('chats').once('value');
  let messageCount = 0;
  chatsSnap.forEach(chatSnap => {
    const messages = chatSnap.val().messages;
    if (messages) {
      messageCount += Object.keys(messages).length;
    }
  });
  document.getElementById('total-messages').textContent = messageCount;
  
  // Recent activity
  const logsSnap = await db.ref('admin_logs').limitToLast(10).once('value');
  const logs = [];
  logsSnap.forEach(child => {
    logs.push(child.val());
  });
  logs.reverse();
  
  const activityContainer = document.getElementById('recent-activity');
  if (logs.length === 0) {
    activityContainer.innerHTML = '<p class="empty-state">Aucune activité récente</p>';
  } else {
    activityContainer.innerHTML = logs.map(log => `
      <div class="activity-item">
        <strong>${log.action}</strong> - ${new Date(log.timestamp).toLocaleString('fr-FR')}
        ${log.targetUserId ? `<br>Utilisateur: ${log.targetUserId}` : ''}
      </div>
    `).join('');
  }
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Add admin styles
const adminStyles = `
  .admin-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    backdrop-filter: blur(10px);
  }
  
  .admin-container {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    border-radius: 20px;
    width: 90%;
    max-width: 1200px;
    max-height: 90vh;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
  }
  
  .admin-header {
    padding: 20px 30px;
    border-bottom: 2px solid rgba(255, 255, 255, 0.1);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .admin-tabs {
    display: flex;
    gap: 5px;
    padding: 10px 20px;
    background: rgba(0, 0, 0, 0.2);
  }
  
  .admin-tab {
    padding: 10px 20px;
    background: transparent;
    border: none;
    color: white;
    cursor: pointer;
    border-radius: 10px;
    transition: all 0.3s;
  }
  
  .admin-tab:hover {
    background: rgba(255, 255, 255, 0.1);
  }
  
  .admin-tab.active {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }
  
  .admin-content {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
  }
  
  .admin-panel {
    display: none;
  }
  
  .admin-panel.active {
    display: block;
  }
  
  .admin-search, .db-path {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
  }
  
  .admin-input {
    flex: 1;
    padding: 12px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 10px;
    color: white;
    font-size: 14px;
  }
  
  .admin-btn, .admin-btn-sm {
    padding: 12px 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: none;
    border-radius: 10px;
    color: white;
    cursor: pointer;
    font-weight: 600;
    transition: transform 0.2s;
  }
  
  .admin-btn-sm {
    padding: 8px 15px;
    font-size: 12px;
  }
  
  .admin-btn:hover, .admin-btn-sm:hover {
    transform: scale(1.05);
  }
  
  .admin-btn-sm.danger {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  }
  
  .admin-btn-sm.success {
    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  }
  
  .admin-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  
  .user-item-admin, .report-item, .banned-item, .activity-item {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    padding: 15px;
  }
  
  .user-info {
    margin-bottom: 10px;
  }
  
  .user-name {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 5px;
  }
  
  .user-email, .user-meta {
    font-size: 12px;
    opacity: 0.7;
  }
  
  .user-actions-admin {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }
  
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
    margin-bottom: 30px;
  }
  
  .stat-card-admin {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 15px;
    padding: 20px;
    text-align: center;
  }
  
  .stat-card-admin .stat-number {
    font-size: 36px;
    font-weight: 700;
    margin-bottom: 10px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  
  .json-viewer {
    background: rgba(0, 0, 0, 0.3);
    padding: 20px;
    border-radius: 10px;
    color: #4ade80;
    font-family: 'Courier New', monospace;
    font-size: 12px;
    overflow-x: auto;
  }
  
  .empty-state {
    text-align: center;
    padding: 40px;
    opacity: 0.5;
  }
  
  .error-state {
    color: #f5576c;
    padding: 20px;
    text-align: center;
  }
`;

// Inject admin styles
if (!document.getElementById('admin-styles')) {
  const style = document.createElement('style');
  style.id = 'admin-styles';
  style.textContent = adminStyles;
  document.head.appendChild(style);
}
