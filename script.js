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

// Map de IDs das abas por ordem visual
const TAB_IDS = ['tabChamada', 'tabCalendario', 'tabMembros', 'tabTutorial', 'tabAdmin'];

// ==========================================
// INICIALIZAÇÃO DA APLICAÇÃO
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
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
    } catch (e) {
      console.error('Erro ao carregar localStorage:', e);
    }
  }
}

function saveState() {
  localStorage.setItem('app_imuit_state', JSON.stringify(state));
  if (window.firebase && firebase.database) {
    const fb = window.getFirebase ? window.getFirebase() : null;
    if (fb && fb.db && state.currentUser) {
      fb.db.ref('app_data').set({
        membros: state.membros || [],
        ministries: state.ministries || [],
        pastas: state.pastas || [],
        chamadas: state.chamadas || [],
        eventos: state.eventos || []
      }).catch(err => console.warn('Aviso ao sincronizar Firebase:', err));
    }
  }
}

function iniciarOuvinteFirebaseGlobal() {
  if (isFirebaseListening || !window.firebase || !firebase.database) return;
  
  const fb = window.getFirebase ? window.getFirebase() : null;
  if (!fb || !fb.db) return;

  isFirebaseListening = true;
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
    }
  });
}

function initDateInputs() {
  const hoje = new Date().toISOString().split('T')[0];
  const inputListaData = document.getElementById('listaData');
  const inputEvtData = document.getElementById('evtData');
  const inputEvtDataFim = document.getElementById('evtDataFim');

  if (inputListaData) inputListaData.value = hoje;
  if (inputEvtData) inputEvtData.value = hoje;
  if (inputEvtDataFim) inputEvtDataFim.value = hoje;
}

// ==========================================
// LÓGICA DE AUTENTICAÇÃO E PERFIS
// ==========================================
function initAuthEventListeners() {
  const btnAuthSubmit = document.getElementById('btnAuthSubmit');
  const authToggleBtn = document.getElementById('authToggleBtn');

  if (btnAuthSubmit) {
    btnAuthSubmit.addEventListener('click', submeterAutenticacao);
  }

  if (authToggleBtn) {
    authToggleBtn.addEventListener('click', alternarModoAutenticacao);
  }
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
  if (window.firebase && firebase.auth) {
    firebase.auth().onAuthStateChanged(user => {
      if (user) {
        checkUserApproval(user);
      } else {
        processLogoutUI();
      }
    });
  }
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

  if (window.firebase && firebase.auth) {
    const auth = firebase.auth();
    if (isRegisterMode) {
      if (!nome) {
        alert('Por favor, informe o seu nome completo.');
        return;
      }
      auth.createUserWithEmailAndPassword(email, password)
        .then(cred => {
          const newUser = {
            uid: cred.user.uid,
            nome: nome,
            email: email,
            aprovado: false,
            perfil: 'L'
          };
          return firebase.database().ref('users/' + cred.user.uid).set(newUser);
        })
        .catch(err => alert('Erro no cadastro: ' + err.message));
    } else {
      auth.signInWithEmailAndPassword(email, password)
        .catch(err => alert('Erro ao iniciar sessão: ' + err.message));
    }
  } else {
    const offlineUser = {
      uid: 'offline_' + Date.now(),
      email: email,
      nome: nome || email.split('@')[0],
      aprovado: true,
      perfil: 'A'
    };
    state.currentUser = offlineUser;
    entrarNoApp();
  }
}

function checkUserApproval(user) {
  const db = firebase.database();
  db.ref('users/' + user.uid).once('value')
    .then(snapshot => {
      const userData = snapshot.val();
      if (!userData) {
        const defaultUser = { uid: user.uid, email: user.email, nome: user.email.split('@')[0], aprovado: true, perfil: 'A' };
        db.ref('users/' + user.uid).set(defaultUser);
        state.currentUser = defaultUser;
        entrarNoApp();
      } else if (!userData.aprovado) {
        document.getElementById('authModal').style.display = 'none';
        document.getElementById('pendingApprovalModal').style.display = 'flex';
        document.getElementById('appMainContent').style.display = 'none';
      } else {
        state.currentUser = userData;
        entrarNoApp();
      }
    })
    .catch(() => {
      state.currentUser = { uid: user.uid, email: user.email, aprovado: true, perfil: 'L' };
      entrarNoApp();
    });
}

