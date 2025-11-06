// Moderation System - Banned words and content filtering

const BANNED_WORDS = [
  // Insultes
  'connard', 'salaud', 'pute', 'batard', 'enculé', 'fdp', 'pd',
  // Vulgarités
  'merde', 'putain', 'bordel', 'chier',
  // Discriminations
  'raciste', 'nazi', 'fasciste',
  // Spam patterns
  'viagra', 'casino', 'crypto', 'bitcoin'
];

// Check if username contains banned words (case-insensitive for banned words check)
export function isUsernameBanned(username) {
  if (!username || username.length < 3) return true;
  
  const lowerUsername = username.toLowerCase();
  
  for (const word of BANNED_WORDS) {
    if (lowerUsername.includes(word.toLowerCase())) {
      return true;
    }
  }
  
  return false;
}

// Check if message contains banned words
export function isMessageBanned(message) {
  if (!message || message.trim().length === 0) return true;
  
  const lowerMessage = message.toLowerCase();
  
  for (const word of BANNED_WORDS) {
    if (lowerMessage.includes(word.toLowerCase())) {
      return true;
    }
  }
  
  return false;
}

// Filter message by replacing banned words with asterisks
export function filterMessage(message) {
  if (!message) return '';
  
  let filtered = message;
  
  for (const word of BANNED_WORDS) {
    const regex = new RegExp(word, 'gi');
    filtered = filtered.replace(regex, '*'.repeat(word.length));
  }
  
  return filtered;
}

// Check for spam patterns
export function isSpamPattern(text) {
  const lowerText = text.toLowerCase();
  
  // Check for repeated characters
  if (/(.)\1{5,}/.test(text)) return true;
  
  // Check for excessive caps
  const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
  if (capsRatio > 0.7 && text.length > 10) return true;
  
  // Check for URLs (basic)
  if (/https?:\/\//i.test(text)) return true;
  
  return false;
}

// Validate username format
export function validateUsername(username) {
  const errors = [];
  
  if (!username || username.length < 3) {
    errors.push('Le pseudo doit faire au moins 3 caractères');
  }
  
  if (username.length > 20) {
    errors.push('Le pseudo ne peut pas dépasser 20 caractères');
  }
  
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    errors.push('Le pseudo ne peut contenir que des lettres, chiffres, tirets et underscores');
  }
  
  if (isUsernameBanned(username)) {
    errors.push('Ce pseudo contient des mots interdits');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Validate email format
export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Rate limiting helper (client-side)
class RateLimiter {
  constructor(maxRequests, windowMs) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = new Map();
  }
  
  check(key) {
    const now = Date.now();
    const userRequests = this.requests.get(key) || [];
    
    // Remove old requests outside the window
    const validRequests = userRequests.filter(time => now - time < this.windowMs);
    
    if (validRequests.length >= this.maxRequests) {
      return false; // Rate limit exceeded
    }
    
    validRequests.push(now);
    this.requests.set(key, validRequests);
    return true;
  }
  
  reset(key) {
    this.requests.delete(key);
  }
}

// Rate limiters for different actions
export const messageLimiter = new RateLimiter(10, 60000); // 10 messages per minute
export const friendRequestLimiter = new RateLimiter(5, 300000); // 5 requests per 5 minutes
export const gameStartLimiter = new RateLimiter(20, 60000); // 20 games per minute
