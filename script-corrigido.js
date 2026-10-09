// ==========================================
// INICIALIZAÇÃO DO FIREBASE (SDK COMPAT) - CORRIGIDA
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyCvJVifSO3SjFuVcUdsyWqNtV5oduWOjSk",
  authDomain: "imuit-169fd.firebaseapp.com",
  databaseURL: "https://imuit-169fd-default-rtdb.firebaseio.com",
  projectId: "imuit-169fd",
  storageBucket: "imuit-169fd.firebasestorage.app",
  messagingSenderId: "265567395624",
  appId: "1:265567395624:web:891f0c14dc086cd8f1fa1d",
  measurementId: "G-YK07KYSXB9"
};

// Verificar se Firebase está carregado e inicializar
if (typeof firebase !== 'undefined') {
  if (!firebase.apps.length) {
    try {
      firebase.initializeApp(firebaseConfig);
      console.log('✅ Firebase inicializado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao inicializar Firebase:', error);
    }
  }
} else {
  console.warn('⚠️ Firebase SDK não carregado. Verifice as tags <script> no HTML');
}

window.getFirebase = function() {
  if (typeof firebase !== 'undefined' && firebase.apps.length) {
    return {
      auth: firebase.auth(),
      db: firebase.database()
    };
  }
  console.warn('Firebase não está disponível');
  return null;
};

// ==========================================
// ESTADO GLOBAL DA APLICAÇÃO
// ==========================================
let state = {
  membros: [],
  ministries: ['Louvor', 'Infantil', 'Jovens', 'Mídia', 'Recepção'],
  pastas: [],
  chamadas: [],
  eventos: [],
  usuarios: [],
  currentUser: null
};

let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let isRegisterMode = false;
let isFirebaseListening = false;
let editingChamadaId = null;

const TAB_IDS = ['tabChamada', 'tabCalendario', 'tabMembros', 'tabTutorial', 'tabAdmin'];

// ==========================================
// INICIALIZAÇÃO DA APLICAÇÃO
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Iniciando aplicação...');
  loadState();
  initAuthEventListeners();
  initFirebaseObserver();
  initDateInputs();
});

function loadState() {
  const localData = localStorage.getItem('app_imuit_state');
  if (localData) {
    try {
      const parsed = JSON.parse(localData);
      state = { ...state, ...parsed };
      console.log('✅ Estado carregado do localStorage');
    } catch (e) {
      console.error('Erro ao carregar dados do localStorage:', e);
    }
  }
}

function saveState() {
  localStorage.setItem('app_imuit_state', JSON.stringify(state));
  
  const fb = window.getFirebase ? window.getFirebase() : null;
  if (fb && fb.db && state.currentUser) {
    fb.db.ref('app_data').set({
      membros: state.membros || [],
      ministries: state.ministries || [],
      pastas: state.pastas || [],
      chamadas: state.chamadas || [],
      eventos: state.eventos || []
    }).catch(err => console.warn('⚠️ Aviso ao sincronizar dados com o Firebase:', err));
  }
}

function iniciarOuvinteFirebaseGlobal() {
  if (isFirebaseListening) {
    console.warn('Ouvinte Firebase já está ativo');
    return;
  }
  
  const fb = window.getFirebase ? window.getFirebase() : null;
  if (!fb || !fb.db) {
    console.error('Firebase não inicializado corretamente');
    return;
  }

  isFirebaseListening = true;
  console.log('📡 Iniciando ouvinte Firebase...');
  
  fb.db.ref('app_data').on('value', snapshot => {
    const val = snapshot.val();
    if (val) {
      state.membros = val.membros || [];
      state.ministries = val.ministries || ['Louvor', 'Infantil', 'Jovens', 'Mídia', 'Recepção'];
      state.pastas = val.pastas || [];
      state.chamadas = val.chamadas || [];
      state.eventos = val.eventos || [];
      localStorage.setItem('app_imuit_state', JSON.stringify(state));
      renderAll();
      console.log('🔄 Dados sincronizados do Firebase');
    }
  }, error => {
    console.error('❌ Erro ao ouvir Firebase:', error);
    isFirebaseListening = false;
  });
}