function entrarNoApp() {
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
  if (window.firebase && firebase.auth) {
    firebase.auth().signOut().then(() => processLogoutUI());
  } else {
    processLogoutUI();
  }
}

function processLogoutUI() {
  state.currentUser = null;
  document.getElementById('authModal').style.display = 'flex';
  document.getElementById('pendingApprovalModal').style.display = 'none';
  document.getElementById('appMainContent').style.display = 'none';

  const statusDiv = document.getElementById('status');
  if (statusDiv) {
    statusDiv.className = 'status-badge status-offline';
    statusDiv.innerHTML = '<i data-lucide="wifi-off" style="width: 14px;"></i> Desconectado';
  }
}

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
// ABA 1: GERENCIADOR DE PASTAS E CHAMADA
// ==========================================
function criarNovaPasta() {
  const input = document.getElementById('novoNomePastaCat');
  if (!input) return;
  const nome = input.value.trim();
  if (!nome) {
    alert('Digite o nome da pasta.');
    return;
  }

  if (!state.pastas.includes(nome)) {
    state.pastas.push(nome);
    saveState();
    renderPastasOptions();
    renderPastasEListasTree();
    input.value = '';
    alert('✅ Pasta criada com sucesso!');
  } else {
    alert('Esta pasta já existe.');
  }
}

