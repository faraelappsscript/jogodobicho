// === Shared Site Script ===

// Constants
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
const TOAST_DURATION = 4000;

// State Management
const state = {
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
};

// === Utility Functions ===
function getCurrentDateString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function getCurrentDayOfWeek() {
  const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  return days[new Date().getDay()];
}

function getFormattedTimestamp(dateStr) {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// === URL Parameter Handling ===
function captureAndStoreUrlParameter() {
  const urlParams = new URLSearchParams(window.location.search);
  const codeParam = urlParams.get('pr');
  if (codeParam) localStorage.setItem('productCode', codeParam);
}

function getStoredProductCode() {
  return localStorage.getItem('productCode') || 'PACruTth';
}

// === Data Fetching ===
async function fetchJson(url, cacheKey) {
  const cached = localStorage.getItem(cacheKey);
  const cachedTime = localStorage.getItem(`${cacheKey}_time`);
  const now = Date.now();

  if (cached && cachedTime && now - cachedTime < CACHE_DURATION) {
    return JSON.parse(cached);
  }

  const response = await fetch(`${url}?t=${now}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Erro ao carregar ${url}`);
  const data = await response.json();
  localStorage.setItem(cacheKey, JSON.stringify(data));
  localStorage.setItem(`${cacheKey}_time`, now);
  return data;
}

async function fetchData(isManualAction = false) {
  const isToday = state.selectedDateStr === getCurrentDateString();
  const container = document.getElementById('data-container');

  if (isManualAction) {
    state.lastModifiedHeader = null;
    if (state.autoUpdateInterval) clearInterval(state.autoUpdateInterval);
    container.innerHTML = '<div class="no-data loading">Carregando...</div>';
  }

  try {
    const response = await fetch(getDataUrl(state.selectedDateStr), { cache: 'no-store' });
    if (!response.ok) throw new Error(`Resultados para ${state.selectedDateStr} não encontrados.`);

    const newLastModified = response.headers.get('Last-Modified');
    if (newLastModified === state.lastModifiedHeader) return;
    state.lastModifiedHeader = newLastModified;

    const newData = await response.json();
    if (JSON.stringify(state.globalData) !== JSON.stringify(newData)) {
      state.globalData = newData;
      renderData();
      if (!isManualAction) {
        showToast(`Resultado ${findLastResultTitle(state.globalData)} atualizado!`);
      }
    }
  } catch (error) {
    if (isManualAction) {
      container.innerHTML = `<div class="no-data">${error.message}</div>`;
    }
  } finally {
    if (isToday && !state.autoUpdateInterval) {
      state.autoUpdateInterval = setInterval(() => fetchData(false), 60000);
    } else if (!isToday && state.autoUpdateInterval) {
      clearInterval(state.autoUpdateInterval);
      state.autoUpdateInterval = null;
    }
  }
}

// === Rendering Functions ===
function renderData() {
  const container = document.getElementById('data-container');
  container.innerHTML = '';
  let hasContent = false;
  const cards = [];

  ['1-5', '1-10'].forEach(version => {
    if (state.globalData[version]) {
      Object.entries(state.globalData[version]).forEach(([title, resultData]) => {
        hasContent = true;
        const cardId = `${version}-${title.replace(/[^a-zA-Z0-9]/g, '')}`;
        cards.push({ card: createCard(cardId, version, title, resultData), title, version });
      });
    }
  });

  cards.sort((a, b) => {
    const timeA = extractTime(a.title);
    const timeB = extractTime(b.title);
    return state.orderPreference === 'ascending' ? timeA - timeB : timeB - timeA;
  });

  cards.forEach(({ card }) => container.appendChild(card));

  if (!hasContent) {
    container.innerHTML = '<div class="no-data">Nenhum resultado disponível.</div>';
  }

  toggleResultView();
}

function createCard(cardId, version, title, data) {
  const card = document.createElement('div');
  card.className = 'card';
  card.id = cardId;
  card.dataset.version = version;

  card.innerHTML = `
    <div class="card-header">
      <h2 class="card-title">${title}</h2>
    </div>
    <div class="card-body">
      ${data.dados && data.dados.some(d => d.Milhar) ? `
        <div class="table-container">
          <table>
            <thead><tr>${data.cabecalhos.map(h => `<th>${h}</th>`).join('')}</tr></thead>
            <tbody>${data.dados.map(row => `<tr>${data.cabecalhos.map(h => `<td>${row[h] || '-'}</td>`).join('')}</tr>`).join('')}</tbody>
          </table>
        </div>
        <div class="timestamp">${getFormattedTimestamp(state.selectedDateStr)}</div>
        <div class="actions-bar">
          <button class="btn btn-primary" onclick="shareContent('result', '${cardId}')">📤 Compartilhar</button>
          <button class="btn btn-primary" onclick="copyContent('result', '${cardId}')">📋 Copiar</button>
          <button class="btn btn-accent" onclick="openCreatePngModal('result', '${cardId}')">🖼️ Criar PNG</button>
        </div>
      ` : '<div class="no-data">Aguardando resultados...</div>'}
    </div>
    <div class="card-footer">
      ${data.acertos ? `
        ${Array(data.acertos.Milhar || 0).fill().map(() => '<div class="acerto-balao milhar" title="Milhar e Centena">M</div>').join('')}
        ${Array(data.acertos.Centena || 0).fill().map(() => '<div class="acerto-balao centena" title="Centena e Dezena">C</div>').join('')}
        ${data.acertos.Dezena > 0 ? `<div class="acerto-balao dezena" title="Dezenas">${data.acertos.Dezena}</div>` : ''}
        ${data.acertos.Grupo ? data.acertos.Grupo.map(emoji => `<div class="acerto-balao grupo" title="Grupo">${emoji}</div>`).join('') : ''}
      ` : ''}
    </div>
    <div class="button-group">
      <button class="btn btn-primary toggle-view-btn">👁️ Ver do 1º ao 10º</button>
      <button class="btn btn-primary" onclick="showResumo('${cardId}')">📊 Ver resumo de acertos</button>
      <button class="btn btn-accent" onclick="showPalpites(false, '${cardId}')">🎯 Palpites para a próxima extração</button>
    </div>
  `;

  return card;
}

function toggleResultView() {
  const has1to5 = document.querySelector('[data-version="1-5"]');
  const has1to10 = document.querySelector('[data-version="1-10"]');
  let show1to10 = localStorage.getItem('viewPreference') === '1-10';

  if (!has1to5 && has1to10) show1to10 = true;

  document.querySelectorAll('.card').forEach(card => {
    card.style.display = show1to10 ? (card.dataset.version === '1-10' ? 'block' : 'none') : (card.dataset.version === '1-5' ? 'block' : 'none');
  });

  document.querySelectorAll('.toggle-view-btn').forEach(btn => {
    btn.textContent = show1to10 ? '👁️ Ver do 1º ao 5º' : '👁️ Ver do 1º ao 10º';
    btn.onclick = () => {
      localStorage.setItem('viewPreference', show1to10 ? '1-5' : '1-10');
      toggleResultView();
    };
  });
}

// === Modal Handling ===
function openModal(modalId) {
  state.modalHistory.push(modalId);
  const modal = document.getElementById(modalId);
  modal.style.display = 'flex';
  document.body.classList.add('modal-open');
  modal.querySelector('.close-btn')?.focus();
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  modal.style.display = 'none';
  document.body.classList.remove('modal-open');
  state.modalHistory = state.modalHistory.filter(id => id !== modalId);
  if (state.modalHistory.length > 0) {
    openModal(state.modalHistory[state.modalHistory.length - 1]);
  }
}

function openImageModal() {
  const modal = document.getElementById('imageModal');
  modal.style.display = 'block';
  document.body.classList.add('modal-open');
  modal.querySelector('.image-modal-close')?.focus();
}

function closeImageModal() {
  const modal = document.getElementById('imageModal');
  modal.style.display = 'none';
  document.body.classList.remove('modal-open');
  state.currentImageBlob = null;
  state.modalHistory.pop();
  if (state.modalHistory.length > 0) {
    openModal(state.modalHistory[state.modalHistory.length - 1]);
  }
}

// === Content Generation ===
async function generateText(type, cardId) {
  const [version, titleKey] = getCardDetails(cardId);
  const data = state.globalData[version][titleKey];
  const pageUrl = `${window.location.origin}${window.location.pathname}?pr=${getStoredProductCode()}`;
  const timestamp = getFormattedTimestamp(state.selectedDateStr);

  if (type === 'result') {
    let text = `*Resultado ${titleKey}*\n_${timestamp}_\n\n`;
    data.dados.forEach(row => {
      text += `${row['Prêmio'] || ''}: *${row['Milhar'] || ''}* - ${row['Grupo'] || ''} ${row['Bicho'] || ''}\n`;
    });
    return `${text}\nVeja mais em: ${pageUrl}`;
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
      text = 'Nenhuma frase de acerto para este resultado.';
    }
    return text;
  }

  if (type === 'palpites') {
    try {
      const palpitesData = await fetchJson(getJsonPath('palpites.json'), 'palpites');
      const frase = palpitesData[`frase_${version}`] || 'Palpites para a próxima extração:';
      return `*${frase}*\n\n${palpitesData.palpites.join(', ')}\n\nConfira os resultados em: ${pageUrl}`;
    } catch {
      return 'Erro ao gerar texto dos palpites.';
    }
  }
}

