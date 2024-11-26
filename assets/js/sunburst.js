document.addEventListener("DOMContentLoaded", function () {
    const chart = echarts.init(document.getElementById("sunburst-chart"));
    const filterSelect = document.getElementById("unit-filter");

    const jsonUrl = "./data/status_all.json"; // URL do JSON

    let originalData = []; // Armazenar os dados originais

    // Função para calcular o total dinamicamente
    const calculateTotal = (data) =>
        data.reduce((total, item) => {
            if (item.children) {
                return total + calculateTotal(item.children);
            }
            return total + (item.value || 0);
        }, 0);

    // Função para aplicar o filtro por unidade
    const filterDataByUnit = (unit) => {
        if (unit === "all") {
            return originalData;
        }
        return originalData.map((year) => {
            return {
                ...year,
                children: year.children.filter(
                    (unitNode) => unitNode.name === unit
                ),
            };
        }).filter((year) => year.children.length > 0); // Remove anos sem dados
    };

    // Buscar os dados do JSON no GitHub
    fetch(jsonUrl)
        .then((response) => response.json())
        .then((data) => {
            originalData = data; // Armazena os dados originais

            // Adicionar unidades ao filtro
            const units = new Set();
            data.forEach((year) => {
                year.children.forEach((unit) => units.add(unit.name));
            });

            units.forEach((unit) => {
                const option = document.createElement("option");
                option.value = unit;
                option.textContent = unit;
                filterSelect.appendChild(option);
            });

            // Renderizar o gráfico inicial
            const renderChart = (filteredData) => {
                const totalValue = calculateTotal(filteredData);
                chart.setOption({
                    // title: {
                    //     text: "Recomendações por Unidade",
                    //     left: "center",
                    // },
                    tooltip: {
                        trigger: "item",
                        formatter: "{b}: {c}",
                    },
                    series: [
                        {
                            type: "sunburst",
                            radius: [50, "90%"],
                            data: filteredData,
                            label: {
                                show: true,
                                rotate: "radial",
                                fontSize: 10,
                                hideOverlap: true,
                                minAngle: 10,
                            },
                            itemStyle: {
                                borderRadius: 5,
                                borderWidth: 2,
                                borderColor: "#fff",
                            },
                        },
                    ],
                    graphic: [
                        {
                            type: "text",
                            left: "center",
                            top: "center",
                            style: {
                                text: `Total\n${totalValue}`,
                                textAlign: "center",
                                fill: "#495057",
                                fontSize: 18,
                                fontWeight: "bold",
                            },
                        },
                    ],
                });
            };

            renderChart(originalData); // Renderizar o gráfico inicial

            // Adicionar evento ao filtro
            filterSelect.addEventListener("change", (event) => {
                const filteredData = filterDataByUnit(event.target.value);
                renderChart(filteredData); // Atualizar o gráfico com os dados filtrados
            });
        })
        .catch((error) =>
            console.error("Erro ao carregar os dados:", error)
        );
});
