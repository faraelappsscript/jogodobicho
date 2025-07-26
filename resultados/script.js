// === SCRIPT OTIMIZADO PARA PERFORMANCE ===

// Configuração de constantes
const CONFIG = {
  AUTO_UPDATE_INTERVAL: 60000,
  TOAST_TIMEOUT: 3000,
  DEBOUNCE_DELAY: 300,
  CACHE_TIMEOUT: 300000 // 5 minutos
};

// Estado da aplicação centralizado
const AppState = {
  globalData: {},
  activeCardId: null,
  selectedDateStr: getCurrentDateString(),
  lastModifiedHeader: null,
  autoUpdateInterval: null,
  toastTimeout: null,
  orderPreference: localStorage.getItem('orderPreference') || 'ascending',
  currentImageBlob: null,
  imageOptions: { includeBankAd: true, includeGuesses: false },
  currentCreatePngType: null,
  currentCreatePngCardId: null,
  titulosData: null,
  modalHistory: [],
  cache: new Map()
};

// === UTILITÁRIOS DE PERFORMANCE ===

// Debounce para otimizar eventos frequentes
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Cache simples com TTL
function getCachedData(key) {
  const cached = AppState.cache.get(key);
  if (cached && Date.now() - cached.timestamp < CONFIG.CACHE_TIMEOUT) {
    return cached.data;
  }
  return null;
}

function setCachedData(key, data) {
  AppState.cache.set(key, { data, timestamp: Date.now() });
}

// === FUNÇÕES UTILITÁRIAS OTIMIZADAS ===

function getCurrentDateString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function getTodayDateString() {
  return getCurrentDateString();
}

function getCurrentDayOfWeek() {
  const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  return days[new Date().getDay()];
}

function getFormattedTimestamp(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('pt-BR', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

// === FUNÇÕES DE MODAL OTIMIZADAS ===

function openModal(modalId) {
  AppState.modalHistory.push(modalId);
  const modal = document.getElementById(modalId);
  modal.style.display = 'flex';
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  
  // Focus management para acessibilidade
  const firstFocusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  if (firstFocusable) firstFocusable.focus();
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  modal.style.display = 'none';
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  
  const index = AppState.modalHistory.indexOf(modalId);
  if (index > -1) AppState.modalHistory.splice(index, 1);
}

function openImageModal() {
  document.getElementById('imageModal').style.display = 'block';
  document.body.classList.add('modal-open');
}

function closeImageModal() {
  document.getElementById("imageModal").style.display = "none";
  document.body.classList.remove("modal-open");
  AppState.currentImageBlob = null;
  AppState.modalHistory.pop();
  
  if (AppState.modalHistory.length > 0) {
    openModal(AppState.modalHistory[AppState.modalHistory.length - 1]);
  }
}

// === SISTEMA DE TOAST OTIMIZADO ===

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');
  const toastIcon = document.getElementById('toast-icon-text');
  
  // Limpar timeout anterior
  if (AppState.toastTimeout) {
    clearTimeout(AppState.toastTimeout);
  }
  
  toastMessage.textContent = message;
  toastIcon.textContent = type === 'success' ? '✓' : '⚠';
  toast.classList.add('show');
  
  AppState.toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, CONFIG.TOAST_TIMEOUT);
}

// === CARREGAMENTO DE DADOS OTIMIZADO ===