function initDateInputs() {
  const hoje = new Date().toISOString().split('T')[0];
  const inputListaData = document.getElementById('listaData');
  const inputEvtData = document.getElementById('evtData');
  const inputEvtDataFim = document.getElementById('evtDataFim');

  if (inputListaData && !inputListaData.value) inputListaData.value = hoje;
  if (inputEvtData && !inputEvtData.value) inputEvtData.value = hoje;
  if (inputEvtDataFim && !inputEvtDataFim.value) inputEvtDataFim.value = hoje;
}

// ==========================================
// AUTENTICAÇÃO - VERSÃO CORRIGIDA
// ==========================================
function initAuthEventListeners() {
  const btnAuthSubmit = document.getElementById('btnAuthSubmit');
  const authToggleBtn = document.getElementById('authToggleBtn');

  if (btnAuthSubmit) btnAuthSubmit.addEventListener('click', submeterAutenticacao);
  if (authToggleBtn) authToggleBtn.addEventListener('click', alternarModoAutenticacao);
}

function alternarModoAutenticacao() {
  isRegisterMode = !isRegisterMode;
  const authTitle = document.getElementById('authTitle');
  const authNameGroup = document.getElementById('authNameGroup');
  const btnAuthSubmit = document.getElementById('btnAuthSubmit');
  const authToggleBtn = document.getElementById('authToggleBtn');

  if (isRegisterMode) {
    if (authTitle) authTitle.innerText = 'Solicitar Acesso / Criar Conta';
    if (authNameGroup) authNameGroup.style.display = 'block';
    if (btnAuthSubmit) btnAuthSubmit.innerHTML = '<i data-lucide="user-plus"></i> Registrar Conta';
    if (authToggleBtn) authToggleBtn.innerText = 'Já tem uma conta? Iniciar Sessão';
  } else {
    if (authTitle) authTitle.innerText = 'Aceder ao App Imuit';
    if (authNameGroup) authNameGroup.style.display = 'none';
    if (btnAuthSubmit) btnAuthSubmit.innerHTML = '<i data-lucide="log-in"></i> Iniciar Sessão';
    if (authToggleBtn) authToggleBtn.innerText = 'Não tem conta? Solicitar Acesso';
  }
  if (window.lucide) lucide.createIcons();
}

function initFirebaseObserver() {
  const fb = window.getFirebase ? window.getFirebase() : null;
  
  if (!fb || !fb.auth) {
    console.warn('Firebase Auth não disponível, usando modo offline');
    return;
  }

  console.log('👁️ Observando mudanças de autenticação...');
  
  fb.auth.onAuthStateChanged(user => {
    if (user) {
      console.log('✅ Usuário autenticado:', user.email);
      checkUserApproval(user);
    } else {
      console.log('❌ Usuário desconectado');
      processLogoutUI();
    }
  }, error => {
    console.error('Erro ao observar autenticação:', error);
  });
}

