// === SCRIPT COMPARTILHADO PARA MÚLTIPLAS PÁGINAS - OTIMIZADO CONSERVADORAMENTE ===

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

// Otimização: Cache de elementos DOM para evitar consultas repetidas
let domCache = {};

// Otimização: Função para inicializar cache DOM
function initDOMCache() {
  domCache = {
    dataContainer: document.getElementById('data-container'),
    orderToggleBtn: document.getElementById('order-toggle-btn'),
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toast-message'),
    toastIcon: document.getElementById('toast-icon-text')
  };
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

// === FUNÇÕES ORIGINAIS ===

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

// Função para carregar e exibir os títulos
async function loadTitulos() {
  try {
    const response = await fetch(getJsonPath('titulos.json') + '?t=' + new Date().getTime());
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

// Função para exibir os títulos de um dia específico
function displayTitulos(dayOfWeek) {
  const content = document.getElementById('titulosContent');
  
  if (!titulosData || !titulosData['1-5'] || !titulosData['1-5'][dayOfWeek]) {
    content.innerHTML = `<div class="no-data">Nenhum título encontrado para ${dayOfWeek}.</div>`;
    return;
  }
  
  const titulos = titulosData['1-5'][dayOfWeek];
  
  let html = `<h4 style="margin: 0 0 1rem 0; color: var(--text-primary); font-size: 1.125rem;">📅 ${dayOfWeek}</h4>`;
  html += '<div style="display: flex; flex-direction: column; gap: 0.75rem;">';
  
  titulos.forEach((titulo, index) => {
    html += `
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
    `;
  });
  
  html += '</div>';
  content.innerHTML = html;
}

// Função para compartilhar imagem
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

// Função para abrir o modal de opções para criar PNG
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

// Inicialização do Flatpickr com configurações melhoradas
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
    onChange: (selectedDates, dateStr) => {
      selectedDateStr = dateStr;
      fetchData(true);
    },
    onOpen: function() {
      // Otimização: Usar requestAnimationFrame para melhor performance
      requestAnimationFrame(() => {
        const calendar = document.querySelector('.flatpickr-calendar');
        if (calendar) {
          calendar.style.zIndex = '9999';
        }
      });
    }
  });
}

// Função para alternar a ordem dos cards
function toggleOrder() {
  orderPreference = orderPreference === 'ascending' ? 'descending' : 'ascending';
  localStorage.setItem('orderPreference', orderPreference);
  
  // Otimização: Usar cache DOM
  if (domCache.orderToggleBtn) {
    domCache.orderToggleBtn.textContent = orderPreference === 'ascending' 
      ? '⬆⬇ Inverter Ordem (Mais recente primeiro)' 
      : '⬆⬇ Inverter Ordem (Mais antigo primeiro)';
  }
  
  renderData();
}

// Funções de Modal com controle de rolagem do body
function openModal(modalId) {
  modalHistory.push(modalId);
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'flex';
    document.body.classList.add('modal-open');
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'none';
    document.body.classList.remove('modal-open');
    // Remover o modal atual do histórico
    const index = modalHistory.indexOf(modalId);
    if (index > -1) {
      modalHistory.splice(index, 1);
    }
  }
}

// Funções do Modal de Imagem com controle de rolagem
function openImageModal() {
  const imageModal = document.getElementById('imageModal');
  if (imageModal) {
    imageModal.style.display = 'block';
    document.body.classList.add('modal-open');
  }
}

function closeImageModal() {
  const imageModal = document.getElementById("imageModal");
  if (imageModal) {
    imageModal.style.display = "none";
    document.body.classList.remove("modal-open");
    currentImageBlob = null;
    modalHistory.pop(); // Remove o modal de imagem do histórico
    if (modalHistory.length > 0) {
      openModal(modalHistory[modalHistory.length - 1]); // Abre o modal anterior
    }
  }
}

