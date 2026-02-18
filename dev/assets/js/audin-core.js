/**
 * AUDIN Design System - Core JavaScript
 *
 * Comportamentos interativos acessiveis para componentes AUDIN.
 * Namespace: window.AUDIN.* (nenhuma funcao global).
 * ES2020+ sem modules (compatibilidade com Joomla inline).
 *
 * Componentes:
 *   - Acordeao: toggle aria-expanded, navegacao por teclado (Enter, Space, Arrow, Home, End)
 *   - Filtros: filtragem client-side por periodo, tipo e busca textual
 *   - Graficos: Chart.js doughnut e bar com dados via data-attributes
 *   - Scroll Spy: destaque do link ativo no indice lateral ao rolar
 *
 * Utilitarios:
 *   - debounce: limita execucao de funcao por intervalo de tempo
 *
 * Uso:
 *   Auto-init no DOMContentLoaded.
 *   Re-init manual: AUDIN.initAll(container) para conteudo dinamico.
 */
(function () {
    'use strict';

    window.AUDIN = window.AUDIN || {};

    /**
     * Inicializa acordeoes dentro de um container.
     * Cada trigger com classe .audin-accordion__trigger recebe:
     *   - Click: toggle aria-expanded e hidden do panel
     *   - Teclado: Enter/Space aciona click, Arrow/Home/End navega entre triggers
     *
     * @param {HTMLElement|Document} [container=document] - Escopo de busca
     */
    AUDIN.initAccordions = function (container) {
        const scope = container || document;
        const triggers = scope.querySelectorAll('.audin-accordion__trigger');

        if (!triggers || triggers.length === 0) {
            return;
        }

        // Agrupa triggers por accordion pai para navegacao entre irmaos
        const accordionGroups = new Map();

        triggers.forEach(function (trigger) {
            // Handler de click: toggle aria-expanded e panel hidden
            trigger.addEventListener('click', function () {
                toggleAccordionPanel(trigger);
            });

            // Handler de teclado
            trigger.addEventListener('keydown', function (event) {
                handleAccordionKeydown(event, trigger, accordionGroups);
            });

            // Agrupa por container pai mais proximo com role ou por ancestral comum
            const parentAccordion = trigger.closest('[data-audin-accordion-group]');
            const groupKey = parentAccordion || 'default';

            if (!accordionGroups.has(groupKey)) {
                accordionGroups.set(groupKey, []);
            }
            accordionGroups.get(groupKey).push(trigger);
        });
    };

    /**
     * Toggle do painel de um acordeao.
     * Alterna aria-expanded entre "true" e "false".
     * Alterna o atributo hidden no panel referenciado por aria-controls.
     *
     * @param {HTMLElement} trigger - Botao trigger do acordeao
     */
    function toggleAccordionPanel(trigger) {
        const panelId = trigger.getAttribute('aria-controls');
        if (!panelId) {
            return;
        }

        const panel = document.getElementById(panelId);
        if (!panel) {
            return;
        }

        const isExpanded = trigger.getAttribute('aria-expanded') === 'true';
        trigger.setAttribute('aria-expanded', String(!isExpanded));

        if (isExpanded) {
            panel.setAttribute('hidden', '');
        } else {
            panel.removeAttribute('hidden');
        }
    }

    /**
     * Handler de teclado para acordeoes.
     *
     * Teclas suportadas:
     *   Enter / Space: aciona toggle (preventDefault no Space para evitar scroll)
     *   ArrowDown: foca proximo trigger no grupo
     *   ArrowUp: foca trigger anterior no grupo
     *   Home: foca primeiro trigger no grupo
     *   End: foca ultimo trigger no grupo
     *
     * @param {KeyboardEvent} event
     * @param {HTMLElement} trigger - Trigger atual
     * @param {Map} groups - Mapa de grupos de acordeao
     */
    function handleAccordionKeydown(event, trigger, groups) {
        const key = event.key;

        // Enter e Space: acionar toggle
        if (key === 'Enter' || key === ' ') {
            event.preventDefault();
            toggleAccordionPanel(trigger);
            return;
        }

        // Navegacao por setas, Home e End
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].indexOf(key) === -1) {
            return;
        }

        event.preventDefault();

        // Encontra o grupo do trigger atual
        let siblings = null;
        for (const [, group] of groups) {
            if (group.indexOf(trigger) !== -1) {
                siblings = group;
                break;
            }
        }

        if (!siblings || siblings.length <= 1) {
            return;
        }

        const currentIndex = siblings.indexOf(trigger);
        let targetIndex;

        switch (key) {
            case 'ArrowDown':
                targetIndex = (currentIndex + 1) % siblings.length;
                break;
            case 'ArrowUp':
                targetIndex = (currentIndex - 1 + siblings.length) % siblings.length;
                break;
            case 'Home':
                targetIndex = 0;
                break;
            case 'End':
                targetIndex = siblings.length - 1;
                break;
            default:
                return;
        }

        siblings[targetIndex].focus();
    }

    /* ============================================
       UTILITARIOS
       ============================================ */

    /**
     * Retorna funcao com debounce que limita execucao.
     * Util para evitar chamadas excessivas em eventos de input/scroll.
     *
     * @param {Function} fn - Funcao a ser executada com debounce
     * @param {number} [delay=300] - Tempo de espera em milissegundos
     * @returns {Function} Funcao com debounce aplicado
     */
    AUDIN.debounce = function (fn, delay) {
        var timer;
        var wait = delay || 300;
        return function () {
            var context = this;
            var args = arguments;
            clearTimeout(timer);
            timer = setTimeout(function () {
                fn.apply(context, args);
            }, wait);
        };
    };

    /* ============================================
       FILTROS (.audin-filtros)
       ============================================ */

    /**
     * Inicializa filtragem client-side na pagina de listagem de relatorios.
     * Busca selects de periodo/tipo e input de busca, filtra itens
     * .audin-relatorio-item por data-attributes e mostra/oculta mensagem vazia.
     *
     * @param {HTMLElement|Document} [container=document] - Escopo de busca
     */
    AUDIN.initFiltros = function (container) {
        var scope = container || document;
        var periodoSelect = scope.querySelector('#filtro-periodo');
        var tipoSelect = scope.querySelector('#filtro-tipo');
        var buscaInput = scope.querySelector('#busca-relatorio');
        var lista = scope.querySelector('.audin-relatorios-lista');
        var vazioMsg = scope.querySelector('.audin-relatorios-lista__vazio');

        if (!lista) {
            return;
        }

        var items = Array.from(lista.querySelectorAll('.audin-relatorio-item'));

        function filtrar() {
            var periodo = periodoSelect ? periodoSelect.value : '';
            var tipo = tipoSelect ? tipoSelect.value : '';
            var busca = buscaInput ? buscaInput.value.toLowerCase().trim() : '';

            var visiveis = 0;

            items.forEach(function (item) {
                var matchPeriodo = !periodo || item.dataset.periodo === periodo;
                var matchTipo = !tipo || item.dataset.tipo === tipo;
                var matchBusca = !busca || (item.dataset.busca || '').toLowerCase().indexOf(busca) !== -1;

                if (matchPeriodo && matchTipo && matchBusca) {
                    item.classList.remove('audin-hidden');
                    visiveis++;
                } else {
                    item.classList.add('audin-hidden');
                }
            });

            if (vazioMsg) {
                if (visiveis === 0) {
                    vazioMsg.classList.remove('audin-hidden');
                } else {
                    vazioMsg.classList.add('audin-hidden');
                }
            }
        }

        if (periodoSelect) {
            periodoSelect.addEventListener('change', filtrar);
        }
        if (tipoSelect) {
            tipoSelect.addEventListener('change', filtrar);
        }
        if (buscaInput) {
            buscaInput.addEventListener('input', AUDIN.debounce(filtrar, 300));
        }
    };

    /* ============================================
       GRAFICOS CHART.JS (.audin-relatorio__resumo)
       ============================================ */

    /**
     * Inicializa graficos Chart.js nos canvas de resumo de relatorio.
     * Busca #chart-status (doughnut) e #chart-achados (bar) no escopo.
     * Dados sao lidos de data-attributes no canvas (data-labels, data-values).
     * Guard: retorna silenciosamente se Chart.js nao estiver carregado.
     *
     * @param {HTMLElement|Document} [container=document] - Escopo de busca
     */
    AUDIN.initReportCharts = function (container) {
        if (typeof Chart === 'undefined') {
            return;
        }

        var scope = container || document;

        // Doughnut chart para status das recomendacoes
        var statusCanvas = scope.querySelector('#chart-status');
        if (statusCanvas) {
            var statusLabels = ['Implementadas', 'Em andamento', 'Pendentes'];
            var statusValues = [];

            try {
                if (statusCanvas.dataset.labels) {
                    statusLabels = JSON.parse(statusCanvas.dataset.labels);
                }
                if (statusCanvas.dataset.values) {
                    statusValues = JSON.parse(statusCanvas.dataset.values);
                }
            } catch (e) {
                statusLabels = ['Implementadas', 'Em andamento', 'Pendentes'];
                statusValues = [];
            }

            new Chart(statusCanvas, {
                type: 'doughnut',
                data: {
                    labels: statusLabels,
                    datasets: [{
                        data: statusValues,
                        backgroundColor: [
                            '#2e7d32',
                            '#c05621',
                            '#c53030'
                        ],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                font: { family: "'Inter', sans-serif", size: 12 },
                                padding: 12
                            }
                        },
                        title: {
                            display: true,
                            text: 'Status das Recomendacoes',
                            font: { family: "'Inter', sans-serif", size: 14, weight: '600' },
                            color: '#2d3748'
                        }
                    }
                }
            });
        }

        // Bar chart para achados por categoria
        var achadosCanvas = scope.querySelector('#chart-achados');
        if (achadosCanvas) {
            var achadosLabels = [];
            var achadosValues = [];

            try {
                if (achadosCanvas.dataset.labels) {
                    achadosLabels = JSON.parse(achadosCanvas.dataset.labels);
                }
                if (achadosCanvas.dataset.values) {
                    achadosValues = JSON.parse(achadosCanvas.dataset.values);
                }
            } catch (e) {
                achadosLabels = [];
                achadosValues = [];
            }

            new Chart(achadosCanvas, {
                type: 'bar',
                data: {
                    labels: achadosLabels,
                    datasets: [{
                        label: 'Achados',
                        data: achadosValues,
                        backgroundColor: '#2e7d32',
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { stepSize: 1 }
                        }
                    },
                    plugins: {
                        legend: { display: false },
                        title: {
                            display: true,
                            text: 'Achados por Categoria',
                            font: { family: "'Inter', sans-serif", size: 14, weight: '600' },
                            color: '#2d3748'
                        }
                    }
                }
            });
        }
    };

    /* ============================================
       SCROLL SPY (.audin-relatorio__nav)
       ============================================ */

    /**
     * Inicializa scroll spy para o indice lateral de relatorios.
     * Destaca o link correspondente a secao visivel na viewport.
     * Usa passive scroll listener para performance.
     *
     * @param {HTMLElement|Document} [container=document] - Escopo de busca
     */
    AUDIN.initScrollSpy = function (container) {
        var scope = container || document;
        var navLinks = scope.querySelectorAll('.audin-relatorio__nav-list a');
        var sections = [];

        navLinks.forEach(function (link) {
            var href = link.getAttribute('href');
            if (!href || href.indexOf('#') === -1) {
                return;
            }
            var targetId = href.replace('#', '');
            var section = document.getElementById(targetId);
            if (section) {
                sections.push({ el: section, link: link });
            }
        });

        if (sections.length === 0) {
            return;
        }

        var activeClass = 'audin-relatorio__nav-link--active';

        function onScroll() {
            var scrollPos = window.scrollY + 100;

            var current = sections[0];
            for (var i = 0; i < sections.length; i++) {
                if (sections[i].el.offsetTop <= scrollPos) {
                    current = sections[i];
                }
            }

            navLinks.forEach(function (link) {
                link.classList.remove(activeClass);
            });
            current.link.classList.add(activeClass);
        }

        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
    };

    /* ============================================
       INIT ALL
       ============================================ */

    /**
     * Inicializa todos os componentes AUDIN dentro de um container.
     * Convenience function para inicializar tudo de uma vez.
     * Util para re-inicializar conteudo carregado dinamicamente.
     *
     * @param {HTMLElement|Document} [container=document] - Escopo de busca
     */
    AUDIN.initAll = function (container) {
        const scope = container || document;
        AUDIN.initAccordions(scope);
        AUDIN.initFiltros(scope);
        AUDIN.initReportCharts(scope);
        AUDIN.initScrollSpy(scope);
    };

    // Auto-init ao carregar o DOM
    document.addEventListener('DOMContentLoaded', function () {
        AUDIN.initAll(document);
    });
})();
