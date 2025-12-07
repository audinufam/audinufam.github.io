/**
 * Data Loader - Carrega dados dinâmicos do JSON para as páginas
 * AUDIN/UFAM Dashboard
 */

// Cache global para os dados
let statsData = null;

/**
 * Carrega os dados de estatísticas do JSON
 */
async function loadStats() {
    if (statsData) return statsData;

    try {
        const response = await fetch('/data/stats.json');
        statsData = await response.json();
        return statsData;
    } catch (error) {
        console.error('Erro ao carregar stats.json:', error);
        return null;
    }
}

/**
 * Formata número para exibição brasileira
 */
function formatNumber(num) {
    return num.toLocaleString('pt-BR');
}

/**
 * Formata percentual para exibição
 */
function formatPercent(num) {
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/**
 * Calcula o path do arco SVG para o gauge
 * @param {number} percentage - Percentual (0-100)
 * @returns {string} - Path SVG
 */
function calculateGaugeArc(percentage) {
    // Arco vai de 0% a 100% em um semicírculo
    // Centro em (100, 100), raio 80
    // Ângulo inicial: 180° (esquerda), final: 0° (direita)
    const startAngle = Math.PI; // 180°
    const endAngle = startAngle - (percentage / 100) * Math.PI;

    const cx = 100;
    const cy = 100;
    const r = 80;

    const startX = cx + r * Math.cos(startAngle);
    const startY = cy - r * Math.sin(startAngle);
    const endX = cx + r * Math.cos(endAngle);
    const endY = cy - r * Math.sin(endAngle);

    // Flag para arco grande (> 180°)
    const largeArcFlag = percentage > 50 ? 1 : 0;

    return `M ${startX} ${startY} A ${r} ${r} 0 ${largeArcFlag} 1 ${endX} ${endY}`;
}

/**
 * Atualiza elementos do Dashboard (index.html)
 */
async function updateDashboard() {
    const stats = await loadStats();
    if (!stats) return;

    // Cards principais
    updateElement('card-relatorios', stats.total_relatorios);
    updateElement('card-recomendacoes', stats.total_recomendacoes);
    updateElement('card-beneficios', stats.beneficios);
    updateElement('card-unidades', stats.total_unidades);

    // Barra de status
    updateStatusBar(stats);

    // Efetividade
    updateElement('efetividade-valor', formatPercent(stats.efetividade) + '%');
    updateElement('efetividade-atendidas-baixadas', stats.beneficios);
    updateElement('efetividade-total', stats.total_recomendacoes);

    // Atualizar arco do gauge SVG
    const gaugeArc = document.getElementById('gauge-arc');
    if (gaugeArc) {
        gaugeArc.setAttribute('d', calculateGaugeArc(stats.efetividade));
    }

    // Números em destaque na seção Sobre a AUDIN
    updateElement('stat-anos', stats.anos_atuacao);
    updateElement('stat-relatorios', stats.total_relatorios);
    updateElement('stat-unidades', stats.total_unidades);

    // Data de atualização
    updateElement('data-atualizacao', stats.data_atualizacao);
}

/**
 * Atualiza elementos do Monitoramento (monitor/index.html)
 */
async function updateMonitoramento() {
    const stats = await loadStats();
    if (!stats) return;

    // Cards de status
    updateElement('monitor-atendidas', stats.atendidas);
    updateElement('monitor-atendidas-perc', formatPercent(stats.perc_atendidas) + '%');

    updateElement('monitor-baixadas', stats.baixadas);
    updateElement('monitor-baixadas-perc', formatPercent(stats.perc_baixadas) + '%');

    updateElement('monitor-implementacao', stats.em_implementacao);
    updateElement('monitor-implementacao-perc', formatPercent(stats.perc_em_implementacao) + '%');

    updateElement('monitor-pendentes', stats.pendentes);
    updateElement('monitor-pendentes-perc', formatPercent(stats.perc_pendentes) + '%');

    // Progresso geral
    updateElement('monitor-resolvidas-perc', formatPercent(stats.efetividade) + '% Resolvidas');

    // Atualizar barra de progresso
    updateProgressBar(stats);
}

/**
 * Atualiza elementos do Benefícios (beneficios/index.html)
 */
async function updateBeneficios() {
    const stats = await loadStats();
    if (!stats) return;

    // Cards principais
    updateElement('beneficios-total', stats.beneficios);
    updateElement('beneficios-unidades', stats.unidades_com_beneficios);
    updateElement('beneficios-media', formatPercent(stats.media_beneficios_unidade));

    // Top 5 unidades com benefícios
    if (stats.top_unidades_beneficios) {
        stats.top_unidades_beneficios.forEach((item, index) => {
            updateElement(`top-beneficio-${index + 1}-nome`, item.unidade);
            updateElement(`top-beneficio-${index + 1}-total`, item.total);
        });
    }
}

/**
 * Atualiza elementos do Raio-X (raio-x/index.html)
 */
async function updateRaioX() {
    const stats = await loadStats();
    if (!stats) return;

    // Cards de estatísticas
    updateElement('raiox-unidades', stats.total_unidades);
    updateElement('raiox-anos', stats.anos_atuacao);
    updateElement('raiox-periodo', `${stats.ano_inicio} - ${stats.ano_fim}`);
    updateElement('raiox-media', formatPercent(stats.media_rec_ano));
    updateElement('raiox-ano-pico', stats.ano_pico);
    updateElement('raiox-rec-pico', stats.rec_ano_pico + ' recomendações');

    // Top unidades com mais recomendações
    if (stats.top_unidades_recomendacoes) {
        stats.top_unidades_recomendacoes.slice(0, 3).forEach((item, index) => {
            updateElement(`top-rec-${index + 1}-nome`, item.unidade);
            updateElement(`top-rec-${index + 1}-total`, item.total);
            updateElement(`top-rec-${index + 1}-perc`, formatPercent(item.percentual) + '% do total');
        });
    }
}

/**
 * Atualiza elementos de Relatórios (report/index.html)
 */
async function updateRelatorios() {
    const stats = await loadStats();
    if (!stats) return;

    // Top 5 unidades com mais recomendações
    if (stats.top_unidades_recomendacoes) {
        stats.top_unidades_recomendacoes.slice(0, 5).forEach((item, index) => {
            updateElement(`report-top-${index + 1}-nome`, item.unidade);
            updateElement(`report-top-${index + 1}-total`, item.total);
        });
    }
}

/**
 * Atualiza um elemento pelo ID
 */
function updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

/**
 * Atualiza a barra de status do dashboard
 */
function updateStatusBar(stats) {
    const barAtendidas = document.getElementById('bar-atendidas');
    const barBaixadas = document.getElementById('bar-baixadas');
    const barImplementacao = document.getElementById('bar-implementacao');
    const barPendentes = document.getElementById('bar-pendentes');

    if (barAtendidas) {
        barAtendidas.style.width = stats.perc_atendidas + '%';
        barAtendidas.textContent = stats.atendidas;
    }
    if (barBaixadas) {
        barBaixadas.style.width = stats.perc_baixadas + '%';
        barBaixadas.textContent = stats.baixadas;
    }
    if (barImplementacao) {
        barImplementacao.style.width = stats.perc_em_implementacao + '%';
        barImplementacao.textContent = stats.em_implementacao;
    }
    if (barPendentes) {
        barPendentes.style.width = stats.perc_pendentes + '%';
        barPendentes.textContent = stats.pendentes;
    }

    // Legenda
    updateElement('legend-atendidas', `Atendidas (${formatPercent(stats.perc_atendidas)}%)`);
    updateElement('legend-baixadas', `Baixadas (${formatPercent(stats.perc_baixadas)}%)`);
    updateElement('legend-implementacao', `Em Implementação (${formatPercent(stats.perc_em_implementacao)}%)`);
    updateElement('legend-pendentes', `Pendentes (${formatPercent(stats.perc_pendentes)}%)`);
}

/**
 * Atualiza a barra de progresso do monitoramento
 */
function updateProgressBar(stats) {
    const segments = [
        { id: 'progress-atendidas', perc: stats.perc_atendidas, value: stats.atendidas },
        { id: 'progress-baixadas', perc: stats.perc_baixadas, value: stats.baixadas },
        { id: 'progress-implementacao', perc: stats.perc_em_implementacao, value: stats.em_implementacao },
        { id: 'progress-pendentes', perc: stats.perc_pendentes, value: stats.pendentes }
    ];

    segments.forEach(seg => {
        const el = document.getElementById(seg.id);
        if (el) {
            el.style.width = seg.perc + '%';
            el.textContent = seg.value;
        }
    });
}

/**
 * Detecta qual página está sendo carregada e atualiza os dados correspondentes
 */
function initDataLoader() {
    const path = window.location.pathname;

    if (path === '/' || path === '/index.html' || path.endsWith('/index.html') && !path.includes('/')) {
        updateDashboard();
    } else if (path.includes('/monitor/')) {
        updateMonitoramento();
    } else if (path.includes('/beneficios/')) {
        updateBeneficios();
    } else if (path.includes('/raio-x/')) {
        updateRaioX();
    } else if (path.includes('/report/')) {
        updateRelatorios();
    }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', initDataLoader);
