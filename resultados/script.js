// === SCRIPT COMPARTILHADO PARA MÚLTIPLAS PÁGINAS ===

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
    document.getElementById('dayFilter').value = currentDay;
    
    // Exibir títulos do dia atual
    displayTitulos(currentDay);
    
  } catch (error) {
    document.getElementById('titulosContent').innerHTML = `<div class="no-data">Erro ao carregar títulos: ${error.message}</div>`;
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
        const imageUrl = URL.createObjectURL(currentImageBlob);
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
  document.getElementById('confirmCreatePngBtn').onclick = () => {
    const addBankAd = document.getElementById("addBankAdOption").checked;
    const addPalpites = document.getElementById("addPalpitesOption").checked;
    imageOptions.includeBankAd = addBankAd;
    imageOptions.includeGuesses = addPalpites;
    closeModal('createPngModal');
    generateImage(currentCreatePngType, currentCreatePngCardId);
  };
  
  openModal('createPngModal');
}

// Inicialização do Flatpickr com configurações melhoradas
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
    onChange: (selectedDates, dateStr) => {
      selectedDateStr = dateStr;
      fetchData(true);
    },
    onOpen: function() {
      setTimeout(() => {
        const calendar = document.querySelector('.flatpickr-calendar');
        if (calendar) {
          calendar.style.zIndex = '9999';
        }
      }, 10);
    }
  });
}

// Função para alternar a ordem dos cards
function toggleOrder() {
  orderPreference = orderPreference === 'ascending' ? 'descending' : 'ascending';
  localStorage.setItem('orderPreference', orderPreference);
  document.getElementById('order-toggle-btn').textContent = orderPreference === 'ascending' ? '⬆⬇ Inverter Ordem (Mais recente primeiro)' : '⬆⬇ Inverter Ordem (Mais antigo primeiro)';
  renderData();
}

// Funções de Modal com controle de rolagem do body
function openModal(modalId) {
  modalHistory.push(modalId);
  document.getElementById(modalId).style.display = 'flex';
  document.body.classList.add('modal-open');
}

function closeModal(modalId) {
  document.getElementById(modalId).style.display = 'none';
  document.body.classList.remove('modal-open');
  // Remover o modal atual do histórico
  const index = modalHistory.indexOf(modalId);
  if (index > -1) {
    modalHistory.splice(index, 1);
  }
}

// Funções do Modal de Imagem com controle de rolagem
function openImageModal() {
  document.getElementById('imageModal').style.display = 'block';
  document.body.classList.add('modal-open');
}

function closeImageModal() {
  document.getElementById("imageModal").style.display = "none";
  document.body.classList.remove("modal-open");
  currentImageBlob = null;
  modalHistory.pop(); // Remove o modal de imagem do histórico
  if (modalHistory.length > 0) {
    openModal(modalHistory[modalHistory.length - 1]); // Abre o modal anterior
  }
}

// Função principal para buscar dados
async function fetchData(isManualAction = false) {
  const isToday = (selectedDateStr === getCurrentDateString());
  
  if (isManualAction) {
    lastModifiedHeader = null;
    if (autoUpdateInterval) clearInterval(autoUpdateInterval);
    document.getElementById('data-container').innerHTML = '<div class="no-data loading">Carregando dados...</div>';
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
    if (isManualAction) {
        document.getElementById('data-container').innerHTML = `<div class="no-data">${error.message}</div>`;
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
  const container = document.getElementById('data-container');
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

  cards.forEach(({ card }) => {
    container.appendChild(card);
  });

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
            localStorage.setItem('viewPreference', localStorage.getItem('viewPreference') === '1-10' ? '1-5' : '1-10');
            toggleResultView();
        };
    });
}

