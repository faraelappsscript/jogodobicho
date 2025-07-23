// === SCRIPT PARA BREADCRUMB NAVIGATION ===

/**
 * Detecta automaticamente o caminho da página baseado na URL
 * e constrói o breadcrumb dinamicamente
 */

/**
 * Analisa a URL atual e extrai os segmentos do caminho
 * @returns {Array} Array com os segmentos do caminho
 */
function parseCurrentPath() {
  const currentPath = window.location.pathname;
  const hostname = window.location.hostname;
  
  // Remover barras extras e dividir o caminho
  const segments = currentPath
    .replace(/^\/+|\/+$/g, '') // Remove barras do início e fim
    .split('/')
    .filter(segment => segment.length > 0); // Remove segmentos vazios
  
  return segments;
}

/**
 * Constrói automaticamente o breadcrumb baseado nos segmentos da URL
 * @returns {Array} Array com os itens do breadcrumb
 */
function buildAutomaticBreadcrumb() {
  const segments = parseCurrentPath();
  const breadcrumbItems = [];
  
  // Sempre começar com "Início"
  breadcrumbItems.push({
    title: 'Início',
    url: '/',
    isHome: true
  });
  
  // Se não há segmentos, estamos na página inicial
  if (segments.length === 0) {
    return [breadcrumbItems[0]]; // Retorna apenas "Início" como página atual
  }
  
  // Construir o caminho progressivamente
  let currentUrl = '';
  
  segments.forEach((segment, index) => {
    currentUrl += '/' + segment;
    
    // Usar o segmento diretamente como título
    let title = segment;
    
    // Se é o último segmento, é a página atual
    const isLast = index === segments.length - 1;
    
    breadcrumbItems.push({
      title: title,
      url: currentUrl + (isLast ? '' : '/'), // Adicionar barra final se não for o último
      isCurrent: isLast
    });
  });
  
  return breadcrumbItems;
}

/**
 * Gera o HTML do breadcrumb
 * @param {Array} breadcrumbItems - Itens do breadcrumb
 * @returns {string} HTML do breadcrumb
 */
function generateBreadcrumbHTML(breadcrumbItems) {
  if (!breadcrumbItems || breadcrumbItems.length === 0) {
    return '';
  }
  
  // Se há apenas um item (página inicial), não mostrar breadcrumb
  if (breadcrumbItems.length === 1 && breadcrumbItems[0].isHome) {
    return '';
  }
  
  let html = '<ol class="breadcrumb">';
  
  breadcrumbItems.forEach((item, index) => {
    const isLast = index === breadcrumbItems.length - 1;
    
    html += '<li class="breadcrumb-item">';
    
    if (isLast || item.isCurrent) {
      // Último item (página atual) - não é clicável
      html += `<span class="breadcrumb-current">${item.title}</span>`;
    } else {
      // Item clicável
      html += `<a href="${item.url}" class="breadcrumb-link">${item.title}</a>`;
    }
    
    html += '</li>';
  });
  
  html += '</ol>';
  
  return html;
}

/**
 * Renderiza o breadcrumb na página
 */
function renderBreadcrumb() {
  const breadcrumbContainer = document.getElementById('breadcrumbNav');
  
  if (!breadcrumbContainer) {
    console.warn('Container do breadcrumb não encontrado (ID: breadcrumbNav)');
    return;
  }
  
  try {
    const breadcrumbItems = buildAutomaticBreadcrumb();
    const breadcrumbHTML = generateBreadcrumbHTML(breadcrumbItems);
    
    if (breadcrumbHTML) {
      breadcrumbContainer.innerHTML = breadcrumbHTML;
      breadcrumbContainer.style.display = 'block';
      
      // Adicionar event listeners para os links do breadcrumb
      addBreadcrumbEventListeners();
      
      console.log('Breadcrumb renderizado:', breadcrumbItems);
    } else {
      // Se não há breadcrumb para mostrar, ocultar o container
      breadcrumbContainer.style.display = 'none';
    }
    
  } catch (error) {
    console.error('Erro ao renderizar breadcrumb:', error);
    breadcrumbContainer.style.display = 'none';
  }
}

/**
 * Adiciona event listeners para os links do breadcrumb
 */
function addBreadcrumbEventListeners() {
  const breadcrumbLinks = document.querySelectorAll('.breadcrumb-link');
  
  breadcrumbLinks.forEach(link => {
    link.addEventListener('click', function(event) {
      // Permitir navegação normal
      console.log('Navegando para:', this.href);
    });
  });
}

/**
 * Atualiza o breadcrumb quando a página muda (para SPAs)
 */
function updateBreadcrumb() {
  renderBreadcrumb();
}

/**
 * Inicializa o sistema de breadcrumb
 */
function initializeBreadcrumb() {
  // Renderizar o breadcrumb inicial
  renderBreadcrumb();
  
  // Escutar mudanças na URL (para SPAs que usam History API)
  window.addEventListener('popstate', function() {
    setTimeout(updateBreadcrumb, 100);
  });
  
  // Escutar mudanças no hash (fallback)
  window.addEventListener('hashchange', function() {
    setTimeout(updateBreadcrumb, 100);
  });
  
  console.log('Sistema de breadcrumb inicializado automaticamente');
  console.log('URL atual:', window.location.pathname);
  console.log('Segmentos detectados:', parseCurrentPath());
}

/**
 * Função para forçar um título personalizado para a página atual
 * @param {string} customTitle - Título personalizado
 */
function setCustomPageTitle(customTitle) {
  const breadcrumbItems = buildAutomaticBreadcrumb();
  
  if (breadcrumbItems.length > 0) {
    // Atualizar o título da última página (atual)
    breadcrumbItems[breadcrumbItems.length - 1].title = customTitle;
    
    const breadcrumbContainer = document.getElementById('breadcrumbNav');
    if (breadcrumbContainer) {
      const breadcrumbHTML = generateBreadcrumbHTML(breadcrumbItems);
      if (breadcrumbHTML) {
        breadcrumbContainer.innerHTML = breadcrumbHTML;
        addBreadcrumbEventListeners();
      }
    }
  }
}

/**
 * Função para obter informações do breadcrumb atual
 * @returns {Object} Informações do breadcrumb
 */
function getBreadcrumbInfo() {
  return {
    currentPath: window.location.pathname,
    segments: parseCurrentPath(),
    breadcrumbItems: buildAutomaticBreadcrumb()
  };
}

// Exportar funções para uso global
window.initializeBreadcrumb = initializeBreadcrumb;
window.updateBreadcrumb = updateBreadcrumb;
window.setCustomPageTitle = setCustomPageTitle;
window.getBreadcrumbInfo = getBreadcrumbInfo;

// Auto-inicializar se o DOM já estiver carregado
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeBreadcrumb);
} else {
  // DOM já carregado, inicializar imediatamente
  initializeBreadcrumb();
}