async function shareContent(type, cardId) {
  const text = await generateText(type, cardId);
  if (navigator.share) {
    try {
      await navigator.share({ title: getPageTitle(), text });
    } catch (error) {
      if (error.name !== 'AbortError') showToast('Erro ao compartilhar.');
    }
  } else {
    showToast('Compartilhamento não suportado.');
  }
}

async function copyContent(type, cardId) {
  try {
    await navigator.clipboard.writeText(await generateText(type, cardId));
    showToast('Conteúdo copiado com sucesso!');
  } catch {
    showToast('Falha ao copiar conteúdo.');
  }
}

async function shareImage() {
  if (!state.currentImageBlob) {
    showToast('Nenhuma imagem disponível.');
    return;
  }

  try {
    const file = new File([state.currentImageBlob], 'resultado.png', { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        title: getPageTitle(),
        text: 'Confira este resultado!',
        files: [file],
      });
      showToast('Imagem compartilhada com sucesso!');
    } else {
      const shareUrl = `${window.location.origin}${window.location.pathname}?pr=${getStoredProductCode()}`;
      await navigator.share({
        title: getPageTitle(),
        text: 'Confira este resultado!',
        url: shareUrl,
      });
      showToast('Link compartilhado com sucesso!');
    }
  } catch (error) {
    if (error.name !== 'AbortError') showToast('Erro ao compartilhar imagem.');
  }
}