// Mostrar resumo de acertos
function showResumo(cardId) {
    activeCardId = cardId;
    const [version, titleKey] = getCardDetails(cardId);
    const data = globalData[version][titleKey];

    const modalBody = document.getElementById('resumoModalBody');
    let content = '<h4>📊 Resultados</h4>';
    
    content += `
        <div class="table-container">
            <table>
                <thead>
                    <tr>${data.cabecalhos.map(h => `<th>${h}</th>`).join('')}</tr>
                </thead>
                <tbody>
                    ${data.dados.map(row => `<tr>${data.cabecalhos.map(h => `<td>${row[h] || '-'}</td>`).join('')}</tr>`).join('')}
                </tbody>
            </table>
        </div>
    `;

    content += `<div class="timestamp">${getFormattedTimestamp(selectedDateStr)}</div>`;
    
    content += `
        <div class="actions-bar">
            <button class="btn btn-primary" onclick="shareContent('result', '${cardId}')">
                📤 Compartilhar
            </button>
            <button class="btn btn-primary" onclick="copyContent('result', '${cardId}')">
                📋 Copiar Resultado
            </button>
            <button class="btn btn-accent" onclick="openCreatePngModal('result', '${cardId}')">
                🖼️ Criar PNG
            </button>
        </div>
    `;

    content += '<h4 style="margin-top: 2rem;">🎯 Frases de Acertos</h4>';
    const frasesContainer = document.createElement('div');
    frasesContainer.className = 'frases-acertos';
    
    if (data.frases && Object.keys(data.frases).length > 0) {
        for (const palpite in data.frases) {
            data.frases[palpite].forEach(frase => {
                frasesContainer.innerHTML += `<p><strong>Palpite ${palpite}:</strong><br>${frase.replace(/<br>/g, ' ')}</p>`;
            });
        }
        content += frasesContainer.outerHTML;
        content += `
            <div class="actions-bar" style="padding-top:0;">
                <button class="btn btn-primary" onclick="copyContent('frases', '${cardId}')">
                    📋 Copiar Frases de Acertos
                </button>
            </div>
        `;
    } else {
        frasesContainer.innerHTML = '<p>Nenhum acerto com os palpites fornecidos.</p>';
        content += frasesContainer.outerHTML;
    }
    
    content += `<p style="margin-top: 2rem; font-style: italic; color: var(--text-secondary);">${data.resumo || ''}</p>`;
    
    modalBody.innerHTML = content;
    document.getElementById('resumoModalPalpitesBtn').onclick = () => showPalpites(true, cardId);
    openModal('resumoModal');
}

// Mostrar palpites
async function showPalpites(fromResumo, cardId) {
    activeCardId = cardId;
    const modalBody = document.getElementById('palpitesModalBody');
    modalBody.innerHTML = '<div class="no-data loading">Carregando palpites...</div>';
    
    document.getElementById('voltarBtn').style.display = fromResumo ? 'inline-flex' : 'none';
    document.getElementById('voltarBtn').onclick = () => {
        closeModal('palpitesModal');
        openModal('resumoModal');
    };

    try {
        const response = await fetch(getJsonPath('palpites.json') + '?t=' + new Date().getTime());
        if (!response.ok) throw new Error('Não foi possível carregar os palpites.');
        const palpitesData = await response.json();
        
        const [version, ] = getCardDetails(cardId);
        const frase = palpitesData[`frase_${version}`] || "Palpites para a próxima extração:";
        
        let content = `<h4>🎯 ${frase}</h4>`;
        content += `<div class="font-mono" style="background: var(--bg-secondary); padding: 1.5rem; border-radius: 12px; word-break: break-word; line-height: 1.8;">${palpitesData.palpites.join(', ')}</div>`;
        
        content += `
            <div class="actions-bar" style="margin-top: 2rem;">
                <button class="btn btn-primary" onclick="shareContent('palpites', '${cardId}')">
                    📤 Compartilhar
                </button>
                <button class="btn btn-primary" onclick="copyContent('palpites', '${cardId}')">
                    📋 Copiar Palpites
                </button>
                <button class="btn btn-accent" onclick="generateImage('palpites', '${cardId}')">
                    🖼️ Criar PNG
                </button>
            </div>
        `;
        modalBody.innerHTML = content;
    } catch (error) {
        modalBody.innerHTML = `<div class="no-data">${error.message}</div>`;
    }

    if (fromResumo) closeModal('resumoModal');
    openModal('palpitesModal');
}

