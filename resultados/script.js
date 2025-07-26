// === SCRIPT COMPARTILHADO PARA MÚLTIPLAS PÁGINAS ===

// Variáveis globais compartilhadas
let globalData = {};
let activeCardId = null;
let selectedDateStr = getCurrentDateString();
let lastModifiedHeader = null;
let autoUpdateInterval = null;
let toastTimeout = null;
let orderPreference = localStorage.getItem("orderPreference") || "ascending";
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
  const codeParam = urlParams.get("pr");
  
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
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Função para obter a data máxima (hoje) no fuso horário do usuário
function getTodayDateString() {
  return getCurrentDateString();
}

// Função para obter o dia da semana atual em português
function getCurrentDayOfWeek() {
  const days = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
  const today = new Date();
  return days[today.getDay()];
}

// Função para carregar e exibir os títulos
async function loadTitulos() {
  try {
    const response = await fetch(getJsonPath("titulos.json") + "?t=" + new Date().getTime());
    if (!response.ok) throw new Error("Não foi possível carregar os títulos.");
    
    titulosData = await response.json();
    
    // Definir o dia atual como padrão
    const currentDay = getCurrentDayOfWeek();
    document.getElementById("dayFilter").value = currentDay;
    
    // Exibir títulos do dia atual
    displayTitulos(currentDay);
    
  } catch (error) {
    document.getElementById("titulosContent").innerHTML = `<div class="no-data">Erro ao carregar títulos: ${error.message}</div>`;
  }
}

// Função para exibir os títulos de um dia específico
function displayTitulos(dayOfWeek) {
  const content = document.getElementById("titulosContent");
  
  if (!titulosData || !titulosData["1-5"] || !titulosData["1-5"][dayOfWeek]) {
    content.innerHTML = `<div class="no-data">Nenhum título encontrado para ${dayOfWeek}.</div>`;
    return;
  }
  
  const titulos = titulosData["1-5"][dayOfWeek];
  
  let html = `<h4 style="margin: 0 0 1rem 0; color: var(--text-primary); font-size: 1.125rem;">📅 ${dayOfWeek}</h4>`;
  html += "<div style=\"display: flex; flex-direction: column; gap: 0.75rem;\">";
  
  titulos.forEach((titulo, index) => {
    html += `
      <div style="
        background: var(--bg-card); 
        border: 1px solid var(--border-color); 
        border-radius: 8px; 
        padding: 0.75rem 1rem; 
        transition: all 0.2s ease;
        cursor: default;
      " onmouseover="this.style.background=\'var(--bg-card-hover)\'" onmouseout="this.style.background=\'var(--bg-card)\'">
        <span style="color: var(--text-primary); font-weight: 500; font-family: \'JetBrains Mono\', monospace;">
          ${titulo}
        </span>
      </div>
    `;
  });
  
  html += "</div>";
  content.innerHTML = html;
}

// Função para compartilhar imagem
async function shareImage() {
  if (!currentImageBlob) {
    showToast("Nenhuma imagem disponível para compartilhar.");
    return;
  }

  try {
    if (navigator.share && navigator.canShare) {
      const file = new File([currentImageBlob], "resultado.png", { type: "image/png" });
      
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: getPageTitle(),
          text: "Confira este resultado!",
          files: [file]
        });
        showToast("Imagem compartilhada com sucesso!");
      } else {
        // Fallback para compartilhamento de URL com código
        const imageUrl = URL.createObjectURL(currentImageBlob);
        const shareUrl = `${window.location.origin}${window.location.pathname}?pr=${getStoredProductCode()}`;
        await navigator.share({
          title: getPageTitle(),
          text: "Confira este resultado!",
          url: shareUrl
        });
        showToast("Link compartilhado com sucesso!");
      }
    } else {
      // Fallback: copiar para clipboard ou mostrar opções
      showToast("Compartilhamento não suportado. Use o botão Baixar PNG.");
    }
  } catch (error) {
    if (error.name !== "AbortError") {
      console.error("Erro ao compartilhar:", error);
      showToast("Erro ao compartilhar imagem.");
    }
  }
}

