// === SCRIPT PARA BREADCRUMB NAVIGATION ===

/**
 * Configuração das páginas do site para o breadcrumb
 * Cada página deve ter um identificador único e suas informações
 */
const BREADCRUMB_CONFIG = {
  // Página inicial (domínio raiz)
  home: {
    title: 'Início',
    url: '/',
    isHome: true
  },
  
  // Página de resultados
  resultados: {
    title: 'Resultados',
    url: '/resultados/',
    parent: 'home'
  },
  
  // Página específica PT-RIO
  'pt-rio': {
    title: 'PT-RIO',
    url: '/resultados/pt-rio/',
    parent: 'resultados'
  },
  
  // Outras páginas podem ser adicionadas aqui
  // Exemplo:
  // 'pt-look': {
  //   title: 'PT-LOOK',
  //   url: '/resultados/pt-look/',
  //   parent: 'resultados'
  // }
};

/**
 * Detecta automaticamente a página atual baseada na URL
 * @returns {string} Identificador da página atual
 */
function detectCurrentPage() {
  const currentPath = window.location.pathname.toLowerCase();
  const currentHost = window.location.hostname;
  
  // Se estiver na raiz do domínio
  if (currentPath === '/' || currentPath === '') {
    return 'home';
  }
  
  // Detectar página de resultados genérica
  if (currentPath.includes('/resultados/') && !currentPath.includes('pt-rio') && !currentPath.includes('pt-look')) {
    return 'resultados';
  }
  
  // Detectar página PT-RIO
  if (currentPath.includes('pt-rio') || currentPath.includes('PT-RIO')) {
    return 'pt-rio';
  }
  
  // Detectar outras páginas específicas
  if (currentPath.includes('pt-look') || currentPath.includes('PT-LOOK')) {
    return 'pt-look';
  }
  
  // Fallback: assumir que está na página de resultados se contém "resultados"
  if (currentPath.includes('resultados')) {
    return 'resultados';
  }
  
  // Fallback final: página inicial
  return 'home';
}

/**
 * Constrói o caminho do breadcrumb baseado na página atual
 * @param {string} currentPageId - Identificador da página atual
 * @returns {Array} Array com o caminho do breadcrumb
 */
function buildBreadcrumbPath(currentPageId) {
  const path = [];
  let currentPage = BREADCRUMB_CONFIG[currentPageId];
  
  if (!currentPage) {
    // Se a página não estiver configurada, assumir que é uma subpágina de resultados
    currentPage = {
      title: 'Página Atual',
      url: window.location.pathname,
      parent: 'resultados'
    };
  }
  
  // Construir o caminho de volta até a raiz
  while (currentPage) {
    path.unshift(currentPage);
    
    if (currentPage.parent && BREADCRUMB_CONFIG[currentPage.parent]) {
      currentPage = BREADCRUMB_CONFIG[currentPage.parent];
    } else {
      break;
    }
  }
  
  return path;
}

/**
 * Gera o HTML do breadcrumb
 * @param {Array} breadcrumbPath - Caminho do breadcrumb
 * @returns {string} HTML do breadcrumb
 */
function generateBreadcrumbHTML(breadcrumbPath) {
  if (!breadcrumbPath || breadcrumbPath.length === 0) {
    return '';
  }
  
  let html = '<ol class="breadcrumb">';
  
  breadcrumbPath.forEach((page, index) => {
    const isLast = index === breadcrumbPath.length - 1;
    
    html += '<li class="breadcrumb-item">';
    
    if (isLast) {
      // Último item (página atual) - não é clicável
      html += `<span class="breadcrumb-current">${page.title}</span>`;
    } else {
      // Item clicável
      html += `<a href="${page.url}" class="breadcrumb-link">${page.title}</a>`;
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
    const currentPageId = detectCurrentPage();
    const breadcrumbPath = buildBreadcrumbPath(currentPageId);
    const breadcrumbHTML = generateBreadcrumbHTML(breadcrumbPath);
    
    if (breadcrumbHTML) {
      breadcrumbContainer.innerHTML = breadcrumbHTML;
      breadcrumbContainer.style.display = 'block';
      
      // Adicionar event listeners para os links do breadcrumb
      addBreadcrumbEventListeners();
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
      // Permitir navegação normal, mas adicionar efeito visual
      this.style.transform = 'scale(0.95)';
      
      setTimeout(() => {
        this.style.transform = '';
      }, 150);
    });
    
    // Adicionar efeito de hover melhorado
    link.addEventListener('mouseenter', function() {
      this.style.transform = 'translateY(-1px)';
    });
    
    link.addEventListener('mouseleave', function() {
      this.style.transform = '';
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
  
  // Observer para mudanças no título da página (pode indicar mudança de conteúdo)
  const titleObserver = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.type === 'childList' && mutation.target.tagName === 'TITLE') {
        setTimeout(updateBreadcrumb, 100);
      }
    });
  });
  
  const titleElement = document.querySelector('title');
  if (titleElement) {
    titleObserver.observe(titleElement, { childList: true });
  }
  
  console.log('Sistema de breadcrumb inicializado');
}

/**
 * Função para adicionar uma nova página à configuração dinamicamente
 * @param {string} pageId - Identificador único da página
 * @param {Object} pageConfig - Configuração da página
 */
function addBreadcrumbPage(pageId, pageConfig) {
  BREADCRUMB_CONFIG[pageId] = pageConfig;
  updateBreadcrumb();
}

/**
 * Função para obter a configuração atual do breadcrumb
 * @returns {Object} Configuração atual
 */
function getBreadcrumbConfig() {
  return { ...BREADCRUMB_CONFIG };
}

/**
 * Função para definir uma página personalizada temporariamente
 * Útil para páginas dinâmicas
 * @param {string} title - Título da página atual
 * @param {string} parent - ID da página pai
 */
function setCustomBreadcrumbPage(title, parent = 'resultados') {
  const currentPath = window.location.pathname;
  const customPageId = 'custom-' + Date.now();
  
  BREADCRUMB_CONFIG[customPageId] = {
    title: title,
    url: currentPath,
    parent: parent
  };
  
  // Forçar re-renderização com a página customizada
  const breadcrumbContainer = document.getElementById('breadcrumbNav');
  if (breadcrumbContainer) {
    const breadcrumbPath = buildBreadcrumbPath(customPageId);
    const breadcrumbHTML = generateBreadcrumbHTML(breadcrumbPath);
    breadcrumbContainer.innerHTML = breadcrumbHTML;
    addBreadcrumbEventListeners();
  }
}

// Exportar funções para uso global
window.initializeBreadcrumb = initializeBreadcrumb;
window.updateBreadcrumb = updateBreadcrumb;
window.addBreadcrumbPage = addBreadcrumbPage;
window.getBreadcrumbConfig = getBreadcrumbConfig;
window.setCustomBreadcrumbPage = setCustomBreadcrumbPage;

// Auto-inicializar se o DOM já estiver carregado
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeBreadcrumb);
} else {
  // DOM já carregado, inicializar imediatamente
  initializeBreadcrumb();
}