// Função para gerar imagem PNG usando Canvas nativo com layout melhorado
async function generateImage(type, cardId) {
    try {
        const [version, titleKey] = getCardDetails(cardId);
        const data = globalData[version][titleKey];
        
        // Verificar opções de imagem para resultados
        if (type === 'result') {
            const selectedOption = document.querySelector('input[name="imageContent"]:checked');
            if (selectedOption) {
                imageOptions.includeBanner = selectedOption.value === 'banner';
                imageOptions.includeGuesses = selectedOption.value === 'guesses';
            }
        }
        
        // Criar canvas com tamanho otimizado
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Configurar tamanho do canvas no formato 9:16 para mobile
        canvas.width = 720;
        canvas.height = 1280;
        
        // Sempre usar gradiente como plano de fundo
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#0f0f23'); // --bg-primary
        gradient.addColorStop(0.3, '#16213e'); // --bg-card
        gradient.addColorStop(0.7, '#1a1a2e'); // --bg-secondary
        gradient.addColorStop(1, '#0f0f23'); // --bg-primary
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Adicionar efeito de borda sutil
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
        ctx.lineWidth = 2;
        ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
        
        let yPosition = 80;
        
        // Tentar carregar e desenhar logo
        try {
            const logoImg = new Image();
            logoImg.crossOrigin = 'anonymous';
            await new Promise((resolve, reject) => {
                logoImg.onload = resolve;
                logoImg.onerror = resolve;
                logoImg.src = getImagePath('logo.png');
                setTimeout(resolve, 2000);
            });
            
            if (logoImg.complete && logoImg.naturalWidth > 0) {
                const originalLogoHeight = 80;
                const logoHeight = originalLogoHeight * 1.5;
                const logoWidth = (logoImg.naturalWidth / logoImg.naturalHeight) * logoHeight;
                const logoX = (canvas.width - logoWidth) / 2;
                ctx.drawImage(logoImg, logoX, 30, logoWidth, logoHeight);
                yPosition = 30 + logoHeight + 60;
            }
        } catch (error) {
            console.log('Logo não carregada, continuando sem ela');
        }
        
        // Configurar fonte principal
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        
        if (type === 'result') {
            // Título principal com estilo melhorado
            ctx.font = 'bold 36px Inter, Arial, sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(titleKey, canvas.width / 2, yPosition);
            yPosition += 50;
            
            // Data abaixo do título
            ctx.font = 'bold 24px Inter, Arial, sans-serif'; // Aumentado de 20px para 24px
            ctx.fillStyle = '#94a3b8';
            ctx.fillText(getFormattedTimestamp(selectedDateStr), canvas.width / 2, yPosition);
            yPosition += 80;
            
            // Desenhar tabela ocupando toda a largura com fonte maior e espaçamento reduzido
            ctx.font = '32px JetBrains Mono, monospace';
            
            // Cabeçalhos da tabela - largura total
            const tableWidth = canvas.width - 40;
            const colWidth = tableWidth / data.cabecalhos.length;
            const startX = 20;
            
            // Fundo dos cabeçalhos
            ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
            ctx.fillRect(startX, yPosition - 20, tableWidth, 32);
            
            // Texto dos cabeçalhos
            ctx.fillStyle = '#3b82f6';
            ctx.font = 'bold 28px Inter, Arial, sans-serif';
            data.cabecalhos.forEach((header, index) => {
                ctx.fillText(header, startX + (index + 0.5) * colWidth, yPosition);
            });
            yPosition += 40;
            
            // Dados da tabela com espaçamento reduzido
            ctx.font = '30px JetBrains Mono, monospace';
            data.dados.forEach((row, rowIndex) => {
                // Alternar cor de fundo das linhas
                if (rowIndex % 2 === 0) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
                    ctx.fillRect(startX, yPosition - 15, tableWidth, 25);
                }
                
                data.cabecalhos.forEach((header, colIndex) => {
                    // Destacar primeira linha (1º lugar)
                    ctx.fillStyle = rowIndex === 0 ? '#FFD700' : '#e2e8f0';
                    const text = row[header] || '-';
                    
                    // Adicionar coroa para o primeiro lugar
                    if (rowIndex === 0 && colIndex === 0) {
                        ctx.fillText('👑 ' + text, startX + (colIndex + 0.5) * colWidth, yPosition);
                    } else {
                        ctx.fillText(text, startX + (colIndex + 0.5) * colWidth, yPosition);
                    }
                });
                yPosition += 30;
            });
            
            // Verificar se deve incluir palpites em vez do banner
            if (imageOptions.includeGuesses) {
                try {
                    const response = await fetch(getJsonPath('palpites.json') + '?t=' + new Date().getTime());
                    const palpitesData = await response.json();
                    const frase = palpitesData[`frase_${version}`] || "Palpites para a próxima extração:";
                    
                    yPosition += 40;
                    
                    // Título dos palpites
                    ctx.font = 'bold 24px Inter, Arial, sans-serif';
                    ctx.fillStyle = '#ffffff';
                    
                    // Quebrar título em múltiplas linhas se necessário
                    const words = frase.split(' ');
                    let line = '';
                    const maxWidth = canvas.width - 40;
                    
                    for (let n = 0; n < words.length; n++) {
                        const testLine = line + words[n] + ' ';
                        const metrics = ctx.measureText(testLine);
                        
                        if (metrics.width > maxWidth && n > 0) {
                            ctx.fillText(line, canvas.width / 2, yPosition);
                            line = words[n] + ' ';
                            yPosition += 30;
                        } else {
                            line = testLine;
                        }
                    }
                    ctx.fillText(line, canvas.width / 2, yPosition);
                    yPosition += 60;
                    
                    // Configurar grade de 5 colunas para os palpites (mobile-friendly)
                    const gridCols = 5;
                    const gridStartX = 20;
                    const gridWidth = canvas.width - 40;
                    const cellWidth = gridWidth / gridCols;
                    const cellHeight = 60;
                    const fontSize = 24;
                    
                    ctx.font = `bold ${fontSize}px JetBrains Mono, monospace`;
                    ctx.textAlign = 'center';
                    
                    // Fundo para a grade de palpites - alinhamento perfeito
                    const gridRows = Math.ceil(palpitesData.palpites.length / gridCols);
                    const gridHeight = gridRows * cellHeight;
                    ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
                    ctx.fillRect(gridStartX, yPosition - cellHeight/2, gridWidth, gridHeight);
                    
                    // Desenhar os palpites em grade
                    palpitesData.palpites.forEach((palpite, index) => {
                        const row = Math.floor(index / gridCols);
                        const col = index % gridCols;
                        
                        const cellX = gridStartX + col * cellWidth;
                        const cellY = yPosition + row * cellHeight;
                        
                        // Fundo alternado para as células - alinhamento correto
                        if ((row + col) % 2 === 0) {
                            ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
                            ctx.fillRect(cellX, cellY - cellHeight/2, cellWidth, cellHeight);
                        }
                        
                        // Texto do palpite
                        ctx.fillStyle = '#e2e8f0';
                        ctx.fillText(palpite, cellX + cellWidth/2, cellY + fontSize/3);
                    });
                    
                    yPosition += gridHeight + 10;
                    
                } catch (error) {
                    console.log('Erro ao carregar palpites para imagem');
                }
            }
            
        } else if (type === 'palpites') {
            try {
                const response = await fetch(getJsonPath('palpites.json') + '?t=' + new Date().getTime());
                const palpitesData = await response.json();
                const frase = palpitesData[`frase_${version}`] || "Palpites para a próxima extração:";
                
                // Título dos palpites
                ctx.font = 'bold 28px Inter, Arial, sans-serif';
                ctx.fillStyle = '#ffffff';
                
                // Quebrar título em múltiplas linhas se necessário
                const words = frase.split(' ');
                let line = '';
                const maxWidth = canvas.width - 40;
                
                for (let n = 0; n < words.length; n++) {
                    const testLine = line + words[n] + ' ';
                    const metrics = ctx.measureText(testLine);
                    
                    if (metrics.width > maxWidth && n > 0) {
                        ctx.fillText(line, canvas.width / 2, yPosition);
                        line = words[n] + ' ';
                        yPosition += 35;
                    } else {
                        line = testLine;
                    }
                }
                ctx.fillText(line, canvas.width / 2, yPosition);
                yPosition += 40;
                
                // Data abaixo do título dos palpites
                ctx.font = 'bold 18px Inter, Arial, sans-serif';
                ctx.fillStyle = '#94a3b8';
                ctx.fillText(getFormattedTimestamp(selectedDateStr), canvas.width / 2, yPosition);
                yPosition += 80;
                
                // Configurar grade de 5 colunas para os palpites (mobile-friendly)
                const gridCols = 5;
                const gridStartX = 20;
                const gridWidth = canvas.width - 40;
                const cellWidth = gridWidth / gridCols;
                const cellHeight = 60;
                const fontSize = 24;
                
                ctx.font = `bold ${fontSize}px JetBrains Mono, monospace`;
                ctx.textAlign = 'center';
                
                // Fundo para a grade de palpites - alinhamento perfeito
                const gridRows = Math.ceil(palpitesData.palpites.length / gridCols);
                const gridHeight = gridRows * cellHeight;
                ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
                ctx.fillRect(gridStartX, yPosition - cellHeight/2, gridWidth, gridHeight);
                
                // Desenhar os palpites em grade
                palpitesData.palpites.forEach((palpite, index) => {
                    const row = Math.floor(index / gridCols);
                    const col = index % gridCols;
                    
                    const cellX = gridStartX + col * cellWidth;
                    const cellY = yPosition + row * cellHeight;
                    
                    // Fundo alternado para as células - alinhamento correto
                    if ((row + col) % 2 === 0) {
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
                        ctx.fillRect(cellX, cellY - cellHeight/2, cellWidth, cellHeight);
                    }
                    
                    // Texto do palpite
                    ctx.fillStyle = '#e2e8f0';
                    ctx.fillText(palpite, cellX + cellWidth/2, cellY + fontSize/3);
                });
                
                yPosition += gridHeight + 10;
                
            } catch (error) {
                ctx.fillText('Erro ao carregar palpites', canvas.width / 2, yPosition);
                yPosition += 60;
            }
        }
        
        // Espaço para a propaganda da banca (condicional baseado nas opções)
        if (type === 'palpites' || (type === 'result' && imageOptions.includeBankAd)) {
            // Definir o espaço disponível para a propaganda da banca
            const adAreaStart = yPosition + 10;
            const adAreaEnd = canvas.height - 120; // Considerando o espaço para o domínio do site
            const adAreaHeight = adAreaEnd - adAreaStart;

            const adText = "Na 77x Brasil, o seu 1 Real vale 8 Mil!\nBônus de 20% na sua primeira recarga!\nAcesse o site para mais!";
            const adLines = adText.split("\n");

            // Calcular a altura total do texto da propaganda
            let totalTextHeight = 0;
            // Altura da primeira linha (maior fonte)
            ctx.font = 'bold 40px Inter, Arial, sans-serif';
            totalTextHeight += 40; // Aproximadamente a altura da fonte
            // Altura das linhas seguintes (menor fonte)
            ctx.font = 'bold 28px Inter, Arial, sans-serif';
            totalTextHeight += (adLines.length - 1) * 35; // 35 é o espaçamento entre as linhas

            // Calcular a posição Y inicial para centralizar verticalmente
            let currentY = adAreaStart + (adAreaHeight - totalTextHeight) / 2;

            // Desenhar a primeira linha com fonte maior e cor amarela vibrante
            ctx.font = 'bold 36px Inter, Arial, sans-serif'; // Fonte um pouco menor
            ctx.fillStyle = '#FFFF00'; // Amarelo vibrante
            ctx.fillText(adLines[0], canvas.width / 2, currentY);
            currentY += 40; // Ajustar para a próxi            // Desenhar as linhas seguintes com fonte menor e fundo azul escuro
            ctx.font = 'bold 36px Inter, Arial, sans-serif'; // Aumentado de 32px para 36px         ctx.fillStyle = '#ffffff'; // Cor do texto para as linhas restantes
            for (let i = 1; i < adLines.length; i++) {
                // Calcular largura do texto para o fundo
                const textWidth = ctx.measureText(adLines[i]).width;
                const backgroundPadding = 20; // Preenchimento para o fundo
                const backgroundX = (canvas.width / 2) - (textWidth / 2) - (backgroundPadding / 2);
                const backgroundY = currentY - 28; // Ajustar para a posição vertical do texto
                const backgroundHeight = 35; // Altura do fundo

                // Desenhar fundo azul escuro
                ctx.fillStyle = 'rgba(0, 0, 128, 0.7)'; // Azul escuro com transparência
                ctx.fillRect(backgroundX, backgroundY, textWidth + backgroundPadding, backgroundHeight);
                
                // Desenhar texto
                ctx.fillStyle = '#ffffff'; // Cor do texto
                ctx.fillText(adLines[i], canvas.width / 2, currentY);
                currentY += 35; // Espaçamento entre as linhas
            }
            yPosition = currentY + 20; // Atualizar yPosition para o próximo elemento
        }
        
        // Domínio do site na parte inferior com fonte muito maior
        ctx.font = 'bold 48px Inter, Arial, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(window.location.hostname, canvas.width / 2, canvas.height - 60);
        
        // Converter canvas para blob
        canvas.toBlob((blob) => {
            if (!blob) {
                throw new Error('Falha ao gerar imagem');
            }
            
            currentImageBlob = blob;
            
            // Criar URL para preview
            const imageUrl = URL.createObjectURL(blob);
            document.getElementById('previewImage').src = imageUrl;
            
            // Configurar botão de download
            document.getElementById('downloadImageBtn').onclick = () => {
                const link = document.createElement('a');
                link.href = imageUrl;
                link.download = `${type}_${titleKey.replace(/[^a-zA-Z0-9]/g, '_')}_${selectedDateStr}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            };
            
            // Abrir modal de visualização
            openImageModal();
        }, 'image/png', 0.9);
        
    } catch (error) {
        console.error('Erro ao gerar imagem:', error);
        alert('Erro ao gerar imagem: ' + error.message);
    }
}

// Mostrar notificação toast
function showToast(message) {
    const toast = document.getElementById("toast");
    const messageSpan = document.getElementById("toast-message");

    if (toastTimeout) {
        clearTimeout(toastTimeout);
    }

    messageSpan.textContent = message;
    toast.classList.add("show");

    toastTimeout = setTimeout(() => {
        toast.classList.remove("show");
    }, 4000);
}

// Formatar timestamp usando horário do sistema
function getFormattedTimestamp(dateStr) {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('pt-BR', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

// Gerar texto para compartilhamento/cópia - ATUALIZADO COM CÓDIGO
async function generateText(type, cardId) {
    const [version, titleKey] = getCardDetails(cardId);
    const data = globalData[version][titleKey];
    const baseUrl = window.location.href;
    
    // Construir URL apenas com código se existir
    const storedCode = getStoredProductCode();
    const pageUrl = storedCode ? 
        `${window.location.origin}${window.location.pathname}?pr=${storedCode}` : 
        `${window.location.origin}${window.location.pathname}`;
    
    const timestamp = getFormattedTimestamp(selectedDateStr);

    if (type === 'result') {
        let text = `*Resultado ${titleKey}*\n_${timestamp}_\n\n`;
        data.dados.forEach(row => {
            text += `${row['Prêmio'] || ''}: *${row['Milhar'] || ''}* - ${row['Grupo'] || ''} ${row['Bicho'] || ''}\n`;
        });
        text += `\nVeja mais em: ${pageUrl}`;
        return text;
    }

    if (type === 'frases') {
        let text = `*Frases de Acertos - ${titleKey}*\n\n`;
        if (data.frases && Object.keys(data.frases).length > 0) {
            for (const palpite in data.frases) {
                data.frases[palpite].forEach(frase => {
                    text += `Palpite ${palpite}: ${frase.replace(/<br>/g, ' ')}\n`;
                });
            }
        } else {
            text = "Nenhuma frase de acerto para este resultado.";
        }
        return text;
    }

    if (type === 'palpites') {
        try {
            const response = await fetch(getJsonPath('palpites.json') + '?t=' + new Date().getTime());
            if (!response.ok) return "Não foi possível carregar os palpites.";
            const palpitesData = await response.json();
            const frase = palpitesData[`frase_${version}`] || "Palpites para a próxima extração:";
            let text = `*${frase}*\n\n${palpitesData.palpites.join(', ')}\n\nConfira os resultados em: ${pageUrl}`;
            return text;
        } catch { 
            return "Erro ao gerar texto dos palpites."; 
        }
    }
}

// Compartilhar conteúdo - ATUALIZADO COM CÓDIGO
async function shareContent(type, cardId) {
    const text = await generateText(type, cardId);
    
    if (navigator.share) {
        navigator.share({ 
            title: getPageTitle(), 
            text: text
            // Removido o parâmetro url para evitar duplicação, pois o link já está no texto
        }).catch(console.error);
    } else {
        showToast('Compartilhamento não suportado neste dispositivo.');
    }
}

// Copiar conteúdo
async function copyContent(type, cardId) {
    const text = await generateText(type, cardId);
    try {
        await navigator.clipboard.writeText(text);
        showToast('Conteúdo copiado com sucesso!');
    } catch (err) {
        showToast('Falha ao copiar conteúdo.');
    }
}

// Obter detalhes do card
function getCardDetails(cardId) {
    const card = document.getElementById(cardId);
    const version = card.dataset.version;
    const titleKey = Object.keys(globalData[version]).find(key => 
        key.replace(/[^a-zA-Z0-9]/g, '') === cardId.replace(version + '-', '')
    );
    return [version, titleKey];
}

// Encontrar último título de resultado
function findLastResultTitle(data) {
    let lastTitle = "desconhecido";
    const versions = ['1-10', '1-5'];
    for (const version of versions) {
        if (data[version]) {
            const titles = Object.keys(data[version]);
            for (let i = titles.length - 1; i >= 0; i--) {
                const title = titles[i];
                if (data[version][title].dados && data[version][title].dados.some(d => d.Milhar)) {
                    return title;
                }
            }
        }
    }
    return lastTitle;
}

// Inicialização comum - ATUALIZADA COM CAPTURA DE PARÂMETRO
function initializeCommonFeatures() {
    captureAndStoreUrlParameter();
    
    // Configurar o botão de inverter ordem
    const orderToggleBtn = document.getElementById('order-toggle-btn');
    if (orderToggleBtn) {
        orderToggleBtn.addEventListener('click', toggleOrder);
        orderToggleBtn.textContent = orderPreference === 'ascending' ? '⬆⬇ Inverter Ordem (Mais recente primeiro)' : '⬆⬇ Inverter Ordem (Mais antigo primeiro)';
    }

    // Event listener para o link dos títulos
    const titulosLink = document.getElementById('titulosLink');
    if (titulosLink) {
        titulosLink.addEventListener('click', function(e) {
            e.preventDefault();
            loadTitulos();
            openModal('titulosModal');
        });
        
        // Efeito hover no link
        titulosLink.addEventListener('mouseenter', function() {
            this.style.color = 'var(--accent-primary)';
        });
        
        titulosLink.addEventListener('mouseleave', function() {
            this.style.color = 'var(--text-secondary)';
        });
    }

    // Event listener para o filtro de dia da semana
    const dayFilter = document.getElementById('dayFilter');
    if (dayFilter) {
        dayFilter.addEventListener('change', function() {
            const selectedDay = this.value;
            displayTitulos(selectedDay);
        });
    }

    // Event listener para o botão de compartilhar imagem
    const shareImageBtn = document.getElementById('shareImageBtn');
    if (shareImageBtn) {
        shareImageBtn.addEventListener('click', function() {
            shareImage();
        });
    }

    // Fechar modal clicando fora com controle de rolagem
    window.onclick = (event) => {
        if (event.target.classList.contains('modal')) {
            closeModal(event.target.id);
        }
        if (event.target.classList.contains('image-modal')) {
            closeImageModal();
        }
    };

    // Inicializar Flatpickr
    initializeFlatpickr();
}

// Funções que devem ser implementadas em cada página específica:
// - getPageTitle() - retorna o título da página
// - getDataUrl(dateStr) - retorna a URL dos dados JSON para a data
// - getJsonPath(filename) - retorna o caminho para arquivos JSON
// - getImagePath(imageName) - retorna o caminho para imagens

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    initializeCommonFeatures();
    fetchData(true);
});



// === SLIDING BANNER LOGIC ===
function initializeSlidingBanner() {
  const slidingBanner = document.getElementById("slidingBanner");
  const closeBannerBtn = document.getElementById("closeBannerBtn");
  const registerBtn = document.getElementById("registerBtn");
  const learnMoreLink = document.getElementById("learnMoreLink");

  if (!slidingBanner) {
    console.warn("Banner element not found");
    return;
  }

  const defaultCode = "PACruTth";
  let productCode = getStoredProductCode();
  if (!productCode) {
    productCode = defaultCode;
  }

  // Set dynamic links
  if (registerBtn) {
    registerBtn.href = `https://app.77xbrasil.com.br/pr/${productCode}`;
    registerBtn.target = "_blank";
    registerBtn.rel = "noopener noreferrer";
  }
  
  if (learnMoreLink) {
    learnMoreLink.href = `https://77xxbrasil.com/pr/${productCode}`;
    learnMoreLink.target = "_blank";
    learnMoreLink.rel = "noopener noreferrer";
  }

  // Show banner after 5 seconds when page is fully loaded
  const showBannerTimeout = setTimeout(() => {
    if (slidingBanner && !slidingBanner.classList.contains('show')) {
      slidingBanner.classList.add("show");
      
      // Add subtle body padding to prevent content jump
      document.body.style.paddingBottom = '20px';
    }
  }, 5000);

  // Close banner functionality
  function hideBanner() {
    if (slidingBanner) {
      slidingBanner.classList.remove("show");
      document.body.style.paddingBottom = '';
    }
  }

  // Close banner when clicking X button
  if (closeBannerBtn) {
    closeBannerBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      hideBanner();
      clearTimeout(showBannerTimeout);
    });
  }

  // Close banner when clicking on register button
  if (registerBtn) {
    registerBtn.addEventListener("click", () => {
      hideBanner();
    });
  }

  // Close banner when clicking on learn more link
  if (learnMoreLink) {
    learnMoreLink.addEventListener("click", () => {
      hideBanner();
    });
  }

  // Handle escape key to close banner
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && slidingBanner && slidingBanner.classList.contains('show')) {
      hideBanner();
    }
  });

  // Prevent banner from showing on print
  window.addEventListener('beforeprint', () => {
    if (slidingBanner) {
      slidingBanner.style.display = 'none';
    }
  });

  window.addEventListener('afterprint', () => {
    if (slidingBanner) {
      slidingBanner.style.display = 'flex';
    }
  });
}

