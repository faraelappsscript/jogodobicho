// === SCRIPT COMPARTILHADO PARA MÚLTIPLAS PÁGINAS ===

// Variáveis globais compartilhadas
const AppState = {
  globalData: {},
  activeCardId: null,
  selectedDateStr: getCurrentDateString(),
  lastModifiedHeader: null,
  autoUpdateInterval: null,
  toastTimeout: null,
  orderPreference: localStorage.getItem('orderPreference') || 'ascending',
  currentImageBlob: null,
  imageOptions: {
    includeBankAd: true,
    includeGuesses: false
  },
  currentCreatePngType: null,
  currentCreatePngCardId: null,
  titulosData: null,
  modalHistory: [],
};

// === FUNCIONALIDADES DE PARÂMETRO DE URL ===

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

// === FUNÇÕES DE DATA E HORA ===

function getCurrentDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getTodayDateString() {
  return getCurrentDateString();
}

function getCurrentDayOfWeek() {
  const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const today = new Date();
  return days[today.getDay()];
}

function getFormattedTimestamp(dateStr) {
  const date = new Date(dateStr);
  const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
  return date.toLocaleDateString('pt-BR', options);
}

// === FUNÇÕES DE CARREGAMENTO DE DADOS ===

async function loadTitulos() {
  try {
    const response = await fetch(getJsonPath('titulos.json') + '?t=' + new Date().getTime());
    if (!response.ok) throw new Error('Não foi possível carregar os títulos.');
    
    AppState.titulosData = await response.json();
    
    const currentDay = getCurrentDayOfWeek();
    document.getElementById('dayFilter').value = currentDay;
    
    displayTitulos(currentDay);
    
  } catch (error) {
    document.getElementById('titulosContent').innerHTML = `<div class="no-data">Erro ao carregar títulos: ${error.message}</div>`;
  }
}

function displayTitulos(dayOfWeek) {
  const content = document.getElementById('titulosContent');
  
  if (!AppState.titulosData || !AppState.titulosData['1-5'] || !AppState.titulosData['1-5'][dayOfWeek]) {
    content.innerHTML = `<div class="no-data">Nenhum título encontrado para ${dayOfWeek}.</div>`;
    return;
  }
  
  const titulos = AppState.titulosData['1-5'][dayOfWeek];
  
  let html = `<h4 style="margin: 0 0 1rem 0; color: var(--text-primary); font-size: 1.125rem;">📅 ${dayOfWeek}</h4>`;
  html += '<div style="display: flex; flex-direction: column; gap: 0.75rem;">';
  
  titulos.forEach((titulo) => {
    html += `
      <div class="titulo-card">
        <span style="color: var(--text-primary); font-weight: 500; font-family: 'JetBrains Mono', monospace;">
          ${titulo}
        </span>
      </div>
    `;
  });
  
  html += '</div>';
  content.innerHTML = html;
}

async function fetchData(isManualAction = false) {
  const isToday = (AppState.selectedDateStr === getCurrentDateString());
  
  if (isManualAction) {
    AppState.lastModifiedHeader = null;
    if (AppState.autoUpdateInterval) clearInterval(AppState.autoUpdateInterval);
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
    const oldDataString = JSON.stringify(AppState.globalData);
    const newDataString = JSON.stringify(newData);

    if (oldDataString !== newDataString) {
        AppState.globalData = newData;
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
        AppState.autoUpdateInterval = setInterval(() => fetchData(false), 60000);
    } else if (!isToday && AppState.autoUpdateInterval) {
        clearInterval(AppState.autoUpdateInterval);
        AppState.autoUpdateInterval = null;
    }
  }
}

function renderData() {
  const container = document.getElementById('data-container');
  container.innerHTML = '';
  let hasContent = false;

  const versions = ['1-5', '1-10'];
  let cards = [];

  versions.forEach(version => {
    if (AppState.globalData[version]) {
      for (const title in AppState.globalData[version]) {
        hasContent = true;
        const resultData = AppState.globalData[version][title];
        const cardId = `${version}-${title.replace(/[^a-zA-Z0-9]/g, '')}`;
        const card = createCard(cardId, version, title, resultData);
        cards.push({ card, title, version });
      }
    }
  });

  cards.sort((a, b) => {
    const timeA = extractTime(a.title);
    const timeB = extractTime(b.title);
    return AppState.orderPreference === 'ascending' ? timeA - timeB : timeB - timeA;
  });

  cards.forEach(({ card }) => {
    container.appendChild(card);
  });

  if (!hasContent) {
    container.innerHTML = '<div class="no-data">Nenhum resultado disponível para a data selecionada.</div>';
  }
  
  toggleResultView();
}