function renderPastasOptions() {
  const sel = document.getElementById('selPastaDestino');
  const container = document.getElementById('listaCategoriasPastas');

  if (sel) {
    sel.innerHTML = state.pastas.map(p => `<option value="${p}">${p}</option>`).join('');
    if (!state.pastas.length) {
      sel.innerHTML = '<option value="">Nenhuma pasta disponível</option>';
    }
  }

  if (container) {
    if (!state.pastas.length) {
      container.innerHTML = '<p style="color:var(--text-muted);">Nenhuma pasta criada.</p>';
    } else {
      container.innerHTML = state.pastas.map(p => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:8px; border-bottom:1px solid var(--border-color);">
          <span>📁 ${p}</span>
          <button type="button" class="btn-danger" style="padding:4px 8px; font-size:0.75rem;" onclick="excluirPasta('${p}')">Remover</button>
        </div>
      `).join('');
    }
  }
}

function excluirPasta(nome) {
  if (confirm(`Deseja excluir a pasta "${nome}"?`)) {
    state.pastas = state.pastas.filter(p => p !== nome);
    saveState();
    renderPastasOptions();
    renderPastasEListasTree();
  }
}

function renderAttendanceListEditor() {
  const container = document.getElementById('boxMembrosChamada');
  const buscaInput = document.getElementById('buscaMembroChamada');
  const ordenacaoSel = document.getElementById('selOrdenacaoChamada');

  if (!container) return;

  const termo = buscaInput ? buscaInput.value.toLowerCase().trim() : '';
  const ordenacao = ordenacaoSel ? ordenacaoSel.value : 'NOME_ASC';

  let membrosFiltrados = state.membros.filter(m => {
    const matchNome = (m.nome || '').toLowerCase().includes(termo);
    const matchApelido = (m.apelido || '').toLowerCase().includes(termo);
    return matchNome || matchApelido;
  });

  if (ordenacao === 'NOME_ASC') {
    membrosFiltrados.sort((a, b) => a.nome.localeCompare(b.nome));
  } else if (ordenacao === 'NOME_DESC') {
    membrosFiltrados.sort((a, b) => b.nome.localeCompare(a.nome));
  }

  if (!membrosFiltrados.length) {
    container.innerHTML = '<p style="color:var(--text-muted); padding:10px;">Nenhum membro encontrado.</p>';
    return;
  }

  container.innerHTML = membrosFiltrados.map(m => `
    <div class="member-item-row" style="display:flex; justify-content:space-between; align-items:center; padding:10px; border-bottom:1px solid var(--border-color, #3f445e);">
      <div>
        <strong>${m.nome}</strong> ${m.apelido ? `(${m.apelido})` : ''}
        <div style="font-size:0.75rem; color:var(--text-muted);">${(m.ministerios || []).join(', ')}</div>
      </div>
      <div>
        <select class="sel-status-presenca" data-id="${m.id}" style="padding:6px 10px; border-radius:6px; background:var(--bg-dark); color:var(--text-main); border:1px solid var(--border-color);">
          <option value="PENDENTE">⏳ Pendente</option>
          <option value="PRESENTE">✅ Presente</option>
          <option value="AUSENTE">❌ Ausente</option>
          <option value="JUSTIFICADO">📝 Justificado</option>
          <option value="FALTA">⚠️ Falta</option>
        </select>
      </div>
    </div>
  `).join('');
}

function atualizarBuscaChamada() {
  renderAttendanceListEditor();
}

function alterarOrdenacaoChamada(valor) {
  renderAttendanceListEditor();
}

function salvarListaNaPasta() {
  const pasta = document.getElementById('selPastaDestino')?.value;
  const titulo = document.getElementById('listaTitulo')?.value.trim();
  const data = document.getElementById('listaData')?.value;

  if (!pasta) {
    alert('Selecione ou crie uma pasta antes de salvar.');
    return;
  }
  if (!titulo) {
    alert('Informe o título do evento / lista.');
    return;
  }

  const selects = document.querySelectorAll('.sel-status-presenca');
  const registrosStatus = {};

  selects.forEach(sel => {
    const memberId = sel.getAttribute('data-id');
    registrosStatus[memberId] = sel.value;
  });

  const novaChamada = {
    id: 'chamada_' + Date.now(),
    pasta: pasta,
    titulo: titulo,
    data: data,
    statusMembros: registrosStatus,
    totalMembros: state.membros.length
  };

  state.chamadas.push(novaChamada);
  saveState();
  renderPastasEListasTree();
  alert('✅ Lista salva com sucesso!');
}

function renderPastasEListasTree() {
  const container = document.getElementById('arvorePastasEListas');
  if (!container) return;

  if (!state.pastas.length && !state.chamadas.length) {
    container.innerHTML = '<p style="color:var(--text-muted);">Nenhuma pasta ou lista salva.</p>';
    return;
  }

  let html = '';
  state.pastas.forEach(pasta => {
    const listasDaPasta = state.chamadas.filter(c => c.pasta === pasta);
    html += `
      <div class="folder-box" style="margin-bottom:15px;">
        <h4>📁 ${pasta} (${listasDaPasta.length} listas)</h4>
        <div style="margin-top:10px; padding-left:15px;">
          ${listasDaPasta.length === 0 ? '<p style="font-size:0.8rem; color:var(--text-muted);">Nenhuma lista nesta pasta.</p>' : ''}
          ${listasDaPasta.map(l => {
            const statusObj = l.statusMembros || {};
            const numPresentes = Object.values(statusObj).filter(v => v === 'PRESENTE').length;
            return `
              <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid var(--border-color);">
                <span>📋 <b>${l.titulo}</b> (${l.data}) - ${numPresentes}/${l.totalMembros} presentes</span>
                <button type="button" class="btn-danger" style="padding:2px 6px; font-size:0.7rem;" onclick="excluirChamada('${l.id}')">Excluir</button>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function excluirChamada(id) {
  if (confirm('Deseja remover esta lista salva?')) {
    state.chamadas = state.chamadas.filter(c => c.id !== id);
    saveState();
    renderPastasEListasTree();
  }
}

// ==========================================
// IMPRESSÃO / PDF FUTURISTA E MODERNO
// ==========================================
function exportarListaParaPDF() {
  const pasta = document.getElementById('selPastaDestino')?.value || 'Geral';
  const titulo = document.getElementById('listaTitulo')?.value.trim() || 'Chamada Geral';
  const dataRaw = document.getElementById('listaData')?.value || new Date().toISOString().split('T')[0];
  const [ano, mes, dia] = dataRaw.split('-');
  const dataFormatada = `${dia}/${mes}/${ano}`;

  const rows = document.querySelectorAll('#boxMembrosChamada .member-item-row');
  
  if (!rows.length) {
    alert('Não há membros na lista para exportar.');
    return;
  }

  let totalMembros = rows.length;
  let contPresentes = 0;
  let contAusentes = 0;
  let contJustificados = 0;
  let contPendentes = 0;

  let tabelaHTML = '';

  rows.forEach(row => {
    const nome = row.querySelector('strong')?.innerText || '';
    const infoSecundario = row.querySelector('div div')?.innerText || 'Membro';
    const select = row.querySelector('select');
    const statusVal = select ? select.value : 'PENDENTE';

    let badgeClass = 'status-pendente';
    let statusText = 'Pendente';

    if (statusVal === 'PRESENTE') {
      contPresentes++;
      badgeClass = 'status-presente';
      statusText = 'Presente';
    } else if (statusVal === 'AUSENTE' || statusVal === 'FALTA') {
      contAusentes++;
      badgeClass = 'status-ausente';
      statusText = 'Ausente';
    } else if (statusVal === 'JUSTIFICADO') {
      contJustificados++;
      badgeClass = 'status-justificado';
      statusText = 'Justificado';
    } else {
      contPendentes++;
    }

    tabelaHTML += `
      <tr>
        <td>
          <div class="member-name">${nome}</div>
          <div class="member-sub">${infoSecundario}</div>
        </td>
        <td>${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td>
        <td style="text-align: right;">
          <span class="badge ${badgeClass}">${statusText}</span>
        </td>
      </tr>
    `;
  });

  const pctPresente = totalMembros > 0 ? Math.round((contPresentes / totalMembros) * 100) : 0;

  const janelaImpressao = window.open('', '_blank', 'width=900,height=700');
  
  janelaImpressao.document.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Relatório - ${titulo}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
          font-family: 'Inter', -apple-system, sans-serif; 
          background-color: #0b0f19; 
          color: #f1f5f9; 
          padding: 30px;
          -webkit-print-color-adjust: exact;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 20px;
          border-bottom: 2px solid #1e293b;
          margin-bottom: 20px;
        }

        .brand-title {
          font-size: 1.6rem;
          font-weight: 700;
          background: linear-gradient(135deg, #38bdf8, #818cf8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          letter-spacing: -0.5px;
        }

        .meta-info {
          font-size: 0.85rem;
          color: #94a3b8;
          text-align: right;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }

        .metric-card {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 8px;
          padding: 12px;
          text-align: center;
        }

        .metric-card .value {
          font-size: 1.4rem;
          font-weight: 700;
          color: #38bdf8;
        }

        .metric-card .label {
          font-size: 0.75rem;
          color: #94a3b8;
          text-transform: uppercase;
        }

        .progress-bar-container {
          background: #1e293b;
          border-radius: 20px;
          height: 10px;
          overflow: hidden;
          margin-bottom: 25px;
          border: 1px solid #334155;
        }

        .progress-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #38bdf8, #34d399);
          width: ${pctPresente}%;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }

        th {
          background: #1e293b;
          color: #94a3b8;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 10px 12px;
          text-align: left;
          border-bottom: 2px solid #334155;
        }

        td {
          padding: 12px;
          border-bottom: 1px solid #1e293b;
          font-size: 0.88rem;
        }

        .member-name { font-weight: 600; color: #f8fafc; }
        .member-sub { font-size: 0.75rem; color: #64748b; }

        .badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .status-presente { background: rgba(52, 211, 153, 0.15); color: #34d399; border: 1px solid rgba(52, 211, 153, 0.3); }
        .status-ausente { background: rgba(248, 113, 113, 0.15); color: #f87171; border: 1px solid rgba(248, 113, 113, 0.3); }
        .status-justificado { background: rgba(251, 191, 36, 0.15); color: #fbbf24; border: 1px solid rgba(251, 191, 36, 0.3); }
        .status-pendente { background: rgba(148, 163, 184, 0.15); color: #94a3b8; border: 1px solid rgba(148, 163, 184, 0.3); }

        .footer {
          margin-top: 30px;
          text-align: center;
          font-size: 0.75rem;
          color: #64748b;
          border-top: 1px solid #1e293b;
          padding-top: 15px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="brand-title">APP IMUIT</div>
          <div style="font-size:0.9rem; color:#94a3b8; margin-top:2px;">📁 ${pasta} — <b>${titulo}</b></div>
        </div>
        <div class="meta-info">
          <div><b>Data:</b> ${dataFormatada}</div>
          <div><b>Gerado por:</b> ${state.currentUser?.nome || 'Sistema'}</div>
        </div>
      </div>

      <div class="metrics-grid">
        <div class="metric-card"><div class="value">${totalMembros}</div><div class="label">Total Cadastrados</div></div>
        <div class="metric-card"><div class="value">${contPresentes}</div><div class="label">Presentes</div></div>
        <div class="metric-card"><div class="value">${contAusentes}</div><div class="label">Ausentes</div></div>
        <div class="metric-card"><div class="value">${pctPresente}%</div><div class="label">Frequência</div></div>
      </div>

      <div class="progress-bar-container">
        <div class="progress-bar-fill"></div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Membro & Ministério</th>
            <th>Horário</th>
            <th style="text-align: right;">Status de Presença</th>
          </tr>
        </thead>
        <tbody>
          ${tabelaHTML}
        </tbody>
      </table>

      <div class="footer">
        Relatório gerado automaticamente via App Imuit · ${new Date().toLocaleString('pt-BR')}
      </div>

      <script>
        window.onload = function() {
          window.print();
          window.onafterprint = function() { window.close(); };
        };
      <\/script>
    </body>
    </html>
  `);

  janelaImpressao.document.close();
}

// ==========================================
// ABA 2: CALENDÁRIO E EVENTOS
// ==========================================
function salvarEvento() {
  const titulo = document.getElementById('evtTitulo')?.value.trim();
  const data = document.getElementById('evtData')?.value;
  const dataFim = document.getElementById('evtDataFim')?.value;
  const hora = document.getElementById('evtHora')?.value;
  const horaFim = document.getElementById('evtHoraFim')?.value;
  const recorrencia = document.getElementById('evtRecorrencia')?.value;

  if (!titulo || !data) {
    alert('Informe ao menos o título e a data do evento.');
    return;
  }

  const novoEvento = {
    id: 'evt_' + Date.now(),
    titulo, data, dataFim, hora, horaFim, recorrencia
  };

  state.eventos.push(novoEvento);
  saveState();
  renderCalendar();
  alert('📅 Evento agendado com sucesso!');
}

function mudarMesCalendario(step) {
  currentMonth += step;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear -= 1;
  } else if (currentMonth > 11) {
    currentMonth = 0;
    currentYear += 1;
  }
  renderCalendar();
}

function renderCalendar() {
  const grid = document.getElementById('gridCalendarioDias');
  const tituloMes = document.getElementById('calTituloMes');
  const listaProximos = document.getElementById('listaEventosProximos');

  if (!grid || !tituloMes) return;

  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  tituloMes.innerText = `${meses[currentMonth]} ${currentYear}`;

  grid.innerHTML = '';
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
  const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();

  for (let x = 0; x < firstDayIndex; x++) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'cal-day-cell other-month';
    grid.appendChild(emptyCell);
  }

  for (let day = 1; day <= totalDays; day++) {
    const cell = document.createElement('div');
    cell.className = 'cal-day-cell';

    const today = new Date();
    if (day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()) {
      cell.classList.add('today');
    }

    cell.innerHTML = `<div class="cal-day-num">${day}</div>`;

    const dataFormatada = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const evtsDoDia = state.eventos.filter(e => e.data === dataFormatada);

    evtsDoDia.forEach(e => {
      cell.innerHTML += `<div class="cal-evt-badge">${e.hora || ''} ${e.titulo}</div>`;
    });

    state.membros.forEach(m => {
      if (m.nasc) {
        const [, mMonth, mDay] = m.nasc.split('-');
        if (parseInt(mMonth) === currentMonth + 1 && parseInt(mDay) === day) {
          cell.innerHTML += `<div class="cal-evt-badge niver">🎂 ${m.apelido || m.nome}</div>`;
        }
      }
    });

    grid.appendChild(cell);
  }

  if (listaProximos) {
    if (!state.eventos.length) {
      listaProximos.innerHTML = '<p style="color:var(--text-muted);">Nenhum evento agendado.</p>';
    } else {
      listaProximos.innerHTML = state.eventos.slice(-5).map(e => `
        <div style="padding:8px; border-bottom:1px solid var(--border-color);">
          <strong>${e.titulo}</strong> - 📅 ${e.data} às ${e.hora || '19:00'}
        </div>
      `).join('');
    }
  }
}

// ==========================================
// ABA 3: MEMBROS E MINISTÉRIOS
// ==========================================
function salvarMembro() {
  const nome = document.getElementById('memNome')?.value.trim();
  const apelido = document.getElementById('memApelido')?.value.trim();
  const nasc = document.getElementById('memNasc')?.value;
  const fone = document.getElementById('memFone')?.value;
  const respNome = document.getElementById('memResponsavelNome')?.value;
  const respFone = document.getElementById('memResponsavelFone')?.value;

  if (!nome) {
    alert('Informe o nome completo do membro.');
    return;
  }

  const selectedMin = [];
  document.querySelectorAll('.chk-min-item:checked').forEach(c => selectedMin.push(c.value));

  const novoMembro = {
    id: 'mem_' + Date.now(),
    nome, 
    apelido, 
    nasc, 
    fone,
    responsavel: { nome: respNome, fone: respFone },
    ministerios: selectedMin
  };

  state.membros.push(novoMembro);
  saveState();
  renderMembersTable();
  renderAttendanceListEditor();
  renderCalendar();
  limparFormMembro();
  alert('👤 Membro cadastrado com sucesso!');
}

function limparFormMembro() {
  ['memNome', 'memApelido', 'memNasc', 'memFone', 'memResponsavelNome', 'memResponsavelFone'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  document.querySelectorAll('.chk-min-item').forEach(c => c.checked = false);
}

// IMPORTAÇÃO EM MASSA VIA PLANILHA / CSV
function abrirModalImportacaoMassa() {
  document.getElementById('importacaoMassaModal').style.display = 'flex';
}

function fecharModalImportacaoMassa() {
  document.getElementById('importacaoMassaModal').style.display = 'none';
  document.getElementById('textoCsvInput').value = '';
  document.getElementById('arquivoCsvInput').value = '';
}

function lerArquivoCsv(input) {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    document.getElementById('textoCsvInput').value = e.target.result;
  };
  reader.readAsText(file, 'UTF-8');
}

function processarImportacaoEmMassa() {
  const rawText = document.getElementById('textoCsvInput').value.trim();
  if (!rawText) {
    alert('Por favor, cole o texto da planilha ou envie um arquivo CSV.');
    return;
  }

  const linhas = rawText.split(/\r?\n/);
  let importados = 0;

  linhas.forEach((linha, index) => {
    if (!linha.trim()) return;

    // Divide por vírgula, ponto e vírgula ou tabulação
    const colunas = linha.split(/[,;\t]/).map(c => c.trim().replace(/^["']|["']$/g, ''));
    
    // Ignora cabeçalhos se houver
    if (index === 0 && (colunas[0].toLowerCase().includes('nome') || colunas[0].toLowerCase().includes('name'))) {
      return;
    }

    const nome = colunas[0];
    const apelido = colunas[1] || '';
    let nasc = colunas[2] || '';
    const fone = colunas[3] || '';

    if (nasc.includes('/')) {
      const parts = nasc.split('/');
      if (parts.length === 3) nasc = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }

    if (nome) {
      state.membros.push({
        id: 'mem_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        nome,
        apelido,
        nasc,
        fone,
        responsavel: { nome: '', fone: '' },
        ministerios: []
      });
      importados++;
    }
  });

  if (importados > 0) {
    saveState();
    renderMembersTable();
    renderAttendanceListEditor();
    renderCalendar();
    fecharModalImportacaoMassa();
    alert(`🎉 Sucesso! ${importados} membros foram cadastrados com sucesso.`);
  } else {
    alert('Nenhum membro válido pôde ser importado. Verifique o formato.');
  }
}

function criarMinisterio() {
  const input = document.getElementById('novoMinNome');
  if (!input) return;

  const nome = input.value.trim();
  if (!nome) {
    alert('Informe o nome do ministério.');
    return;
  }

  state.ministries = state.ministries || [];
  if (!state.ministries.includes(nome)) {
    state.ministries.push(nome);
    saveState();
  }

  input.value = '';
  renderMinistryCheckboxes();
  renderAttendanceListEditor();
  alert('✅ Ministério criado com sucesso!');
}

function excluirMinisterio(nomeMinisterio) {
  if (confirm(`Tem certeza de que deseja excluir o ministério "${nomeMinisterio}"?`)) {
    state.ministries = (state.ministries || []).filter(m => m !== nomeMinisterio);
    saveState();
    renderMinistryCheckboxes();
    renderAttendanceListEditor();
    renderMembersTable();
    alert('🗑️ Ministério excluído com sucesso!');
  }
}

function renderMinistryCheckboxes() {
  const box = document.getElementById('boxCheckMinisterios');
  const boxChamada = document.getElementById('boxFiltrosMinisteriosChamada');
  const listaMin = document.getElementById('listaMinisteriosCadastrados');

  if (box) {
    box.innerHTML = state.ministries.map(m => `
      <label class="chip-item">
        <input type="checkbox" class="chk-min-item" value="${m}">
        <span>${m}</span>
      </label>
    `).join('');
  }

  if (boxChamada) {
    boxChamada.innerHTML = state.ministries.map(m => `
      <span class="tag tag-blue" style="cursor:pointer;" onclick="renderAttendanceListEditor()">${m}</span>
    `).join('');
  }

  if (listaMin) {
    if (!state.ministries.length) {
      listaMin.innerHTML = '<p style="color:var(--text-muted); font-size:0.85rem;">Nenhum ministério cadastrado.</p>';
    } else {
      listaMin.innerHTML = state.ministries.map(m => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid var(--border-color);">
          <span>📌 <b>${m}</b></span>
          <button type="button" class="btn-danger" style="padding:4px 8px; font-size:0.75rem;" onclick="excluirMinisterio('${m}')">
            Excluir
          </button>
        </div>
      `).join('');
    }
  }
}

function renderMembersTable() {
  const tbody = document.getElementById('tbMembrosCorpo');
  const busca = document.getElementById('buscaMembrosLista')?.value.toLowerCase().trim() || '';

  if (!tbody) return;

  const filtrados = state.membros.filter(m => (m.nome || '').toLowerCase().includes(busca) || (m.apelido || '').toLowerCase().includes(busca));

  if (!filtrados.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">Nenhum membro cadastrado.</td></tr>';
    return;
  }

  tbody.innerHTML = filtrados.map(m => `
    <tr>
      <td><b>${m.nome}</b> ${m.apelido ? `<br><small style="color:var(--text-muted);">${m.apelido}</small>` : ''}</td>
      <td>${calcularIdade(m.nasc)} anos</td>
      <td>${m.fone || '-'}</td>
      <td>${(m.ministerios || []).map(min => `<span class="tag tag-blue">${min}</span>`).join(' ')}</td>
      <td>
        <button type="button" class="btn-secondary" style="padding:4px 8px; font-size:0.75rem;" onclick="abrirFichaMembro('${m.id}')">Ficha</button>
        <button type="button" class="btn-danger" style="padding:4px 8px; font-size:0.75rem;" onclick="excluirMembro('${m.id}')">Excluir</button>
      </td>
    </tr>
  `).join('');
}

function renderListaMembros() {
  renderMembersTable();
}

function calcularIdade(dataNasc) {
  if (!dataNasc) return '-';
  const hoje = new Date();
  const nasc = new Date(dataNasc);
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) {
    idade--;
  }
  return idade;
}

function abrirFichaMembro(id) {
  const membro = state.membros.find(m => m.id === id);
  if (!membro) return;

  const modal = document.getElementById('fichaMembroModal');
  const conteudo = document.getElementById('fichaConteudo');

  if (modal && conteudo) {
    conteudo.innerHTML = `
      <p><b>Nome Completo:</b> ${membro.nome}</p>
      <p><b>Apelido:</b> ${membro.apelido || '-'}</p>
      <p><b>Data de Nascimento:</b> ${membro.nasc || '-'} (${calcularIdade(membro.nasc)} anos)</p>
      <p><b>Telefone:</b> ${membro.fone || '-'}</p>
      <hr style="margin:10px 0; border-color:var(--border-color);">
      <p><b>Responsável:</b> ${membro.responsavel?.nome || '-'}</p>
      <p><b>Telefone Responsável:</b> ${membro.responsavel?.fone || '-'}</p>
      <p><b>Ministérios:</b> ${(membro.ministerios || []).join(', ') || 'Nenhum'}</p>
    `;
    modal.style.display = 'flex';
  }
}

function fecharFichaMembro() {
  const modal = document.getElementById('fichaMembroModal');
  if (modal) modal.style.display = 'none';
}

function imprimirFicha() {
  window.print();
}

function excluirMembro(id) {
  if (confirm('Tem certeza de que deseja remover este membro?')) {
    state.membros = state.membros.filter(m => m.id !== id);
    saveState();
    renderMembersTable();
    renderAttendanceListEditor();
  }
}

// ==========================================
// ABA 5: SEGURANÇA E ADMINISTRAÇÃO DE UTILIZADORES
// ==========================================
function renderUsersAdminTable() {
  const tbody = document.getElementById('tbPerfisUsuarios');
  if (!tbody) return;

  if (window.firebase && firebase.database) {
    firebase.database().ref('users').once('value').then(snapshot => {
      const usersData = snapshot.val() || {};
      const list = Object.values(usersData);
      renderUsersRows(tbody, list);
    }).catch(() => renderUsersRows(tbody, state.usuarios));
  } else {
    renderUsersRows(tbody, state.usuarios);
  }
}

function renderUsersRows(container, list) {
  if (!list.length) {
    container.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">Nenhum utilizador para aprovação.</td></tr>';
    return;
  }

  container.innerHTML = list.map(u => `
    <tr>
      <td>${u.nome || u.email.split('@')[0]}</td>
      <td>${u.email}</td>
      <td><span class="tag ${u.aprovado ? 'tag-green' : 'tag-yellow'}">${u.aprovado ? 'Aprovado' : 'Pendente'}</span></td>
      <td>
        <select onchange="alterarPerfilUsuario('${u.uid}', this.value)">
          <option value="L" ${u.perfil === 'L' ? 'selected' : ''}>Líder</option>
          <option value="O" ${u.perfil === 'O' ? 'selected' : ''}>Ordem de Culto</option>
          <option value="A" ${u.perfil === 'A' ? 'selected' : ''}>Admin</option>
        </select>
      </td>
      <td>
        ${!u.aprovado ? `<button type="button" class="btn-secondary" style="padding:4px 8px; font-size:0.75rem;" onclick="aprovarUsuario('${u.uid}')">Aprovar</button>` : ''}
      </td>
    </tr>
  `).join('');
}

function aprovarUsuario(uid) {
  if (window.firebase && firebase.database) {
    firebase.database().ref('users/' + uid).update({ aprovado: true })
      .then(() => {
        alert('Utilizador aprovado!');
        renderUsersAdminTable();
      });
  }
}

function alterarPerfilUsuario(uid, novoPerfil) {
  if (window.firebase && firebase.database) {
    firebase.database().ref('users/' + uid).update({ perfil: novoPerfil })
      .then(() => alert('Perfil atualizado!'));
  }
}

// ==========================================
// EXPOSIÇÃO DAS FUNÇÕES GLOBAIS NO WINDOW
// ==========================================
window.irParaJanela = irParaJanela;
window.mudarMesCalendario = mudarMesCalendario;
window.atualizarBuscaChamada = atualizarBuscaChamada;
window.alterarOrdenacaoChamada = alterarOrdenacaoChamada;
window.criarMinisterio = criarMinisterio;
window.excluirMinisterio = excluirMinisterio;
window.salvarListaNaPasta = salvarListaNaPasta;
window.alternarTema = alternarTema;
window.mascaraTelefone = mascaraTelefone;
window.renderListaMembros = renderListaMembros;
window.criarNovaPasta = criarNovaPasta;
window.salvarEvento = salvarEvento;
window.salvarMembro = salvarMembro;
window.excluirMembro = excluirMembro;
window.abrirFichaMembro = abrirFichaMembro;
window.fecharFichaMembro = fecharFichaMembro;
window.imprimirFicha = imprimirFicha;
window.excluirPasta = excluirPasta;
window.excluirChamada = excluirChamada;
window.exportarListaParaPDF = exportarListaParaPDF;
window.terminarSessao = terminarSessao;
window.aprovarUsuario = aprovarUsuario;
window.alterarPerfilUsuario = alterarPerfilUsuario;
window.abrirModalImportacaoMassa = abrirModalImportacaoMassa;
window.fecharModalImportacaoMassa = fecharModalImportacaoMassa;
window.lerArquivoCsv = lerArquivoCsv;
window.processarImportacaoEmMassa = processarImportacaoEmMassa;
