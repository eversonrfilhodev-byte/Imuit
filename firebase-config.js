// ==================== FIREBASE CONFIGURATION ====================
// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCvJVifSO3SjFuVcUdsyWqNtV5oduWOjSk",
  authDomain: "imuit-169fd.firebaseapp.com",
  projectId: "imuit-169fd",
  storageBucket: "imuit-169fd.firebasestorage.app",
  messagingSenderId: "265567395624",
  appId: "1:265567395624:web:891f0c14dc086cd8f1fa1d",
  measurementId: "G-YK07KYSXB9"
};

// Initialize Firebase
let app, auth, db;

function initFirebase() {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    console.log('✅ Firebase inicializado com sucesso!');
    return { app, auth, db };
  } catch (error) {
    console.error('❌ Erro ao inicializar Firebase:', error);
    console.warn('⚠️ A aplicação funcionará em modo offline com localStorage.');
    return { app: null, auth: null, db: null };
  }
}

// Export functions para uso global
window.firebaseConfig = firebaseConfig;
window.initFirebase = initFirebase;
window.getFirebaseInstances = () => ({ app, auth, db });