// Função para abrir o modal de opções para criar PNG
function openCreatePngModal(type, cardId) {
  currentCreatePngType = type;
  currentCreatePngCardId = cardId;
  
  // Para palpites, não mostrar opções (sempre incluir apenas banner)
  if (type === "palpites") {
    generateImage(type, cardId);
    return;
  }
  
  // Para resultados, mostrar modal com opções
  const modalBody = document.getElementById("createPngModalBody");
  modalBody.innerHTML = `
    <div class="image-options">
      <h5>🖼️ Configurações da Imagem</h5>
      <div class="image-option">
        <input type="checkbox" id="addBankAdOption" name="addBankAd" ${imageOptions.includeBankAd ? "checked" : ""}>
        <label for="addBankAdOption">Adicionar propaganda da banca</label>
      </div>
      <div class="image-option">
        <input type="checkbox" id="addPalpitesOption" name="addPalpites" ${imageOptions.includeGuesses ? "checked" : ""}>
        <label for="addPalpitesOption">Adicionar palpites acima do banner</label>
      </div>
    </div>
  `;
  
  // Configurar botão de confirmação
  document.getElementById("confirmCreatePngBtn").onclick = () => {
    const addBankAd = document.getElementById("addBankAdOption").checked;
    const addPalpites = document.getElementById("addPalpitesOption").checked;
    imageOptions.includeBankAd = addBankAd;
    imageOptions.includeGuesses = addPalpites;
    closeModal("createPngModal");
    generateImage(currentCreatePngType, currentCreatePngCardId);
  };
  
  openModal("createPngModal");
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
        const calendar = document.querySelector(".flatpickr-calendar");
        if (calendar) {
          calendar.style.zIndex = "9999";
        }
      }, 10);
    }
  });
}

// Função para alternar a ordem dos cards
function toggleOrder() {
  orderPreference = orderPreference === "ascending" ? "descending" : "ascending";
  localStorage.setItem("orderPreference", orderPreference);
  document.getElementById("order-toggle-btn").textContent = orderPreference === "ascending" ? "⬆⬇ Inverter Ordem (Mais recente primeiro)" : "⬆⬇ Inverter Ordem (Mais antigo primeiro)";
  renderData();
}

// Funções de Modal com controle de rolagem do body
function openModal(modalId) {
  modalHistory.push(modalId);
  document.getElementById(modalId).style.display = "flex";
  document.body.classList.add("modal-open");
}

function closeModal(modalId) {
  document.getElementById(modalId).style.display = "none";
  document.body.classList.remove("modal-open");
  // Remover o modal atual do histórico
  const index = modalHistory.indexOf(modalId);
  if (index > -1) {
    modalHistory.splice(index, 1);
  }
}

// Funções do Modal de Imagem com controle de rolagem
function openImageModal() {
  document.getElementById("imageModal").style.display = "block";
  document.body.classList.add("modal-open");
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
    document.getElementById("data-container").innerHTML = "<div class=\"no-data loading\">Carregando dados...</div>";
  }

  const url = getDataUrl(selectedDateStr);
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`Resultados para ${selectedDateStr} não encontrados.`);
    
    const newLastModified = response.headers.get("Last-Modified");
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
        document.getElementById("data-container").innerHTML = `<div class="no-data">${error.message}</div>`;
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
  const container = document.getElementById("data-container");
  container.innerHTML = "";
  let hasContent = false;

  const versions = ["1-5", "1-10"];
  let cards = [];

  versions.forEach(version => {
    if (globalData[version]) {
      for (const title in globalData[version]) {
        hasContent = true;
        const resultData = globalData[version][title];
        const cardId = `${version}-${title.replace(/[^a-zA-Z0-9]/g, "")}`;
        const card = createCard(cardId, version, title, resultData);
        cards.push({ card, title, version });
      }
    }
  });

  // Ordenar os cards com base na preferência
  cards.sort((a, b) => {
    const timeA = extractTime(a.title);
    const timeB = extractTime(b.title);
    return orderPreference === "ascending" ? timeA - timeB : timeB - timeA;
  });

  cards.forEach(({ card }) => {
    container.appendChild(card);
  });

  if (!hasContent) {
    container.innerHTML = "<div class=\"no-data\">Nenhum resultado disponível para a data selecionada.</div>";
  }
  
  toggleResultView();
}

// Função para extrair o horário do título para ordenação
function extractTime(title) {
  const match = title.match(/(\d{2}:\d{2})/);
  if (match) {
    const [hours, minutes] = match[1].split(":").map(Number);
    return hours * 60 + minutes;
  }
  return 0;
}

