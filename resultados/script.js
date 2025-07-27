// === SCRIPT COMPARTILHADO OTIMIZADO PARA MÚLTIPLAS PÁGINAS ===

// Variáveis globais compartilhadas
let globalData = {};
let activeCardId = null;
let selectedDateStr = getCurrentDateString();
let lastModifiedHeader = null;
let autoUpdateInterval = null;
let toastTimeout = null;
let orderPreference = localStorage.getItem('orderPreference') || 'ascending';
let currentImageBlob = null;
let imageOptions = {
  includeBankAd: true,
  includeGuesses: false
};
let currentCreatePngType = null;
let currentCreatePngCardId = null;
let titulosData = null;
let modalHistory = []; // Histórico de modais para navegação

// Cache de elementos DOM para melhor performance
const domCache = {
  dataContainer: null,
  datePickerInput: null,
  orderToggleBtn: null,
  toast: null,
  toastMessage: null,
  toastIcon: null,
  breadcrumbNav: null,
  init() {
    this.dataContainer = document.getElementById('data-container');
    this.datePickerInput = document.getElementById('date-picker');
    this.orderToggleBtn = document.getElementById('order-toggle-btn');
    this.toast = document.getElementById('toast');
    this.toastMessage = document.getElementById('toast-message');
    this.toastIcon = document.getElementById('toast-icon-text');
    this.breadcrumbNav = document.getElementById('breadcrumbNav');
  }
};

// Debounce utility para otimizar eventos
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

// Throttle utility para otimizar scroll e resize
function throttle(func, limit) {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }
}

// === FUNCIONALIDADES DE PARÂMETRO DE URL ===

// Função para capturar parâmetro de URL e armazenar no navegador
function captureAndStoreUrlParameter() {
  const urlParams = new URLSearchParams(window.location.search);
  const codeParam = urlParams.get('pr');
  
  if (codeParam) {
    localStorage.setItem("productCode", codeParam);
    console.log("Código do produto armazenado:", codeParam);
  }
}

// Função para recuperar o código armazenado
function getStoredProductCode() {
  return localStorage.getItem("productCode");
}

// === FUNÇÕES ORIGINAIS OTIMIZADAS ===

// Função para obter a data atual no fuso horário do usuário
function getCurrentDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Função para obter a data máxima (hoje) no fuso horário do usuário
function getTodayDateString() {
  return getCurrentDateString();
}

// Função para obter o dia da semana atual em português
function getCurrentDayOfWeek() {
  const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const today = new Date();
  return days[today.getDay()];
}

// Função para carregar e exibir os títulos - otimizada
async function loadTitulos() {
  try {
    const response = await fetch(getJsonPath('titulos.json') + '?t=' + Date.now());
    if (!response.ok) throw new Error('Não foi possível carregar os títulos.');
    
    titulosData = await response.json();
    
    // Definir o dia atual como padrão
    const currentDay = getCurrentDayOfWeek();
    const dayFilter = document.getElementById('dayFilter');
    if (dayFilter) {
      dayFilter.value = currentDay;
    }
    
    // Exibir títulos do dia atual
    displayTitulos(currentDay);
    
  } catch (error) {
    const titulosContent = document.getElementById('titulosContent');
    if (titulosContent) {
      titulosContent.innerHTML = `<div class="no-data">Erro ao carregar títulos: ${error.message}</div>`;
    }
  }
}