// Função principal para buscar dados
async function fetchData(isManualAction = false) {
  const isToday = (selectedDateStr === getCurrentDateString());
  
  if (isManualAction) {
    lastModifiedHeader = null;
    if (autoUpdateInterval) {
      clearInterval(autoUpdateInterval);
      autoUpdateInterval = null;
    }
    // Otimização: Usar cache DOM
    if (domCache.dataContainer) {
      domCache.dataContainer.innerHTML = '<div class="no-data loading">Carregando dados...</div>';
    }
  }

  const url = getDataUrl(selectedDateStr);
  try {
    const response = await fetch(url, { cache: "no-store" });
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

// Renderizar dados na página
function renderData() {
  // Otimização: Usar cache DOM
  const container = domCache.dataContainer || document.getElementById('data-container');
  if (!container) return;
  
  container.innerHTML = '';
  let hasContent = false;

  const versions = ['1-5', '1-10'];
  let cards = [];

  versions.forEach(version => {
    if (globalData[version]) {
      for (const title in globalData[version]) {
        hasContent = true;
        const resultData = globalData[version][title];
        const cardId = `${version}-${title.replace(/[^a-zA-Z0-9]/g, '')}`;
        const card = createCard(cardId, version, title, resultData);
        cards.push({ card, title, version });
      }
    }
  });

  // Ordenar os cards com base na preferência
  cards.sort((a, b) => {
    const timeA = extractTime(a.title);
    const timeB = extractTime(b.title);
    return orderPreference === 'ascending' ? timeA - timeB : timeB - timeA;
  });

  // Otimização: Usar DocumentFragment para melhor performance
  const fragment = document.createDocumentFragment();
  cards.forEach(({ card }) => {
    fragment.appendChild(card);
  });
  container.appendChild(fragment);

  if (!hasContent) {
    container.innerHTML = '<div class="no-data">Nenhum resultado disponível para a data selecionada.</div>';
  }
  
  toggleResultView();
}

// Função para extrair o horário do título para ordenação
function extractTime(title) {
  const match = title.match(/(\d{2}:\d{2})/);
  if (match) {
    const [hours, minutes] = match[1].split(':').map(Number);
    return hours * 60 + minutes;
  }
  return 0;
}

// Criar card de resultado
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
        for (let i = 0; i < (data.acertos.Milhar || 0); i++) {
            footer.innerHTML += `<div class="acerto-balao milhar" title="Milhar e Centena">M</div>`;
        }
        for (let i = 0; i < (data.acertos.Centena || 0); i++) {
            footer.innerHTML += `<div class="acerto-balao centena" title="Centena e Dezena">C</div>`;
        }
        if (data.acertos.Dezena > 0) {
            footer.innerHTML += `<div class="acerto-balao dezena" title="Dezenas">${data.acertos.Dezena}</div>`;
        }
        if (data.acertos.Grupo) {
            data.acertos.Grupo.forEach(emoji => {
                footer.innerHTML += `<div class="acerto-balao grupo" title="Grupo">${emoji}</div>`;
            });
        }
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

// Alternar visualização entre 1-5 e 1-10
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

// Otimização: Toast notification melhorada
function showToast(message, type = 'success') {
  // Usar cache DOM
  const toast = domCache.toast || document.getElementById('toast');
  const toastMessage = domCache.toastMessage || document.getElementById('toast-message');
  const toastIcon = domCache.toastIcon || document.getElementById('toast-icon-text');
  
  if (!toast || !toastMessage || !toastIcon) return;
  
  // Limpar timeout anterior
  if (toastTimeout) {
    clearTimeout(toastTimeout);
  }
  
  toastMessage.textContent = message;
  toastIcon.textContent = type === 'success' ? '✓' : '⚠';
  
  toast.classList.add('show');
  
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Otimização: Função de inicialização comum melhorada
function initializeCommonFeatures() {
  // Inicializar cache DOM
  initDOMCache();
  
  // Capturar parâmetro de URL
  captureAndStoreUrlParameter();
  
  // Inicializar Flatpickr
  initializeFlatpickr();
  
  // Event listeners
  if (domCache.orderToggleBtn) {
    domCache.orderToggleBtn.addEventListener('click', toggleOrder);
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