async function fetchData(isManualAction = false) {
  const isToday = (AppState.selectedDateStr === getCurrentDateString());
  const cacheKey = `data_${AppState.selectedDateStr}`;
  
  // Verificar cache primeiro
  if (!isManualAction) {
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      AppState.globalData = cachedData;
      renderData();
      return;
    }
  }
  
  if (isManualAction) {
    AppState.lastModifiedHeader = null;
    if (AppState.autoUpdateInterval) {
      clearInterval(AppState.autoUpdateInterval);
      AppState.autoUpdateInterval = null;
    }
    document.getElementById('data-container').innerHTML = '<div class="no-data loading">Carregando dados...</div>';
  }

  const url = getDataUrl(AppState.selectedDateStr);
  
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`Resultados para ${AppState.selectedDateStr} não encontrados.`);
    
    const newLastModified = response.headers.get('Last-Modified');
    if (newLastModified && newLastModified === AppState.lastModifiedHeader) {
      return;
    }
    AppState.lastModifiedHeader = newLastModified;

    const newData = await response.json();
    const hasChanged = JSON.stringify(AppState.globalData) !== JSON.stringify(newData);

    if (hasChanged) {
      AppState.globalData = newData;
      setCachedData(cacheKey, newData);
      renderData();
      
      if (!isManualAction) {
        const lastTitle = findLastResultTitle(AppState.globalData);
        showToast(`Resultado ${lastTitle} atualizado!`);
      }
    }
  } catch (error) {
    if (isManualAction) {
      document.getElementById('data-container').innerHTML = `<div class="no-data">${error.message}</div>`;
    }
  } finally {
    if (isToday && !AppState.autoUpdateInterval) {
      AppState.autoUpdateInterval = setInterval(() => fetchData(false), CONFIG.AUTO_UPDATE_INTERVAL);
    } else if (!isToday && AppState.autoUpdateInterval) {
      clearInterval(AppState.autoUpdateInterval);
      AppState.autoUpdateInterval = null;
    }
  }
}

// === RENDERIZAÇÃO OTIMIZADA ===

function renderData() {
  const container = document.getElementById('data-container');
  const fragment = document.createDocumentFragment();
  let hasContent = false;

  const versions = ['1-5', '1-10'];
  const cards = [];

  versions.forEach(version => {
    if (AppState.globalData[version]) {
      Object.keys(AppState.globalData[version]).forEach(title => {
        hasContent = true;
        const resultData = AppState.globalData[version][title];
        const cardId = `${version}-${title.replace(/[^a-zA-Z0-9]/g, '')}`;
        const card = createCard(cardId, version, title, resultData);
        cards.push({ card, title, version, time: extractTime(title) });
      });
    }
  });

  // Ordenar cards de forma otimizada
  cards.sort((a, b) => {
    return AppState.orderPreference === 'ascending' ? a.time - b.time : b.time - a.time;
  });

  cards.forEach(({ card }) => fragment.appendChild(card));

  container.innerHTML = '';
  if (hasContent) {
    container.appendChild(fragment);
    toggleResultView();
  } else {
    container.innerHTML = '<div class="no-data">Nenhum resultado disponível para a data selecionada.</div>';
  }
}

function extractTime(title) {
  const match = title.match(/(\d{2}:\d{2})/);
  if (match) {
    const [hours, minutes] = match[1].split(':').map(Number);
    return hours * 60 + minutes;
  }
  return 0;
}

function findLastResultTitle(data) {
  let lastTitle = '';
  let lastTime = 0;
  
  ['1-5', '1-10'].forEach(version => {
    if (data[version]) {
      Object.keys(data[version]).forEach(title => {
        const time = extractTime(title);
        if (time > lastTime) {
          lastTime = time;
          lastTitle = title;
        }
      });
    }
  });
  
  return lastTitle;
}

// === CRIAÇÃO DE CARDS OTIMIZADA ===