function extractTime(title) {
  const match = title.match(/(\d{2}:\d{2})/);
  if (match) {
    const [hours, minutes] = match[1].split(':').map(Number);
    return hours * 60 + minutes;
  }
  return 0;
}

function createCard(cardId, version, title, data) {
    const card = document.createElement('div');
    card.className = 'card';
    card.id = cardId;
    card.dataset.version = version;

    const header = document.createElement('div');
    header.className = 'card-header';
    const cardTitle = document.createElement('h2');
    cardTitle.className = 'card-title';
    cardTitle.textContent = title;
    header.appendChild(cardTitle);
    card.appendChild(header);

    const body = document.createElement('div');
    body.className = 'card-body';
    
    if (data.dados && data.dados.some(d => d.Milhar)) {
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

        const timestamp = document.createElement('div');
        timestamp.className = 'timestamp';
        timestamp.textContent = getFormattedTimestamp(AppState.selectedDateStr);
        body.appendChild(timestamp);

        const actionsBar = document.createElement('div');
        actionsBar.className = 'actions-bar';
        actionsBar.innerHTML = `
            <button class="btn btn-primary share-btn" data-type="result" data-card-id="${cardId}">
                📤 Compartilhar
            </button>
            <button class="btn btn-primary copy-btn" data-type="result" data-card-id="${cardId}">
                📋 Copiar
            </button>
            <button class="btn btn-accent create-png-btn" data-type="result" data-card-id="${cardId}">
                🖼️ Criar PNG
            </button>
        `;
        body.appendChild(actionsBar);

    } else {
        body.innerHTML = '<div class="no-data">Aguardando resultados...</div>';
    }
    card.appendChild(body);

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

    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'button-group';
    buttonGroup.innerHTML = `
        <button class="btn btn-primary toggle-view-btn">
            👁️ Ver do 1º ao 10º
        </button>
        <button class="btn btn-primary show-resumo-btn" data-card-id="${cardId}">
            📊 Ver resumo de acertos
        </button>
        <button class="btn btn-accent show-palpites-btn" data-from-resumo="false" data-card-id="${cardId}">
            🎯 Palpites para a próxima extração
        </button>
    `;
    card.appendChild(buttonGroup);

    return card;
}

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