// Criar card de resultado
function createCard(cardId, version, title, data) {
    const card = document.createElement("div");
    card.className = "card";
    card.id = cardId;
    card.dataset.version = version;

    // Header do card
    const header = document.createElement("div");
    header.className = "card-header";
    const cardTitle = document.createElement("h2");
    cardTitle.className = "card-title";
    cardTitle.textContent = title;
    header.appendChild(cardTitle);
    card.appendChild(header);

    // Body do card
    const body = document.createElement("div");
    body.className = "card-body";
    
    if (data.dados && data.dados.some(d => d.Milhar)) {
        // Container da tabela
        const tableContainer = document.createElement("div");
        tableContainer.className = "table-container";
        
        const table = document.createElement("table");
        table.innerHTML = `
            <thead>
                <tr>${data.cabecalhos.map(h => `<th>${h}</th>`).join("")}</tr>
            </thead>
            <tbody>
                ${data.dados.map(row => `<tr>${data.cabecalhos.map(h => `<td>${row[h] || "-"}</td>`).join("")}</tr>`).join("")}
            </tbody>
        `;
        tableContainer.appendChild(table);
        body.appendChild(tableContainer);

        // Timestamp usando horário do sistema
        const timestamp = document.createElement("div");
        timestamp.className = "timestamp";
        timestamp.textContent = getFormattedTimestamp(selectedDateStr);
        body.appendChild(timestamp);

        // Actions bar
        const actionsBar = document.createElement("div");
        actionsBar.className = "actions-bar";
        actionsBar.innerHTML = `
            <button class="btn btn-primary" onclick="shareContent(\'result\', \'${cardId}\')">
                📤 Compartilhar
            </button>
            <button class="btn btn-primary" onclick="copyContent(\'result\', \'${cardId}\')">
                📋 Copiar
            </button>
            <button class="btn btn-accent" onclick="openCreatePngModal(\'result\', \'${cardId}\')">
                🖼️ Criar PNG
            </button>
        `;
        body.appendChild(actionsBar);

    } else {
        body.innerHTML = "<div class=\"no-data\">Aguardando resultados...</div>";
    }
    card.appendChild(body);

    // Footer com balões de acertos
    const footer = document.createElement("div");
    footer.className = "card-footer";
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
    const buttonGroup = document.createElement("div");
    buttonGroup.className = "button-group";
    buttonGroup.innerHTML = `
        <button class="btn btn-primary toggle-view-btn">
            👁️ Ver do 1º ao 10º
        </button>
        <button class="btn btn-primary" onclick="showResumo(\'${cardId}\')">
            📊 Ver resumo de acertos
        </button>
        <button class="btn btn-accent" onclick="showPalpites(false, \'${cardId}\')">
            🎯 Palpites para a próxima extração
        </button>
    `;
    card.appendChild(buttonGroup);

    return card;
}

// Alternar visualização entre 1-5 e 1-10
function toggleResultView() {
    const has1to5 = document.querySelector("[data-version=\"1-5\"]");
    const has1to10 = document.querySelector("[data-version=\"1-10\"]");
    let show1to10 = localStorage.getItem("viewPreference") === "1-10";

    if (!has1to5 && has1to10) show1to10 = true;

    document.querySelectorAll(".card").forEach(card => {
        card.style.display = (show1to10 ? card.dataset.version === "1-10" : card.dataset.version === "1-5") ? "block" : "none";
    });

    document.querySelectorAll(".toggle-view-btn").forEach(btn => {
        btn.innerHTML = show1to10 ? "👁️ Ver do 1º ao 5º" : "👁️ Ver do 1º ao 10º";
        btn.onclick = () => {
            localStorage.setItem("viewPreference", show1to10 ? "1-5" : "1-10");
            toggleResultView();
        };
    });
}

