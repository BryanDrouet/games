// Chat System - Private and group messaging with Firebase Realtime Database

import { isMessageBanned, filterMessage, messageLimiter } from './moderation.js';

let db, auth, currentUserId, currentUsername;
let activeChat = null;
let typingTimeouts = new Map();

export function initChat(firebaseDb, firebaseAuth) {
  db = firebaseDb;
  auth = firebaseAuth;
  
  auth.onAuthStateChanged(user => {
    if (user) {
      currentUserId = user.uid;
      db.ref(`users/${user.uid}/username`).once('value').then(snap => {
        currentUsername = snap.val();
      });
      setupChatListeners();
    }
  });
}

// Setup real-time chat listeners
function setupChatListeners() {
  if (!currentUserId) return;
  
  // Listen to unread messages count
  db.ref(`chats`).on('value', snapshot => {
    let unreadCount = 0;
    
    snapshot.forEach(chatSnap => {
      const chat = chatSnap.val();
      const chatId = chatSnap.key;
      
      // Check if user is participant
      if (chat.participants && chat.participants[currentUserId]) {
        // Count unread messages
        if (chat.messages) {
          Object.values(chat.messages).forEach(msg => {
            if (msg.senderId !== currentUserId && !msg.read) {
              unreadCount++;
            }
          });
        }
      }
    });
    
    updateUnreadBadge(unreadCount);
  });
}

// Generate chat ID for private chat (consistent ordering)
function getChatId(userId1, userId2) {
  return [userId1, userId2].sort().join('_');
}

// Send private message
export async function sendPrivateMessage(recipientId, message) {
  if (!currentUserId) throw new Error('Not authenticated');
  
  if (!message || message.trim().length === 0) {
    throw new Error('Le message ne peut pas être vide');
  }
  
  // Check rate limit
  if (!messageLimiter.check(currentUserId)) {
    throw new Error('Vous envoyez trop de messages. Attendez un peu.');
  }
  
  // Check for banned words
  if (isMessageBanned(message)) {
    throw new Error('Votre message contient des mots interdits');
  }
  
  // Filter message
  const filteredMessage = filterMessage(message);
  
  const chatId = getChatId(currentUserId, recipientId);
  
  // Get recipient username
  const recipientSnap = await db.ref(`users/${recipientId}/username`).once('value');
  const recipientUsername = recipientSnap.val();
  
  // Create/update chat
  const updates = {};
  
  // Ensure chat exists
  updates[`chats/${chatId}/participants/${currentUserId}`] = {
    username: currentUsername,
    joinedAt: Date.now()
  };
  updates[`chats/${chatId}/participants/${recipientId}`] = {
    username: recipientUsername,
    joinedAt: Date.now()
  };
  updates[`chats/${chatId}/type`] = 'private';
  updates[`chats/${chatId}/lastMessage`] = {
    text: filteredMessage,
    senderId: currentUserId,
    senderName: currentUsername,
    timestamp: Date.now()
  };
  
  // Add message
  const messageId = db.ref(`chats/${chatId}/messages`).push().key;
  updates[`chats/${chatId}/messages/${messageId}`] = {
    senderId: currentUserId,
    senderName: currentUsername,
    text: filteredMessage,
    timestamp: Date.now(),
    read: false
  };
  
  await db.ref().update(updates);
  
  // Send notification
  await db.ref(`notifications/${recipientId}`).push({
    type: 'new_message',
    from: currentUserId,
    fromUsername: currentUsername,
    chatId: chatId,
    message: filteredMessage.substring(0, 50),
    timestamp: Date.now(),
    read: false
  });
  
  return { success: true, chatId, messageId };
}

// Send group message
export async function sendGroupMessage(groupId, message) {
  if (!currentUserId) throw new Error('Not authenticated');
  
  if (!message || message.trim().length === 0) {
    throw new Error('Le message ne peut pas être vide');
  }
  
  // Check rate limit
  if (!messageLimiter.check(currentUserId)) {
    throw new Error('Vous envoyez trop de messages. Attendez un peu.');
  }
  
  // Check for banned words
  if (isMessageBanned(message)) {
    throw new Error('Votre message contient des mots interdits');
  }
  
  // Filter message
  const filteredMessage = filterMessage(message);
  
  // Verify user is in group
  const memberCheck = await db.ref(`groups/${groupId}/members/${currentUserId}`).once('value');
  if (!memberCheck.exists()) {
    throw new Error('Vous n\'êtes pas membre de ce groupe');
  }
  
  // Add message
  const updates = {};
  const messageId = db.ref(`groups/${groupId}/messages`).push().key;
  
  updates[`groups/${groupId}/messages/${messageId}`] = {
    senderId: currentUserId,
    senderName: currentUsername,
    text: filteredMessage,
    timestamp: Date.now()
  };
  
  updates[`groups/${groupId}/lastMessage`] = {
    text: filteredMessage,
    senderId: currentUserId,
    senderName: currentUsername,
    timestamp: Date.now()
  };
  
  await db.ref().update(updates);
  
  // Notify all group members except sender
  const membersSnap = await db.ref(`groups/${groupId}/members`).once('value');
  const notificationPromises = [];
  
  membersSnap.forEach(child => {
    if (child.key !== currentUserId) {
      notificationPromises.push(
        db.ref(`notifications/${child.key}`).push({
          type: 'group_message',
          from: currentUserId,
          fromUsername: currentUsername,
          groupId: groupId,
          message: filteredMessage.substring(0, 50),
          timestamp: Date.now(),
          read: false
        })
      );
    }
  });
  
  await Promise.all(notificationPromises);
  
  return { success: true, groupId, messageId };
}