function showResumo(cardId) {
    AppState.activeCardId = cardId;
    const [version, titleKey] = getCardDetails(cardId);
    const data = AppState.globalData[version][titleKey];

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

    content += `<div class="timestamp">${getFormattedTimestamp(AppState.selectedDateStr)}</div>`;
    
    content += `
        <div class="actions-bar">
            <button class="btn btn-primary share-btn" data-type="result" data-card-id="${cardId}">
                📤 Compartilhar
            </button>
            <button class="btn btn-primary copy-btn" data-type="result" data-card-id="${cardId}">
                📋 Copiar Resultado
            </button>
            <button class="btn btn-accent create-png-btn" data-type="result" data-card-id="${cardId}">
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
                <button class="btn btn-primary copy-btn" data-type="frases" data-card-id="${cardId}">
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

async function showPalpites(fromResumo, cardId) {
    AppState.activeCardId = cardId;
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
                <button class="btn btn-primary share-btn" data-type="palpites" data-card-id="${cardId}">
                    📤 Compartilhar
                </button>
                <button class="btn btn-primary copy-btn" data-type="palpites" data-card-id="${cardId}">
                    📋 Copiar Palpites
                </button>
                <button class="btn btn-accent create-png-btn" data-type="palpites" data-card-id="${cardId}">
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

async function generateImage(type, cardId) {
    try {
        const [version, titleKey] = getCardDetails(cardId);
        const data = AppState.globalData[version][titleKey];
        
        if (type === 'result') {
            const addBankAd = document.getElementById("addBankAdOption").checked;
            const addPalpites = document.getElementById("addPalpitesOption").checked;
            AppState.imageOptions.includeBankAd = addBankAd;
            AppState.imageOptions.includeGuesses = addPalpites;
        }
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = 720;
        canvas.height = 1280;
        
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#0f0f23');
        gradient.addColorStop(0.3, '#16213e');
        gradient.addColorStop(0.7, '#1a1a2e');
        gradient.addColorStop(1, '#0f0f23');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
        ctx.lineWidth = 2;
        ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
        
        let yPosition = 80;
        
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
        
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        
        if (type === 'result') {
            ctx.font = 'bold 36px Inter, Arial, sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(titleKey, canvas.width / 2, yPosition);
            yPosition += 50;
            
            ctx.font = 'bold 24px Inter, Arial, sans-serif';
            ctx.fillStyle = '#94a3b8';
            ctx.fillText(getFormattedTimestamp(AppState.selectedDateStr), canvas.width / 2, yPosition);
            yPosition += 80;
            
            ctx.font = '32px JetBrains Mono, monospace';
            
            const tableWidth = canvas.width - 40;
            const colWidth = tableWidth / data.cabecalhos.length;
            const startX = 20;
            
            ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
            ctx.fillRect(startX, yPosition - 20, tableWidth, 32);
            
            ctx.fillStyle = '#3b82f6';
            ctx.font = 'bold 28px Inter, Arial, sans-serif';
            data.cabecalhos.forEach((header, index) => {
                ctx.fillText(header, startX + (index + 0.5) * colWidth, yPosition);
            });
            yPosition += 40;
            
            ctx.font = '30px JetBrains Mono, monospace';
            data.dados.forEach((row, rowIndex) => {
                if (rowIndex % 2 === 0) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
                    ctx.fillRect(startX, yPosition - 15, tableWidth, 25);
                }
                
                data.cabecalhos.forEach((header, colIndex) => {
                    ctx.fillStyle = rowIndex === 0 ? '#FFD700' : '#e2e8f0';
                    const text = row[header] || '-';
                    
                    if (rowIndex === 0 && colIndex === 0) {
                        ctx.fillText('👑 ' + text, startX + (colIndex + 0.5) * colWidth, yPosition);
                    } else {
                        ctx.fillText(text, startX + (colIndex + 0.5) * colWidth, yPosition);
                    }
                });
                yPosition += 30;
            });
            
            if (AppState.imageOptions.includeGuesses) {
                try {
                    const response = await fetch(getJsonPath('palpites.json') + '?t=' + new Date().getTime());
                    const palpitesData = await response.json();
                    const frase = palpitesData[`frase_${version}`] || "Palpites para a próxima extração:";
                    
                    yPosition += 40;
                    
                    ctx.font = 'bold 24px Inter, Arial, sans-serif';
                    ctx.fillStyle = '#ffffff';
                    
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
                    
                    const gridCols = 5;
                    const gridStartX = 20;
                    const gridWidth = canvas.width - 40;
                    const cellWidth = gridWidth / gridCols;
                    const cellHeight = 60;
                    const fontSize = 24;
                    
                    ctx.font = `bold ${fontSize}px JetBrains Mono, monospace`;
                    ctx.textAlign = 'center';
                    
                    const gridRows = Math.ceil(palpitesData.palpites.length / gridCols);
                    const gridHeight = gridRows * cellHeight;
                    ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
                    ctx.fillRect(gridStartX, yPosition - cellHeight/2, gridWidth, gridHeight);
                    
                    palpitesData.palpites.forEach((palpite, index) => {
                        const row = Math.floor(index / gridCols);
                        const col = index % gridCols;
                        
                        const cellX = gridStartX + col * cellWidth;
                        const cellY = yPosition + row * cellHeight;
                        
                        if ((row + col) % 2 === 0) {
                            ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
                            ctx.fillRect(cellX, cellY - cellHeight/2, cellWidth, cellHeight);
                        }
                        
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
                
                ctx.font = 'bold 28px Inter, Arial, sans-serif';
                ctx.fillStyle = '#ffffff';
                
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
                
                ctx.font = 'bold 18px Inter, Arial, sans-serif';
                ctx.fillStyle = '#94a3b8';
                ctx.fillText(getFormattedTimestamp(AppState.selectedDateStr), canvas.width / 2, yPosition);
                yPosition += 80;
                
                const gridCols = 5;
                const gridStartX = 20;
                const gridWidth = canvas.width - 40;
                const cellWidth = gridWidth / gridCols;
                const cellHeight = 60;
                const fontSize = 24;
                
                ctx.font = `bold ${fontSize}px JetBrains Mono, monospace`;
                ctx.textAlign = 'center';
                
                const gridRows = Math.ceil(palpitesData.palpites.length / gridCols);
                const gridHeight = gridRows * cellHeight;
                ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
                ctx.fillRect(gridStartX, yPosition - cellHeight/2, gridWidth, gridHeight);
                
                palpitesData.palpites.forEach((palpite, index) => {
                    const row = Math.floor(index / gridCols);
                    const col = index % gridCols;
                    
                    const cellX = gridStartX + col * cellWidth;
                    const cellY = yPosition + row * cellHeight;
                    
                    if ((row + col) % 2 === 0) {
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
                        ctx.fillRect(cellX, cellY - cellHeight/2, cellWidth, cellHeight);
                    }
                    
                    ctx.fillStyle = '#e2e8f0';
                    ctx.fillText(palpite, cellX + cellWidth/2, cellY + fontSize/3);
                });
                
                yPosition += gridHeight + 10;
                
            } catch (error) {
                console.log('Erro ao carregar palpites para imagem');
            }
        }

        if (AppState.imageOptions.includeBankAd) {
            try {
                const bankAdImg = new Image();
                bankAdImg.crossOrigin = 'anonymous';
                await new Promise((resolve, reject) => {
                    bankAdImg.onload = resolve;
                    bankAdImg.onerror = resolve;
                    bankAdImg.src = getImagePath('banner.png');
                    setTimeout(resolve, 2000);
                });

                if (bankAdImg.complete && bankAdImg.naturalWidth > 0) {
                    const adWidth = canvas.width - 40;
                    const adHeight = (bankAdImg.naturalHeight / bankAdImg.naturalWidth) * adWidth;
                    ctx.drawImage(bankAdImg, 20, canvas.height - adHeight - 20, adWidth, adHeight);
                }
            } catch (error) {
                console.log('Banner não carregado, continuando sem ele');
            }
        }

        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        AppState.currentImageBlob = blob;
        const imageUrl = URL.createObjectURL(blob);
        document.getElementById('fullImage').src = imageUrl;
        openImageModal();

    } catch (error) {
        console.error('Erro ao gerar imagem:', error);
        showToast('Erro ao gerar imagem.');
    }
}

// === FUNÇÕES DE COMPARTILHAMENTO E CÓPIA ===

async function shareContent(type, cardId) {
  if (type === 'image') {
    shareImage();
    return;
  }

  const [version, titleKey] = getCardDetails(cardId);
  const data = AppState.globalData[version][titleKey];
  let textToShare = '';
  let titleToShare = getPageTitle();

  if (type === 'result') {
    textToShare = `Resultado ${titleKey} (${getFormattedTimestamp(AppState.selectedDateStr)}):\n\n`;
    data.dados.forEach(row => {
      textToShare += `${row.Milhar || ''} ${row.Grupo || ''} ${row.Dezena || ''}\n`;
    });
  } else if (type === 'frases') {
    textToShare = `Frases de Acertos para ${titleKey} (${getFormattedTimestamp(AppState.selectedDateStr)}):\n\n`;
    if (data.frases) {
      for (const palpite in data.frases) {
        data.frases[palpite].forEach(frase => {
          textToShare += `Palpite ${palpite}: ${frase.replace(/<br>/g, ' ')}\n`;
        });
      }
    }
  } else if (type === 'palpites') {
    try {
      const response = await fetch(getJsonPath('palpites.json') + '?t=' + new Date().getTime());
      const palpitesData = await response.json();
      const frase = palpitesData[`frase_${version}`] || "Palpites para a próxima extração:";
      textToShare = `${frase}\n\n${palpitesData.palpites.join(', ')}`;
    } catch (error) {
      console.error('Erro ao carregar palpites para compartilhamento:', error);
      showToast('Erro ao carregar palpites para compartilhamento.');
      return;
    }
  }

  try {
    if (navigator.share) {
      await navigator.share({
        title: titleToShare,
        text: textToShare,
        url: `${window.location.origin}${window.location.pathname}?pr=${getStoredProductCode()}`
      });
      showToast('Conteúdo compartilhado com sucesso!');
    } else {
      await navigator.clipboard.writeText(textToShare);
      showToast('Conteúdo copiado para a área de transferência!');
    }
  } catch (error) {
    console.error('Erro ao compartilhar/copiar:', error);
    showToast('Erro ao compartilhar/copiar conteúdo.');
  }
}

async function copyContent(type, cardId) {
  const [version, titleKey] = getCardDetails(cardId);
  const data = AppState.globalData[version][titleKey];
  let textToCopy = '';

  if (type === 'result') {
    textToCopy = `Resultado ${titleKey} (${getFormattedTimestamp(AppState.selectedDateStr)}):\n\n`;
    data.dados.forEach(row => {
      textToCopy += `${row.Milhar || ''} ${row.Grupo || ''} ${row.Dezena || ''}\n`;
    });
  } else if (type === 'frases') {
    textToCopy = `Frases de Acertos para ${titleKey} (${getFormattedTimestamp(AppState.selectedDateStr)}):\n\n`;
    if (data.frases) {
      for (const palpite in data.frases) {
        data.frases[palpite].forEach(frase => {
          textToCopy += `Palpite ${palpite}: ${frase.replace(/<br>/g, ' ')}\n`;
        });
      }
    }
  } else if (type === 'palpites') {
    try {
      const response = await fetch(getJsonPath('palpites.json') + '?t=' + new Date().getTime());
      const palpitesData = await response.json();
      const frase = palpitesData[`frase_${version}`] || "Palpites para a próxima extração:";
      textToCopy = `${frase}\n\n${palpitesData.palpites.join(', ')}`;
    } catch (error) {
      console.error('Erro ao carregar palpites para cópia:', error);
      showToast('Erro ao carregar palpites para cópia.');
      return;
    }
  }

  try {
    await navigator.clipboard.writeText(textToCopy);
    showToast('Conteúdo copiado para a área de transferência!');
  } catch (error) {
    console.error('Erro ao copiar:', error);
    showToast('Erro ao copiar conteúdo.');
  }
}

async function shareImage() {
  if (!AppState.currentImageBlob) {
    showToast('Nenhuma imagem disponível para compartilhar.');
    return;
  }

  try {
    if (navigator.share && navigator.canShare) {
      const file = new File([AppState.currentImageBlob], 'resultado.png', { type: 'image/png' });
      
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: getPageTitle(),
          text: 'Confira este resultado!',
          files: [file]
        });
        showToast('Imagem compartilhada com sucesso!');
      } else {
        const imageUrl = URL.createObjectURL(AppState.currentImageBlob);
        const shareUrl = `${window.location.origin}${window.location.pathname}?pr=${getStoredProductCode()}`;
        await navigator.share({
          title: getPageTitle(),
          text: 'Confira este resultado!',
          url: shareUrl
        });
        showToast('Link compartilhado com sucesso!');
      }
    } else {
      showToast('Compartilhamento não suportado. Use o botão Baixar PNG.');
    }
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error('Erro ao compartilhar:', error);
      showToast('Erro ao compartilhar imagem.');
    }
  }
}

// === FUNÇÕES DE MODAL ===

function openModal(modalId) {
  AppState.modalHistory.push(modalId);
  document.getElementById(modalId).style.display = 'flex';
  document.body.classList.add('modal-open');
}

function closeModal(modalId) {
  document.getElementById(modalId).style.display = 'none';
  document.body.classList.remove('modal-open');
  const index = AppState.modalHistory.indexOf(modalId);
  if (index > -1) {
    AppState.modalHistory.splice(index, 1);
  }
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

function openCreatePngModal(type, cardId) {
  AppState.currentCreatePngType = type;
  AppState.currentCreatePngCardId = cardId;
  
  if (type === 'palpites') {
    generateImage(type, cardId);
    return;
  }
  
  const modalBody = document.getElementById('createPngModalBody');
  modalBody.innerHTML = `
    <div class="image-options">
      <h5>🖼️ Configurações da Imagem</h5>
      <div class="image-option">
        <input type="checkbox" id="addBankAdOption" name="addBankAd" ${AppState.imageOptions.includeBankAd ? 'checked' : ''}>
        <label for="addBankAdOption">Adicionar propaganda da banca</label>
      </div>
      <div class="image-option">
        <input type="checkbox" id="addPalpitesOption" name="addPalpites" ${AppState.imageOptions.includeGuesses ? 'checked' : ''}>
        <label for="addPalpitesOption">Adicionar palpites acima do banner</label>
      </div>
    </div>
  `;
  
  document.getElementById('confirmCreatePngBtn').onclick = () => {
    const addBankAd = document.getElementById("addBankAdOption").checked;
    const addPalpites = document.getElementById("addPalpitesOption").checked;
    AppState.imageOptions.includeBankAd = addBankAd;
    AppState.imageOptions.includeGuesses = addPalpites;
    closeModal('createPngModal');
    generateImage(AppState.currentCreatePngType, AppState.currentCreatePngCardId);
  };
  
  openModal('createPngModal');
}

// === FUNÇÕES DE UTILIDADE ===

function getPageTitle() {
  return document.title;
}

function getJsonPath(filename) {
  return `./data/${filename}`;
}

function getImagePath(filename) {
  return `./assets/${filename}`;
}

function getCardDetails(cardId) {
  const parts = cardId.split('-');
  const version = parts[0] + '-' + parts[1];
  const titleKey = cardId.substring(version.length + 1);
  return [version, titleKey];
}

function findLastResultTitle(data) {
  const versions = ['1-5', '1-10'];
  let lastTitle = 'desconhecido';
  let lastTime = 0;

  versions.forEach(version => {
    if (data[version]) {
      for (const title in data[version]) {
        const time = extractTime(title);
        if (time > lastTime) {
          lastTime = time;
          lastTitle = title;
        }
      }
    }
  });
  return lastTitle;
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  if (AppState.toastTimeout) {
    clearTimeout(AppState.toastTimeout);
  }
  AppState.toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// === INICIALIZAÇÃO ===

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
      AppState.selectedDateStr = dateStr;
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

function setupEventListeners() {
  document.getElementById('order-toggle-btn').addEventListener('click', toggleOrder);
  document.getElementById('closeImageModalBtn').addEventListener('click', closeImageModal);
  document.getElementById('downloadPngBtn').addEventListener('click', () => {
    if (AppState.currentImageBlob) {
      const url = URL.createObjectURL(AppState.currentImageBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'resultado.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Imagem baixada com sucesso!');
    } else {
      showToast('Nenhuma imagem para baixar.');
    }
  });
  document.getElementById('shareImageBtn').addEventListener('click', () => shareContent('image'));

  document.addEventListener('click', (event) => {
    if (event.target.classList.contains('share-btn')) {
      shareContent(event.target.dataset.type, event.target.dataset.cardId);
    } else if (event.target.classList.contains('copy-btn')) {
      copyContent(event.target.dataset.type, event.target.dataset.cardId);
    } else if (event.target.classList.contains('create-png-btn')) {
      openCreatePngModal(event.target.dataset.type, event.target.dataset.cardId);
    } else if (event.target.classList.contains('show-resumo-btn')) {
      showResumo(event.target.dataset.cardId);
    } else if (event.target.classList.contains('show-palpites-btn')) {
      showPalpites(event.target.dataset.fromResumo === 'true', event.target.dataset.cardId);
    }
  });

  document.querySelectorAll('.close-modal-btn').forEach(btn => {
    btn.addEventListener('click', (event) => {
      closeModal(event.target.closest('.modal').id);
    });
  });

  window.addEventListener('popstate', () => {
    if (AppState.modalHistory.length > 0) {
      const lastModalId = AppState.modalHistory[AppState.modalHistory.length - 1];
      closeModal(lastModalId);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  captureAndStoreUrlParameter();
  initializeFlatpickr();
  loadTitulos();
  fetchData(true);
  setupEventListeners();
});