// Mostrar resumo de acertos
function showResumo(cardId) {
    const [version, titleKey] = getCardDetails(cardId);
    const data = globalData[version][titleKey];
    
    const modalBody = document.getElementById("resumoModalBody");
    
    if (!data.acertos || Object.keys(data.acertos).length === 0) {
        modalBody.innerHTML = "<div class=\"no-data\">Nenhum acerto registrado para este resultado.</div>";
    } else {
        let html = "<div class=\"acertos-summary\">";
        
        if (data.acertos.Milhar > 0) {
            html += `<div class="acerto-item"><span class="acerto-label">Milhares:</span> <span class="acerto-value">${data.acertos.Milhar}</span></div>`;
        }
        if (data.acertos.Centena > 0) {
            html += `<div class="acerto-item"><span class="acerto-label">Centenas:</span> <span class="acerto-value">${data.acertos.Centena}</span></div>`;
        }
        if (data.acertos.Dezena > 0) {
            html += `<div class="acerto-item"><span class="acerto-label">Dezenas:</span> <span class="acerto-value">${data.acertos.Dezena}</span></div>`;
        }
        if (data.acertos.Grupo && data.acertos.Grupo.length > 0) {
            html += `<div class="acerto-item"><span class="acerto-label">Grupos:</span> <span class="acerto-value">${data.acertos.Grupo.join(" ")}</span></div>`;
        }
        
        html += "</div>";
        
        // Adicionar frases de acertos se existirem
        if (data.frases && Object.keys(data.frases).length > 0) {
            html += "<div class=\"frases-acertos\"><h4>Frases de Acertos:</h4>";
            for (const palpite in data.frases) {
                data.frases[palpite].forEach(frase => {
                    html += `<p><strong>Palpite ${palpite}:</strong> ${frase}</p>`;
                });
            }
            html += "</div>";
        }
        
        modalBody.innerHTML = html;
    }
    
    // Configurar botão de palpites
    document.getElementById("resumoModalPalpitesBtn").onclick = () => {
        closeModal("resumoModal");
        showPalpites(false, cardId);
    };
    
    openModal("resumoModal");
}

// Mostrar palpites
function showPalpites(fromResumo = false, cardId = null) {
    const modalBody = document.getElementById("palpitesModalBody");
    modalBody.innerHTML = "<div class=\"no-data loading\">Carregando palpites...</div>";
    
    // Configurar botão voltar
    const voltarBtn = document.getElementById("voltarBtn");
    if (fromResumo && cardId) {
        voltarBtn.style.display = "block";
        voltarBtn.onclick = () => {
            closeModal("palpitesModal");
            showResumo(cardId);
        };
    } else {
        voltarBtn.style.display = "none";
    }
    
    openModal("palpitesModal");
    
    // Carregar palpites
    fetch(getJsonPath("palpites.json") + "?t=" + new Date().getTime())
        .then(response => {
            if (!response.ok) throw new Error("Não foi possível carregar os palpites.");
            return response.json();
        })
        .then(data => {
            let html = "<div class=\"palpites-container\">";
            
            // Frase personalizada
            if (data.frase_1_5) {
                html += `<div class="palpites-frase"><h4>${data.frase_1_5}</h4></div>`;
            }
            
            // Lista de palpites
            if (data.palpites && data.palpites.length > 0) {
                html += "<div class=\"palpites-list\">";
                data.palpites.forEach((palpite, index) => {
                    html += `<div class="palpite-item">${palpite}</div>`;
                });
                html += "</div>";
                
                // Botão para compartilhar palpites
                html += `
                    <div class="palpites-actions">
                        <button class="btn btn-primary" onclick="shareContent(\'palpites\', \'${cardId || "default"}\')">
                            📤 Compartilhar
                        </button>
                        <button class="btn btn-primary" onclick="copyContent(\'palpites\', \'${cardId || "default"}\')">
                            📋 Copiar
                        </button>
                        <button class="btn btn-accent" onclick="openCreatePngModal(\'palpites\', \'${cardId || "default"}\')">
                            🖼️ Criar PNG
                        </button>
                    </div>
                `;
            } else {
                html += "<div class=\"no-data\">Nenhum palpite disponível no momento.</div>";
            }
            
            html += "</div>";
            modalBody.innerHTML = html;
        })
        .catch(error => {
            modalBody.innerHTML = `<div class="no-data">Erro ao carregar palpites: ${error.message}</div>`;
        });
}