// Mark messages as read
export async function markMessagesAsRead(chatId) {
  if (!currentUserId) return;
  
  const messagesSnap = await db.ref(`chats/${chatId}/messages`).once('value');
  const updates = {};
  
  messagesSnap.forEach(child => {
    const msg = child.val();
    if (msg.senderId !== currentUserId && !msg.read) {
      updates[`chats/${chatId}/messages/${child.key}/read`] = true;
    }
  });
  
  if (Object.keys(updates).length > 0) {
    await db.ref().update(updates);
  }
}

// Get chat messages
export async function getChatMessages(chatId, limit = 50) {
  const snapshot = await db.ref(`chats/${chatId}/messages`)
    .orderByChild('timestamp')
    .limitToLast(limit)
    .once('value');
  
  const messages = [];
  snapshot.forEach(child => {
    messages.push({
      id: child.key,
      ...child.val()
    });
  });
  
  return messages;
}

// Get user's chats list
export async function getUserChats() {
  if (!currentUserId) return [];
  
  const snapshot = await db.ref('chats').once('value');
  const chats = [];
  
  snapshot.forEach(child => {
    const chat = child.val();
    if (chat.participants && chat.participants[currentUserId]) {
      chats.push({
        id: child.key,
        ...chat
      });
    }
  });
  
  // Sort by last message timestamp
  chats.sort((a, b) => {
    const aTime = a.lastMessage?.timestamp || 0;
    const bTime = b.lastMessage?.timestamp || 0;
    return bTime - aTime;
  });
  
  return chats;
}

// Listen to chat messages in real-time
export function listenToChat(chatId, callback) {
  if (!currentUserId) return;
  
  activeChat = chatId;
  
  const messagesRef = db.ref(`chats/${chatId}/messages`);
  messagesRef.on('child_added', snapshot => {
    callback({
      type: 'message',
      data: {
        id: snapshot.key,
        ...snapshot.val()
      }
    });
  });
  
  // Listen to typing indicators
  const typingRef = db.ref(`chats/${chatId}/typing`);
  typingRef.on('value', snapshot => {
    const typing = snapshot.val() || {};
    const typingUsers = Object.entries(typing)
      .filter(([userId, isTyping]) => userId !== currentUserId && isTyping)
      .map(([userId]) => userId);
    
    callback({
      type: 'typing',
      data: typingUsers
    });
  });
  
  // Mark messages as read
  markMessagesAsRead(chatId);
}

// Stop listening to chat
export function stopListeningToChat(chatId) {
  if (chatId) {
    db.ref(`chats/${chatId}/messages`).off();
    db.ref(`chats/${chatId}/typing`).off();
    
    // Clear typing indicator
    if (currentUserId) {
      db.ref(`chats/${chatId}/typing/${currentUserId}`).remove();
    }
  }
  activeChat = null;
}

// Send typing indicator
export function sendTypingIndicator(chatId, isTyping) {
  if (!currentUserId) return;
  
  if (isTyping) {
    db.ref(`chats/${chatId}/typing/${currentUserId}`).set(true);
    
    // Auto-clear after 3 seconds
    if (typingTimeouts.has(chatId)) {
      clearTimeout(typingTimeouts.get(chatId));
    }
    
    const timeout = setTimeout(() => {
      db.ref(`chats/${chatId}/typing/${currentUserId}`).remove();
    }, 3000);
    
    typingTimeouts.set(chatId, timeout);
  } else {
    db.ref(`chats/${chatId}/typing/${currentUserId}`).remove();
  }
}

// Delete message (sender only)
export async function deleteMessage(chatId, messageId) {
  if (!currentUserId) throw new Error('Not authenticated');
  
  const messageSnap = await db.ref(`chats/${chatId}/messages/${messageId}`).once('value');
  const message = messageSnap.val();
  
  if (!message) {
    throw new Error('Message introuvable');
  }
  
  if (message.senderId !== currentUserId) {
    throw new Error('Vous ne pouvez supprimer que vos propres messages');
  }
  
  await db.ref(`chats/${chatId}/messages/${messageId}`).remove();
  
  return { success: true };
}

