(function () {
  const firebaseConfig = {
    apiKey: 'AIzaSyCvJVifSO3SjFuVcUdsyWqNtV5oduWOjSk',
    authDomain: 'imuit-169fd.firebaseapp.com',
    databaseURL: 'https://imuit-169fd-default-rtdb.firebaseio.com',
    projectId: 'imuit-169fd',
    storageBucket: 'imuit-169fd.firebasestorage.app',
    messagingSenderId: '265567395624',
    appId: '1:265567395624:web:891f0c14dc086cd8f1fa1d',
    measurementId: 'G-YK07KYSXB9'
  };

  let firebaseApp = null;
  let firebaseDb = null;
  let firebaseAuth = null;

  function initFirebase() {
    if (!window.firebase) {
      console.warn('⚠️ Firebase SDK não carregado. Aplicação em modo local/offline.');
      return null;
    }

    if (firebaseApp) {
      return { app: firebaseApp, db: firebaseDb, auth: firebaseAuth };
    }

    try {
      firebaseApp = window.firebase.initializeApp(firebaseConfig);
      firebaseDb = window.firebase.database ? window.firebase.database() : null;
      firebaseAuth = window.firebase.auth ? window.firebase.auth() : null;
      console.log('✅ Firebase inicializado com sucesso');
      return { app: firebaseApp, db: firebaseDb, auth: firebaseAuth };
    } catch (error) {
      console.error('❌ Erro ao inicializar Firebase:', error);
      return null;
    }
  }

  window.firebaseConfig = firebaseConfig;
  window.initFirebase = initFirebase;
  window.getFirebase = () => ({ app: firebaseApp, db: firebaseDb, auth: firebaseAuth });

  document.addEventListener('DOMContentLoaded', () => {
    const fb = initFirebase();
    if (fb && fb.db) {
      console.log('Banco Firebase pronto:', fb.db);
    } else {
      console.warn('Aplicação em modo local/offline - sem conexão ativa com Firebase.');
    }
  });
})();