function submeterAutenticacao() {
  const emailInput = document.getElementById('authEmail');
  const passwordInput = document.getElementById('authPassword');
  const nomeInput = document.getElementById('authNome');

  const email = emailInput ? emailInput.value.trim() : '';
  const password = passwordInput ? passwordInput.value.trim() : '';
  const nome = nomeInput ? nomeInput.value.trim() : '';

  if (!email || !password) {
    alert('Por favor, preencha o e-mail e a palavra-passe.');
    return;
  }

  const fb = window.getFirebase ? window.getFirebase() : null;
  
  if (!fb || !fb.auth) {
    console.warn('Usando modo offline (Firebase não disponível)');
    const offlineUser = {
      uid: 'offline_' + Date.now(),
      email: email,
      nome: nome || email.split('@')[0],
      aprovado: true,
      perfil: 'A'
    };
    state.currentUser = offlineUser;
    entrarNoApp();
    return;
  }

  const auth = fb.auth;

  if (isRegisterMode) {
    if (!nome) {
      alert('Por favor, informe o seu nome completo.');
      return;
    }

    console.log('📝 Tentando registrar novo usuário...');
    auth.createUserWithEmailAndPassword(email, password)
      .then(cred => {
        console.log('✅ Usuário criado:', cred.user.uid);
        const newUser = {
          uid: cred.user.uid,
          nome: nome,
          email: email,
          aprovado: false,
          perfil: 'L'
        };
        return fb.db.ref('users/' + cred.user.uid).set(newUser);
      })
      .then(() => {
        alert('✅ Conta criada! Aguarde aprovação do administrador.');
        isRegisterMode = false;
        alternarModoAutenticacao();
      })
      .catch(err => {
        console.error('Erro no cadastro:', err);
        alert('❌ Erro no cadastro: ' + err.message);
      });
  } else {
    console.log('🔑 Tentando fazer login...');
    auth.signInWithEmailAndPassword(email, password)
      .then(cred => {
        console.log('✅ Login bem-sucedido:', cred.user.uid);
        alert('Login bem-sucedido!');
      })
      .catch(err => {
        console.error('Erro ao iniciar sessão:', err);
        let mensagem = 'Erro ao iniciar sessão: ' + err.message;
        
        if (err.code === 'auth/user-not-found') {
          mensagem = 'Usuário não encontrado.';
        } else if (err.code === 'auth/wrong-password') {
          mensagem = 'Senha incorreta.';
        } else if (err.code === 'auth/invalid-email') {
          mensagem = 'E-mail inválido.';
        }
        
        alert('❌ ' + mensagem);
      });
  }
}

function checkUserApproval(user) {
  const fb = window.getFirebase ? window.getFirebase() : null;
  
  if (!fb || !fb.db) {
    console.warn('Database não disponível, usando dados locais');
    state.currentUser = {
      uid: user.uid,
      email: user.email,
      nome: user.displayName || user.email.split('@')[0],
      aprovado: true,
      perfil: 'L'
    };
    entrarNoApp();
    return;
  }

  console.log('🔍 Verificando aprovação do usuário...');
  
  fb.db.ref('users/' + user.uid).once('value')
    .then(snapshot => {
      const userData = snapshot.val();
      
      if (!userData) {
        console.log('Usuário novo, criando registro padrão');
        const defaultUser = {
          uid: user.uid,
          email: user.email,
          nome: user.displayName || user.email.split('@')[0],
          aprovado: true,
          perfil: 'A'
        };
        return fb.db.ref('users/' + user.uid).set(defaultUser).then(() => {
          state.currentUser = defaultUser;
          entrarNoApp();
        });
      } else if (!userData.aprovado) {
        console.log('Usuário aguardando aprovação');
        document.getElementById('authModal').style.display = 'none';
        document.getElementById('pendingApprovalModal').style.display = 'flex';
        document.getElementById('appMainContent').style.display = 'none';
      } else {
        console.log('✅ Usuário aprovado');
        state.currentUser = userData;
        entrarNoApp();
      }
    })
    .catch(error => {
      console.error('❌ Erro ao verificar aprovação:', error);
      // Fallback: permitir entrada mesmo com erro
      state.currentUser = {
        uid: user.uid,
        email: user.email,
        nome: user.displayName || user.email.split('@')[0],
        aprovado: true,
        perfil: 'L'
      };
      entrarNoApp();
    });
}

function entrarNoApp() {
  console.log('🎉 Entrando no app...');
  document.getElementById('authModal').style.display = 'none';
  document.getElementById('pendingApprovalModal').style.display = 'none';
  document.getElementById('appMainContent').style.display = 'block';

  const userEmailDisplay = document.getElementById('userEmailDisplay');
  const userRoleBadge = document.getElementById('userRoleBadge');
  const tabBtnAdmin = document.getElementById('tabBtnAdmin');
  const statusDiv = document.getElementById('status');

  if (userEmailDisplay && state.currentUser) {
    userEmailDisplay.innerText = state.currentUser.nome || state.currentUser.email;
  }

  if (userRoleBadge && state.currentUser) {
    const p = state.currentUser.perfil || 'L';
    userRoleBadge.innerText = `Perfil: ${p === 'A' ? 'Administrador' : p === 'O' ? 'Ordem de Culto' : 'Líder'}`;
  }

  if (tabBtnAdmin) {
    tabBtnAdmin.style.display = (state.currentUser && state.currentUser.perfil === 'A') ? 'inline-flex' : 'none';
  }

  if (statusDiv) {
    statusDiv.className = 'status-badge status-online';
    statusDiv.innerHTML = '<i data-lucide="wifi" style="width: 14px;"></i> Conectado';
  }

  iniciarOuvinteFirebaseGlobal();
  renderAll();
  irParaJanela('tabChamada');
}