// Função para exibir os títulos de um dia específico - otimizada
function displayTitulos(dayOfWeek) {
  const content = document.getElementById('titulosContent');
  if (!content) return;
  
  if (!titulosData || !titulosData['1-5'] || !titulosData['1-5'][dayOfWeek]) {
    content.innerHTML = `<div class="no-data">Nenhum título encontrado para ${dayOfWeek}.</div>`;
    return;
  }
  
  const titulos = titulosData['1-5'][dayOfWeek];
  
  // Usar template string otimizada
  const titulosHtml = titulos.map((titulo, index) => `
    <div style="
      background: var(--bg-card); 
      border: 1px solid var(--border-color); 
      border-radius: 8px; 
      padding: 0.75rem 1rem; 
      transition: all 0.2s ease;
      cursor: default;
    " onmouseover="this.style.background='var(--bg-card-hover)'" onmouseout="this.style.background='var(--bg-card)'">
      <span style="color: var(--text-primary); font-weight: 500; font-family: 'JetBrains Mono', monospace;">
        ${titulo}
      </span>
    </div>
  `).join('');
  
  content.innerHTML = `
    <h4 style="margin: 0 0 1rem 0; color: var(--text-primary); font-size: 1.125rem;">📅 ${dayOfWeek}</h4>
    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
      ${titulosHtml}
    </div>
  `;
}

// Função para compartilhar imagem - otimizada
async function shareImage() {
  if (!currentImageBlob) {
    showToast('Nenhuma imagem disponível para compartilhar.');
    return;
  }

  try {
    if (navigator.share && navigator.canShare) {
      const file = new File([currentImageBlob], 'resultado.png', { type: 'image/png' });
      
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: getPageTitle(),
          text: 'Confira este resultado!',
          files: [file]
        });
        showToast('Imagem compartilhada com sucesso!');
      } else {
        // Fallback para compartilhamento de URL com código
        const shareUrl = `${window.location.origin}${window.location.pathname}?pr=${getStoredProductCode()}`;
        await navigator.share({
          title: getPageTitle(),
          text: 'Confira este resultado!',
          url: shareUrl
        });
        showToast('Link compartilhado com sucesso!');
      }
    } else {
      // Fallback: copiar para clipboard ou mostrar opções
      showToast('Compartilhamento não suportado. Use o botão Baixar PNG.');
    }
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error('Erro ao compartilhar:', error);
      showToast('Erro ao compartilhar imagem.');
    }
  }
}

// Função para abrir o modal de opções para criar PNG - otimizada
function openCreatePngModal(type, cardId) {
  currentCreatePngType = type;
  currentCreatePngCardId = cardId;
  
  // Para palpites, não mostrar opções (sempre incluir apenas banner)
  if (type === 'palpites') {
    generateImage(type, cardId);
    return;
  }
  
  // Para resultados, mostrar modal com opções
  const modalBody = document.getElementById('createPngModalBody');
  if (!modalBody) return;
  
  modalBody.innerHTML = `
    <div class="image-options">
      <h5>🖼️ Configurações da Imagem</h5>
      <div class="image-option">
        <input type="checkbox" id="addBankAdOption" name="addBankAd" ${imageOptions.includeBankAd ? 'checked' : ''}>
        <label for="addBankAdOption">Adicionar propaganda da banca</label>
      </div>
      <div class="image-option">
        <input type="checkbox" id="addPalpitesOption" name="addPalpites" ${imageOptions.includeGuesses ? 'checked' : ''}>
        <label for="addPalpitesOption">Adicionar palpites acima do banner</label>
      </div>
    </div>
  `;
  
  // Configurar botão de confirmação
  const confirmBtn = document.getElementById('confirmCreatePngBtn');
  if (confirmBtn) {
    confirmBtn.onclick = () => {
      const addBankAd = document.getElementById("addBankAdOption")?.checked || false;
      const addPalpites = document.getElementById("addPalpitesOption")?.checked || false;
      imageOptions.includeBankAd = addBankAd;
      imageOptions.includeGuesses = addPalpites;
      closeModal('createPngModal');
      generateImage(currentCreatePngType, currentCreatePngCardId);
    };
  }
  
  openModal('createPngModal');
}

// Inicialização do Flatpickr com configurações melhoradas - otimizada
function initializeFlatpickr() {
  const datePickerElement = document.getElementById("date-picker");
  if (!datePickerElement || typeof flatpickr === 'undefined') return;
  
  flatpickr(datePickerElement, {
    dateFormat: "Y-m-d",
    maxDate: getTodayDateString(),
    locale: "pt",
    defaultDate: getCurrentDateString(),
    allowInput: false,
    clickOpens: true,
    disableMobile: false,
    position: "auto center",
    onChange: debounce((selectedDates, dateStr) => {
      selectedDateStr = dateStr;
      fetchData(true);
    }, 300),
    onOpen: function() {
      requestAnimationFrame(() => {
        const calendar = document.querySelector('.flatpickr-calendar');
        if (calendar) {
          calendar.style.zIndex = '9999';
        }
      });
    }
  });
}