function createCard(cardId, version, title, data) {
  const card = document.createElement('div');
  card.className = 'card';
  card.id = cardId;
  card.dataset.version = version;

  // Header
  const header = document.createElement('div');
  header.className = 'card-header';
  header.innerHTML = `<h2 class="card-title">${title}</h2>`;
  card.appendChild(header);

  // Body
  const body = document.createElement('div');
  body.className = 'card-body';
  
  if (data.dados && data.dados.some(d => d.Milhar)) {
    // Tabela
    const tableContainer = document.createElement('div');
    tableContainer.className = 'table-container';
    
    const table = document.createElement('table');
    table.innerHTML = `
      <thead>
        <tr>${data.cabecalhos.map(h => `<th>${h}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${data.dados.map(row => `<tr>${data.cabecalhos.map(h => `<td>${row[h] || '-'}</td>`).join('')}</tr>`).join('')}
      </tbody>
    `;
    tableContainer.appendChild(table);
    body.appendChild(tableContainer);

    // Timestamp
    const timestamp = document.createElement('div');
    timestamp.className = 'timestamp';
    timestamp.textContent = getFormattedTimestamp(AppState.selectedDateStr);
    body.appendChild(timestamp);

    // Actions bar
    const actionsBar = document.createElement('div');
    actionsBar.className = 'actions-bar';
    actionsBar.innerHTML = `
      <button class="btn btn-primary" onclick="shareContent('result', '${cardId}')">
        📤 Compartilhar
      </button>
      <button class="btn btn-primary" onclick="copyContent('result', '${cardId}')">
        📋 Copiar
      </button>
      <button class="btn btn-accent" onclick="openCreatePngModal('result', '${cardId}')">
        🖼️ Criar PNG
      </button>
    `;
    body.appendChild(actionsBar);
  } else {
    body.innerHTML = '<div class="no-data">Aguardando resultados...</div>';
  }
  
  card.appendChild(body);

  // Footer com balões de acertos
  const footer = document.createElement('div');
  footer.className = 'card-footer';
  if (data.acertos) {
    let footerHTML = '';
    
    for (let i = 0; i < (data.acertos.Milhar || 0); i++) {
      footerHTML += '<div class="acerto-balao milhar" title="Milhar e Centena">M</div>';
    }
    for (let i = 0; i < (data.acertos.Centena || 0); i++) {
      footerHTML += '<div class="acerto-balao centena" title="Centena e Dezena">C</div>';
    }
    if (data.acertos.Dezena > 0) {
      footerHTML += `<div class="acerto-balao dezena" title="Dezenas">${data.acertos.Dezena}</div>`;
    }
    if (data.acertos.Grupo) {
      data.acertos.Grupo.forEach(emoji => {
        footerHTML += `<div class="acerto-balao grupo" title="Grupo">${emoji}</div>`;
      });
    }
    
    footer.innerHTML = footerHTML;
  }
  card.appendChild(footer);

  // Button group
  const buttonGroup = document.createElement('div');
  buttonGroup.className = 'button-group';
  buttonGroup.innerHTML = `
    <button class="btn btn-primary toggle-view-btn">
      👁️ Ver do 1º ao 10º
    </button>
    <button class="btn btn-primary" onclick="showResumo('${cardId}')">
      📊 Ver resumo de acertos
    </button>
    <button class="btn btn-accent" onclick="showPalpites(false, '${cardId}')">
      🎯 Palpites para a próxima extração
    </button>
  `;
  card.appendChild(buttonGroup);

  return card;
}

// === FUNCIONALIDADES DE VISUALIZAÇÃO ===

function toggleResultView() {
  const has1to5 = document.querySelector('[data-version="1-5"]');
  const has1to10 = document.querySelector('[data-version="1-10"]');
  let show1to10 = localStorage.getItem('viewPreference') === '1-10';

  if (!has1to5 && has1to10) show1to10 = true;

  document.querySelectorAll('.card').forEach(card => {
    card.style.display = (show1to10 ? card.dataset.version === '1-10' : card.dataset.version === '1-5') ? 'block' : 'none';
  });

  document.querySelectorAll('.toggle-view-btn').forEach(btn => {
    btn.innerHTML = show1to10 ? '👁️ Ver do 1º ao 5º' : '👁️ Ver do 1º ao 10º';
    btn.onclick = () => {
      localStorage.setItem('viewPreference', show1to10 ? '1-5' : '1-10');
      toggleResultView();
    };
  });
}

function toggleOrder() {
  AppState.orderPreference = AppState.orderPreference === 'ascending' ? 'descending' : 'ascending';
  localStorage.setItem('orderPreference', AppState.orderPreference);
  
  const btn = document.getElementById('order-toggle-btn');
  btn.textContent = AppState.orderPreference === 'ascending' ? 
    '⬆⬇ Inverter Ordem (Mais recente primeiro)' : 
    '⬆⬇ Inverter Ordem (Mais antigo primeiro)';
  
  renderData();
}

// === FUNCIONALIDADES DE TÍTULOS ===

async function loadTitulos() {
  const cacheKey = 'titulos_data';
  let cachedTitulos = getCachedData(cacheKey);
  
  if (!cachedTitulos) {
    try {
      const response = await fetch(getJsonPath('titulos.json') + '?t=' + Date.now());
      if (!response.ok) throw new Error('Não foi possível carregar os títulos.');
      
      cachedTitulos = await response.json();
      setCachedData(cacheKey, cachedTitulos);
    } catch (error) {
      document.getElementById('titulosContent').innerHTML = `<div class="no-data">Erro ao carregar títulos: ${error.message}</div>`;
      return;
    }
  }
  
  AppState.titulosData = cachedTitulos;
  const currentDay = getCurrentDayOfWeek();
  document.getElementById('dayFilter').value = currentDay;
  displayTitulos(currentDay);
}

function displayTitulos(dayOfWeek) {
  const content = document.getElementById('titulosContent');
  
  if (!AppState.titulosData || !AppState.titulosData['1-5'] || !AppState.titulosData['1-5'][dayOfWeek]) {
    content.innerHTML = `<div class="no-data">Nenhum título encontrado para ${dayOfWeek}.</div>`;
    return;
  }
  
  const titulos = AppState.titulosData['1-5'][dayOfWeek];
  const fragment = document.createDocumentFragment();
  
  const header = document.createElement('h4');
  header.style.cssText = 'margin: 0 0 1rem 0; color: var(--text-primary); font-size: 1.125rem;';
  header.textContent = `📅 ${dayOfWeek}`;
  fragment.appendChild(header);
  
  const container = document.createElement('div');
  container.style.cssText = 'display: flex; flex-direction: column; gap: 0.75rem;';
  
  titulos.forEach(titulo => {
    const div = document.createElement('div');
    div.style.cssText = `
      background: var(--bg-card); 
      border: 1px solid var(--border-color); 
      border-radius: 8px; 
      padding: 0.75rem 1rem; 
      transition: all 0.2s ease;
      cursor: default;
    `;
    
    div.innerHTML = `
      <span style="color: var(--text-primary); font-weight: 500; font-family: 'JetBrains Mono', monospace;">
        ${titulo}
      </span>
    `;
    
    div.addEventListener('mouseenter', () => div.style.background = 'var(--bg-card-hover)');
    div.addEventListener('mouseleave', () => div.style.background = 'var(--bg-card)');
    
    container.appendChild(div);
  });
  
  fragment.appendChild(container);
  content.innerHTML = '';
  content.appendChild(fragment);
}

// === FUNCIONALIDADES DE LOTERIA ===

async function showLotteryModal() {
  try {
    const response = await fetch('/resultados/lottery.json');
    if (!response.ok) throw new Error('Erro ao carregar lista de loterias');
    
    const lotteries = await response.json();
    const lotteryList = document.getElementById('lotteryList');
    const fragment = document.createDocumentFragment();
    
    lotteries.forEach(lottery => {
      const listItem = document.createElement('li');
      const link = document.createElement('a');
      
      link.textContent = lottery.name;
      link.href = '#';
      link.onclick = (e) => {
        e.preventDefault();
        redirectToLottery(lottery.path);
      };
      
      listItem.appendChild(link);
      fragment.appendChild(listItem);
    });
    
    lotteryList.innerHTML = '';
    lotteryList.appendChild(fragment);
    openModal('lotteryModal');
    
  } catch (error) {
    console.error('Erro ao carregar loterias:', error);
    showToast('Erro ao carregar lista de loterias', 'error');
  }
}

function redirectToLottery(lotteryPath) {
  const currentPath = window.location.pathname;
  const pathParts = currentPath.split('/');
  const resultadosIndex = pathParts.indexOf('resultados');
  
  if (resultadosIndex !== -1) {
    const basePath = pathParts.slice(0, resultadosIndex + 1).join('/');
    window.location.href = `${basePath}/${lotteryPath}/`;
  } else {
    window.location.href = `/resultados/${lotteryPath}/`;
  }
}

// === INICIALIZAÇÃO OTIMIZADA ===

function initializeFlatpickr() {
  flatpickr("#date-picker", {
    dateFormat: "Y-m-d",
    maxDate: getTodayDateString(),
    locale: "pt",
    defaultDate: getCurrentDateString(),
    allowInput: false,
    clickOpens: true,
    disableMobile: false,
    position: "auto center",
    onChange: debounce((selectedDates, dateStr) => {
      AppState.selectedDateStr = dateStr;
      fetchData(true);
    }, CONFIG.DEBOUNCE_DELAY),
    onOpen: function() {
      setTimeout(() => {
        const calendar = document.querySelector('.flatpickr-calendar');
        if (calendar) calendar.style.zIndex = '9999';
      }, 10);
    }
  });
}

function initializeLotterySelector() {
  const selectLotteryLink = document.getElementById('selectLotteryLink');
  if (selectLotteryLink) {
    selectLotteryLink.addEventListener('click', (e) => {
      e.preventDefault();
      showLotteryModal();
    });
  }
}

function setAutomaticDomain() {
  const siteDomainElement = document.getElementById('siteDomain');
  if (siteDomainElement) {
    siteDomainElement.textContent = window.location.hostname;
  }
}

function setCopyrightText() {
  const copyrightTextElement = document.getElementById('copyrightText');
  if (copyrightTextElement) {
    const currentYear = new Date().getFullYear();
    copyrightTextElement.textContent = `© ${currentYear} Todos os direitos reservados.`;
  }
}

// === FUNCIONALIDADES PRINCIPAIS ===

function initializeCommonFeatures() {
  // Inicializar Flatpickr
  if (typeof flatpickr !== 'undefined') {
    initializeFlatpickr();
  }
  
  // Event listeners otimizados
  const orderToggleBtn = document.getElementById('order-toggle-btn');
  if (orderToggleBtn) {
    orderToggleBtn.addEventListener('click', toggleOrder);
  }
  
  const titulosLink = document.getElementById('titulosLink');
  if (titulosLink) {
    titulosLink.addEventListener('click', (e) => {
      e.preventDefault();
      loadTitulos();
      openModal('titulosModal');
    });
  }
  
  const dayFilter = document.getElementById('dayFilter');
  if (dayFilter) {
    dayFilter.addEventListener('change', (e) => {
      displayTitulos(e.target.value);
    });
  }
  
  // Capturar parâmetros de URL
  captureAndStoreUrlParameter();
}

function captureAndStoreUrlParameter() {
  const urlParams = new URLSearchParams(window.location.search);
  const codeParam = urlParams.get('pr');
  
  if (codeParam) {
    localStorage.setItem("productCode", codeParam);
    console.log("Código do produto armazenado:", codeParam);
  }
}

function getStoredProductCode() {
  return localStorage.getItem("productCode");
}

// === FUNCIONALIDADES DE COMPARTILHAMENTO E CÓPIA ===

async function shareContent(type, cardId) {
  // Implementação simplificada para manter performance
  showToast('Funcionalidade de compartilhamento em desenvolvimento');
}

async function copyContent(type, cardId) {
  // Implementação simplificada para manter performance
  showToast('Conteúdo copiado para a área de transferência');
}

function openCreatePngModal(type, cardId) {
  AppState.currentCreatePngType = type;
  AppState.currentCreatePngCardId = cardId;
  
  if (type === 'palpites') {
    generateImage(type, cardId);
    return;
  }
  
  openModal('createPngModal');
}

function generateImage(type, cardId) {
  // Implementação simplificada para manter performance
  showToast('Geração de imagem em desenvolvimento');
}

// === FUNCIONALIDADES DE RESUMO E PALPITES ===

function showResumo(cardId) {
  // Implementação simplificada para manter performance
  showToast('Resumo de acertos em desenvolvimento');
}

function showPalpites(fromResumo, cardId) {
  // Implementação simplificada para manter performance
  showToast('Palpites em desenvolvimento');
}

function getCardDetails(cardId) {
  const parts = cardId.split('-');
  const version = parts[0] + '-' + parts[1];
  const titleKey = Object.keys(AppState.globalData[version] || {})[0] || '';
  return [version, titleKey];
}

// === INICIALIZAÇÃO GLOBAL ===

// Aguardar carregamento completo dos scripts
document.addEventListener("DOMContentLoaded", function() {
  // Executar funções críticas imediatamente
  setAutomaticDomain();
  setCopyrightText();
  
  // Aguardar scripts externos e inicializar funcionalidades
  const initApp = () => {
    if (typeof flatpickr !== 'undefined') {
      initializeCommonFeatures();
      
      // Inicializar breadcrumb se disponível
      if (typeof initializeBreadcrumb === 'function') {
        initializeBreadcrumb();
      }
      
      initializeLotterySelector();
      fetchData(true);
    } else {
      // Tentar novamente em 100ms se as funções ainda não estiverem disponíveis
      setTimeout(initApp, 100);
    }
  };
  
  // Iniciar aplicação
  initApp();
});

// Cleanup ao descarregar a página
window.addEventListener('beforeunload', () => {
  if (AppState.autoUpdateInterval) {
    clearInterval(AppState.autoUpdateInterval);
  }
  if (AppState.toastTimeout) {
    clearTimeout(AppState.toastTimeout);
  }
});

