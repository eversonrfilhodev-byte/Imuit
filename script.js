function irParaJanela(index) {
  const tabs = [...document.querySelectorAll('.tab-content')];
  const buttons = [...document.querySelectorAll('.tab-btn')];

  if (!tabs.length) return;
  const safeIndex = Math.max(0, Math.min(index, tabs.length - 1));

  tabs.forEach((tab, i) => {
    tab.style.display = i === safeIndex ? 'block' : 'none';
  });

  buttons.forEach((btn, i) => {
    btn.classList.toggle('active', i === safeIndex);
  });
}

function navegarProximaJanela(step) {
  const buttons = [...document.querySelectorAll('.tab-btn')];
  if (!buttons.length) return;

  const currentIndex = buttons.findIndex(btn => btn.classList.contains('active'));
  const nextIndex = Math.max(0, Math.min(currentIndex + step, buttons.length - 1));
  irParaJanela(nextIndex);
}

function mudarMesCalendario(step) {
  currentMonth += step;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear -= 1;
  }
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear += 1;
  }
  renderCalendar();
}

function atualizarBuscaChamada() {
  if (typeof renderMembersTable === 'function') {
    renderMembersTable();
  }
}

function alterarOrdenacaoChamada(valor) {
  console.log('Ordenação alterada:', valor);
  if (typeof renderAttendanceListEditor === 'function') {
    renderAttendanceListEditor();
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
  initFilters();
  renderAttendanceListEditor();
  alert('✅ Ministério criado com sucesso!');
}

function salvarListaNaPasta() {
  saveGeneratedList();
}

function alternarTema() {
  const root = document.documentElement;
  const atual = root.getAttribute('data-theme') || 'dark';
  const novoTema = atual === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', novoTema);

  const btn = document.getElementById('btnTema');
  if (btn) {
    btn.textContent = novoTema === 'dark' ? '🌙 Modo Escuro' : '☀️ Modo Claro';
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
      return c ? `(${a}) ${b}-${c}` : `(${a}) ${b}`;
    });
  }
}

function renderListaMembros() {
  if (typeof renderMembersTable === 'function') {
    renderMembersTable();
  }
}

window.irParaJanela = irParaJanela;
window.navegarProximaJanela = navegarProximaJanela;
window.mudarMesCalendario = mudarMesCalendario;
window.atualizarBuscaChamada = atualizarBuscaChamada;
window.alterarOrdenacaoChamada = alterarOrdenacaoChamada;
window.criarMinisterio = criarMinisterio;
window.salvarListaNaPasta = salvarListaNaPasta;
window.alternarTema = alternarTema;
window.mascaraTelefone = mascaraTelefone;
window.renderListaMembros = renderListaMembros;