// Send game invite
export async function sendGameInvite(recipientId, gameType) {
  if (!currentUserId) throw new Error('Not authenticated');
  
  const chatId = getChatId(currentUserId, recipientId);
  
  // Get recipient username
  const recipientSnap = await db.ref(`users/${recipientId}/username`).once('value');
  const recipientUsername = recipientSnap.val();
  
  const updates = {};
  const messageId = db.ref(`chats/${chatId}/messages`).push().key;
  
  updates[`chats/${chatId}/messages/${messageId}`] = {
    senderId: currentUserId,
    senderName: currentUsername,
    type: 'game_invite',
    gameType: gameType,
    timestamp: Date.now(),
    read: false,
    status: 'pending' // pending, accepted, declined
  };
  
  updates[`chats/${chatId}/participants/${currentUserId}`] = {
    username: currentUsername,
    joinedAt: Date.now()
  };
  updates[`chats/${chatId}/participants/${recipientId}`] = {
    username: recipientUsername,
    joinedAt: Date.now()
  };
  
  await db.ref().update(updates);
  
  // Send notification
  await db.ref(`notifications/${recipientId}`).push({
    type: 'game_invite',
    from: currentUserId,
    fromUsername: currentUsername,
    gameType: gameType,
    chatId: chatId,
    messageId: messageId,
    timestamp: Date.now(),
    read: false
  });
  
  return { success: true, chatId, messageId };
}

// Respond to game invite
export async function respondToGameInvite(chatId, messageId, accept) {
  if (!currentUserId) throw new Error('Not authenticated');
  
  const status = accept ? 'accepted' : 'declined';
  await db.ref(`chats/${chatId}/messages/${messageId}/status`).set(status);
  
  if (accept) {
    // Create game session here
    const messageSnap = await db.ref(`chats/${chatId}/messages/${messageId}`).once('value');
    const invite = messageSnap.val();
    
    // TODO: Create multiplayer game session
    // This will be implemented in the game modules
  }
  
  return { success: true, status };
}

// UI Update helpers
function updateUnreadBadge(count) {
  const badge = document.getElementById('chat-unread-badge');
  if (badge) {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'inline-block' : 'none';
  }
}

// Open chat modal
export function openChatModal(recipientId) {
  const chatId = getChatId(currentUserId, recipientId);
  
  // Create chat UI
  const modal = document.createElement('div');
  modal.id = 'chat-modal';
  modal.className = 'chat-modal';
  modal.innerHTML = `
    <div class="chat-container">
      <div class="chat-header">
        <h3>💬 Chat</h3>
        <button class="close-btn" onclick="this.closest('.chat-modal').remove()">✕</button>
      </div>
      <div class="chat-messages" id="chat-messages-${chatId}"></div>
      <div class="typing-indicator" id="typing-indicator-${chatId}" style="display:none">
        <span>...</span> est en train d'écrire
      </div>
      <div class="chat-input">
        <input type="text" id="chat-input-${chatId}" placeholder="Écrivez votre message..." maxlength="500">
        <button class="send-btn" onclick="window.sendChatMessage('${chatId}')">Envoyer</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Load messages
  listenToChat(chatId, (event) => {
    if (event.type === 'message') {
      appendMessage(chatId, event.data);
    } else if (event.type === 'typing') {
      updateTypingIndicator(chatId, event.data);
    }
  });
  
  // Setup input events
  const input = document.getElementById(`chat-input-${chatId}`);
  let typingTimer;
  
  input.addEventListener('input', () => {
    sendTypingIndicator(chatId, true);
    
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
      sendTypingIndicator(chatId, false);
    }, 1000);
  });
  
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      window.sendChatMessage(chatId);
    }
  });
}

function appendMessage(chatId, message) {
  const container = document.getElementById(`chat-messages-${chatId}`);
  if (!container) return;
  
  const isOwn = message.senderId === currentUserId;
  const messageEl = document.createElement('div');
  messageEl.className = `chat-message ${isOwn ? 'own' : 'other'}`;
  
  const time = new Date(message.timestamp).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  });
  
  messageEl.innerHTML = `
    <div class="message-sender">${escapeHtml(message.senderName)}</div>
    <div class="message-text">${escapeHtml(message.text)}</div>
    <div class="message-time">${time}</div>
  `;
  
  container.appendChild(messageEl);
  container.scrollTop = container.scrollHeight;
}

function updateTypingIndicator(chatId, typingUsers) {
  const indicator = document.getElementById(`typing-indicator-${chatId}`);
  if (!indicator) return;
  
  if (typingUsers.length > 0) {
    indicator.style.display = 'block';
  } else {
    indicator.style.display = 'none';
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Global function for sending messages (called from HTML)
window.sendChatMessage = async function(chatId) {
  const input = document.getElementById(`chat-input-${chatId}`);
  const message = input.value.trim();
  
  if (!message) return;
  
  try {
    // Get recipient ID from chat ID
    const parts = chatId.split('_');
    const recipientId = parts[0] === currentUserId ? parts[1] : parts[0];
    
    await sendPrivateMessage(recipientId, message);
    input.value = '';
    sendTypingIndicator(chatId, false);
  } catch (error) {
    alert(error.message);
  }
};

window.openChat = openChatModal;
