// Configuration Firebase pour GameHub Arcade
// Copiez ce fichier vers config.js et remplissez avec vos vraies valeurs

const firebaseConfig = {
  apiKey: "VOTRE_API_KEY",
  authDomain: "votre-project.firebaseapp.com",
  databaseURL: "https://votre-project.firebasedatabase.app",
  projectId: "votre-project",
  storageBucket: "votre-project.appspot.com",
  messagingSenderId: "VOTRE_SENDER_ID",
  appId: "VOTRE_APP_ID"
};

// Compte administrateur
const ADMIN_USERNAME = "Bryan_Drouet";

// Export pour utilisation dans app.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { firebaseConfig, ADMIN_USERNAME };
}