// === Image Generation ===
async function generateImage(type, cardId) {
  try {
    const [version, titleKey] = getCardDetails(cardId);
    const data = state.globalData[version][titleKey];
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

    let yPosition = 80;

    try {
      const logoImg = await loadImage(getImagePath('logo.png'));
      const logoHeight = 120;
      const logoWidth = (logoImg.naturalWidth / logoImg.naturalHeight) * logoHeight;
      ctx.drawImage(logoImg, (canvas.width - logoWidth) / 2, 30, logoWidth, logoHeight);
      yPosition = 30 + logoHeight + 60;
    } catch {
      console.log('Logo não carregada.');
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';

    if (type === 'result') {
      ctx.font = 'bold 32px Inter, Arial, sans-serif';
      ctx.fillText(titleKey, canvas.width / 2, yPosition);
      yPosition += 50;

      ctx.font = 'bold 24px Inter, Arial, sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(getFormattedTimestamp(state.selectedDateStr), canvas.width / 2, yPosition);
      yPosition += 80;

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
          ctx.fillText(rowIndex === 0 && colIndex === 0 ? `👑 ${text}` : text, startX + (colIndex + 0.5) * colWidth, yPosition);
        });
        yPosition += 30;
      });

      if (state.imageOptions.includeGuesses) {
        const palpitesData = await fetchJson(getJsonPath('palpites.json'), 'palpites');
        const frase = palpitesData[`frase_${version}`] || 'Palpites para a próxima extração:';
        yPosition += 40;

        ctx.font = 'bold 24px Inter, Arial, sans-serif';
        ctx.fillStyle = '#ffffff';
        wrapText(ctx, frase, canvas.width / 2, yPosition, canvas.width - 40, 30);
        yPosition += 60;

        const gridCols = 5;
        const gridWidth = canvas.width - 40;
        const cellWidth = gridWidth / gridCols;
        const cellHeight = 60;
        const gridRows = Math.ceil(palpitesData.palpites.length / gridCols);
        const gridHeight = gridRows * cellHeight;

        ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
        ctx.fillRect(20, yPosition - cellHeight / 2, gridWidth, gridHeight);

        ctx.font = 'bold 24px JetBrains Mono, monospace';
        palpitesData.palpites.forEach((palpite, index) => {
          const row = Math.floor(index / gridCols);
          const col = index % gridCols;
          const cellX = 20 + col * cellWidth;
          const cellY = yPosition + row * cellHeight;
          if ((row + col) % 2 === 0) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.fillRect(cellX, cellY - cellHeight / 2, cellWidth, cellHeight);
          }
          ctx.fillStyle = '#e2e8f0';
          ctx.fillText(palpite, cellX + cellWidth / 2, cellY + 24 / 3);
        });
        yPosition += gridHeight + 10;
      }
    } else if (type === 'palpites') {
      const palpitesData = await fetchJson(getJsonPath('palpites.json'), 'palpites');
      const frase = palpitesData[`frase_${version}`] || 'Palpites para a próxima extração:';

      ctx.font = 'bold 28px Inter, Arial, sans-serif';
      ctx.fillStyle = '#ffffff';
      wrapText(ctx, frase, canvas.width / 2, yPosition, canvas.width - 40, 35);
      yPosition += 40;

      ctx.font = 'bold 18px Inter, Arial, sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(getFormattedTimestamp(state.selectedDateStr), canvas.width / 2, yPosition);
      yPosition += 80;

      const gridCols = 5;
      const gridWidth = canvas.width - 40;
      const cellWidth = gridWidth / gridCols;
      const cellHeight = 60;
      const gridRows = Math.ceil(palpitesData.palpites.length / gridCols);
      const gridHeight = gridRows * cellHeight;

      ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
      ctx.fillRect(20, yPosition - cellHeight / 2, gridWidth, gridHeight);

      ctx.font = 'bold 24px JetBrains Mono, monospace';
      palpitesData.palpites.forEach((palpite, index) => {
        const row = Math.floor(index / gridCols);
        const col = index % gridCols;
        const cellX = 20 + col * cellWidth;
        const cellY = yPosition + row * cellHeight;
        if ((row + col) % 2 === 0) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
          ctx.fillRect(cellX, cellY - cellHeight / 2, cellWidth, cellHeight);
        }
        ctx.fillStyle = '#e2e8f0';
        ctx.fillText(palpite, cellX + cellWidth / 2, cellY + 24 / 3);
      });
      yPosition += gridHeight + 10;
    }

    if (type === 'palpites' || (type === 'result' && state.imageOptions.includeBankAd)) {
      const adAreaStart = yPosition + 10;
      const adAreaEnd = canvas.height - 120;
      const adAreaHeight = adAreaEnd - adAreaStart;
      const adText = ['Na 77x Brasil, o seu 1 Real vale 8 Mil!', 'Bônus de 20% na sua primeira recarga!', 'Acesse o site para mais!'];

      let currentY = adAreaStart + (adAreaHeight - (40 + (adText.length - 1) * 35)) / 2;

      ctx.font = 'bold 36px Inter, Arial, sans-serif';
      ctx.fillStyle = '#FFFF00';
      ctx.fillText(adText[0], canvas.width / 2, currentY);
      currentY += 40;

      ctx.font = 'bold 36px Inter, Arial, sans-serif';
      ctx.fillStyle = '#ffffff';
      for (let i = 1; i < adText.length; i++) {
        const textWidth = ctx.measureText(adText[i]).width;
        const backgroundPadding = 20;
        ctx.fillStyle = 'rgba(0, 0, 128, 0.7)';
        ctx.fillRect((canvas.width - textWidth - backgroundPadding) / 2, currentY - 28, textWidth + backgroundPadding, 35);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(adText[i], canvas.width / 2, currentY);
        currentY += 35;
      }
      yPosition = currentY + 20;
    }

    ctx.font = 'bold 48px Inter, Arial, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(window.location.hostname, canvas.width / 2, canvas.height - 60);

    canvas.toBlob(blob => {
      if (!blob) throw new Error('Falha ao gerar imagem');
      state.currentImageBlob = blob;
      const imageUrl = URL.createObjectURL(blob);
      document.getElementById('previewImage').src = imageUrl;
      document.getElementById('downloadImageBtn').onclick = () => {
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = `${type}_${titleKey.replace(/[^a-zA-Z0-9]/g, '_')}_${state.selectedDateStr}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      };
      openImageModal();
    }, 'image/png', 0.9);
  } catch (error) {
    showToast(`Erro ao gerar imagem: ${error.message}`);
  }
}

// === Modal Content ===
async function loadTitulos() {
  try {
    state.titulosData = await fetchJson(getJsonPath('titulos.json'), 'titulos');
    const currentDay = getCurrentDayOfWeek();
    document.getElementById('dayFilter').value = currentDay;
    displayTitulos(currentDay);
  } catch (error) {
    document.getElementById('titulosContent').innerHTML = `<div class="no-data">Erro ao carregar títulos: ${error.message}</div>`;
  }
}

function displayTitulos(dayOfWeek) {
  const content = document.getElementById('titulosContent');
  if (!state.titulosData?.['1-5']?.[dayOfWeek]) {
    content.innerHTML = `<div class="no-data">Nenhum título para ${dayOfWeek}.</div>`;
    return;
  }

  const titulos = state.titulosData['1-5'][dayOfWeek];
  content.innerHTML = `
    <h4 style="margin: 0 0 1rem; color: var(--text-primary); font-size: 1.125rem;">📅 ${dayOfWeek}</h4>
    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
      ${titulos.map(titulo => `
        <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; padding: 0.75rem; transition: background 0.2s;">
          <span style="color: var(--text-primary); font-weight: 500; font-family: 'JetBrains Mono', monospace;">${titulo}</span>
        </div>
      `).join('')}
    </div>
  `;
}

async function showResumo(cardId) {
  state.activeCardId = cardId;
  const [version, titleKey] = getCardDetails(cardId);
  const data = state.globalData[version][titleKey];
  const modalBody = document.getElementById('resumoModalBody');

  let content = `
    <h4>📊 Resultados</h4>
    <div class="table-container">
      <table>
        <thead><tr>${data.cabecalhos.map(h => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${data.dados.map(row => `<tr>${data.cabecalhos.map(h => `<td>${row[h] || '-'}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>
    </div>
    <div class="timestamp">${getFormattedTimestamp(state.selectedDateStr)}</div>
    <div class="actions-bar">
      <button class="btn btn-primary" onclick="shareContent('result', '${cardId}')">📤 Compartilhar</button>
      <button class="btn btn-primary" onclick="copyContent('result', '${cardId}')">📋 Copiar Resultado</button>
      <button class="btn btn-accent" onclick="openCreatePngModal('result', '${cardId}')">🖼️ Criar PNG</button>
    </div>
    <h4 style="margin-top: 2rem;">🎯 Frases de Acertos</h4>
    <div class="frases-acertos">
      ${data.frases && Object.keys(data.frases).length > 0 ? Object.entries(data.frases).map(([palpite, frases]) =>
        frases.map(frase => `<p><strong>Palpite ${palpite}:</strong><br>${frase.replace(/<br>/g, ' ')}</p>`).join('')
      ).join('') : '<p>Nenhum acerto com os palpites fornecidos.</p>'}
    </div>
    <div class="actions-bar" style="padding-top:0;">
      <button class="btn btn-primary" onclick="copyContent('frases', '${cardId}')">📋 Copiar Frases de Acertos</button>
    </div>
    <p style="margin-top: 2rem; font-style: italic; color: var(--text-secondary);">${data.resumo || ''}</p>
  `;

  modalBody.innerHTML = content;
  document.getElementById('resumoModalPalpitesBtn').onclick = () => showPalpites(true, cardId);
  openModal('resumoModal');
}

async function showPalpites(fromResumo, cardId) {
  state.activeCardId = cardId;
  const modalBody = document.getElementById('palpitesModalBody');
  modalBody.innerHTML = '<div class="no-data loading">Carregando palpites...</div>';

  document.getElementById('voltarBtn').style.display = fromResumo ? 'inline-flex' : 'none';
  document.getElementById('voltarBtn').onclick = () => {
    closeModal('palpitesModal');
    openModal('resumoModal');
  };

  try {
    const palpitesData = await fetchJson(getJsonPath('palpites.json'), 'palpites');
    const [version] = getCardDetails(cardId);
    const frase = palpitesData[`frase_${version}`] || 'Palpites para a próxima extração:';
    modalBody.innerHTML = `
      <h4>🎯 ${frase}</h4>
      <div class="font-mono" style="background: var(--bg-secondary); padding: 1.5rem; border-radius: 12px; word-break: break-word; line-height: 1.8;">${palpitesData.palpites.join(', ')}</div>
      <div class="actions-bar" style="margin-top: 2rem;">
        <button class="btn btn-primary" onclick="shareContent('palpites', '${cardId}')">📤 Compartilhar</button>
        <button class="btn btn-primary" onclick="copyContent('palpites', '${cardId}')">📋 Copiar Palpites</button>
        <button class="btn btn-accent" onclick="generateImage('palpites', '${cardId}')">🖼️ Criar PNG</button>
      </div>
    `;
  } catch (error) {
    modalBody.innerHTML = `<div class="no-data">${error.message}</div>`;
  }

  if (fromResumo) closeModal('resumoModal');
  openModal('palpitesModal');
}

function openCreatePngModal(type, cardId) {
  state.currentCreatePngType = type;
  state.currentCreatePngCardId = cardId;

  if (type === 'palpites') {
    generateImage(type, cardId);
    return;
  }

  const modalBody = document.getElementById('createPngModalBody');
  modalBody.innerHTML = `
    <div class="image-options">
      <h5>🖼️ Configurações da Imagem</h5>
      <div class="image-option">
        <input type="checkbox" id="addBankAdOption" name="addBankAd" ${state.imageOptions.includeBankAd ? 'checked' : ''}>
        <label for="addBankAdOption">Adicionar propaganda da banca</label>
      </div>
      <div class="image-option">
        <input type="checkbox" id="addPalpitesOption" name="addPalpites" ${state.imageOptions.includeGuesses ? 'checked' : ''}>
        <label for="addPalpitesOption">Adicionar palpites acima do banner</label>
      </div>
    </div>
  `;

  document.getElementById('confirmCreatePngBtn').onclick = () => {
    state.imageOptions.includeBankAd = document.getElementById('addBankAdOption').checked;
    state.imageOptions.includeGuesses = document.getElementById('addPalpitesOption').checked;
    closeModal('createPngModal');
    generateImage(state.currentCreatePngType, state.currentCreatePngCardId);
  };

  openModal('createPngModal');
}

// === Helper Functions ===
function getCardDetails(cardId) {
  const card = document.getElementById(cardId);
  const version = card.dataset.version;
  const titleKey = Object.keys(state.globalData[version]).find(key => key.replace(/[^a-zA-Z0-9]/g, '') === cardId.replace(`${version}-`, ''));
  return [version, titleKey];
}

function findLastResultTitle(data) {
  for (const version of ['1-10', '1-5']) {
    if (data[version]) {
      const titles = Object.keys(data[version]);
      for (let i = titles.length - 1; i >= 0; i--) {
        const title = titles[i];
        if (data[version][title].dados?.some(d => d.Milhar)) {
          return title;
        }
      }
    }
  }
  return 'desconhecido';
}

function extractTime(title) {
  const match = title.match(/(\d{2}:\d{2})/);
  if (match) {
    const [hours, minutes] = match[1].split(':').map(Number);
    return hours * 60 + minutes;
  }
  return 0;
}

function showToast(message) {
  const toast = document.getElementById('toast');
  document.getElementById('toast-message').textContent = message;
  toast.classList.add('show');
  if (state.toastTimeout) clearTimeout(state.toastTimeout);
  state.toastTimeout = setTimeout(() => toast.classList.remove('show'), TOAST_DURATION);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
    setTimeout(reject, 2000);
  });
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line, x, y);
      line = words[n] + ' ';
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
}

// === Initialization ===
function initializeFlatpickr() {
  flatpickr('#date-picker', {
    dateFormat: 'Y-m-d',
    maxDate: getCurrentDateString(),
    locale: 'pt',
    defaultDate: state.selectedDateStr,
    allowInput: false,
    disableMobile: false,
    onChange: ([selectedDate]) => {
      state.selectedDateStr = selectedDate.toISOString().split('T')[0];
      fetchData(true);
    },
    onOpen: () => {
      setTimeout(() => {
        const calendar = document.querySelector('.flatpickr-calendar');
        if (calendar) calendar.style.zIndex = '9999';
      }, 10);
    },
  });
}

function initializeSlidingBanner() {
  const slidingBanner = document.getElementById('slidingBanner');
  if (!slidingBanner) return;

  const registerBtn = document.getElementById('registerBtn');
  const learnMoreLink = document.getElementById('learnMoreLink');
  const closeBannerBtn = document.getElementById('closeBannerBtn');

  const productCode = getStoredProductCode();
  registerBtn.href = `https://app.77xbrasil.com.br/pr/${productCode}`;
  learnMoreLink.href = `https://77xxbrasil.com/pr/${productCode}`;

  setTimeout(() => {
    slidingBanner.classList.add('show');
    document.body.style.paddingBottom = '20px';
  }, 5000);

  const hideBanner = () => {
    slidingBanner.classList.remove('show');
    document.body.style.paddingBottom = '';
  };

  closeBannerBtn.addEventListener('click', hideBanner);
  registerBtn.addEventListener('click', hideBanner);
  learnMoreLink.addEventListener('click', hideBanner);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && slidingBanner.classList.contains('show')) hideBanner();
  });
}

function initializeLotterySelector() {
  const selectLotteryLink = document.getElementById('selectLotteryLink');
  if (selectLotteryLink) {
    selectLotteryLink.addEventListener('click', async e => {
      e.preventDefault();
      try {
        const lotteries = await fetchJson('/resultados/lottery.json', 'lotteries');
        const lotteryList = document.getElementById('lotteryList');
        lotteryList.innerHTML = lotteries.map(lottery => `
          <li><a href="#" onclick="redirectToLottery('${lottery.path}');return false;">${lottery.name}</a></li>
        `).join('');
        openModal('lotteryModal');
      } catch {
        showToast('Erro ao carregar loterias.');
      }
    });
  }
}

function redirectToLottery(lotteryPath) {
  const pathParts = window.location.pathname.split('/');
  const resultadosIndex = pathParts.indexOf('resultados');
  const newPath = resultadosIndex !== -1
    ? `${pathParts.slice(0, resultadosIndex + 1).join('/')}/${lotteryPath}/`
    : `/resultados/${lotteryPath}/`;
  window.location.href = newPath;
}

function setAutomaticDomain() {
  const siteDomainElement = document.getElementById('siteDomain');
  if (siteDomainElement) siteDomainElement.textContent = window.location.hostname;
}

function setCopyrightText() {
  const copyrightTextElement = document.getElementById('copyrightText');
  if (copyrightTextElement) copyrightTextElement.textContent = `© ${new Date().getFullYear()} Todos os direitos reservados.`;
}

function initializeCommonFeatures() {
  captureAndStoreUrlParameter();
  initializeFlatpickr();
  initializeSlidingBanner();
  initializeLotterySelector();
  setAutomaticDomain();
  setCopyrightText();

  document.getElementById('order-toggle-btn').addEventListener('click', debounce(() => {
    state.orderPreference = state.orderPreference === 'ascending' ? 'descending' : 'ascending';
    localStorage.setItem('orderPreference', state.orderPreference);
    document.getElementById('order-toggle-btn').textContent = state.orderPreference === 'ascending'
      ? '⬆⬇ Inverter Ordem (Mais recente primeiro)'
      : '⬆⬇ Inverter Ordem (Mais antigo primeiro)';
    renderData();
  }, 300));

  document.getElementById('titulosLink').addEventListener('click', e => {
    e.preventDefault();
    loadTitulos();
    openModal('titulosModal');
  });

  document.getElementById('dayFilter').addEventListener('change', e => displayTitulos(e.target.value));

  document.getElementById('shareImageBtn').addEventListener('click', shareImage);

  window.addEventListener('click', e => {
    if (e.target.classList.contains('modal')) closeModal(e.target.id);
    if (e.target.classList.contains('image-modal')) closeImageModal();
  });
}

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// === Placeholder Functions (to be implemented per page) ===
function getPageTitle() {
  return document.title;
}

function getDataUrl(dateStr) {
  return `/resultados/data/${dateStr}.json`; // Example
}

function getJsonPath(filename) {
  return `/resultados/${filename}`;
}

function getImagePath(imageName) {
  return `/images/${imageName}`;
}

// === Initialization ===
document.addEventListener('DOMContentLoaded', () => {
  initializeCommonFeatures();
  fetchData(true);
});
