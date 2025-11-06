# 🎮 GameHub Arcade Pro# 🎮 GameHub Arcade Pro



**Plateforme de jeux sociale complète** avec chat, amis, classements et administration.Plateforme de jeux sociale complète avec chat temps réel, système d'amis, classements avancés et support multijoueur.



🌐 **Demo Live**: [https://bryandrouet.github.io/GameHub-Arcade](https://bryandrouet.github.io/GameHub-Arcade)## ✨ Fonctionnalités



## ✨ Fonctionnalités### 🔐 Authentification & Sécurité

- ✅ Inscription/Connexion sécurisée avec JWT

### 🎯 Jeux- ✅ Vérification d'email par code à 6 chiffres

- Devine le nombre- ✅ Réinitialisation de mot de passe par email

- Memory- ✅ Unicité pseudo/email (sensible à la casse)

- Morpion (vs IA + Multijoueur)- ✅ Gestion multi-sessions (max 5 appareils)

- + Plus de jeux à venir !- ✅ Déconnexion globale de tous les appareils

- ✅ Protection anti-bot (rate limiting, détection comportement)

### 👥 Social- ✅ Liste de mots bannis pour pseudos/messages

- Système d'amis (demandes, acceptation)

- Groupes d'amis### 👥 Système Social

- Chat privé en temps réel- ✅ Ajout d'amis avec demandes

- Chat de groupe- ✅ Création de groupes d'amis

- Invitations à jouer- ✅ Chat privé en temps réel (WebSocket)

- ✅ Chat de groupe

### 🏆 Classements- ✅ Blocage d'utilisateurs

- Classements global / amis uniquement- ✅ Invitations à jouer dans les conversations

- Périodes: quotidien, hebdomadaire, mensuel, annuel- ✅ Recherche de joueurs

- Recherche de joueurs

- Statistiques personnelles### 🎯 Jeux & Classements

- ✅ Jeux existants: Morpion, Memory, Devine le nombre

### 👤 Profil- 🚧 Nouveaux jeux: Snake, 2048, Tetris, Puissance 4, Bataille navale

- Photo de profil- ✅ Système de favoris et épinglés (max 3)

- Modification compte (pseudo, email, mot de passe)- ✅ Classements global/annuel/mensuel/hebdomadaire/quotidien

- Jeux favoris et épinglés- ✅ Filtres: amis uniquement, période personnalisée

- Historique de parties- ✅ Recherche de joueur dans classements

- Suppression de compte- ✅ Mise en évidence du joueur connecté

- ✅ Sauvegarde de parties en cours

### 🔨 Administration (Bryan_Drouet)- ✅ Mode multijoueur temps réel

- Panel de gestion base de données

- Bannissement d'utilisateurs### � Profil Utilisateur

- Modération des messages- ✅ Photo de profil (upload & redimensionnement auto)

- Statistiques globales- ✅ Modification pseudo/email/mot de passe

- ✅ Statistiques détaillées (parties jouées, victoires, taux de réussite)

### 🛡️ Sécurité- ✅ Historique de jeux

- Authentification Firebase- ✅ Suppression de compte (données effacées)

- Modération automatique (mots bannis)

- Protection anti-spam### 🔨 Administration

- Validation des données- ✅ Panel admin pour compte `Bryan_Drouet`

- ✅ Bannissement d'utilisateurs

## 🚀 Installation- ✅ Modération des messages

- ✅ Logs d'activité

### 1. Configurer Firebase

### 📱 Progressive Web App (PWA)

1. Créez un projet sur [Firebase Console](https://console.firebase.google.com)- 🚧 Installation en tant qu'application

2. Activez **Authentication** (Email/Password)- 🚧 Notifications push (messages, invitations)

3. Activez **Realtime Database**- 🚧 Mode hors ligne

4. Activez **Storage**- ✅ Responsive (mobile/tablette/desktop)

5. Copiez la configuration Firebase

## 🛠️ Stack Technique

### 2. Configuration

### Backend

```bash- **Node.js** + Express.js

# Copiez le fichier de configuration- **MongoDB** avec Mongoose

cp config.example.js config.js- **Socket.IO** pour le temps réel

- **JWT** pour l'authentification

# Éditez config.js avec votre configuration Firebase- **Nodemailer** pour les emails

```- **Bcrypt** pour le hashage de mots de passe

- **Sharp** pour le traitement d'images

### 3. Règles Firebase

### Frontend

Appliquez les règles de sécurité depuis `firebase-rules.json` dans votre Realtime Database.- **HTML5** + **CSS3** + **JavaScript ES6+**

- **Socket.IO Client** pour le temps réel

### 4. Déploiement GitHub Pages- Service Worker pour le PWA (à implémenter)



```bash## 📦 Installation

git init

git add .### Prérequis

git commit -m "Initial commit"- Node.js (v16 ou supérieur)

git remote add origin https://github.com/BryanDrouet/GameHub-Arcade.git- MongoDB (local ou Atlas)

git branch -M main- Compte email (Gmail recommandé)

git push -u origin main

```### Étapes



Activez GitHub Pages dans Settings > Pages > Source: main branch1. **Installer les dépendances**

```bash

## 📱 Utilisationnpm install

```

1. **Inscription/Connexion** avec email et mot de passe

2. **Jouez** aux jeux disponibles2. **Configurer les variables d'environnement**

3. **Ajoutez des amis** et créez des groupes```powershell

4. **Chattez** en temps réel# Copier le fichier d'exemple

5. **Consultez** les classementscopy .env.example .env

```

### Compte Admin

Éditer `.env` et remplir:

Le compte avec le pseudo `Bryan_Drouet` aura automatiquement accès au **panel d'administration**.- `JWT_SECRET`: Générer avec `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

- `MONGODB_URI`: URL MongoDB

## 🏗️ Structure- `EMAIL_USER`: Votre email Gmail

- `EMAIL_PASSWORD`: Mot de passe d'application Gmail

```

games/3. **Démarrer MongoDB** (si local)

├── index.html          # Page principale```powershell

├── app.js              # Application principalemongod

├── styles.css          # Styles```

├── config.js           # Configuration Firebase (à créer)

├── admin.js            # Panel admin4. **Démarrer le serveur**

├── friends.js          # Système d'amis```powershell

├── chat.js             # Chat temps réel# Mode développement

├── leaderboard.js      # Classementsnpm run dev

├── moderation.js       # Modération

├── manifest.json       # PWA# Mode production

├── sw.js               # Service Workernpm start

├── firebase-rules.json # Règles Firebase```

└── games/              # Modules de jeux

    ├── guess.js5. **Ouvrir dans le navigateur**

    ├── memory.js- Serveur API: http://localhost:3000

    └── tictactoe.js- Client: Ouvrir `index.html` ou utiliser un serveur local

```

## 📁 Structure du Projet

## 🔧 Technologies

```

- **Frontend**: HTML5, CSS3, JavaScript ES6+games/

- **Backend**: Firebase (Auth + Realtime Database + Storage)├── server/

- **Hosting**: GitHub Pages│   ├── models/          # Modèles MongoDB

- **PWA**: Service Worker + Manifest│   ├── routes/          # Routes API REST

│   ├── middleware/      # Middleware Express

## 🌐 Compatible│   ├── socket/          # Gestion WebSocket

│   ├── utils/           # Utilitaires

- ✅ Chrome, Firefox, Edge, Safari│   └── server.js        # Point d'entrée

- ✅ Desktop, Tablette, Mobile├── games/               # Modules de jeux

- ✅ Tous réseaux (WiFi, 4G, 5G)├── uploads/             # Fichiers uploadés

- ✅ Mode hors ligne (PWA)├── index.html

├── app.js

## 📄 Licence├── styles.css

├── package.json

MIT License└── .env

```

## 🔑 Configuration Email (Gmail)

1. Activer l'authentification à 2 facteurs
2. Générer un mot de passe d'application:
   - Compte Google > Sécurité > Mots de passe des applications
3. Utiliser ce mot de passe dans `.env`

## 🚀 API Endpoints Principaux

### Auth
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `POST /api/auth/verify-email` - Vérifier email
- `POST /api/auth/logout-all` - Déconnecter tous appareils

### Users
- `GET /api/users/:userId` - Profil
- `PUT /api/users/profile` - Modifier profil
- `DELETE /api/users/account` - Supprimer compte

### Friends
- `POST /api/friends/request/:userId` - Demande d'ami
- `GET /api/friends` - Liste d'amis

### Messages
- `POST /api/messages/send` - Envoyer message
- `GET /api/messages/:userId` - Conversation

Voir documentation complète dans les fichiers de routes.

## 🛡️ Sécurité

- JWT avec expiration (7 jours)
- Bcrypt (12 rounds)
- Rate limiting par IP
- Détection anti-bot
- Validation des données
- Modération automatique
- CORS & Helmet.js

## 🐛 Dépannage

### Port déjà utilisé
```powershell
# Changer dans .env
PORT=3001
```

### MongoDB ne démarre pas
Utiliser MongoDB Atlas (cloud gratuit): https://www.mongodb.com/cloud/atlas

### Emails non envoyés
- Vérifier 2FA activé sur Gmail
- Utiliser mot de passe d'application (pas mot de passe Gmail)

## � TODO

- [ ] Implémenter PWA (manifest.json, service worker)
- [ ] Ajouter nouveaux jeux (Snake, 2048, Tetris, etc.)
- [ ] Compléter toutes les routes manquantes
- [ ] Ajouter tests unitaires
- [ ] Documentation API complète

## 📄 Licence

MIT License

---

**Note**: Projet en développement actif. Fonctionnalités backend créées, intégration frontend en cours.