// Initialize banner when page is fully loaded
window.addEventListener('load', () => {
  // Small delay to ensure all other scripts are loaded
  setTimeout(initializeSlidingBanner, 100);
});

// === FUNCIONALIDADE DO MODAL DE SELEÇÃO DE LOTERIA ===

// Função para carregar e exibir o modal de seleção de loteria
async function showLotteryModal() {
  try {
    const response = await fetch('/resultados/lottery.json');
    if (!response.ok) {
      throw new Error('Erro ao carregar lista de loterias');
    }
    
    const lotteries = await response.json();
    const lotteryList = document.getElementById('lotteryList');
    
    // Limpar lista existente
    lotteryList.innerHTML = '';
    
    // Adicionar cada loteria à lista
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
      lotteryList.appendChild(listItem);
    });
    
    // Exibir o modal
    openModal('lotteryModal');
    
  } catch (error) {
    console.error('Erro ao carregar loterias:', error);
    showToast('Erro ao carregar lista de loterias', 'error');
  }
}

// Função para redirecionar para a página da loteria selecionada
function redirectToLottery(lotteryPath) {
  // Obter a raiz do repositório (assumindo que estamos em /resultados/nome-da-banca/)
  const currentPath = window.location.pathname;
  const pathParts = currentPath.split('/');
  
  // Encontrar o índice de 'resultados' no caminho
  const resultadosIndex = pathParts.indexOf('resultados');
  
  if (resultadosIndex !== -1) {
    // Construir o novo caminho
    const basePath = pathParts.slice(0, resultadosIndex + 1).join('/');
    const newPath = `${basePath}/${lotteryPath}/`;
    
    // Redirecionar
    window.location.href = newPath;
  } else {
    // Fallback: assumir que estamos na raiz
    window.location.href = `/resultados/${lotteryPath}/`;
  }
}

// Função para inicializar o evento do link de seleção de loteria
function initializeLotterySelector() {
  const selectLotteryLink = document.getElementById('selectLotteryLink');
  if (selectLotteryLink) {
    selectLotteryLink.addEventListener('click', (e) => {
      e.preventDefault();
      showLotteryModal();
    });
  }
}



// === FUNCIONALIDADE DE DOMÍNIO AUTOMÁTICO NO FOOTER ===

function setAutomaticDomain() {
  const siteDomainElement = document.getElementById('siteDomain');
  if (siteDomainElement) {
    siteDomainElement.textContent = window.location.hostname;
  }
}

// Chamar a função ao carregar a página
document.addEventListener('DOMContentLoaded', setAutomaticDomain);




// === FUNCIONALIDADE DE DIREITOS AUTORAIS AUTOMÁTICOS NO FOOTER ===

function setCopyrightText() {
  const copyrightTextElement = document.getElementById("copyrightText");
  if (copyrightTextElement) {
    const currentYear = new Date().getFullYear();
    copyrightTextElement.textContent = `© ${currentYear} Todos os direitos reservados.`;
  }
}

// Chamar a função ao carregar a página
document.addEventListener("DOMContentLoaded", setCopyrightText);