function terminarSessao() {
  const fb = window.getFirebase ? window.getFirebase() : null;
  
  if (fb && fb.auth) {
    fb.auth.signOut().then(() => {
      console.log('✅ Sessão encerrada');
      processLogoutUI();
    }).catch(err => {
      console.error('Erro ao encerrar sessão:', err);
      processLogoutUI();
    });
  } else {
    processLogoutUI();
  }
}

function processLogoutUI() {
  state.currentUser = null;
  isFirebaseListening = false;
  document.getElementById('authModal').style.display = 'flex';
  document.getElementById('pendingApprovalModal').style.display = 'none';
  document.getElementById('appMainContent').style.display = 'none';

  const statusDiv = document.getElementById('status');
  if (statusDiv) {
    statusDiv.className = 'status-badge status-offline';
    statusDiv.innerHTML = '<i data-lucide="wifi-off" style="width: 14px;"></i> Desconectado';
  }
}

// [Resto do código permanece igual...]
// ==========================================
// RENDERIZAÇÃO GERAL E INTERFACE
// ==========================================
function renderAll() {
  renderMinistryCheckboxes();
  renderPastasOptions();
  renderAttendanceListEditor();
  renderPastasEListasTree();
  renderCalendar();
  renderMembersTable();
  renderUsersAdminTable();
  if (window.lucide) lucide.createIcons();
}

function irParaJanela(target) {
  const tabs = [...document.querySelectorAll('.tab-content')];
  const buttons = [...document.querySelectorAll('.tab-btn')];

  if (!tabs.length) return;

  let targetId = '';

  if (typeof target === 'number') {
    targetId = TAB_IDS[target] || TAB_IDS[0];
  } else if (typeof target === 'string') {
    if (!isNaN(target)) {
      const idx = parseInt(target, 10);
      targetId = TAB_IDS[idx] || TAB_IDS[0];
    } else {
      targetId = target.replace('#', '');
    }
  }

  let selectedTabExists = false;

  tabs.forEach((tab) => {
    if (tab.id === targetId) {
      tab.style.display = 'block';
      selectedTabExists = true;
    } else {
      tab.style.display = 'none';
    }
  });

  if (!selectedTabExists && tabs[0]) {
    tabs[0].style.display = 'block';
    targetId = tabs[0].id;
  }

  buttons.forEach((btn) => {
    const onclickAttr = btn.getAttribute('onclick') || '';
    btn.classList.toggle('active', onclickAttr.includes(targetId));
  });

  if (window.lucide) lucide.createIcons();
}

function alternarTema() {
  const root = document.documentElement;
  const atual = root.getAttribute('data-theme') || 'dark';
  const novoTema = atual === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', novoTema);

  const btn = document.getElementById('btnTema');
  if (btn) {
    btn.textContent = novoTema === 'dark' ? '🌙 Modo Escuro' : '☀ Modo Claro';
  }
}

function mascaraTelefone(input) {
  if (!input) return;
  let digits = input.value.replace(/\D/g, '').slice(0, 11);

  if (digits.length <= 10) {
    input.value = digits.replace(/(\d{2})(\d{4})(\d{0,4})/, function (_, a, b, c) {
      return c ? `(${a}) ${b}-${c}` : b ? `(${a}) ${b}` : `(${a})`;
    });
  } else {
    input.value = digits.replace(/(\d{2})(\d{5})(\d{0,4})/, function (_, a, b, c) {
      return c ? `(${a}) ${b}-${c}` : `(${a})`;
    });
  }
}

// ==========================================
// EXPOSIÇÃO DAS FUNÇÕES GLOBAIS
// ==========================================
window.irParaJanela = irParaJanela;
window.alternarTema = alternarTema;
window.mascaraTelefone = mascaraTelefone;
window.terminarSessao = terminarSessao;
