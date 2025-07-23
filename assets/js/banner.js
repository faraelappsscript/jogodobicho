// === BANNER FLUTUANTE COM LINK DINÂMICO - VERSÃO CORRIGIDA ===

(function() {
    'use strict';
    
    // Configurações do banner
    const BANNER_CONFIG = {
        showDelay: 10000, // 10 segundos
        defaultLink: 'https://77xxbrasil.com',
        infoPageLink: '/criarmeubanner'
    };
    
    // Função para recuperar o link armazenado no navegador
    function getStoredReferrerLink() {
        const link = localStorage.getItem('referrerLink');
        console.log('Banner: Tentando recuperar link armazenado:', link);
        return link;
    }
    
    // Função para extrair domínio de uma URL
    function extractDomain(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname;
        } catch (error) {
            return url;
        }
    }
    
    // Função para criar os estilos CSS do banner
    function createBannerStyles() {
        const style = document.createElement('style');
        style.textContent = `
            #promotional-banner {
                position: fixed;
                bottom: -100%;
                left: 50%;
                transform: translateX(-50%);
                width: 90%;
                max-width: 400px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border-radius: 15px 15px 0 0;
                box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.3);
                z-index: 10000;
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                transition: bottom 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                border: 2px solid rgba(255, 255, 255, 0.2);
            }
            
            #promotional-banner.show {
                bottom: 0;
            }
            
            .banner-header {
                position: relative;
                padding: 15px 20px 10px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.2);
            }
            
            .banner-close {
                position: absolute;
                top: 10px;
                right: 15px;
                background: rgba(255, 255, 255, 0.2);
                border: none;
                color: white;
                width: 30px;
                height: 30px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 18px;
                font-weight: bold;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
            }
            
            .banner-close:hover {
                background: rgba(255, 255, 255, 0.3);
                transform: scale(1.1);
            }
            
            .banner-content {
                padding: 20px;
                text-align: center;
                line-height: 1.6;
            }
            
            .banner-title {
                font-size: 16px;
                font-weight: bold;
                margin-bottom: 8px;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
            }
            
            .banner-domain {
                font-size: 18px;
                font-weight: bold;
                color: #FFD700;
                margin: 8px 0;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
            }
            
            .banner-description {
                font-size: 14px;
                margin: 8px 0;
                opacity: 0.95;
            }
            
            .banner-cta {
                margin: 15px 0;
            }
            
            .banner-button {
                background: linear-gradient(45deg, #FFD700, #FFA500);
                color: #333;
                border: none;
                padding: 12px 25px;
                border-radius: 25px;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s ease;
                text-decoration: none;
                display: inline-block;
                box-shadow: 0 4px 15px rgba(255, 215, 0, 0.3);
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .banner-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(255, 215, 0, 0.4);
                background: linear-gradient(45deg, #FFA500, #FFD700);
            }
            
            .banner-footer {
                padding: 10px 20px 15px;
                font-size: 11px;
                text-align: center;
                opacity: 0.8;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .banner-info-link {
                color: #FFD700;
                text-decoration: underline;
                cursor: pointer;
                transition: color 0.3s ease;
            }
            
            .banner-info-link:hover {
                color: #FFA500;
            }
            
            @media (max-width: 480px) {
                #promotional-banner {
                    width: 95%;
                    max-width: none;
                }
                
                .banner-content {
                    padding: 15px;
                }
                
                .banner-title {
                    font-size: 15px;
                }
                
                .banner-domain {
                    font-size: 16px;
                }
                
                .banner-description {
                    font-size: 13px;
                }
                
                .banner-button {
                    padding: 10px 20px;
                    font-size: 14px;
                }
            }
            
            /* Animação de pulso para o botão */
            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.05); }
                100% { transform: scale(1); }
            }
            
            .banner-button.pulse {
                animation: pulse 2s infinite;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Função para criar o HTML do banner
    function createBannerHTML(referrerLink) {
        const hasSavedLink = !!referrerLink;
        const targetLink = hasSavedLink ? referrerLink : BANNER_CONFIG.defaultLink;
        const domain = hasSavedLink ? extractDomain(referrerLink) : extractDomain(BANNER_CONFIG.defaultLink);
        
        console.log('Banner: Criando HTML com link:', targetLink);
        console.log('Banner: Domínio extraído:', domain);
        console.log('Banner: Tem link salvo?', hasSavedLink);
        
        let bannerHTML = `
            <div id="promotional-banner">
                <div class="banner-header">
                    <button class="banner-close" onclick="closeBanner()">&times;</button>
                </div>
                <div class="banner-content">
                    <div class="banner-title">
                        Cadastre-se agora e tenha a sorte na palma da sua mão!
                    </div>
                    <div class="banner-domain">
                        ${domain}
                    </div>
                    <div class="banner-description">
                        Banca 24h/7 online, com as melhores cotações!
                    </div>
                    <div class="banner-description">
                        Cadastre-se no botão abaixo e descubra a emoção de ganhar prêmios incríveis!
                    </div>
                    <div class="banner-cta">
                        <a href="${targetLink}" target="_blank" class="banner-button pulse">
                            Cadastre-se
                        </a>
                    </div>
                </div>
        `;
        
        // Adicionar footer apenas se não houver link salvo
        if (!hasSavedLink) {
            bannerHTML += `
                <div class="banner-footer">
                    Tenha o seu link de promotor como destino do botão acima!<br>
                    <span class="banner-info-link" onclick="openInfoPage()">
                        Clique aqui e saiba mais
                    </span>
                </div>
            `;
        }
        
        bannerHTML += `</div>`;
        
        return bannerHTML;
    }
    
    // Função para fechar o banner
    function closeBanner() {
        const banner = document.getElementById('promotional-banner');
        if (banner) {
            banner.classList.remove('show');
            setTimeout(() => {
                banner.remove();
            }, 500);
            
            // Marcar que o banner foi fechado para não mostrar novamente nesta sessão
            sessionStorage.setItem('bannerClosed', 'true');
        }
    }
    
    // Função para abrir página de informações
    function openInfoPage() {
        window.open(BANNER_CONFIG.infoPageLink, '_blank');
    }
    
    // Função para verificar se o banner deve ser exibido
    function shouldShowBanner() {
        // Não mostrar se já foi fechado nesta sessão
        if (sessionStorage.getItem('bannerClosed') === 'true') {
            console.log('Banner: Banner foi fechado nesta sessão');
            return false;
        }
        
        // Não mostrar se já existe um banner na página
        if (document.getElementById('promotional-banner')) {
            console.log('Banner: Banner já existe na página');
            return false;
        }
        
        return true;
    }
    
    // Função para exibir o banner
    function showBanner() {
        console.log('Banner: Iniciando showBanner()');
        
        if (!shouldShowBanner()) {
            console.log('Banner: Banner não deve ser exibido');
            return;
        }
        
        // Recuperar o link aqui, após o delay de 10 segundos
        const referrerLink = getStoredReferrerLink();
        console.log('Banner: Link recuperado para exibição (após delay):', referrerLink);
        
        // Verificar novamente se há link no localStorage
        console.log('Banner: Verificando localStorage completo:');
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            console.log(`  ${key}: ${localStorage.getItem(key)}`);
        }
        
        // Criar estilos CSS
        createBannerStyles();
        
        // Criar e inserir o banner no DOM
        const bannerContainer = document.createElement('div');
        bannerContainer.innerHTML = createBannerHTML(referrerLink);
        document.body.appendChild(bannerContainer.firstElementChild);
        
        // Tornar as funções globais para os event handlers
        window.closeBanner = closeBanner;
        window.openInfoPage = openInfoPage;
        
        // Mostrar o banner com animação após um pequeno delay
        setTimeout(() => {
            const banner = document.getElementById('promotional-banner');
            if (banner) {
                banner.classList.add('show');
                console.log('Banner: Banner exibido com sucesso');
            }
        }, 100);
        
        // Remover a animação de pulso após alguns segundos
        setTimeout(() => {
            const button = document.querySelector('.banner-button');
            if (button) {
                button.classList.remove('pulse');
            }
        }, 8000);
    }
    
    // Função principal de inicialização
    function initBanner() {
        console.log('Banner: Inicializando banner. Aguardando', BANNER_CONFIG.showDelay, 'ms');
        
        // Verificar se há link no localStorage imediatamente
        const currentLink = getStoredReferrerLink();
        console.log('Banner: Link atual no localStorage (na inicialização):', currentLink);
        
        // Aguardar o tempo configurado antes de mostrar o banner
        setTimeout(showBanner, BANNER_CONFIG.showDelay);
    }
    
    // Aguardar que todos os scripts sejam carregados
    function waitForScriptsAndInit() {
        // Aguardar um pouco mais para garantir que o script principal teve tempo de processar
        setTimeout(() => {
            console.log('Banner: Iniciando após aguardar scripts carregarem');
            initBanner();
        }, 1000); // 1 segundo adicional
    }
    
    // Inicializar quando o DOM estiver completamente carregado
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', waitForScriptsAndInit);
    } else {
        waitForScriptsAndInit();
    }
    
    // Exportar funções para uso externo se necessário
    window.BannerManager = {
        show: showBanner,
        close: closeBanner,
        getStoredLink: getStoredReferrerLink,
        forceShow: () => {
            sessionStorage.removeItem('bannerClosed');
            showBanner();
        }
    };
    
})();

