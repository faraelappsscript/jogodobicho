// Configuração
const config = {
    defaultProductCode: 'PACruTth',
    jsonBasePath: '/data/',
    bannerDelay: 5000,
    autoUpdateInterval: 60000,
};

// Estado global
const state = {
    data: {},
    activeCardId: null,
    selectedDateStr: getCurrentDateString(),
    viewPreference: localStorage.getItem('viewPreference') || 'card',
    orderPreference: localStorage.getItem('orderPreference') || 'desc',
    cachedPalpites: null,
};

// Funções utilitárias
function getCurrentDateString() {
    return new Date().toISOString().split('T')[0].split('-').reverse().join('-');
}

function getJsonPath(filename) {
    return `${config.jsonBasePath}${filename}`;
}

function getDataUrl(date) {
    return `${getJsonPath('results.json')}?date=${date}`;
}

function showToast(message) {
    Toastify({
        text: message,
        duration: 3000,
        gravity: 'bottom',
        position: 'center',
        backgroundColor: '#ff4d4f',
    }).showToast();
}

function debounce(fn, delay) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
}

function withErrorBoundary(fn) {
    return async (...args) => {
        try {
            return await fn(...args);
        } catch (error) {
            console.error(error);
            showToast('Ocorreu um erro inesperado.');
        }
    };
}

// Gerenciamento de modais
function createModal(id, title, bodyContent, footerContent = '') {
    const template = document.getElementById('modal-template').content.cloneNode(true);
    const modal = template.querySelector('.modal');
    modal.id = id;
    modal.setAttribute('aria-hidden', 'false');
    modal.querySelector('.modal-title').textContent = title;
    modal.querySelector('.modal-body').innerHTML = bodyContent;
    modal.querySelector('.modal-footer').innerHTML = footerContent;
    modal.querySelector('.close-btn').addEventListener('click', () => closeModal(id));
    document.body.appendChild(template);
    modal.focus();
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.setAttribute('aria-hidden', 'true');
        modal.remove();
    }
}

// Manipulação de dados
const fetchData = withErrorBoundary(async (date) => {
    const response = await fetch(getDataUrl(date));
    if (!response.ok) throw new Error('Não foi possível carregar os dados.');
    const lastModified = response.headers.get('Last-Modified');
    if (lastModified && state.data.lastModified === lastModified) return;
    state.data = await response.json();
    state.data.lastModified = lastModified;
    renderData();
});

const debouncedFetchData = debounce(fetchData, 300);

function renderData() {
    const container = document.getElementById('data-container');
    const fragment = document.createDocumentFragment();
    const cards = Object.keys(state.data).map((cardId) => ({
        cardId,
        card: createCard(cardId, state.data[cardId]),
    }));
    cards.sort((a, b) => {
        const order = state.orderPreference === 'asc' ? 1 : -1;
        return order * (a.cardId.localeCompare(b.cardId));
    });
    cards.forEach(({ card }) => fragment.appendChild(card));
    container.innerHTML = '';
    container.appendChild(fragment);
}

function createCard(cardId, cardData) {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
        <h3>${cardData.title}</h3>
        <p>${cardData.results.join(', ')}</p>
        <button class="btn btn-primary" aria-label="Compartilhar resultado" onclick="shareContent('result', '${cardId}')">📤 Compartilhar</button>
    `;
    return card;
}

// Funções de modal
function openLotteryModal() {
    const bodyContent = '<p>Selecione uma loteria para visualizar os resultados.</p>';
    const footerContent = '<button class="btn btn-primary" onclick="redirectToLottery()">Confirmar</button>';
    createModal('lotteryModal', 'Selecionar Loteria', bodyContent, footerContent);
}

function openImageModal() {
    const bodyContent = `<img id="previewImage" src="${URL.createObjectURL(currentImageBlob)}" alt="Prévia da imagem">`;
    const footerContent = `
        <button class="btn btn-primary" onclick="downloadImage()">Baixar</button>
        <button class="btn btn-secondary" onclick="shareContent('image')">Compartilhar</button>
    `;
    createModal('imageModal', 'Prévia da Imagem', bodyContent, footerContent);
}

// Geração de imagens
let currentImageBlob = null;

const generateImage = withErrorBoundary(async (type, cardId, version, titleKey, selectedDateStr) => {
    const canvas = document.createElement('canvas');
    canvas.width = 720;
    canvas.height = 1280;
    const ctx = canvas.getContext('2d');
    // Lógica de geração de imagem (mantida como no original)
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px Inter';
    ctx.fillText(state.data[cardId].title, 20, 60);
    currentImageBlob = await canvas.convertToBlob({ type: 'image/png', quality: 0.9 });
    openImageModal();
});

// Funções de compartilhamento
async function shareContent(type, cardId) {
    try {
        if (type === 'image') {
            const file = new File([currentImageBlob], 'result.png', { type: 'image/png' });
            await navigator.share({ files: [file] });
        } else {
            const text = await generateText(type, cardId);
            await navigator.share({ text });
        }
    } catch (error) {
        showToast('Erro ao compartilhar.');
    }
}

async function generateText(type, cardId) {
    if (type === 'palpite') {
        if (!state.cachedPalpites) {
            const response = await fetch(getJsonPath('palpites.json') + '?t=' + new Date().getTime());
            if (!response.ok) throw new Error('Não foi possível carregar os palpites.');
            state.cachedPalpites = await response.json();
        }
        return state.cachedPalpites[cardId] || 'Sem palpites disponíveis.';
    }
    return state.data[cardId].results.join(', ');
}

// Banner deslizante
function initializeSlidingBanner() {
    const banner = document.getElementById('slidingBanner');
    setTimeout(() => {
        banner.style.display = 'block';
        banner.setAttribute('aria-hidden', 'false');
    }, config.bannerDelay);
    document.getElementById('closeBanner').addEventListener('click', () => {
        banner.style.display = 'none';
        banner.setAttribute('aria-hidden', 'true');
    });
    const productCode = new URLSearchParams(window.location.search).get('productCode') || config.defaultProductCode;
    document.getElementById('registerBtn').href = `https://77xbrasil.com/register?code=${productCode}`;
    document.getElementById('learnMoreBtn').href = `https://77xbrasil.com/learn?code=${productCode}`;
}

// Inicialização
function initialize() {
    flatpickr('#calendar', {
        dateFormat: 'd-m-Y',
        maxDate: 'today',
        defaultDate: state.selectedDateStr,
        onChange: (selectedDates, dateStr) => {
            state.selectedDateStr = dateStr;
            debouncedFetchData(dateStr);
        },
    });
    document.getElementById('orderToggle').addEventListener('click', () => {
        state.orderPreference = state.orderPreference === 'asc' ? 'desc' : 'asc';
        localStorage.setItem('orderPreference', state.orderPreference);
        renderData();
    });
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (event) => {
            if (event.target === modal) closeModal(modal.id);
        });
    });
    debouncedFetchData(state.selectedDateStr);
    setInterval(() => {
        if (state.selectedDateStr === getCurrentDateString()) {
            debouncedFetchData(state.selectedDateStr);
        }
    }, config.autoUpdateInterval);
    initializeSlidingBanner();
    document.getElementById('footerDomain').textContent = window.location.hostname;
    document.getElementById('footerYear').textContent = new Date().getFullYear();
}

initialize();