// Função para alternar a ordem dos cards - otimizada
function toggleOrder() {
  orderPreference = orderPreference === 'ascending' ? 'descending' : 'ascending';
  localStorage.setItem('orderPreference', orderPreference);
  
  if (domCache.orderToggleBtn) {
    domCache.orderToggleBtn.textContent = orderPreference === 'ascending' 
      ? '⬆⬇ Inverter Ordem (Mais recente primeiro)' 
      : '⬆⬇ Inverter Ordem (Mais antigo primeiro)';
  }
  
  renderData();
}

// Funções de Modal com controle de rolagem do body - otimizadas
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  
  modalHistory.push(modalId);
  modal.style.display = 'flex';
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  
  // Focus no primeiro elemento focável do modal
  requestAnimationFrame(() => {
    const focusableElement = modal.querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusableElement) {
      focusableElement.focus();
    }
  });
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  
  modal.style.display = 'none';
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  
  // Remover o modal atual do histórico
  const index = modalHistory.indexOf(modalId);
  if (index > -1) {
    modalHistory.splice(index, 1);
  }
}

// Funções do Modal de Imagem com controle de rolagem - otimizadas
function openImageModal() {
  const imageModal = document.getElementById('imageModal');
  if (!imageModal) return;
  
  imageModal.style.display = 'block';
  imageModal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
}

function closeImageModal() {
  const imageModal = document.getElementById("imageModal");
  if (!imageModal) return;
  
  imageModal.style.display = "none";
  imageModal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove("modal-open");
  currentImageBlob = null;
  
  modalHistory.pop(); // Remove o modal de imagem do histórico
  if (modalHistory.length > 0) {
    openModal(modalHistory[modalHistory.length - 1]); // Abre o modal anterior
  }
}

