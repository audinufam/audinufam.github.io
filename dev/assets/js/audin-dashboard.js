/**
 * AUDIN Design System - Dashboard JavaScript
 *
 * Comportamentos interativos para dashboard, estatisticas e consulta.
 * Estende o namespace window.AUDIN (definido em audin-core.js).
 * Carregado APOS audin-core.js.
 *
 * Componentes:
 *   - Contadores animados: IntersectionObserver + requestAnimationFrame
 *   - Graficos Chart.js: inicializacao generica via data-chart-type
 *   - Graficos Plotly.js: sunburst/treemap via data-plotly-type
 *   - Tabs: WAI-ARIA tabs com navegacao por teclado
 *   - Validacao de formulario: Constraint Validation API + feedback visual
 *
 * Uso:
 *   Auto-init no DOMContentLoaded.
 *   Re-init manual: AUDIN.initDashboard(container) para conteudo dinamico.
 */
(function () {
    'use strict';

    window.AUDIN = window.AUDIN || {};

    /* ============================================
       1. CONTADORES ANIMADOS
       ============================================ */

    /**
     * Inicializa contadores animados com IntersectionObserver.
     * Elementos com data-count-to animam de 0 ate o valor alvo
     * quando entram na viewport (threshold 0.5).
     *
     * Suporte a data-count-suffix para adicionar sufixo (ex: "%").
     * Animacao: requestAnimationFrame com ease-out cubic, 1500ms.
     *
     * @param {HTMLElement|Document} [container=document] - Escopo de busca
     */
    AUDIN.initCounters = function (container) {
        var scope = container || document;
        var counters = scope.querySelectorAll('[data-count-to]');

        if (counters.length === 0) {
            return;
        }

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    animateCounter(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        counters.forEach(function (counter) {
            observer.observe(counter);
        });

        function animateCounter(el) {
            var target = parseInt(el.dataset.countTo, 10);
            var suffix = el.dataset.countSuffix || '';
            var duration = 1500;
            var startTime = null;

            function step(timestamp) {
                if (!startTime) {
                    startTime = timestamp;
                }
                var progress = Math.min((timestamp - startTime) / duration, 1);
                // ease-out cubic: 1 - (1 - t)^3
                var eased = 1 - Math.pow(1 - progress, 3);
                var current = Math.floor(eased * target);

                el.textContent = current + suffix;

                if (progress < 1) {
                    requestAnimationFrame(step);
                } else {
                    el.textContent = target + suffix;
                }
            }

            requestAnimationFrame(step);
        }
    };

    /* ============================================
       2. GRAFICOS CHART.JS (DASHBOARD)
       ============================================ */

    /**
     * Inicializa graficos Chart.js genericos via data-attributes.
     * Busca todos os canvas com data-chart-type no escopo.
     * Dados: data-labels (JSON), data-values (JSON), data-colors (JSON).
     * Guard: retorna silenciosamente se Chart.js nao estiver carregado.
     *
     * Configuracao: responsive:true, maintainAspectRatio:false.
     * Tooltip com percentual. Fonte Inter nos labels.
     *
     * @param {HTMLElement|Document} [container=document] - Escopo de busca
     */
    AUDIN.initDashboardCharts = function (container) {
        if (typeof Chart === 'undefined') {
            return;
        }

        var scope = container || document;
        var canvases = scope.querySelectorAll('[data-chart-type]');

        canvases.forEach(function (canvas) {
            var chartType = canvas.dataset.chartType;
            var labels, values, colors;

            try {
                labels = JSON.parse(canvas.dataset.labels || '[]');
                values = JSON.parse(canvas.dataset.values || '[]');
                colors = JSON.parse(canvas.dataset.colors || '[]');
            } catch (e) {
                return;
            }

            if (labels.length === 0 || values.length === 0) {
                return;
            }

            var defaultColors = ['#2e7d32', '#c05621', '#2b6cb0', '#c53030', '#4a5568', '#1b5e20'];

            new Chart(canvas, {
                type: chartType,
                data: {
                    labels: labels,
                    datasets: [{
                        data: values,
                        backgroundColor: colors.length > 0 ? colors : defaultColors,
                        borderWidth: 0,
                        borderRadius: chartType === 'bar' ? 4 : 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: chartType !== 'bar',
                            position: 'bottom',
                            labels: {
                                font: { family: "'Inter', sans-serif", size: 12 },
                                padding: 12
                            }
                        },
                        tooltip: {
                            backgroundColor: '#2d3748',
                            titleFont: { family: "'Inter', sans-serif" },
                            bodyFont: { family: "'Inter', sans-serif" },
                            callbacks: {
                                label: function (context) {
                                    var label = context.label || '';
                                    var value = context.parsed.y !== undefined ? context.parsed.y : context.parsed;
                                    var total = context.dataset.data.reduce(function (a, b) { return a + b; }, 0);
                                    var percent = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                                    return label + ': ' + value + ' (' + percent + '%)';
                                }
                            }
                        }
                    },
                    scales: chartType === 'bar' ? {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1,
                                font: { family: "'Inter', sans-serif" }
                            }
                        },
                        x: {
                            ticks: {
                                font: { family: "'Inter', sans-serif" }
                            }
                        }
                    } : undefined
                }
            });
        });
    };

    /* ============================================
       3. GRAFICOS PLOTLY.JS
       ============================================ */

    /**
     * Inicializa graficos Plotly.js via data-attributes.
     * Busca divs com data-plotly-type no escopo.
     * Dados: data-plotly-labels, data-plotly-parents, data-plotly-values (JSON).
     * Guard: retorna silenciosamente se Plotly.js nao estiver carregado.
     *
     * Layout: margin compacta, fonte Inter, sunburstcolorway AUDIN,
     * paper/plot bgcolor transparent.
     * Config: responsive:true, displaylogo:false, export PNG no modeBar.
     *
     * @param {HTMLElement|Document} [container=document] - Escopo de busca
     */
    AUDIN.initPlotlyCharts = function (container) {
        if (typeof Plotly === 'undefined') {
            return;
        }

        var scope = container || document;
        var elements = scope.querySelectorAll('[data-plotly-type]');

        elements.forEach(function (el) {
            var plotType = el.dataset.plotlyType;
            var labels, parents, values;

            try {
                labels = JSON.parse(el.dataset.plotlyLabels || '[]');
                parents = JSON.parse(el.dataset.plotlyParents || '[]');
                values = JSON.parse(el.dataset.plotlyValues || '[]');
            } catch (e) {
                return;
            }

            if (labels.length === 0) {
                return;
            }

            var data = [{
                type: plotType,
                labels: labels,
                parents: parents,
                values: values,
                branchvalues: 'total',
                insidetextorientation: 'radial',
                leaf: { opacity: 0.7 },
                marker: { line: { width: 1.5, color: '#ffffff' } }
            }];

            var layout = {
                margin: { l: 10, r: 10, b: 10, t: 10 },
                font: { family: "'Inter', sans-serif", size: 12, color: '#2d3748' },
                sunburstcolorway: ['#2e7d32', '#1b5e20', '#2b6cb0', '#c05621', '#4a5568', '#c53030'],
                treemapcolorway: ['#2e7d32', '#1b5e20', '#2b6cb0', '#c05621', '#4a5568', '#c53030'],
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent'
            };

            var config = {
                responsive: true,
                displaylogo: false,
                displayModeBar: true,
                modeBarButtonsToRemove: ['lasso2d', 'select2d'],
                toImageButtonOptions: {
                    format: 'png',
                    filename: 'audin-' + plotType,
                    height: 600,
                    width: 800
                }
            };

            Plotly.newPlot(el.id, data, layout, config);
        });
    };

    /* ============================================
       4. TABS ACESSIVEIS
       ============================================ */

    /**
     * Inicializa tabs acessiveis WAI-ARIA.
     * Click ativa tab. Arrow Left/Right navega. Home/End para extremos.
     * Gerencia aria-selected, tabindex e hidden nos panels.
     *
     * @param {HTMLElement|Document} [container=document] - Escopo de busca
     */
    AUDIN.initTabs = function (container) {
        var scope = container || document;
        var tablist = scope.querySelector('[role="tablist"]');

        if (!tablist) {
            return;
        }

        var tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
        var panels = tabs.map(function (tab) {
            return document.getElementById(tab.getAttribute('aria-controls'));
        });

        tabs.forEach(function (tab, index) {
            tab.addEventListener('click', function () {
                activateTab(index);
            });

            tab.addEventListener('keydown', function (e) {
                var key = e.key;
                var targetIndex;

                if (key === 'ArrowRight') {
                    e.preventDefault();
                    targetIndex = (index + 1) % tabs.length;
                } else if (key === 'ArrowLeft') {
                    e.preventDefault();
                    targetIndex = (index - 1 + tabs.length) % tabs.length;
                } else if (key === 'Home') {
                    e.preventDefault();
                    targetIndex = 0;
                } else if (key === 'End') {
                    e.preventDefault();
                    targetIndex = tabs.length - 1;
                } else {
                    return;
                }

                activateTab(targetIndex);
                tabs[targetIndex].focus();
            });
        });

        function activateTab(index) {
            tabs.forEach(function (t, i) {
                t.setAttribute('aria-selected', String(i === index));
                t.classList.toggle('audin-dash__tab--active', i === index);
                t.setAttribute('tabindex', i === index ? '0' : '-1');
            });
            panels.forEach(function (p, i) {
                if (p) {
                    p.hidden = (i !== index);
                }
            });

            // Disparar resize para Chart.js recalcular graficos em tabs que estavam hidden
            setTimeout(function () {
                window.dispatchEvent(new Event('resize'));
            }, 50);
        }
    };

    /* ============================================
       5. VALIDACAO DE FORMULARIO
       ============================================ */

    /**
     * Inicializa validacao de formulario com novalidate + Constraint Validation API.
     * Blur valida campo individual. Input limpa erro.
     * Submit valida todos, foca primeiro invalido se houver.
     * Sucesso: mostra alert e esconde form (site estatico, sem backend).
     *
     * @param {HTMLElement|Document} [container=document] - Escopo de busca
     */
    AUDIN.initFormValidation = function (container) {
        var scope = container || document;
        var form = scope.querySelector('.audin-dash__form');

        if (!form) {
            return;
        }

        // Validacao no submit
        form.addEventListener('submit', function (e) {
            e.preventDefault();

            var isValid = true;
            var fields = form.querySelectorAll('[required]');

            fields.forEach(function (field) {
                if (!validateField(field)) {
                    isValid = false;
                }
            });

            if (isValid) {
                showSubmitConfirmation(form);
            } else {
                var firstInvalid = form.querySelector('.audin-dash__form-group--error [required]');
                if (firstInvalid) {
                    firstInvalid.focus();
                }
            }
        });

        // Validacao em tempo real no blur + limpar no input
        var requiredFields = form.querySelectorAll('[required]');
        requiredFields.forEach(function (field) {
            field.addEventListener('blur', function () {
                validateField(field);
            });
            field.addEventListener('input', function () {
                var group = field.closest('.audin-dash__form-group');
                if (group) {
                    group.classList.remove('audin-dash__form-group--error');
                }
                var errorEl = group ? group.querySelector('.audin-dash__form-error') : null;
                if (errorEl) {
                    errorEl.textContent = '';
                }
            });
        });

        function validateField(field) {
            var group = field.closest('.audin-dash__form-group');
            var errorEl = group ? group.querySelector('.audin-dash__form-error') : null;

            if (!field.checkValidity()) {
                if (group) {
                    group.classList.add('audin-dash__form-group--error');
                }
                if (errorEl) {
                    errorEl.textContent = field.validationMessage;
                }
                return false;
            } else {
                if (group) {
                    group.classList.remove('audin-dash__form-group--error');
                }
                if (errorEl) {
                    errorEl.textContent = '';
                }
                return true;
            }
        }

        function showSubmitConfirmation(formEl) {
            var confirmDiv = document.createElement('div');
            confirmDiv.className = 'audin-alert audin-alert--success';
            confirmDiv.setAttribute('role', 'alert');
            confirmDiv.innerHTML = '<strong>Sugestao registrada com sucesso!</strong> ' +
                'Esta e uma versao demonstrativa. Para participar oficialmente, use o formulario do Google Forms acima.';
            formEl.parentNode.insertBefore(confirmDiv, formEl.nextSibling);
            formEl.reset();
            formEl.style.display = 'none';
        }
    };

    /* ============================================
       6. DASHBOARD INIT ALL
       ============================================ */

    /**
     * Inicializa todos os componentes de dashboard.
     * Chamado automaticamente no DOMContentLoaded.
     * Pode ser chamado manualmente para conteudo dinamico.
     *
     * @param {HTMLElement|Document} [container=document] - Escopo de busca
     */
    AUDIN.initDashboard = function (container) {
        var scope = container || document;
        AUDIN.initCounters(scope);
        AUDIN.initDashboardCharts(scope);
        AUDIN.initPlotlyCharts(scope);
        AUDIN.initTabs(scope);
        AUDIN.initFormValidation(scope);
    };

    // Auto-init ao carregar o DOM
    document.addEventListener('DOMContentLoaded', function () {
        AUDIN.initDashboard(document);
    });
})();
