// Friends System - Friend requests, friends list, and blocking

import { validateUsername } from './moderation.js';

let db, auth, currentUserId;

export function initFriends(firebaseDb, firebaseAuth) {
  db = firebaseDb;
  auth = firebaseAuth;
  
  auth.onAuthStateChanged(user => {
    if (user) {
      currentUserId = user.uid;
      setupFriendsListener();
    }
  });
}

// Setup real-time listener for friend updates
function setupFriendsListener() {
  if (!currentUserId) return;
  
  // Listen to friend requests
  db.ref(`friendRequests/${currentUserId}`).on('value', snapshot => {
    updateFriendRequestsBadge(snapshot.numChildren());
  });
  
  // Listen to friends list
  db.ref(`friends/${currentUserId}`).on('value', snapshot => {
    const friendsList = [];
    snapshot.forEach(child => {
      friendsList.push({ id: child.key, ...child.val() });
    });
    updateFriendsList(friendsList);
  });
}

// Send friend request
export async function sendFriendRequest(recipientUsername) {
  if (!currentUserId) throw new Error('Not authenticated');
  
  const validation = validateUsername(recipientUsername);
  if (!validation.valid) {
    throw new Error(validation.errors[0]);
  }
  
  // Find user by username
  const usersSnapshot = await db.ref('users')
    .orderByChild('username')
    .equalTo(recipientUsername)
    .once('value');
  
  if (!usersSnapshot.exists()) {
    throw new Error('Utilisateur introuvable');
  }
  
  let recipientId = null;
  usersSnapshot.forEach(child => {
    recipientId = child.key;
  });
  
  if (recipientId === currentUserId) {
    throw new Error('Vous ne pouvez pas vous ajouter vous-même');
  }
  
  // Check if already friends
  const friendCheck = await db.ref(`friends/${currentUserId}/${recipientId}`).once('value');
  if (friendCheck.exists()) {
    throw new Error('Vous êtes déjà amis');
  }
  
  // Check if request already sent
  const requestCheck = await db.ref(`friendRequests/${recipientId}/${currentUserId}`).once('value');
  if (requestCheck.exists()) {
    throw new Error('Demande déjà envoyée');
  }
  
  // Check if recipient blocked you
  const blockCheck = await db.ref(`blocked/${recipientId}/${currentUserId}`).once('value');
  if (blockCheck.exists()) {
    throw new Error('Impossible d\'envoyer une demande');
  }
  
  // Get sender info
  const senderSnapshot = await db.ref(`users/${currentUserId}`).once('value');
  const senderData = senderSnapshot.val();
  
  // Send request
  await db.ref(`friendRequests/${recipientId}/${currentUserId}`).set({
    username: senderData.username,
    sentAt: Date.now()
  });
  
  // Send notification
  await db.ref(`notifications/${recipientId}`).push({
    type: 'friend_request',
    from: currentUserId,
    fromUsername: senderData.username,
    timestamp: Date.now(),
    read: false
  });
  
  return { success: true, message: 'Demande d\'ami envoyée' };
}

// Accept friend request
export async function acceptFriendRequest(requesterId) {
  if (!currentUserId) throw new Error('Not authenticated');
  
  // Get requester info
  const requesterSnapshot = await db.ref(`users/${requesterId}`).once('value');
  const requesterData = requesterSnapshot.val();
  
  // Get current user info
  const currentSnapshot = await db.ref(`users/${currentUserId}`).once('value');
  const currentData = currentSnapshot.val();
  
  // Add to both friends lists
  const updates = {};
  updates[`friends/${currentUserId}/${requesterId}`] = {
    username: requesterData.username,
    addedAt: Date.now(),
    status: 'offline'
  };
  updates[`friends/${requesterId}/${currentUserId}`] = {
    username: currentData.username,
    addedAt: Date.now(),
    status: 'offline'
  };
  
  // Remove friend request
  updates[`friendRequests/${currentUserId}/${requesterId}`] = null;
  
  await db.ref().update(updates);
  
  // Send notification
  await db.ref(`notifications/${requesterId}`).push({
    type: 'friend_accepted',
    from: currentUserId,
    fromUsername: currentData.username,
    timestamp: Date.now(),
    read: false
  });
  
  return { success: true, message: 'Ami ajouté' };
}

// Reject friend request
export async function rejectFriendRequest(requesterId) {
  if (!currentUserId) throw new Error('Not authenticated');
  
  await db.ref(`friendRequests/${currentUserId}/${requesterId}`).remove();
  
  return { success: true, message: 'Demande refusée' };
}