// Função principal para buscar dados - otimizada
async function fetchData(isManualAction = false) {
  const isToday = (selectedDateStr === getCurrentDateString());
  
  if (isManualAction) {
    lastModifiedHeader = null;
    if (autoUpdateInterval) {
      clearInterval(autoUpdateInterval);
      autoUpdateInterval = null;
    }
    if (domCache.dataContainer) {
      domCache.dataContainer.innerHTML = '<div class="no-data loading">Carregando dados...</div>';
    }
  }

  const url = getDataUrl(selectedDateStr);
  try {
    const response = await fetch(url, { 
      cache: "no-store",
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    
    if (!response.ok) throw new Error(`Resultados para ${selectedDateStr} não encontrados.`);
    
    const newLastModified = response.headers.get('Last-Modified');
    if (newLastModified && newLastModified === lastModifiedHeader) {
      return;
    }
    lastModifiedHeader = newLastModified;

    const newData = await response.json();
    const oldDataString = JSON.stringify(globalData);
    const newDataString = JSON.stringify(newData);

    if (oldDataString !== newDataString) {
        globalData = newData;
        renderData();
        if (!isManualAction) {
            const lastTitle = findLastResultTitle(globalData);
            showToast(`Resultado ${lastTitle} atualizado!`);
        }
    }
  } catch (error) {
    if (isManualAction && domCache.dataContainer) {
        domCache.dataContainer.innerHTML = `<div class="no-data">${error.message}</div>`;
    }
  } finally {
    if (isToday && !autoUpdateInterval) {
        autoUpdateInterval = setInterval(() => fetchData(false), 60000);
    } else if (!isToday && autoUpdateInterval) {
        clearInterval(autoUpdateInterval);
        autoUpdateInterval = null;
    }
  }
}

// Renderizar dados na página - otimizada
function renderData() {
  if (!domCache.dataContainer) return;
  
  domCache.dataContainer.innerHTML = '';
  let hasContent = false;

  const versions = ['1-5', '1-10'];
  const cards = [];

  // Usar for...of para melhor performance
  for (const version of versions) {
    if (globalData[version]) {
      for (const title in globalData[version]) {
        hasContent = true;
        const resultData = globalData[version][title];
        const cardId = `${version}-${title.replace(/[^a-zA-Z0-9]/g, '')}`;
        const card = createCard(cardId, version, title, resultData);
        cards.push({ card, title, version });
      }
    }
  }

  // Ordenar os cards com base na preferência
  cards.sort((a, b) => {
    const timeA = extractTime(a.title);
    const timeB = extractTime(b.title);
    return orderPreference === 'ascending' ? timeA - timeB : timeB - timeA;
  });

  // Usar DocumentFragment para melhor performance
  const fragment = document.createDocumentFragment();
  cards.forEach(({ card }) => {
    fragment.appendChild(card);
  });
  domCache.dataContainer.appendChild(fragment);

  if (!hasContent) {
    domCache.dataContainer.innerHTML = '<div class="no-data">Nenhum resultado disponível para a data selecionada.</div>';
  }
  
  toggleResultView();
}

// Função para extrair o horário do título para ordenação - otimizada
function extractTime(title) {
  const match = title.match(/(\d{2}:\d{2})/);
  if (match) {
    const [hours, minutes] = match[1].split(':').map(Number);
    return hours * 60 + minutes;
  }
  return 0;
}

// Criar card de resultado - otimizada
function createCard(cardId, version, title, data) {
    const card = document.createElement('div');
    card.className = 'card';
    card.id = cardId;
    card.dataset.version = version;

    // Header do card
    const header = document.createElement('div');
    header.className = 'card-header';
    const cardTitle = document.createElement('h2');
    cardTitle.className = 'card-title';
    cardTitle.textContent = title;
    header.appendChild(cardTitle);
    card.appendChild(header);

    // Body do card
    const body = document.createElement('div');
    body.className = 'card-body';
    
    if (data.dados && data.dados.some(d => d.Milhar)) {
        // Container da tabela
        const tableContainer = document.createElement('div');
        tableContainer.className = 'table-container';
        
        const table = document.createElement('table');
        
        // Criar thead
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        data.cabecalhos.forEach(h => {
            const th = document.createElement('th');
            th.textContent = h;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // Criar tbody
        const tbody = document.createElement('tbody');
        data.dados.forEach(row => {
            const tr = document.createElement('tr');
            data.cabecalhos.forEach(h => {
                const td = document.createElement('td');
                td.textContent = row[h] || '-';
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        
        tableContainer.appendChild(table);
        body.appendChild(tableContainer);

        // Timestamp usando horário do sistema
        const timestamp = document.createElement('div');
        timestamp.className = 'timestamp';
        timestamp.textContent = getFormattedTimestamp(selectedDateStr);
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
        const footerContent = [];
        
        // Milhar
        for (let i = 0; i < (data.acertos.Milhar || 0); i++) {
            footerContent.push(`<div class="acerto-balao milhar" title="Milhar e Centena">M</div>`);
        }
        
        // Centena
        for (let i = 0; i < (data.acertos.Centena || 0); i++) {
            footerContent.push(`<div class="acerto-balao centena" title="Centena e Dezena">C</div>`);
        }
        
        // Dezena
        if (data.acertos.Dezena > 0) {
            footerContent.push(`<div class="acerto-balao dezena" title="Dezenas">${data.acertos.Dezena}</div>`);
        }
        
        // Grupo
        if (data.acertos.Grupo) {
            data.acertos.Grupo.forEach(emoji => {
                footerContent.push(`<div class="acerto-balao grupo" title="Grupo">${emoji}</div>`);
            });
        }
        
        footer.innerHTML = footerContent.join('');
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

// Alternar visualização entre 1-5 e 1-10 - otimizada
function toggleResultView() {
    const has1to5 = document.querySelector('[data-version="1-5"]');
    const has1to10 = document.querySelector('[data-version="1-10"]');
    let show1to10 = localStorage.getItem('viewPreference') === '1-10';

    if (!has1to5 && has1to10) show1to10 = true;

    // Usar querySelectorAll uma vez e cache o resultado
    const allCards = document.querySelectorAll('.card');
    const toggleButtons = document.querySelectorAll('.toggle-view-btn');
    
    allCards.forEach(card => {
        const shouldShow = show1to10 ? card.dataset.version === '1-10' : card.dataset.version === '1-5';
        card.style.display = shouldShow ? 'block' : 'none';
    });

    toggleButtons.forEach(btn => {
        btn.innerHTML = show1to10 ? '👁️ Ver do 1º ao 5º' : '👁️ Ver do 1º ao 10º';
        btn.onclick = () => {
            localStorage.setItem('viewPreference', show1to10 ? '1-5' : '1-10');
            toggleResultView();
        };
    });
}

// Toast notification otimizada
function showToast(message, type = 'success') {
  if (!domCache.toast || !domCache.toastMessage || !domCache.toastIcon) return;
  
  // Limpar timeout anterior
  if (toastTimeout) {
    clearTimeout(toastTimeout);
  }
  
  domCache.toastMessage.textContent = message;
  domCache.toastIcon.textContent = type === 'success' ? '✓' : '⚠';
  
  domCache.toast.classList.add('show');
  
  toastTimeout = setTimeout(() => {
    domCache.toast.classList.remove('show');
  }, 3000);
}

// Função de inicialização comum otimizada
function initializeCommonFeatures() {
  // Inicializar cache DOM
  domCache.init();
  
  // Capturar parâmetro de URL
  captureAndStoreUrlParameter();
  
  // Inicializar Flatpickr
  initializeFlatpickr();
  
  // Event listeners otimizados
  if (domCache.orderToggleBtn) {
    domCache.orderToggleBtn.addEventListener('click', toggleOrder);
  }
  
  // Event delegation para modais
  document.addEventListener('click', (e) => {
    if (e.target.matches('.close-btn')) {
      const modal = e.target.closest('.modal');
      if (modal) {
        closeModal(modal.id);
      }
    }
  });
  
  // Keyboard navigation para modais
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalHistory.length > 0) {
      closeModal(modalHistory[modalHistory.length - 1]);
    }
  });
  
  // Lazy loading para imagens
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.classList.remove('lazy');
          observer.unobserve(img);
        }
      });
    });
    
    document.querySelectorAll('img[data-src]').forEach(img => {
      imageObserver.observe(img);
    });
  }
}

// Função para encontrar o último título de resultado
function findLastResultTitle(data) {
  let lastTitle = '';
  let lastTime = 0;
  
  const versions = ['1-5', '1-10'];
  for (const version of versions) {
    if (data[version]) {
      for (const title in data[version]) {
        const time = extractTime(title);
        if (time > lastTime) {
          lastTime = time;
          lastTitle = title;
        }
      }
    }
  }
  
  return lastTitle;
}

// Função para formatar timestamp
function getFormattedTimestamp(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  return `Atualizado em ${date.toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`;
}

// Placeholder functions que devem ser implementadas em outros arquivos
function shareContent(type, cardId) {
  console.log('shareContent não implementado');
}

function copyContent(type, cardId) {
  console.log('copyContent não implementado');
}

function generateImage(type, cardId) {
  console.log('generateImage não implementado');
}

function showResumo(cardId) {
  console.log('showResumo não implementado');
}

function showPalpites(fromResumo, cardId) {
  console.log('showPalpites não implementado');
}

function initializeBreadcrumb() {
  console.log('initializeBreadcrumb não implementado');
}

function initializeLotterySelector() {
  console.log('initializeLotterySelector não implementado');
}

function setAutomaticDomain() {
  console.log('setAutomaticDomain não implementado');
}

function setCopyrightText() {
  console.log('setCopyrightText não implementado');
}

// Performance monitoring
if (typeof performance !== 'undefined' && performance.mark) {
  performance.mark('script-loaded');
}