// Gerar imagem
async function generateImage(type, cardId) {
    try {
        const [version, titleKey] = getCardDetails(cardId);
        const data = globalData[version][titleKey];
        
        // Criar canvas
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        
        // Configurações do canvas
        canvas.width = 800;
        canvas.height = 1200;
        
        // Fundo gradiente
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, "#0f0f23");
        gradient.addColorStop(1, "#1a1a2e");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Configurações de texto
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
        let yPosition = 80;
        
        if (type === "result") {
            // Título
            ctx.font = "bold 32px Inter, Arial, sans-serif";
            ctx.fillStyle = "#e2e8f0";
            ctx.fillText(titleKey, canvas.width / 2, yPosition);
            yPosition += 60;
            
            // Data
            ctx.font = "20px Inter, Arial, sans-serif";
            ctx.fillStyle = "#94a3b8";
            ctx.fillText(getFormattedTimestamp(selectedDateStr), canvas.width / 2, yPosition);
            yPosition += 80;
            
            // Resultados
            if (data.dados && data.dados.length > 0) {
                data.dados.forEach((row, index) => {
                    const prêmio = row["Prêmio"] || "";
                    const milhar = row["Milhar"] || "";
                    const grupo = row["Grupo"] || "";
                    const bicho = row["Bicho"] || "";
                    
                    // Prêmio
                    ctx.font = "bold 24px Inter, Arial, sans-serif";
                    ctx.fillStyle = index === 0 ? "#FFD700" : "#3b82f6";
                    ctx.fillText(`${prêmio}: ${milhar} - ${grupo} ${bicho}`, canvas.width / 2, yPosition);
                    yPosition += 50;
                });
            }
        } else if (type === "palpites") {
            // Carregar dados dos palpites
            const response = await fetch(getJsonPath("palpites.json") + "?t=" + new Date().getTime());
            const palpitesData = await response.json();
            
            // Título
            ctx.font = "bold 28px Inter, Arial, sans-serif";
            ctx.fillStyle = "#e2e8f0";
            ctx.fillText(palpitesData.frase_1_5 || "Palpites para a próxima extração", canvas.width / 2, yPosition);
            yPosition += 80;
            
            // Palpites
            if (palpitesData.palpites && palpitesData.palpites.length > 0) {
                ctx.font = "22px Inter, Arial, sans-serif";
                ctx.fillStyle = "#94a3b8";
                const palpitesText = palpitesData.palpites.join(", ");
                
                // Quebrar texto em linhas
                const words = palpitesText.split(" ");
                let line = "";
                const maxWidth = canvas.width - 100;
                
                for (let i = 0; i < words.length; i++) {
                    const testLine = line + words[i] + " ";
                    const metrics = ctx.measureText(testLine);
                    const testWidth = metrics.width;
                    
                    if (testWidth > maxWidth && i > 0) {
                        ctx.fillText(line, canvas.width / 2, yPosition);
                        line = words[i] + " ";
                        yPosition += 35;
                    } else {
                        line = testLine;
                    }
                }
                ctx.fillText(line, canvas.width / 2, yPosition);
                yPosition += 60;
            }
        }
        
        // Adicionar propaganda da banca se selecionado
        if (imageOptions.includeBankAd) {
            const adText = "Na 77x Brasil, o seu 1 Real vale 8 Mil!\nCadastre-se agora e ganhe 20% na sua primeira recarga!";
            const adLines = adText.split("\n");
            
            // Calcular altura total do texto do anúncio
            const adAreaHeight = 120;
            const adAreaStart = canvas.height - 200;
            let totalTextHeight = adLines.length * 35;
            totalTextHeight += (adLines.length - 1) * 35; // 35 é o espaçamento entre as linhas

            // Calcular a posição Y inicial para centralizar verticalmente
            let currentY = adAreaStart + (adAreaHeight - totalTextHeight) / 2;

            // Desenhar a primeira linha com fonte maior e cor amarela vibrante
            ctx.font = "bold 36px Inter, Arial, sans-serif"; // Fonte um pouco menor
            ctx.fillStyle = "#FFFF00"; // Amarelo vibrante
            ctx.fillText(adLines[0], canvas.width / 2, currentY);
            currentY += 40; // Ajustar para a próxima linha

            // Desenhar as linhas seguintes com fonte menor e fundo azul escuro
            ctx.font = "bold 36px Inter, Arial, sans-serif"; // Aumentado de 32px para 36px
            ctx.fillStyle = "#ffffff"; // Cor do texto para as linhas restantes
            for (let i = 1; i < adLines.length; i++) {
                // Calcular largura do texto para o fundo
                const textWidth = ctx.measureText(adLines[i]).width;
                const backgroundPadding = 20; // Preenchimento para o fundo
                const backgroundX = (canvas.width / 2) - (textWidth / 2) - (backgroundPadding / 2);
                const backgroundY = currentY - 28; // Ajustar para a posição vertical do texto
                const backgroundHeight = 35; // Altura do fundo

                // Desenhar fundo azul escuro
                ctx.fillStyle = "rgba(0, 0, 128, 0.7)"; // Azul escuro com transparência
                ctx.fillRect(backgroundX, backgroundY, textWidth + backgroundPadding, backgroundHeight);
                
                // Desenhar texto
                ctx.fillStyle = "#ffffff"; // Cor do texto
                ctx.fillText(adLines[i], canvas.width / 2, currentY);
                currentY += 35; // Espaçamento entre as linhas
            }
            yPosition = currentY + 20; // Atualizar yPosition para o próximo elemento
        }
        
        // Domínio do site na parte inferior com fonte muito maior
        ctx.font = "bold 48px Inter, Arial, sans-serif";
        ctx.fillStyle = "#94a3b8";
        ctx.fillText(window.location.hostname, canvas.width / 2, canvas.height - 60);
        
        // Converter canvas para blob
        canvas.toBlob((blob) => {
            if (!blob) {
                throw new Error("Falha ao gerar imagem");
            }
            
            currentImageBlob = blob;
            
            // Criar URL para preview
            const imageUrl = URL.createObjectURL(blob);
            document.getElementById("previewImage").src = imageUrl;
            
            // Configurar botão de download
            document.getElementById("downloadImageBtn").onclick = () => {
                const link = document.createElement("a");
                link.href = imageUrl;
                link.download = `${type}_${titleKey.replace(/[^a-zA-Z0-9]/g, "_")}_${selectedDateStr}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            };
            
            // Abrir modal de visualização
            openImageModal();
        }, "image/png", 0.9);
        
    } catch (error) {
        console.error("Erro ao gerar imagem:", error);
        alert("Erro ao gerar imagem: " + error.message);
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
    const date = new Date(dateStr + "T12:00:00");
    return date.toLocaleDateString("pt-BR", { 
        weekday: "long", 
        year: "numeric", 
        month: "long", 
        day: "numeric" 
    });
}

// Gerar texto para compartilhamento/cópia
async function generateText(type, cardId) {
    const [version, titleKey] = getCardDetails(cardId);
    const data = globalData[version][titleKey];
    const baseUrl = window.location.href;
    const pageUrl = generateDynamicShareUrl();
    const timestamp = getFormattedTimestamp(selectedDateStr);

    if (type === "result") {
        let text = `Resultado PT-RIO, RJ, 09:20, PT\nsábado, 26 de julho de 2025\n\n1º: 2876 - 19 Pavão\n2º: 6079 - 20 Peru\n3º: 5244 - 11 Cavalo\n4º: 1656 - 14 Gato\n5º: 4239 - 10 Coelho\n6º [soma]: 0094 -  \n7º [mult]: 483 -  \n\nVeja mais em: ${pageUrl}`;
        return text;
    }

    if (type === "frases") {
        let text = `Frases de Acertos - ${titleKey}\n\n`;
        if (data.frases && Object.keys(data.frases).length > 0) {
            for (const palpite in data.frases) {
                data.frases[palpite].forEach(frase => {
                    text += `Palpite ${palpite}: ${frase.replace(/<br>/g, " ")}\n`;
                });
            }
        } else {
            text = "Nenhuma frase de acerto para este resultado.";
        }
        return text;
    }

    if (type === "palpites") {
        try {
            const response = await fetch(getJsonPath("palpites.json") + "?t=" + new Date().getTime());
            if (!response.ok) return "Não foi possível carregar os palpites.";
            const palpitesData = await response.json();
            const frase = palpitesData[`frase_${version}`] || "Palpites para a próxima extração:";
            let text = `${frase}\n\n${palpitesData.palpites.join(", ")}\n\nConfira os resultados em: ${pageUrl}`;
            return text;
        } catch { 
            return "Erro ao gerar texto dos palpites."; 
        }
    }
}

// Compartilhar conteúdo
async function shareContent(type, cardId) {
    const text = await generateText(type, cardId);
    const baseUrl = window.location.href;
    const shareUrl = `${window.location.origin}${window.location.pathname}?pr=${getStoredProductCode()}`;
    
    if (navigator.share) {
        navigator.share({ 
            title: getPageTitle(), 
            text: text
        }).catch(console.error);
    } else {
        showToast("Compartilhamento não suportado neste dispositivo.");
    }
}

// Copiar conteúdo
async function copyContent(type, cardId) {
    const text = await generateText(type, cardId);
    try {
        await navigator.clipboard.writeText(text);
        showToast("Conteúdo copiado com sucesso!");
    } catch (err) {
        showToast("Falha ao copiar conteúdo.");
    }
}

// Obter detalhes do card
function getCardDetails(cardId) {
    const card = document.getElementById(cardId);
    const version = card.dataset.version;
    const titleKey = Object.keys(globalData[version]).find(key => 
        key.replace(/[^a-zA-Z0-9]/g, "") === cardId.replace(version + "-", "")
    );
    return [version, titleKey];
}

// Encontrar último título de resultado
function findLastResultTitle(data) {
    let lastTitle = "desconhecido";
    const versions = ["1-10", "1-5"];
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
    const orderToggleBtn = document.getElementById("order-toggle-btn");
    if (orderToggleBtn) {
        orderToggleBtn.addEventListener("click", toggleOrder);
        orderToggleBtn.textContent = orderPreference === "ascending" ? "⬆⬇ Inverter Ordem (Mais recente primeiro)" : "⬆⬇ Inverter Ordem (Mais antigo primeiro)";
    }

    // Event listener para o link dos títulos
    const titulosLink = document.getElementById("titulosLink");
    if (titulosLink) {
        titulosLink.addEventListener("click", function(e) {
            e.preventDefault();
            loadTitulos();
            openModal("titulosModal");
        });
        
        // Efeito hover no link
        titulosLink.addEventListener("mouseenter", function() {
            this.style.color = "var(--accent-primary)";
        });
        
        titulosLink.addEventListener("mouseleave", function() {
            this.style.color = "var(--text-secondary)";
        });
    }

    // Event listener para o filtro de dia
    const dayFilter = document.getElementById("dayFilter");
    if (dayFilter) {
        dayFilter.addEventListener("change", function() {
            displayTitulos(this.value);
        });
    }

    // Inicializar Flatpickr
    initializeFlatpickr();

    // Configurar banner deslizante
    setupSlidingBanner();

    // Configurar fechamento de modais com ESC
    document.addEventListener("keydown", function(e) {
        if (e.key === "Escape") {
            // Fechar modal de imagem primeiro se estiver aberto
            const imageModal = document.getElementById("imageModal");
            if (imageModal && imageModal.style.display === "block") {
                closeImageModal();
                return;
            }
            
            // Fechar outros modais
            const modals = document.querySelectorAll(".modal");
            modals.forEach(modal => {
                if (modal.style.display === "flex") {
                    closeModal(modal.id);
                }
            });
        }
    });

    // Configurar fechamento de modais clicando fora
    document.addEventListener("click", function(e) {
        if (e.target.classList.contains("modal")) {
            closeModal(e.target.id);
        }
        if (e.target.classList.contains("image-modal")) {
            closeImageModal();
        }
    });
}

// Configurar banner deslizante
function setupSlidingBanner() {
    const banner = document.getElementById("slidingBanner");
    const closeBtn = document.getElementById("closeBannerBtn");
    const registerBtn = document.getElementById("registerBtn");
    const learnMoreLink = document.getElementById("learnMoreLink");

    if (!banner) return;

    // Mostrar banner após 3 segundos
    setTimeout(() => {
        banner.classList.add("show");
    }, 3000);

    // Fechar banner
    if (closeBtn) {
        closeBtn.addEventListener("click", () => {
            banner.classList.remove("show");
        });
    }

    // Links do banner
    if (registerBtn) {
        registerBtn.addEventListener("click", (e) => {
            e.preventDefault();
            window.open("https://77xbrasil.com/register", "_blank");
        });
    }

    if (learnMoreLink) {
        learnMoreLink.addEventListener("click", (e) => {
            e.preventDefault();
            window.open("https://77xbrasil.com", "_blank");
        });
    }

    // Auto-fechar banner após 15 segundos
    setTimeout(() => {
        banner.classList.remove("show");
    }, 18000);
}



// Função para gerar URL de compartilhamento dinâmica
function generateDynamicShareUrl() {
  const storedCode = getStoredProductCode();
  const baseUrl = `${window.location.origin}${window.location.pathname}`;
  
  if (storedCode) {
    return `${baseUrl}?pr=${storedCode}`;
  } else {
    return baseUrl;
  }
}


