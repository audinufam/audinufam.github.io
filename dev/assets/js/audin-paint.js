/**
 * AUDIN Design System - PAINT JavaScript
 *
 * Comportamentos interativos para a pagina do PAINT digital.
 * Estende o namespace window.AUDIN (definido em audin-core.js).
 * Carregado APOS audin-core.js.
 *
 * Componentes:
 *   - PAINT_DATA: populacao de campos numericos via data-paint-field
 *   - Scroll spy: IntersectionObserver para destaque de secao ativa na sidebar
 *   - Smooth scroll: navegacao suave ao clicar links da sidebar
 *   - Barra de progresso: indicador de % lido do conteudo
 *   - Voltar ao topo: botao flutuante com visibilidade por scroll
 *   - Graficos Chart.js: leitura de PAINT_DATA com fallback hardcoded
 *   - Hamburger menu: sidebar overlay para mobile
 *   - Scroll shadows: sombras indicativas em tabelas com scroll horizontal
 *
 * Uso:
 *   Auto-init no DOMContentLoaded.
 *   Re-init manual: AUDIN.initPaint(container) para conteudo dinamico.
 */
(function () {
    'use strict';

    window.AUDIN = window.AUDIN || {};

    /* ============================================
       1. SCROLL SPY (IntersectionObserver)
       ============================================ */

    /**
     * Inicializa scroll spy para a sidebar do PAINT.
     * Destaca o link correspondente a secao visivel na viewport.
     * Usa IntersectionObserver com rootMargin para deteccao precisa.
     *
     * INDEPENDENTE do scroll spy de audin-core.js (que usa .audin-relatorio__nav-link).
     *
     * @param {HTMLElement|Document} [container=document] - Escopo de busca
     */
    AUDIN.initPaintScrollSpy = function (container) {
        var scope = container || document;
        var navLinks = scope.querySelectorAll('.audin-paint__nav-link');
        var sections = [];

        navLinks.forEach(function (link) {
            var href = link.getAttribute('href');
            if (!href || href.indexOf('#') === -1) {
                return;
            }
            var targetId = href.split('#')[1];
            var section = document.getElementById(targetId);
            if (section) {
                sections.push({ el: section, link: link });
            }
        });

        if (sections.length === 0) {
            return;
        }

        var activeClass = 'audin-paint__nav-link--active';

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    navLinks.forEach(function (link) {
                        link.classList.remove(activeClass);
                    });
                    var match = sections.find(function (s) {
                        return s.el === entry.target;
                    });
                    if (match) {
                        match.link.classList.add(activeClass);
                    }
                }
            });
        }, {
            rootMargin: '-20% 0px -70% 0px',
            threshold: 0
        });

        sections.forEach(function (s) {
            observer.observe(s.el);
        });
    };

    /* ============================================
       2. SMOOTH SCROLL
       ============================================ */

    /**
     * Inicializa smooth scroll nos links da sidebar do PAINT.
     * Respeita prefers-reduced-motion para acessibilidade.
     *
     * @param {HTMLElement|Document} [container=document] - Escopo de busca
     */
    AUDIN.initPaintSmoothScroll = function (container) {
        var scope = container || document;
        var links = scope.querySelectorAll('.audin-paint__nav-link');
        var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        links.forEach(function (link) {
            link.addEventListener('click', function (e) {
                var href = link.getAttribute('href');
                if (!href || href.indexOf('#') === -1) {
                    return;
                }
                var target = document.getElementById(href.split('#')[1]);
                if (!target) {
                    return;
                }
                e.preventDefault();
                target.scrollIntoView({
                    behavior: prefersReducedMotion ? 'auto' : 'smooth',
                    block: 'start'
                });
            });
        });
    };

    /* ============================================
       3. BARRA DE PROGRESSO
       ============================================ */

    /**
     * Inicializa barra de progresso de leitura do conteudo PAINT.
     * Atualiza a largura do fill conforme scroll position relativa ao conteudo.
     * Usa passive scroll listener para performance.
     *
     * @param {HTMLElement|Document} [container=document] - Escopo de busca
     */
    AUDIN.initPaintProgress = function (container) {
        var scope = container || document;
        var fill = scope.querySelector('.audin-paint__progress-fill');
        var content = scope.querySelector('.audin-paint__content');

        if (!fill || !content) {
            return;
        }

        function updateProgress() {
            var contentTop = content.offsetTop;
            var contentHeight = content.scrollHeight;
            var scrollPos = window.scrollY - contentTop;
            var viewportHeight = window.innerHeight;
            var totalScrollable = contentHeight - viewportHeight;

            if (totalScrollable <= 0) {
                fill.style.width = '100%';
                return;
            }

            var percent = Math.max(0, Math.min(100, (scrollPos / totalScrollable) * 100));
            fill.style.width = percent + '%';
        }

        window.addEventListener('scroll', updateProgress, { passive: true });
        updateProgress();
    };

    /* ============================================
       4. BOTAO VOLTAR AO TOPO
       ============================================ */

    /**
     * Inicializa botao flutuante de voltar ao topo.
     * Aparece apos rolar 400px, scroll suave ao clicar.
     * Respeita prefers-reduced-motion para acessibilidade.
     * Usa passive scroll listener para performance.
     *
     * @param {HTMLElement|Document} [container=document] - Escopo de busca
     */
    AUDIN.initPaintBackToTop = function (container) {
        var scope = container || document;
        var btn = scope.querySelector('.audin-paint__back-to-top');

        if (!btn) {
            return;
        }

        var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        function toggleVisibility() {
            if (window.scrollY > 400) {
                btn.classList.add('audin-paint__back-to-top--visible');
            } else {
                btn.classList.remove('audin-paint__back-to-top--visible');
            }
        }

        btn.addEventListener('click', function () {
            window.scrollTo({
                top: 0,
                behavior: prefersReducedMotion ? 'auto' : 'smooth'
            });
        });

        window.addEventListener('scroll', toggleVisibility, { passive: true });
        toggleVisibility();
    };

    /* ============================================
       5. PAINT_DATA: populacao de campos numericos
       ============================================ */

    /**
     * Resolve um path pontilhado (ex: 'kpis.capacidadeTotal') em um objeto.
     * Retorna undefined se qualquer nivel intermediario nao existir.
     *
     * @param {Object} obj - Objeto raiz
     * @param {string} path - Caminho pontilhado (ex: 'kpis.capacidadeTotal')
     * @returns {*} Valor encontrado ou undefined
     */
    function resolvePath(obj, path) {
        return path.split('.').reduce(function (acc, part) {
            return acc && acc[part];
        }, obj);
    }

    /**
     * Popula elementos com atributo data-paint-field a partir de PAINT_DATA.
     * Numeros sao formatados com separador de milhar pt-BR.
     * Atualiza tambem o titulo da pagina com o ano do exercicio.
     *
     * NAO gera HTML (tabelas, cards, etc) -- apenas popula valores numericos
     * em elementos ja existentes no DOM.
     *
     * @param {Object} [data=window.PAINT_DATA] - Dados do PAINT
     */
    AUDIN.initPaintData = function (data) {
        data = data || window.PAINT_DATA;
        if (!data) return;

        /* Popular campos marcados com data-paint-field */
        document.querySelectorAll('[data-paint-field]').forEach(function (el) {
            var field = el.getAttribute('data-paint-field');
            var value = resolvePath(data, field);
            if (value !== undefined) {
                el.textContent = typeof value === 'number'
                    ? value.toLocaleString('pt-BR')
                    : value;
            }
        });

        /* Atualizar titulo da pagina com o ano */
        if (data.ano) {
            document.title = 'PAINT ' + data.ano + ' - Plano Anual de Auditoria Interna - AUDIN/UFAM';
        }
    };

    /* ============================================
       6. GRAFICOS CHART.JS (doughnut + barras horizontais)
       ============================================ */

    /**
     * Plugin inline para texto central no doughnut.
     * Exibe valor total e subtexto no centro do grafico.
     * Registrado por instancia (nao global) via array plugins.
     */
    var centerTextPlugin = {
        id: 'centerText',
        afterDraw: function (chart) {
            if (!chart.config.options.plugins.centerText) return;
            var ctx = chart.ctx;
            var text = chart.config.options.plugins.centerText.text || '';
            var subtext = chart.config.options.plugins.centerText.subtext || '';

            /* Centro real do donut (exclui legenda) */
            var area = chart.chartArea;
            var cx = (area.left + area.right) / 2;
            var cy = (area.top + area.bottom) / 2;
            var donutHeight = area.bottom - area.top;

            ctx.save();
            var fontSize = (donutHeight / 10).toFixed(2);
            ctx.font = 'bold ' + fontSize + 'px Inter, sans-serif';
            ctx.textBaseline = 'middle';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#1a202c';
            ctx.fillText(text, cx, cy - fontSize * 0.4);
            ctx.font = (fontSize * 0.5).toFixed(2) + 'px Inter, sans-serif';
            ctx.fillStyle = '#4a5568';
            ctx.fillText(subtext, cx, cy + fontSize * 0.5);
            ctx.restore();
        }
    };

    /**
     * Constroi configuracao do grafico de capacidade (doughnut).
     * Le dados de PAINT_DATA se disponivel; caso contrario, usa fallback hardcoded.
     * Cores permanecem hardcoded (sao configuracao visual, nao dados).
     */
    function buildCapacidadeConfig(fontFamily) {
        /* Dados fallback (hardcoded -- compatibilidade se PAINT_DATA nao existir) */
        var labels = [
            'Servicos de Auditoria', 'Capacitacao', 'Monitoramento',
            'Gestao Qualidade', 'Orgaos de Controle', 'Gestao Interna', 'Extraordinarias'
        ];
        var values = [7976, 720, 3220, 840, 804, 2216, 496];
        var totalText = '16.272';

        /* Ler de PAINT_DATA se disponivel */
        var pd = window.PAINT_DATA;
        if (pd && pd.capacidade && pd.capacidade.categorias) {
            labels = pd.capacidade.categorias.map(function (c) { return c.label; });
            values = pd.capacidade.categorias.map(function (c) { return c.hh; });
            var total = values.reduce(function (a, b) { return a + b; }, 0);
            totalText = total.toLocaleString('pt-BR');
        }

        return {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: [
                        '#2e7d32', '#6a1b9a', '#e65100',
                        '#00838f', '#546e7a', '#1565c0', '#8d6e63'
                    ]
                }]
            },
            options: {
                cutout: '68%',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { font: { family: fontFamily, size: 11 } }
                    },
                    centerText: {
                        text: totalText,
                        subtext: 'H/H Total'
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                var label = context.label || '';
                                var value = context.parsed;
                                var sum = context.dataset.data.reduce(function (a, b) { return a + b; }, 0);
                                var pct = ((value / sum) * 100).toFixed(1).replace('.', ',');
                                return label + ': ' + value.toLocaleString('pt-BR') + ' H/H (' + pct + '%)';
                            }
                        }
                    }
                }
            },
            plugins: [centerTextPlugin]
        };
    }

    /**
     * Constroi configuracao do grafico de servicos H/H (barras horizontais).
     * Le dados de PAINT_DATA se disponivel; caso contrario, usa fallback hardcoded.
     */
    function buildServicosHHConfig(fontFamily) {
        var labels = [
            'Prestacao Contas', 'Obras', 'Orcamento campi', 'Diarias',
            'Riscos (consultoria)', 'LGPD', 'Manutencao', 'Laboratorios'
        ];
        var values = [320, 1090, 1116, 1090, 1090, 1090, 1090, 1090];
        var colors = ['#2e7d32', '#2e7d32', '#2e7d32', '#2e7d32', '#1565c0', '#2e7d32', '#2e7d32', '#2e7d32'];

        var pd = window.PAINT_DATA;
        if (pd && pd.servicos && pd.servicos.length > 0) {
            labels = pd.servicos.map(function (s) { return s.titulo; });
            values = pd.servicos.map(function (s) { return s.hh; });
            colors = pd.servicos.map(function (s) {
                return s.tipo === 'Consultoria' ? '#1565c0' : '#2e7d32';
            });
        }

        return {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: colors,
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return context.parsed.x.toLocaleString('pt-BR') + ' H/H';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: { font: { family: fontFamily } }
                    },
                    y: {
                        ticks: { font: { family: fontFamily, size: 11 } }
                    }
                }
            }
        };
    }

    /**
     * Constroi configuracao do grafico de cronograma (Gantt).
     * Le dados de PAINT_DATA se disponivel; caso contrario, usa fallback hardcoded.
     * Semestre 1 -> meses [1,6], Semestre 2 -> meses [7,12].
     */
    function buildCronogramaConfig(fontFamily) {
        var labels = [
            'Prestacao Contas', 'Obras', 'Orcamento campi', 'Diarias',
            'Riscos (consultoria)', 'LGPD', 'Manutencao', 'Laboratorios'
        ];
        var ranges = [[1,6],[1,6],[1,6],[1,6],[1,6],[7,12],[7,12],[7,12]];
        var colors = ['#2e7d32','#2e7d32','#2e7d32','#2e7d32','#1565c0','#2e7d32','#2e7d32','#2e7d32'];

        var pd = window.PAINT_DATA;
        if (pd && pd.servicos && pd.servicos.length > 0) {
            labels = pd.servicos.map(function (s) { return s.titulo; });
            ranges = pd.servicos.map(function (s) {
                return s.semestre === 1 ? [1, 6] : [7, 12];
            });
            colors = pd.servicos.map(function (s) {
                return s.tipo === 'Consultoria' ? '#1565c0' : '#2e7d32';
            });
        }

        return {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    data: ranges,
                    backgroundColor: colors,
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                var raw = context.raw;
                                var start = Array.isArray(raw) ? raw[0] : raw;
                                var semestre = start <= 6 ? '1o semestre' : '2o semestre';
                                return 'Servico ' + (context.dataIndex + 1) + ' - ' + semestre;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        min: 0,
                        max: 13,
                        ticks: {
                            callback: function (value) {
                                var meses = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez', ''];
                                return meses[value] || '';
                            },
                            font: { family: fontFamily }
                        },
                        grid: { display: true }
                    },
                    y: {
                        ticks: { font: { family: fontFamily, size: 11 } }
                    }
                }
            }
        };
    }

    /**
     * Constroi configuracao do grafico de recomendacoes (doughnut).
     * Le dados de PAINT_DATA se disponivel; caso contrario, usa fallback hardcoded.
     */
    function buildRecomendacoesConfig(fontFamily) {
        var emImpl = 158;
        var pendentes = 234;
        var totalText = '392';

        var pd = window.PAINT_DATA;
        if (pd && pd.monitoramento) {
            emImpl = pd.monitoramento.emImplementacao;
            pendentes = pd.monitoramento.pendentes;
            var total = pd.monitoramento.total || (emImpl + pendentes);
            totalText = total.toLocaleString('pt-BR');
        }

        return {
            type: 'doughnut',
            data: {
                labels: ['Em implementacao', 'Pendentes de resposta'],
                datasets: [{
                    data: [emImpl, pendentes],
                    backgroundColor: ['#ff9800', '#f44336']
                }]
            },
            options: {
                cutout: '60%',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { font: { family: fontFamily, size: 12 } }
                    },
                    centerText: {
                        text: totalText,
                        subtext: 'Recomendacoes'
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                var label = context.label || '';
                                var value = context.parsed;
                                var sum = context.dataset.data.reduce(function (a, b) { return a + b; }, 0);
                                var pct = ((value / sum) * 100).toFixed(1).replace('.', ',');
                                return label + ': ' + value.toLocaleString('pt-BR') + ' recomendacoes (' + pct + '%)';
                            }
                        }
                    }
                }
            },
            plugins: [centerTextPlugin]
        };
    }

    /**
     * Cria grafico Chart.js com base no data-chart-id do canvas.
     * Delega para builders especificos que leem de PAINT_DATA com fallback.
     *
     * @param {HTMLCanvasElement} canvas - Elemento canvas com data-chart-id
     */
    function initChartById(canvas) {
        var chartId = canvas.getAttribute('data-chart-id');
        if (!chartId || typeof Chart === 'undefined') return;

        var fontFamily = "'Inter', sans-serif";

        var builders = {
            'capacidade':    buildCapacidadeConfig,
            'servicos-hh':   buildServicosHHConfig,
            'cronograma':    buildCronogramaConfig,
            'recomendacoes': buildRecomendacoesConfig
        };

        var builder = builders[chartId];
        if (!builder) return;

        var config = builder(fontFamily);
        new Chart(canvas.getContext('2d'), config);
    }

    /**
     * Inicializa graficos Chart.js via IntersectionObserver.
     * Graficos sao criados apenas quando o container entra na viewport,
     * gerando a animacao de preenchimento natural do Chart.js.
     *
     * @param {HTMLElement|Document} [container=document] - Escopo de busca
     */
    AUDIN.initPaintCharts = function (container) {
        var scope = container || document;
        var chartContainers = scope.querySelectorAll('.audin-paint__chart-container');
        if (chartContainers.length === 0 || typeof Chart === 'undefined') return;

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    var canvas = entry.target.querySelector('canvas');
                    if (canvas && !canvas.dataset.chartInit) {
                        canvas.dataset.chartInit = 'true';
                        initChartById(canvas);
                    }
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.3 });

        chartContainers.forEach(function (el) { observer.observe(el); });
    };

    /* ============================================
       7. CARDS EXPANDIVEIS (.audin-paint__servico-toggle)
       ============================================ */

    /**
     * Inicializa toggle expand/collapse nos cards de servico.
     * Cada card expande/colapsa independentemente (nao accordion).
     * Suporte a teclado: Enter e Space.
     *
     * @param {HTMLElement|Document} [container=document] - Escopo de busca
     */
    AUDIN.initExpandableCards = function (container) {
        var scope = container || document;
        var triggers = scope.querySelectorAll('.audin-paint__servico-toggle');

        triggers.forEach(function (trigger) {
            trigger.addEventListener('click', function () {
                var panelId = trigger.getAttribute('aria-controls');
                var panel = document.getElementById(panelId);
                if (!panel) return;
                var isExpanded = trigger.getAttribute('aria-expanded') === 'true';
                trigger.setAttribute('aria-expanded', String(!isExpanded));
                if (isExpanded) {
                    panel.setAttribute('hidden', '');
                } else {
                    panel.removeAttribute('hidden');
                }
            });

            trigger.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    trigger.click();
                }
            });
        });
    };

    /* ============================================
       8. HAMBURGER MENU (.audin-paint__nav-toggle)
       ============================================ */

    /**
     * Inicializa menu hamburger para sidebar em viewports mobile.
     * Botao toggle abre sidebar como overlay deslizante, com backdrop,
     * botao fechar e Escape. Foco move para dentro do menu ao abrir
     * e retorna ao botao ao fechar. Links da nav fecham o menu.
     *
     * @param {HTMLElement|Document} [container=document] - Escopo de busca
     */
    AUDIN.initPaintHamburger = function (container) {
        var scope = container || document;
        var toggle = scope.querySelector('.audin-paint__nav-toggle');
        var nav = document.getElementById('paint-nav');
        var backdrop = scope.querySelector('.audin-paint__nav-backdrop');
        var closeBtn = nav ? nav.querySelector('.audin-paint__nav-close') : null;

        if (!toggle || !nav) {
            return;
        }

        var paintContainer = scope.querySelector('.audin-paint');

        function open() {
            nav.classList.add('audin-paint__nav--open');
            toggle.setAttribute('aria-expanded', 'true');
            if (backdrop) {
                backdrop.removeAttribute('hidden');
            }
            if (paintContainer) {
                paintContainer.style.overflow = 'hidden';
            }
            if (closeBtn) {
                closeBtn.focus();
            } else {
                var firstLink = nav.querySelector('.audin-paint__nav-link');
                if (firstLink) {
                    firstLink.focus();
                }
            }
        }

        function close() {
            nav.classList.remove('audin-paint__nav--open');
            toggle.setAttribute('aria-expanded', 'false');
            if (backdrop) {
                backdrop.setAttribute('hidden', '');
            }
            if (paintContainer) {
                paintContainer.style.overflow = '';
            }
            toggle.focus();
        }

        toggle.addEventListener('click', open);

        if (closeBtn) {
            closeBtn.addEventListener('click', close);
        }

        if (backdrop) {
            backdrop.addEventListener('click', close);
        }

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && nav.classList.contains('audin-paint__nav--open')) {
                close();
            }
        });

        var navLinks = nav.querySelectorAll('.audin-paint__nav-link');
        navLinks.forEach(function (link) {
            link.addEventListener('click', function () {
                if (nav.classList.contains('audin-paint__nav--open')) {
                    close();
                }
            });
        });
    };

    /* ============================================
       9. SCROLL SHADOWS (IntersectionObserver)
       ============================================ */

    /**
     * Inicializa sombras indicativas de scroll horizontal em tabelas.
     * Detecta tabelas que excedem a largura do wrapper e adiciona
     * sentinelas + sombras dinamicas via IntersectionObserver.
     * Sombras aparecem/desaparecem conforme posicao do scroll.
     *
     * @param {HTMLElement|Document} [container=document] - Escopo de busca
     */
    AUDIN.initScrollShadows = function (container) {
        var scope = container || document;
        var wrappers = scope.querySelectorAll('.audin-table-wrapper');

        wrappers.forEach(function (wrapper) {
            var table = wrapper.querySelector('.audin-table');
            if (!table) {
                return;
            }

            /* Verificar se tabela excede largura do wrapper */
            if (wrapper.scrollWidth <= wrapper.clientWidth + 2) {
                return;
            }

            wrapper.classList.add('audin-table-wrapper--scrollable');

            /* Criar sombras */
            var shadowLeft = document.createElement('div');
            shadowLeft.className = 'audin-table-wrapper__shadow audin-table-wrapper__shadow--left';
            shadowLeft.setAttribute('aria-hidden', 'true');

            var shadowRight = document.createElement('div');
            shadowRight.className = 'audin-table-wrapper__shadow audin-table-wrapper__shadow--right';
            shadowRight.setAttribute('aria-hidden', 'true');

            wrapper.insertBefore(shadowLeft, table);
            wrapper.insertBefore(shadowRight, table);

            /* Atualizar sombras com base na posicao do scroll */
            function updateShadows() {
                var scrollLeft = wrapper.scrollLeft;
                var maxScroll = wrapper.scrollWidth - wrapper.clientWidth;

                if (scrollLeft > 2) {
                    shadowLeft.classList.add('audin-table-wrapper__shadow--visible');
                } else {
                    shadowLeft.classList.remove('audin-table-wrapper__shadow--visible');
                }

                if (scrollLeft < maxScroll - 2) {
                    shadowRight.classList.add('audin-table-wrapper__shadow--visible');
                } else {
                    shadowRight.classList.remove('audin-table-wrapper__shadow--visible');
                }
            }

            wrapper.addEventListener('scroll', updateShadows, { passive: true });
            updateShadows();
        });
    };

    /* ============================================
       10. INIT PAINT (funcao agregadora)
       ============================================ */

    /**
     * Inicializa todos os componentes PAINT.
     * Chamado automaticamente no DOMContentLoaded.
     * Pode ser chamado manualmente para conteudo dinamico.
     *
     * @param {HTMLElement|Document} [container=document] - Escopo de busca
     */
    AUDIN.initPaint = function (container) {
        var scope = container || document;
        AUDIN.initPaintData(window.PAINT_DATA);
        AUDIN.initPaintScrollSpy(scope);
        AUDIN.initPaintSmoothScroll(scope);
        AUDIN.initPaintProgress(scope);
        AUDIN.initPaintBackToTop(scope);
        AUDIN.initPaintCharts(scope);
        AUDIN.initExpandableCards(scope);
        AUDIN.initPaintHamburger(scope);
        AUDIN.initScrollShadows(scope);
    };

    /* ============================================
       11. AUTO-INIT
       ============================================ */

    document.addEventListener('DOMContentLoaded', function () {
        AUDIN.initPaint(document);
    });
})();