// Remove friend
export async function removeFriend(friendId) {
  if (!currentUserId) throw new Error('Not authenticated');
  
  const updates = {};
  updates[`friends/${currentUserId}/${friendId}`] = null;
  updates[`friends/${friendId}/${currentUserId}`] = null;
  
  await db.ref().update(updates);
  
  return { success: true, message: 'Ami supprimé' };
}

// Block user
export async function blockUser(userId) {
  if (!currentUserId) throw new Error('Not authenticated');
  
  const updates = {};
  
  // Remove from friends if exists
  updates[`friends/${currentUserId}/${userId}`] = null;
  updates[`friends/${userId}/${currentUserId}`] = null;
  
  // Add to blocked list
  updates[`blocked/${currentUserId}/${userId}`] = {
    blockedAt: Date.now()
  };
  
  await db.ref().update(updates);
  
  return { success: true, message: 'Utilisateur bloqué' };
}

// Unblock user
export async function unblockUser(userId) {
  if (!currentUserId) throw new Error('Not authenticated');
  
  await db.ref(`blocked/${currentUserId}/${userId}`).remove();
  
  return { success: true, message: 'Utilisateur débloqué' };
}

// Get friends list
export async function getFriendsList() {
  if (!currentUserId) return [];
  
  const snapshot = await db.ref(`friends/${currentUserId}`).once('value');
  const friends = [];
  
  snapshot.forEach(child => {
    friends.push({
      id: child.key,
      ...child.val()
    });
  });
  
  return friends;
}

// Get friend requests
export async function getFriendRequests() {
  if (!currentUserId) return [];
  
  const snapshot = await db.ref(`friendRequests/${currentUserId}`).once('value');
  const requests = [];
  
  snapshot.forEach(child => {
    requests.push({
      id: child.key,
      ...child.val()
    });
  });
  
  return requests;
}

// Get blocked users
export async function getBlockedUsers() {
  if (!currentUserId) return [];
  
  const snapshot = await db.ref(`blocked/${currentUserId}`).once('value');
  const blocked = [];
  
  snapshot.forEach(child => {
    blocked.push(child.key);
  });
  
  return blocked;
}

// Search users
export async function searchUsers(query) {
  if (!query || query.length < 2) return [];
  
  const snapshot = await db.ref('users')
    .orderByChild('username')
    .startAt(query)
    .endAt(query + '\uf8ff')
    .limitToFirst(10)
    .once('value');
  
  const users = [];
  snapshot.forEach(child => {
    if (child.key !== currentUserId) { // Don't include current user
      users.push({
        id: child.key,
        username: child.val().username
      });
    }
  });
  
  return users;
}

// Update friend status (online/offline)
export function updateOnlineStatus(status) {
  if (!currentUserId) return;
  
  db.ref(`users/${currentUserId}/status`).set(status);
  
  // Update status in all friends' lists
  db.ref(`friends`).once('value', snapshot => {
    snapshot.forEach(child => {
      const friendsList = child.val();
      if (friendsList && friendsList[currentUserId]) {
        db.ref(`friends/${child.key}/${currentUserId}/status`).set(status);
      }
    });
  });
}

// Update UI helpers
function updateFriendRequestsBadge(count) {
  const badge = document.getElementById('friend-requests-badge');
  if (badge) {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'inline-block' : 'none';
  }
}

function updateFriendsList(friends) {
  const container = document.getElementById('friends-list-container');
  if (!container) return;
  
  if (friends.length === 0) {
    container.innerHTML = '<p class="empty-state">Aucun ami pour le moment</p>';
    return;
  }
  
  container.innerHTML = friends.map(friend => `
    <div class="friend-item">
      <div class="friend-info">
        <div class="friend-avatar">👤</div>
        <div class="friend-details">
          <div class="friend-name">${escapeHtml(friend.username)}</div>
          <div class="friend-status ${friend.status || 'offline'}">${friend.status === 'online' ? '🟢 En ligne' : '⚫ Hors ligne'}</div>
        </div>
      </div>
      <div class="friend-actions">
        <button class="btn-icon" onclick="window.openChat('${friend.id}')" title="Envoyer un message">💬</button>
        <button class="btn-icon" onclick="window.sendGameInvite('${friend.id}')" title="Inviter à jouer">🎮</button>
        <button class="btn-icon danger" onclick="window.removeFriend('${friend.id}')" title="Supprimer">🗑️</button>
      </div>
    </div>
  `).join('');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Set online status when user connects/disconnects
auth.onAuthStateChanged(user => {
  if (user) {
    updateOnlineStatus('online');
    
    // Set offline on disconnect
    db.ref(`users/${user.uid}/status`).onDisconnect().set('offline');
  }
});
