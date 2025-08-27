class RealtimeDashboard {
    constructor() {
        this.socket = null;
        this.data = [];
        this.colorField = 'red_social';
        this.isConnected = false;
        this.startDate = null;
        this.selectedDay = 'all'; // Mostrar todos los posts por defecto
        this.filteredData = []; // Datos filtrados por día
        this.autoRefreshInterval = null; // Para la actualización automática
        this.tipoCasoFilter = 'todos'; // Nuevo filtro para tipo de caso
        this.startHour = 0; // Nuevo: hora de inicio
        this.endHour = 24; // Nuevo: hora de fin
        this.socialField = 'red_social'; // Campo para primer gráfico
        this.statusField = 'status'; // Campo para segundo gráfico  
        this.formatField = 'formato'; // Campo para tercer gráfico
        this.tooltipPinned = false; // Para manejar tooltip fijo al hacer click

        // Variables para zoom y pan
        this.currentZoom = d3.zoomIdentity;
        this.zoom = null;
        this.isFullscreen = false;

        // Escalas D3
        this.colorScale = d3.scaleOrdinal(d3.schemeCategory10);
        this.xScale = d3.scaleTime();
        this.yScale = d3.scaleLinear();
        this.radiusScale = d3.scaleSqrt().range([6, 24]); // Rango duplicado (era 3-12)

        // SVG elementos - actualizados para nueva estructura
        this.svg = d3.select('#main-viz');
        this.socialSvg = d3.select('#social-viz');
        this.statusSvg = d3.select('#status-viz');
        this.formatSvg = d3.select('#format-viz');

        // Dimensiones
        this.updateDimensions();

        // Inicializar
        this.initializeVisualization();
        this.initializeSocialChart();
        this.initializeStatusChart();
        this.initializeFormatChart();
        this.initializeDateSelector();
        this.initializeConnection();
        this.loadInitialData();
        this.updateSelectorOptions(); // Inicializar opciones de selectores
        this.setupEventListeners();
        this.setupResizeHandler();
        this.setupTooltipClickHandler(); // Nuevo: manejar clicks en tooltip
        this.startAutoRefresh(); // Nueva función para actualización automática

    }

    updateDimensions() {
        const bubbleChartElement = document.querySelector('.bubble-chart-container');
        const chartColumns = document.querySelectorAll('.chart-column');

        if (!bubbleChartElement) return;

        // Obtener dimensiones reales del contenedor
        const bubbleRect = bubbleChartElement.getBoundingClientRect();

        // Ajustar márgenes según el tamaño de pantalla y modo pantalla completa
        const isSmall = window.innerWidth < 768;
        const isMedium = window.innerWidth < 1200;

        if (this.isFullscreen) {
            // Dimensiones especiales para pantalla completa
            this.margin = { top: 80, right: 80, bottom: 100, left: 100 };
            this.chartWidth = Math.max(1200, window.innerWidth - this.margin.left - this.margin.right - 40);
            this.chartHeight = Math.max(600, window.innerHeight - this.margin.top - this.margin.bottom - 200);
        } else {
            // Dimensiones normales
            if (isSmall) {
                this.margin = { top: 30, right: 30, bottom: 50, left: 50 };
                this.chartMargin = { top: 25, right: 25, bottom: 40, left: 60 };
            } else if (isMedium) {
                this.margin = { top: 40, right: 40, bottom: 60, left: 60 };
                this.chartMargin = { top: 30, right: 30, bottom: 45, left: 70 };
            } else {
                this.margin = { top: 50, right: 50, bottom: 70, left: 70 };
                this.chartMargin = { top: 35, right: 35, bottom: 50, left: 80 };
            }

            // Calcular dimensiones del gráfico principal de burbujas
            this.chartWidth = Math.max(800, bubbleRect.width - this.margin.left - this.margin.right - 40);
            this.chartHeight = Math.max(300, 380 - this.margin.top - this.margin.bottom);
        }

        // Calcular dimensiones para gráficos de columnas (más pequeños)
        this.smallChartWidth = Math.max(200, 260 - this.chartMargin.left - this.chartMargin.right);
        this.smallChartHeight = Math.max(200, 300 - this.chartMargin.top - this.chartMargin.bottom);

        // Actualizar escalas
        this.xScale.range([0, this.chartWidth]);
        this.yScale.range([this.chartHeight, 0]);

        // Ajustar escala de radio según el tamaño
        const maxRadius = this.isFullscreen ? 32 : (isSmall ? 16 : isMedium ? 20 : 24);
        this.radiusScale.range([6, maxRadius]);

        // Actualizar viewBox de los SVGs
        this.svg.attr('viewBox', `0 0 ${this.chartWidth + this.margin.left + this.margin.right} ${this.chartHeight + this.margin.top + this.margin.bottom}`);
        
        if (!this.isFullscreen) {
            this.socialSvg.attr('viewBox', `0 0 ${this.smallChartWidth + this.chartMargin.left + this.chartMargin.right} ${this.smallChartHeight + this.chartMargin.top + this.chartMargin.bottom}`);
            this.statusSvg.attr('viewBox', `0 0 ${this.smallChartWidth + this.chartMargin.left + this.chartMargin.right} ${this.smallChartHeight + this.chartMargin.top + this.chartMargin.bottom}`);
            this.formatSvg.attr('viewBox', `0 0 ${this.smallChartWidth + this.chartMargin.left + this.chartMargin.right} ${this.smallChartHeight + this.chartMargin.top + this.chartMargin.bottom}`);
        }

        // Actualizar posición de ejes si ya existen
        if (this.xAxis) {
            this.xAxis.attr('transform', `translate(0,${this.chartHeight})`);
        }

        // Actualizar transformación del grupo principal
        if (this.chartGroup) {
            this.chartGroup.attr('transform', `translate(${this.margin.left},${this.margin.top})`);
        }

        // Reconfigurar zoom con las nuevas dimensiones
        if (this.zoom && this.svg) {
            this.svg.call(this.zoom.transform, d3.zoomIdentity);
        }
    }

    initializeVisualization() {
        this.chartGroup = this.svg.append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

        // Crear grupo para elementos con zoom
        this.zoomGroup = this.chartGroup.append('g')
            .attr('class', 'zoom-group');

        this.xAxis = this.chartGroup.append('g')
            .attr('class', 'axis x-axis')
            .attr('transform', `translate(0,${this.chartHeight})`);

        this.yAxis = this.chartGroup.append('g')
            .attr('class', 'axis y-axis');

        this.bubblesGroup = this.zoomGroup.append('g').attr('class', 'bubbles');

        // Configurar zoom
        this.zoom = d3.zoom()
            .scaleExtent([0.5, 10]) // Permitir zoom desde 50% hasta 1000%
            .on('zoom', (event) => this.handleZoom(event));

        // Aplicar zoom al SVG
        this.svg.call(this.zoom);

        // Labels - solo eje Y para ahorrar espacio
        this.chartGroup.append('text')
            .attr('class', 'axis-label')
            .attr('transform', 'rotate(-90)')
            .attr('y', 0 - this.margin.left)
            .attr('x', 0 - (this.chartHeight / 2))
            .attr('dy', '1em')
            .style('text-anchor', 'middle')
            .style('font-size', '12px')
            .style('fill', '#666')
            .text('Reacciones');

        // Configurar event listeners para botones
        this.setupZoomControls();
    }

    initializeSocialChart() {
        this.socialChartGroup = this.socialSvg.append('g')
            .attr('transform', `translate(${this.chartMargin.left},${this.chartMargin.top})`);

        this.socialXAxis = this.socialChartGroup.append('g')
            .attr('class', 'axis x-axis')
            .attr('transform', `translate(0,${this.smallChartHeight})`);

        this.socialYAxis = this.socialChartGroup.append('g')
            .attr('class', 'axis y-axis');

        this.socialBarsGroup = this.socialChartGroup.append('g').attr('class', 'bars');
    }

    initializeStatusChart() {
        this.statusChartGroup = this.statusSvg.append('g')
            .attr('transform', `translate(${this.chartMargin.left},${this.chartMargin.top})`);

        this.statusXAxis = this.statusChartGroup.append('g')
            .attr('class', 'axis x-axis')
            .attr('transform', `translate(0,${this.smallChartHeight})`);

        this.statusYAxis = this.statusChartGroup.append('g')
            .attr('class', 'axis y-axis');

        this.statusBarsGroup = this.statusChartGroup.append('g').attr('class', 'bars');
    }

    initializeFormatChart() {
        this.formatChartGroup = this.formatSvg.append('g')
            .attr('transform', `translate(${this.chartMargin.left},${this.chartMargin.top})`);

        this.formatXAxis = this.formatChartGroup.append('g')
            .attr('class', 'axis x-axis')
            .attr('transform', `translate(0,${this.smallChartHeight})`);

        this.formatYAxis = this.formatChartGroup.append('g')
            .attr('class', 'axis y-axis');

        this.formatBarsGroup = this.formatChartGroup.append('g').attr('class', 'bars');
    }

    // Método simplificado - ya no necesitamos WebSockets
    initializeConnection() {
        this.isConnected = true; // Siempre conectados via HTTP
        this.updateConnectionStatus();
    }

    async loadInitialData() {
        try {
            // Primero obtener el total de posts para saber si necesitamos cargar más
            const initialResponse = await fetch('/api/posts?limit=1');
            const initialResult = await initialResponse.json();
            const totalPosts = initialResult.total;

            console.log(`📊 Total de posts en la base de datos: ${totalPosts}`);

            // Si hay más de 10000 posts, cargar todos de una vez sin límite
            let finalLimit;
            if (totalPosts > 10000) {
                finalLimit = totalPosts + 100; // Margen de seguridad
                console.log(`📈 Cargando todos los ${totalPosts} posts...`);
            } else {
                finalLimit = 10000; // Límite por defecto
            }

            const response = await fetch(`/api/posts?limit=${finalLimit}`);
            const result = await response.json();

            if (result.posts && result.posts.length > 0) {
                console.log(`📊 Datos iniciales cargados: ${result.posts.length} de ${result.total} posts totales`);
                this.data = result.posts.reverse(); // Orden cronológico

                // Verificar si hay datos del día seleccionado o mostrar todos si selectedDay es 'all'
                if (this.selectedDay === 'all') {
                    console.log(`📅 Mostrando todos los posts (${this.data.length} posts)`);
                } else {
                    const currentDayData = this.data.filter(d => {
                        const postDate = new Date(d.updated_at || d.submitted_at || d.created_at);
                        return postDate.toDateString() === this.selectedDay.toDateString();
                    });

                    if (currentDayData.length === 0) {
                        console.log(`📅 No hay datos para ${this.selectedDay.toDateString()}, mostrando dashboard vacío`);
                        // No cambiar la fecha - mantener el día seleccionado aunque esté vacío
                    } else {
                        console.log(`📅 Encontrados ${currentDayData.length} posts para ${this.selectedDay.toDateString()}`);
                    }
                }

                this.updateVisualization();
                this.updateStats();
                this.populateDateOptions(); // Agregar fechas disponibles al selector

                // Verificar si se cargaron todos los posts
                if (result.posts.length < result.total) {
                    console.warn(`⚠️ Solo se cargaron ${result.posts.length} de ${result.total} posts totales. Considera aumentar el límite.`);
                    this.showLoadWarning(result.posts.length, result.total);
                }
            } else {
                console.log('📅 No hay datos disponibles, mostrando dashboard vacío');
                this.data = [];
                this.updateVisualization();
                this.updateStats();
            }
        } catch (error) {
            console.error('Error cargando datos iniciales:', error);
        }
    }

    async loadDataWithoutUI() {
        // Versión que usa la misma lógica que loadInitialData pero sin actualizar UI
        try {
            // Primero obtener el total de posts
            const initialResponse = await fetch('/api/posts?limit=1');
            const initialResult = await initialResponse.json();
            const totalPosts = initialResult.total;

            // Cargar todos los posts
            let finalLimit = totalPosts > 10000 ? totalPosts + 100 : 10000;
            const response = await fetch(`/api/posts?limit=${finalLimit}`);
            const result = await response.json();

            if (result.posts && result.posts.length > 0) {
                console.log('Datos auto-refresh cargados:', result.posts.length);
                this.data = result.posts.reverse(); // Orden cronológico
            } else {
                console.log('📅 No hay datos disponibles en auto-refresh');
                this.data = [];
            }
        } catch (error) {
            console.error('Error cargando datos en auto-refresh:', error);
        }
    }

    findDateWithMostPosts() {
        if (!this.data || this.data.length === 0) return null;

        // Agrupar posts por día
        const postsByDay = {};
        this.data.forEach(post => {
            const postDate = new Date(post.updated_at || post.submitted_at || post.created_at);
            const dayKey = postDate.toDateString();
            if (!postsByDay[dayKey]) {
                postsByDay[dayKey] = [];
            }
            postsByDay[dayKey].push(post);
        });

        // Encontrar el día con más posts
        let maxCount = 0;
        let bestDay = null;

        Object.keys(postsByDay).forEach(dayKey => {
            if (postsByDay[dayKey].length > maxCount) {
                maxCount = postsByDay[dayKey].length;
                bestDay = new Date(dayKey);
            }
        });

        console.log(`📊 Día con más datos: ${bestDay?.toDateString()} (${maxCount} posts)`);
        return bestDay;
    }

    // Ya no necesitamos estos métodos - la actualización automática usa loadInitialData() directamente

    updateVisualization() {
        if (this.data.length === 0) return;

        // Procesar datos
        const processedData = this.processData();

        // Actualizar escalas
        this.updateScales(processedData);

        // Dibujar elementos
        this.drawBubbles(processedData);
        this.drawAxes();
        this.updateSocialChart(processedData);
        this.updateStatusChart(processedData);
        this.updateFormatChart(processedData);
        this.updateStats();
        this.updateLegend();
    }

    processData() {
        // Usar datos filtrados por día y rango de tiempo
        const dataToProcess = this.filterDataByTimeRange();

        return dataToProcess.map(d => {
            const date = new Date(d.updated_at || d.submitted_at || d.created_at);

            // Eje Y: solo reacciones (como campo 'interacciones')
            const interacciones = d.reacciones || 0;

            // Tamaño de burbuja: comentarios + compartidos
            const bubbleSize = (d.comentarios || 0) + (d.compartidos || 0);

            // Valor para gráfico de barras: fórmula ponderada
            const barValue = 1 * (d.reacciones || 0) +
                2 * (d.comentarios || 0) +
                3 * (d.compartidos || 0);

            return {
                ...d,
                date: date,
                interacciones: interacciones,
                bubbleSize: Math.max(bubbleSize, 5), // Mínimo tamaño 5
                barValue: barValue
            };
        }).filter(d => !isNaN(d.date.getTime()));
    }

    filterDataByTimeRange() {
        // Primero filtrar por día (o todos los posts si selectedDay es 'all')
        const dayFilteredData = this.filterDataByDay();

        // Si selectedDay es 'all', no aplicar filtro de horas ya que no tiene sentido
        if (this.selectedDay === 'all') {
            return dayFilteredData;
        }

        // Filtrar por rango de horas solo si hay un día específico seleccionado
        const dayStart = new Date(this.selectedDay);
        dayStart.setHours(this.startHour, 0, 0, 0);

        const dayEnd = new Date(this.selectedDay);
        if (this.endHour === 24) {
            dayEnd.setHours(23, 59, 59, 999);
        } else {
            dayEnd.setHours(this.endHour, 0, 0, 0);
        }

        return dayFilteredData.filter(d => {
            const postDate = new Date(d.updated_at || d.submitted_at || d.created_at);
            return postDate >= dayStart && postDate <= dayEnd;
        });
    }

    updateScales(data) {
        // Escala temporal: usar diferentes rangos según si es 'all' o día específico
        if (this.selectedDay === 'all') {
            // Para 'todos', usar rango completo de fechas en los datos
            const dateExtent = d3.extent(data, d => d.date);
            if (dateExtent[0] && dateExtent[1]) {
                this.xScale.domain(dateExtent);
            } else {
                // Fallback si no hay datos
                const now = new Date();
                this.xScale.domain([new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), now]);
            }
        } else {
            // Para día específico, usar horas de inicio y fin
            const timeStart = new Date(this.selectedDay);
            timeStart.setHours(this.startHour, 0, 0, 0);

            const timeEnd = new Date(this.selectedDay);
            if (this.endHour === 24) {
                timeEnd.setHours(23, 59, 59, 999);
            } else {
                timeEnd.setHours(this.endHour, 0, 0, 0);
            }

            this.xScale.domain([timeStart, timeEnd]);
        }

        // Escala Y: solo interacciones (reacciones)
        const maxInteractions = d3.max(data, d => d.interacciones) || 100;
        this.yScale.domain([0, maxInteractions]);

        // Escala de tamaño: comentarios + compartidos
        const sizeExtent = d3.extent(data, d => d.bubbleSize);
        this.radiusScale.domain(sizeExtent || [1, 100]);

        // Escala de color
        const categories = [...new Set(data.map(d => d[this.colorField]))].filter(d => d);
        this.colorScale.domain(categories);
    }

    drawBubbles(data) {
        // Crear grupos para cada post usando check_dbid como identificador estable
        const bubbleGroups = this.bubblesGroup.selectAll('.bubble-group')
            .data(data, d => d.check_dbid);

        // Remover grupos que ya no están en los datos
        bubbleGroups.exit().remove();

        // Crear nuevos grupos de burbujas
        const bubbleGroupsEnter = bubbleGroups.enter()
            .append('g')
            .attr('class', 'bubble-group');

        // Merge enter + update selections
        const bubbleGroupsUpdate = bubbleGroupsEnter.merge(bubbleGroups);

        // Posicionar grupos (sin animación para evitar parpadeo)
        bubbleGroupsUpdate
            .attr('transform', d => `translate(${this.xScale(d.date)}, ${this.yScale(d.interacciones)})`);

        // Crear las 3 capas de burbujas para cada grupo
        this.createBubbleLayers(bubbleGroupsUpdate);

        // Los tooltips se configuran solo en la capa base (círculo central)
        // NO en todo el grupo para evitar activación en el círculo de interacciones
    }

    createBubbleLayers(bubbleGroups) {
        const baseRadius = 4; // Radio fijo para burbuja base
        const maxLayerSize = 50; // Tamaño máximo aumentado para mayor contraste

        // Calcular el rango dinámico de interacciones en los datos actuales
        const allData = bubbleGroups.data();
        const interactionValues = allData.map(d => (d.comentarios || 0) + (d.compartidos || 0)).filter(v => v > 0);
        const maxInteraction = Math.max(...interactionValues, 1);

        // Usar escala de potencia más agresiva para amplificar diferencias
        const interactionScale = d3.scalePow()
            .exponent(0.5) // Raíz cuadrada para amplificar diferencias
            .domain([0, maxInteraction])
            .range([0, maxLayerSize - baseRadius])
            .clamp(true);

        // Capa concéntrica - Comentarios + Compartidos
        let interactionLayer = bubbleGroups.selectAll('.interaction-layer')
            .data(d => [d]);

        interactionLayer.enter()
            .append('circle')
            .attr('class', 'interaction-layer')
            .merge(interactionLayer)
            .attr('r', d => {
                const totalInteractions = (d.comentarios || 0) + (d.compartidos || 0);
                if (totalInteractions === 0) return 0; // No mostrar si no hay interacciones

                // Usar escala de potencia para amplificar diferencias
                const additionalRadius = interactionScale(totalInteractions);

                // Asegurar mínimo visible para diferenciación
                const minAdditionalRadius = totalInteractions > 0 ? Math.max(additionalRadius, 3) : 0;

                return baseRadius + minAdditionalRadius;
            })
            .style('fill', d => {
                const color = d3.color(this.colorScale(d[this.colorField]) || '#888');
                return color.brighter(0.3).toString();
            })
            .style('fill-opacity', 0.15)
            .style('stroke', d => {
                const color = d3.color(this.colorScale(d[this.colorField]) || '#888');
                return color.brighter(0.1).toString();
            })
            .style('stroke-width', 1.5)
            .style('stroke-opacity', 0.6);

        // Capa base (centro) - Post principal - TAMAÑO FIJO SIEMPRE
        let baseLayer = bubbleGroups.selectAll('.base-layer')
            .data(d => [d]);

        const baseLayerUpdate = baseLayer.enter()
            .append('circle')
            .attr('class', 'base-layer')
            .merge(baseLayer)
            .attr('r', baseRadius) // TAMAÑO FIJO - no depende de reacciones
            .style('fill', d => this.colorScale(d[this.colorField]) || '#888')
            .style('opacity', d => d.isNew ? 0.9 : d.isUpdated ? 0.8 : 0.75)
            .style('stroke', d => d.isNew ? '#FFD700' : d.isUpdated ? '#FFA500' : 'rgba(255,255,255,0.4)')
            .style('stroke-width', d => d.isNew ? 2 : d.isUpdated ? 1.5 : 0.5);

        // Configurar tooltips SOLO en la capa base (círculo central)
        baseLayerUpdate
            .on('mouseover', (event, d) => this.showTooltip(event, d))
            .on('mousemove', (event, d) => this.moveTooltip(event))
            .on('mouseout', () => this.hideTooltip())
            .on('click', (event, d) => {
                event.stopPropagation(); // Evitar que se propague al body
                this.pinTooltip(event, d);
            });
    }

    drawAxes() {
        if (this.selectedDay === 'all') {
            // Para 'todos', usar formato de fecha completa
            this.xAxis
                .transition()
                .duration(800)
                .call(d3.axisBottom(this.xScale)
                    .ticks(6)
                    .tickFormat(d3.timeFormat('%d/%m')));
        } else {
            // Para día específico, usar formato de hora
            // Ajustar ticks según el rango de horas
            const hourDiff = this.endHour - this.startHour;
            let timeInterval;

            if (hourDiff >= 24 || hourDiff <= 0) {
                timeInterval = d3.timeHour.every(4); // Cada 4 horas para 24h completo
            } else if (hourDiff >= 12) {
                timeInterval = d3.timeHour.every(2); // Cada 2 horas para 12h+
            } else if (hourDiff >= 6) {
                timeInterval = d3.timeHour.every(1); // Cada hora para 6h+
            } else {
                timeInterval = d3.timeHour.every(1); // Cada hora para rangos pequeños
            }

            this.xAxis
                .transition()
                .duration(800)
                .call(d3.axisBottom(this.xScale)
                    .ticks(timeInterval)
                    .tickFormat(d3.timeFormat('%H:%M')));
        }

        this.yAxis
            .transition()
            .duration(800)
            .call(d3.axisLeft(this.yScale)
                .ticks(6)
                .tickFormat(d3.format('.0s')));
    }

    updateSocialChart(data) {
        // Gráfico de redes sociales
        const socialData = d3.rollup(
            data,
            v => d3.sum(v, d => d.barValue),
            d => d[this.socialField] || 'Sin especificar'
        );

        const socialBarData = Array.from(socialData, ([key, value]) => ({
            category: key,
            value: value
        })).sort((a, b) => b.value - a.value).slice(0, 5);

        this.drawBarChart(
            this.socialBarsGroup,
            this.socialXAxis,
            this.socialYAxis,
            socialBarData,
            this.smallChartWidth,
            this.smallChartHeight
        );
    }

    updateStatusChart(data) {
        // Gráfico de status
        const statusData = d3.rollup(
            data,
            v => d3.sum(v, d => d.barValue),
            d => d[this.statusField] || 'Sin especificar'
        );

        const statusBarData = Array.from(statusData, ([key, value]) => ({
            category: key,
            value: value
        })).sort((a, b) => b.value - a.value).slice(0, 5);

        this.drawBarChart(
            this.statusBarsGroup,
            this.statusXAxis,
            this.statusYAxis,
            statusBarData,
            this.smallChartWidth,
            this.smallChartHeight
        );
    }

    updateFormatChart(data) {
        // Gráfico de formato
        const formatData = d3.rollup(
            data,
            v => d3.sum(v, d => d.barValue),
            d => d[this.formatField] || 'Sin especificar'
        );

        const formatBarData = Array.from(formatData, ([key, value]) => ({
            category: key,
            value: value
        })).sort((a, b) => b.value - a.value).slice(0, 5);

        this.drawBarChart(
            this.formatBarsGroup,
            this.formatXAxis,
            this.formatYAxis,
            formatBarData,
            this.smallChartWidth,
            this.smallChartHeight
        );
    }

    drawBarChart(barsGroup, xAxisGroup, yAxisGroup, barData, width, height) {
        const isSmall = window.innerWidth < 768;

        // Escalas para barras
        const barXScale = d3.scaleLinear()
            .domain([0, d3.max(barData, d => d.value) || 100])
            .range([0, width]);

        const barYScale = d3.scaleBand()
            .domain(barData.map(d => d.category))
            .range([0, height])
            .padding(0.3);

        // Dibujar barras
        const bars = barsGroup.selectAll('.bar')
            .data(barData, d => d.category);

        bars.exit()
            .transition()
            .duration(400)
            .attr('width', 0)
            .remove();

        const barsEnter = bars.enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('x', 0)
            .attr('width', 0);

        const barsUpdate = barsEnter.merge(bars);

        barsUpdate
            .transition()
            .duration(600)
            .attr('x', 0)
            .attr('y', d => barYScale(d.category))
            .attr('width', d => barXScale(d.value))
            .attr('height', barYScale.bandwidth())
            .style('fill', d => this.colorScale(d.category));

        // Tooltips
        barsUpdate
            .on('mouseover', (event, d) => this.showBarTooltip(event, d))
            .on('mousemove', (event, d) => this.moveTooltip(event))
            .on('mouseout', () => this.hideTooltip());

        // Ejes
        xAxisGroup
            .transition()
            .duration(600)
            .call(d3.axisBottom(barXScale)
                .ticks(3)
                .tickFormat(d3.format('.0s')));

        yAxisGroup
            .transition()
            .duration(600)
            .call(d3.axisLeft(barYScale)
                .tickFormat(d => d.length > 8 ? d.substring(0, 8) + '...' : d));
    }

    showBarTooltip(event, d) {
        const tooltip = d3.select('#tooltip');

        const content = `
            <strong>${d.category}</strong><br/>
            <strong>Total Interacciones:</strong> ${d.value.toLocaleString()}
        `;

        tooltip
            .html(content)
            .classed('visible', true);

        this.moveTooltip(event);
    }

    updateLegend() {
        const categories = [...new Set(this.data.map(d => d[this.colorField]))].filter(d => d);

        const legend = d3.select('#legend');
        legend.selectAll('*').remove();

        const legendItems = legend.selectAll('.legend-item')
            .data(categories)
            .enter()
            .append('div')
            .attr('class', 'legend-item');

        legendItems.append('div')
            .attr('class', 'legend-color')
            .style('background-color', d => this.colorScale(d));

        legendItems.append('span')
            .attr('class', 'legend-text')
            .text(d => d);
    }

    showTooltip(event, d) {
        // No mostrar hover tooltip si ya hay uno pinned
        if (this.tooltipPinned) {
            return;
        }

        const tooltip = d3.select('#tooltip');

        // Generar enlace si existe item_page_url
        const linkHtml = d.item_page_url ?
            `<br/><div style="margin-top: 8px;"><a href="${d.item_page_url}" target="_blank" rel="noopener noreferrer" style="color: #007bff; text-decoration: underline; font-weight: 500;">🔗 Ver detalles</a></div>` :
            '';

        // Calcular total de interacciones
        const totalInteractions = (d.reacciones || 0) + (d.comentarios || 0) + (d.compartidos || 0);
        
        // Crear barras visuales para las interacciones
        const maxBarWidth = 120;
        const maxInteraction = Math.max(d.reacciones || 0, d.comentarios || 0, d.compartidos || 0, 1);
        
        const reaccionesBar = Math.round((d.reacciones || 0) / maxInteraction * maxBarWidth);
        const comentariosBar = Math.round((d.comentarios || 0) / maxInteraction * maxBarWidth);
        const compartidosBar = Math.round((d.compartidos || 0) / maxInteraction * maxBarWidth);

        const content = `
            <div style="font-family: 'Segoe UI', sans-serif; line-height: 1.4;">
                <div style="font-weight: bold; font-size: 14px; margin-bottom: 8px; color: #2f3640;">
                    ${d.claim ? (d.claim.length > 80 ? d.claim.substring(0, 80) + '...' : d.claim) : 'Sin título'}
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
                    <div><strong>Estado:</strong> <span style="color: #3742fa;">${d.status || 'N/A'}</span></div>
                    <div><strong>Red Social:</strong> <span style="color: #ff6b6b;">${d.red_social || 'N/A'}</span></div>
                    <div><strong>Formato:</strong> <span style="color: #4ecdc4;">${d.formato || 'N/A'}</span></div>
                    <div><strong>Total Interacciones:</strong> <span style="color: #ff9f43; font-weight: bold;">${totalInteractions.toLocaleString()}</span></div>
                </div>

                <div style="margin: 8px 0;">
                    <div style="display: flex; align-items: center; margin-bottom: 4px;">
                        <span style="width: 80px; font-size: 12px;">👍 ${(d.reacciones || 0).toLocaleString()}</span>
                        <div style="background: #ff6b6b; height: 6px; width: ${reaccionesBar}px; border-radius: 3px; margin-left: 8px;"></div>
                    </div>
                    <div style="display: flex; align-items: center; margin-bottom: 4px;">
                        <span style="width: 80px; font-size: 12px;">💬 ${(d.comentarios || 0).toLocaleString()}</span>
                        <div style="background: #4ecdc4; height: 6px; width: ${comentariosBar}px; border-radius: 3px; margin-left: 8px;"></div>
                    </div>
                    <div style="display: flex; align-items: center; margin-bottom: 4px;">
                        <span style="width: 80px; font-size: 12px;">📤 ${(d.compartidos || 0).toLocaleString()}</span>
                        <div style="background: #3742fa; height: 6px; width: ${compartidosBar}px; border-radius: 3px; margin-left: 8px;"></div>
                    </div>
                    ${d.visualizaciones ? `<div style="font-size: 12px; color: #666;">👁️ ${d.visualizaciones.toLocaleString()} visualizaciones</div>` : ''}
                </div>

                <div style="font-size: 12px; color: #666; margin-top: 8px;">
                    📅 ${d.date.toLocaleDateString('es-ES')} ${d.date.toLocaleTimeString('es-ES', { hour12: false })}
                </div>
                ${linkHtml}
            </div>
        `;

        tooltip
            .html(content)
            .classed('visible', true);

        this.moveTooltip(event);
    }

    moveTooltip(event) {
        const tooltip = d3.select('#tooltip');
        tooltip
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px');
    }

    hideTooltip() {
        // Solo ocultar tooltip si no está pinned
        if (!this.tooltipPinned) {
            d3.select('#tooltip').classed('visible', false);
        }
    }

    pinTooltip(event, d) {
        const tooltip = d3.select('#tooltip');

        // Usar el mismo formato mejorado que en showTooltip
        const linkHtml = d.item_page_url ?
            `<br/><div style="margin-top: 8px;"><a href="${d.item_page_url}" target="_blank" rel="noopener noreferrer" style="color: #007bff; text-decoration: underline; font-weight: 500;">🔗 Ver detalles</a></div>` :
            '';

        // Calcular total de interacciones
        const totalInteractions = (d.reacciones || 0) + (d.comentarios || 0) + (d.compartidos || 0);
        
        // Crear barras visuales para las interacciones
        const maxBarWidth = 120;
        const maxInteraction = Math.max(d.reacciones || 0, d.comentarios || 0, d.compartidos || 0, 1);
        
        const reaccionesBar = Math.round((d.reacciones || 0) / maxInteraction * maxBarWidth);
        const comentariosBar = Math.round((d.comentarios || 0) / maxInteraction * maxBarWidth);
        const compartidosBar = Math.round((d.compartidos || 0) / maxInteraction * maxBarWidth);

        const content = `
            <div style="font-family: 'Segoe UI', sans-serif; line-height: 1.4;">
                <div style="font-weight: bold; font-size: 14px; margin-bottom: 8px; color: #2f3640;">
                    ${d.claim ? (d.claim.length > 80 ? d.claim.substring(0, 80) + '...' : d.claim) : 'Sin título'}
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
                    <div><strong>Estado:</strong> <span style="color: #3742fa;">${d.status || 'N/A'}</span></div>
                    <div><strong>Red Social:</strong> <span style="color: #ff6b6b;">${d.red_social || 'N/A'}</span></div>
                    <div><strong>Formato:</strong> <span style="color: #4ecdc4;">${d.formato || 'N/A'}</span></div>
                    <div><strong>Total Interacciones:</strong> <span style="color: #ff9f43; font-weight: bold;">${totalInteractions.toLocaleString()}</span></div>
                </div>

                <div style="margin: 8px 0;">
                    <div style="display: flex; align-items: center; margin-bottom: 4px;">
                        <span style="width: 80px; font-size: 12px;">👍 ${(d.reacciones || 0).toLocaleString()}</span>
                        <div style="background: #ff6b6b; height: 6px; width: ${reaccionesBar}px; border-radius: 3px; margin-left: 8px;"></div>
                    </div>
                    <div style="display: flex; align-items: center; margin-bottom: 4px;">
                        <span style="width: 80px; font-size: 12px;">💬 ${(d.comentarios || 0).toLocaleString()}</span>
                        <div style="background: #4ecdc4; height: 6px; width: ${comentariosBar}px; border-radius: 3px; margin-left: 8px;"></div>
                    </div>
                    <div style="display: flex; align-items: center; margin-bottom: 4px;">
                        <span style="width: 80px; font-size: 12px;">📤 ${(d.compartidos || 0).toLocaleString()}</span>
                        <div style="background: #3742fa; height: 6px; width: ${compartidosBar}px; border-radius: 3px; margin-left: 8px;"></div>
                    </div>
                    ${d.visualizaciones ? `<div style="font-size: 12px; color: #666;">👁️ ${d.visualizaciones.toLocaleString()} visualizaciones</div>` : ''}
                </div>

                <div style="font-size: 12px; color: #666; margin-top: 8px;">
                    📅 ${d.date.toLocaleDateString('es-ES')} ${d.date.toLocaleTimeString('es-ES', { hour12: false })}
                </div>
                ${linkHtml}
                <div style="margin-top: 8px; font-size: 11px; color: #999; text-align: center;">
                    💡 Tooltip fijado - Click fuera para cerrar
                </div>
            </div>
        `;

        // Mostrar tooltip y marcarlo como pinned
        tooltip
            .html(content)
            .classed('visible', true)
            .classed('pinned', true);

        this.tooltipPinned = true;
        this.moveTooltip(event);
    }

    unpinTooltip() {
        // Desmarcar como pinned y ocultar
        this.tooltipPinned = false;
        d3.select('#tooltip')
            .classed('pinned', false)
            .classed('visible', false);
    }

    setupTooltipClickHandler() {
        // Click en cualquier lado del body cierra el tooltip pinned
        document.body.addEventListener('click', (event) => {
            // Si el click no fue en el tooltip mismo, cerrar tooltip pinned
            const tooltip = document.getElementById('tooltip');
            if (this.tooltipPinned && tooltip && !tooltip.contains(event.target)) {
                this.unpinTooltip();
            }
        });

        // Evitar que clicks en el tooltip lo cierren
        const tooltip = document.getElementById('tooltip');
        if (tooltip) {
            tooltip.addEventListener('click', (event) => {
                event.stopPropagation();
            });
        }
    }

    updateConnectionStatus(status = null) {
        const statusDot = document.getElementById('connectionStatus');
        const statusText = document.getElementById('statusText');

        // Determinar estado actual
        const currentStatus = status || (this.isConnected ? 'online' : 'offline');

        switch (currentStatus) {
            case 'updating':
                statusDot.className = 'status-dot updating';
                statusText.textContent = 'Actualizando...';
                break;
            case 'error':
                statusDot.className = 'status-dot error';
                statusText.textContent = 'Error';
                break;
            case 'online':
                statusDot.className = 'status-dot online';
                statusText.textContent = 'En línea';
                break;
            case 'offline':
            default:
                statusDot.className = 'status-dot offline';
                statusText.textContent = 'Desconectado';
                break;
        }
    }

    async updateStats() {
        // Obtener datos filtrados
        const dayData = this.filterDataByDay();

        // Calcular métricas
        const totalPosts = this.data.length;
        const dayPosts = dayData.length;

        // Actualizar cards en el header
        const totalPostsElement = document.getElementById('totalPosts');
        const dayPostsElement = document.getElementById('dayPosts');

        if (totalPostsElement) {
            totalPostsElement.textContent = totalPosts.toLocaleString();
        }
        if (dayPostsElement) {
            dayPostsElement.textContent = dayPosts.toLocaleString();
        }
    }

    // Métodos de notificación de WebSocket eliminados - solo usamos las notificaciones de auto-refresh

    // Función duplicada eliminada

    updateSelectorOptions() {
        const selectors = ['socialSelector', 'statusSelector', 'formatSelector'];

        // Opciones base que siempre están disponibles
        const baseOptions = [
            { value: 'red_social', text: 'Red Social' },
            { value: 'status', text: 'Status' },
            { value: 'formato', text: 'Formato' },
            { value: 'tags', text: 'Tags' }
        ];

        // Opciones adicionales según tipo de caso
        let additionalOptions = [];
        if (this.tipoCasoFilter === 'Desinformación') {
            additionalOptions.push({ value: 'narrativa_desinformacion', text: 'Narrativa Desinformación' });
        } else if (this.tipoCasoFilter === 'Rumor') {
            additionalOptions.push({ value: 'rumor_promovido', text: 'Rumor Promovido' });
        }

        // Actualizar cada selector
        selectors.forEach(selectorId => {
            const selector = document.getElementById(selectorId);
            if (!selector) return;

            // Guardar valor actual
            const currentValue = selector.value;

            // Limpiar opciones
            selector.innerHTML = '';

            // Agregar opciones base
            baseOptions.forEach(option => {
                const optionElement = document.createElement('option');
                optionElement.value = option.value;
                optionElement.textContent = option.text;
                selector.appendChild(optionElement);
            });

            // Agregar opciones adicionales
            additionalOptions.forEach(option => {
                const optionElement = document.createElement('option');
                optionElement.value = option.value;
                optionElement.textContent = option.text;
                selector.appendChild(optionElement);
            });

            // Restaurar valor si todavía está disponible
            if ([...selector.options].some(opt => opt.value === currentValue)) {
                selector.value = currentValue;
            } else {
                // Si el valor anterior ya no está disponible, usar el valor por defecto del selector
                const defaultValues = {
                    'socialSelector': 'red_social',
                    'statusSelector': 'status',
                    'formatSelector': 'formato'
                };
                selector.value = defaultValues[selectorId];

                // Actualizar el campo correspondiente
                if (selectorId === 'socialSelector') this.socialField = selector.value;
                if (selectorId === 'statusSelector') this.statusField = selector.value;
                if (selectorId === 'formatSelector') this.formatField = selector.value;
            }
        });
    }

    setupEventListeners() {
        // Selector de tipo de caso
        document.getElementById('tipoCaso').addEventListener('change', (e) => {
            this.tipoCasoFilter = e.target.value;
            this.updateSelectorOptions(); // Actualizar opciones de selectores
            this.updateVisualization();
        });

        // Selector de día
        document.getElementById('daySelector').addEventListener('change', (e) => {
            const dateStr = e.target.value;
            if (dateStr === 'all') {
                this.selectedDay = 'all';
                // Ocultar controles de tiempo ya que no aplican para "todos"
                this.hideTimeControls();
            } else {
                const [year, month, day] = dateStr.split('-');
                this.selectedDay = new Date(year, month - 1, day);
                // Mostrar controles de tiempo para días específicos
                this.showTimeControls();
            }
            this.updatePostsLabel();
            this.updateVisualization();
        });

        // Selectores de hora
        document.getElementById('startHour').addEventListener('change', (e) => {
            this.startHour = parseInt(e.target.value);
            this.updateVisualization();
        });

        document.getElementById('endHour').addEventListener('change', (e) => {
            this.endHour = parseInt(e.target.value);
            this.updateVisualization();
        });

        // Selectores de variables para gráficos
        document.getElementById('socialSelector').addEventListener('change', (e) => {
            this.socialField = e.target.value;
            this.updateVisualization();
        });

        document.getElementById('statusSelector').addEventListener('change', (e) => {
            this.statusField = e.target.value;
            this.updateVisualization();
        });

        document.getElementById('formatSelector').addEventListener('change', (e) => {
            this.formatField = e.target.value;
            this.updateVisualization();
        });

        // Color pickers para burbujas
        document.getElementById('socialColorPicker').addEventListener('click', () => {
            this.colorField = this.socialField;
            this.updateVisualization();
        });

        document.getElementById('statusColorPicker').addEventListener('click', () => {
            this.colorField = this.statusField;
            this.updateVisualization();
        });

        document.getElementById('formatColorPicker').addEventListener('click', () => {
            this.colorField = this.formatField;
            this.updateVisualization();
        });

        // Configurar botón de recargar
        this.setupRefreshButton();
    }

    setupResizeHandler() {
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.updateDimensions();

                // Actualizar transformaciones de grupos
                this.chartGroup.attr('transform', `translate(${this.margin.left},${this.margin.top})`);
                this.socialChartGroup.attr('transform', `translate(${this.chartMargin.left},${this.chartMargin.top})`);
                this.statusChartGroup.attr('transform', `translate(${this.chartMargin.left},${this.chartMargin.top})`);
                this.formatChartGroup.attr('transform', `translate(${this.chartMargin.left},${this.chartMargin.top})`);

                // Actualizar posiciones de ejes
                this.xAxis.attr('transform', `translate(0,${this.chartHeight})`);
                this.socialXAxis.attr('transform', `translate(0,${this.smallChartHeight})`);
                this.statusXAxis.attr('transform', `translate(0,${this.smallChartHeight})`);
                this.formatXAxis.attr('transform', `translate(0,${this.smallChartHeight})`);

                // Actualizar labels
                this.updateAxisLabels();

                // Re-renderizar visualización
                this.updateVisualization();
            }, 250);
        });
    }

    updateAxisLabels() {
        // Actualizar label del eje Y principal si existe
        const yLabel = this.chartGroup.select('.axis-label');
        if (!yLabel.empty()) {
            yLabel.attr('y', 0 - this.margin.left)
                .attr('x', 0 - (this.chartHeight / 2));
        }
    }

    initializeDateSelector() {
        const daySelector = document.getElementById('daySelector');
        
        if (daySelector) {
            // Agregar opción "Todos los posts" como primera opción
            const allOption = document.createElement('option');
            allOption.value = 'all';
            allOption.textContent = 'Todos los posts';
            allOption.selected = true; // Seleccionado por defecto
            daySelector.appendChild(allOption);
            
            // Configurar fecha por defecto (pero no seleccionada)
            const today = new Date();
            const todayOption = document.createElement('option');
            todayOption.value = today.toISOString().split('T')[0];
            todayOption.textContent = `Hoy (${today.toLocaleDateString('es-ES')})`;
            daySelector.appendChild(todayOption);
        }
        
        this.selectedDay = 'all'; // Mostrar todos por defecto
        this.hideTimeControls(); // Ocultar controles de tiempo por defecto
        this.updatePostsLabel(); // Actualizar label inicial
    }

    hideTimeControls() {
        const timeControls = document.querySelectorAll('.time-controls');
        timeControls.forEach(control => {
            control.style.display = 'none';
        });
    }

    showTimeControls() {
        const timeControls = document.querySelectorAll('.time-controls');
        timeControls.forEach(control => {
            control.style.display = 'flex';
        });
    }

    updatePostsLabel() {
        const postsLabel = document.getElementById('postsLabel');
        if (postsLabel) {
            if (this.selectedDay === 'all') {
                postsLabel.textContent = 'Posts totales';
            } else {
                postsLabel.textContent = 'Posts del día';
            }
        }
    }

    populateDateOptions() {
        const daySelector = document.getElementById('daySelector');
        if (!daySelector || !this.data || this.data.length === 0) return;

        // Obtener fechas únicas de los datos
        const uniqueDates = [...new Set(this.data.map(d => {
            const postDate = new Date(d.updated_at || d.submitted_at || d.created_at);
            return postDate.toDateString();
        }))].sort((a, b) => new Date(b) - new Date(a)); // Ordenar de más reciente a más antigua

        // Limpiar opciones existentes excepto la primera ("Todos los posts")
        const allOption = daySelector.querySelector('option[value="all"]');
        daySelector.innerHTML = '';
        if (allOption) {
            daySelector.appendChild(allOption);
        }

        // Agregar fechas disponibles
        uniqueDates.slice(0, 10).forEach(dateString => { // Limitar a 10 fechas más recientes
            const date = new Date(dateString);
            const option = document.createElement('option');
            option.value = date.toISOString().split('T')[0];
            option.textContent = date.toLocaleDateString('es-ES', { 
                weekday: 'short', 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            });
            daySelector.appendChild(option);
        });

        // Mantener la selección actual
        if (this.selectedDay === 'all') {
            daySelector.value = 'all';
        }
    }

    handleZoom(event) {
        // Aplicar transformación de zoom al grupo de elementos
        this.zoomGroup.attr('transform', event.transform);
        this.currentZoom = event.transform;

        // Actualizar ejes con la nueva escala
        const newXScale = event.transform.rescaleX(this.xScale);
        const newYScale = event.transform.rescaleY(this.yScale);

        // Actualizar ejes
        if (this.selectedDay === 'all') {
            this.xAxis.call(d3.axisBottom(newXScale)
                .ticks(6)
                .tickFormat(d3.timeFormat('%d/%m')));
        } else {
            const hourDiff = this.endHour - this.startHour;
            let timeInterval;

            if (hourDiff >= 24 || hourDiff <= 0) {
                timeInterval = d3.timeHour.every(4);
            } else if (hourDiff >= 12) {
                timeInterval = d3.timeHour.every(2);
            } else if (hourDiff >= 6) {
                timeInterval = d3.timeHour.every(1);
            } else {
                timeInterval = d3.timeHour.every(1);
            }

            this.xAxis.call(d3.axisBottom(newXScale)
                .ticks(timeInterval)
                .tickFormat(d3.timeFormat('%H:%M')));
        }

        this.yAxis.call(d3.axisLeft(newYScale)
            .ticks(6)
            .tickFormat(d3.format('.0s')));
    }

    setupZoomControls() {
        // Botón de zoom in
        document.getElementById('zoomInBtn').addEventListener('click', () => {
            this.svg.transition().duration(300).call(
                this.zoom.scaleBy, 1.5
            );
        });

        // Botón de zoom out
        document.getElementById('zoomOutBtn').addEventListener('click', () => {
            this.svg.transition().duration(300).call(
                this.zoom.scaleBy, 1 / 1.5
            );
        });

        // Botón de reset zoom
        document.getElementById('resetZoomBtn').addEventListener('click', () => {
            this.svg.transition().duration(500).call(
                this.zoom.transform,
                d3.zoomIdentity
            );
        });

        // Botón de pantalla completa
        document.getElementById('fullscreenBtn').addEventListener('click', () => {
            this.toggleFullscreen();
        });

        // Escape para salir de pantalla completa
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.isFullscreen) {
                this.exitFullscreen();
            }
        });
    }

    toggleFullscreen() {
        const container = document.querySelector('.bubble-chart-container');
        
        if (!this.isFullscreen) {
            this.enterFullscreen(container);
        } else {
            this.exitFullscreen();
        }
    }

    enterFullscreen(container) {
        container.classList.add('fullscreen');
        this.isFullscreen = true;

        // Actualizar dimensiones para pantalla completa
        this.updateDimensions();
        
        // Cambiar icono del botón
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        fullscreenBtn.innerHTML = '⤓';
        fullscreenBtn.title = 'Salir de pantalla completa';

        // Re-renderizar con nuevas dimensiones
        setTimeout(() => {
            this.updateVisualization();
        }, 100);
    }

    exitFullscreen() {
        const container = document.querySelector('.bubble-chart-container');
        container.classList.remove('fullscreen');
        this.isFullscreen = false;

        // Restaurar dimensiones normales
        this.updateDimensions();

        // Cambiar icono del botón
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        fullscreenBtn.innerHTML = '⛶';
        fullscreenBtn.title = 'Pantalla completa';

        // Re-renderizar con dimensiones normales
        setTimeout(() => {
            this.updateVisualization();
        }, 100);
    }

    showLoadWarning(loaded, total) {
        const notification = document.createElement('div');
        notification.className = 'new-posts-notification warning';
        notification.innerHTML = `⚠️ Mostrando ${loaded} de ${total} posts totales`;
        notification.style.background = 'linear-gradient(135deg, #ff9800, #f57c00)';

        document.body.appendChild(notification);

        setTimeout(() => notification.classList.add('show'), 100);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 5000); // Mostrar por 5 segundos
    }

    filterDataByDay() {
        // Filtrar datos por día y tipo de caso
        this.filteredData = this.data.filter(d => {
            // Si selectedDay es 'all', no filtrar por día
            let matchesDay = true;
            if (this.selectedDay !== 'all') {
                const postDate = new Date(d.updated_at || d.submitted_at || d.created_at);
                matchesDay = postDate.toDateString() === this.selectedDay.toDateString();
            }

            // Aplicar filtro de tipo de caso
            let matchesTipoCaso = true;
            if (this.tipoCasoFilter !== 'todos') {
                matchesTipoCaso = d.es_caso_es === this.tipoCasoFilter;
            }

            return matchesDay && matchesTipoCaso;
        });

        return this.filteredData;
    }

    setupRefreshButton() {
        const refreshButton = document.getElementById('refreshButton');
        if (refreshButton) {
            refreshButton.addEventListener('click', () => {
                this.manualRefresh();
            });
        }
    }

    async manualRefresh() {
        const refreshButton = document.getElementById('refreshButton');

        try {
            // Mostrar animación de carga
            refreshButton.classList.add('loading');

            // Recargar datos desde el servidor
            await this.loadInitialData();

            // Mostrar notificación de éxito
            this.showRefreshNotification('✅ Datos actualizados');

        } catch (error) {
            console.error('Error en recarga manual:', error);
            this.showRefreshNotification('❌ Error al actualizar', true);
        } finally {
            // Quitar animación de carga
            refreshButton.classList.remove('loading');
        }
    }

    showRefreshNotification(message, isError = false) {
        const notification = document.createElement('div');
        notification.className = `new-posts-notification ${isError ? 'error' : 'success'}`;
        notification.innerHTML = message;

        document.body.appendChild(notification);

        setTimeout(() => notification.classList.add('show'), 100);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 2000);
    }

    calculateInteractionsHash(dayData) {
        // 🎯 FUNCIÓN MEJORADA: Detectar cambios en interacciones de forma precisa
        // 
        // PROBLEMA RESUELTO: Cuando un periodista actualiza las anotaciones con interacciones
        // (reacciones, comentarios, compartidos), el gráfico de burbujas no se actualizaba
        // porque solo se verificaba la cantidad de posts, NO los cambios en interacciones.
        // 
        // SOLUCIÓN: Esta función calcula un hash único y estable de todas las interacciones
        // del día seleccionado. Solo cambia cuando realmente cambian las interacciones.

        if (!dayData || dayData.length === 0) {
            return 'empty';
        }

        // Ordenar por check_dbid para asegurar orden consistente
        const sortedData = dayData.slice().sort((a, b) => (a.check_dbid || 0) - (b.check_dbid || 0));

        let interactionString = '';
        let totalInteractions = 0;

        sortedData.forEach(post => {
            const reacciones = post.reacciones || 0;
            const comentarios = post.comentarios || 0;
            const compartidos = post.compartidos || 0;
            const visualizaciones = post.visualizaciones || 0;

            totalInteractions += reacciones + comentarios + compartidos + visualizaciones;

            // Crear string único que incluye ID del post y TODAS sus interacciones
            interactionString += `${post.check_dbid}:${reacciones}:${comentarios}:${compartidos}:${visualizaciones}|`;
        });

        // Hash más robusto: incluir cantidad de posts, total de interacciones y checksum del string
        const postCount = sortedData.length;
        const stringChecksum = interactionString.length + interactionString.charCodeAt(Math.floor(interactionString.length / 2));

        return `${postCount}-${totalInteractions}-${stringChecksum}`;
    }

    startAutoRefresh() {
        // Actualización automática cada 30 segundos
        this.autoRefreshInterval = setInterval(async () => {
            try {
                // Mostrar indicador de actualización al inicio de CADA consulta
                this.updateConnectionStatus('updating');

                // Guardar datos anteriores para comparar cantidad Y interacciones
                const previousDataLength = this.data.length;
                const previousDayData = this.filterDataByDay();
                const previousDayLength = previousDayData.length;
                const previousInteractionsHash = this.calculateInteractionsHash(previousDayData);

                // Cargar datos frescos usando la misma lógica que el refresh manual pero sin actualizar UI
                await this.loadDataWithoutUI();

                // Verificar cambios en el día seleccionado específicamente
                const newDayData = this.filterDataByDay();
                const newDayLength = newDayData.length;
                const newInteractionsHash = this.calculateInteractionsHash(newDayData);

                // Detectar cambios en cantidad de posts
                const hasQuantityChanges = newDayLength !== previousDayLength;

                // 🎯 DETECTAR CAMBIOS EN INTERACCIONES (NUEVA FUNCIONALIDAD)
                // Antes: Solo se verificaba si cambiaba la cantidad de posts
                // Ahora: También se verifica si cambian las interacciones (reacciones, comentarios, compartidos)
                // Esto resuelve el problema de que las burbujas no se actualizaban cuando los periodistas
                // agregaban interacciones a posts existentes
                const hasInteractionChanges = newInteractionsHash !== previousInteractionsHash;

                // Logging detallado para debug
                const dayLabel = this.selectedDay === 'all' ? 'todos los posts' : this.selectedDay.toDateString();
                console.log(`🔄 Auto-refresh (${dayLabel}): Cantidad ${previousDayLength}→${newDayLength}, Interacciones: ${hasInteractionChanges ? 'CAMBIÓ' : 'igual'}`);
                if (hasInteractionChanges) {
                    console.log(`   Hash anterior: ${previousInteractionsHash}`);
                    console.log(`   Hash nuevo: ${newInteractionsHash}`);
                }

                // Solo mostrar notificaciones cuando HAY cambios reales
                if (hasQuantityChanges || hasInteractionChanges) {
                    // Priorizar notificación de cantidad sobre interacciones
                    if (hasQuantityChanges) {
                        const diff = newDayLength - previousDayLength;
                        if (diff > 0) {
                            this.showAutoRefreshNotification(`📈 +${diff} posts nuevos`);
                        } else if (diff < 0) {
                            this.showAutoRefreshNotification(`📉 ${Math.abs(diff)} posts eliminados`);
                        }
                    } else if (hasInteractionChanges) {
                        // Solo mostrar notificación de interacciones si NO hay cambios de cantidad
                        this.showAutoRefreshNotification(`💬 Interacciones actualizadas`);
                    }

                    // Actualizar visualización cuando cambie cantidad O interacciones
                    this.updateVisualization();
                    this.updateStats();
                } else {
                    // Sin cambios: solo actualizar stats silenciosamente, sin notificaciones
                    this.updateStats();
                }

                // SIEMPRE mantener estado "actualizando" por 1 segundo (independiente de si hay cambios)
                setTimeout(() => {
                    this.updateConnectionStatus('online');
                }, 1000);

            } catch (error) {
                console.error('Error en actualización automática:', error);
                this.updateConnectionStatus('error');
                // Volver a normal después de 1 segundo
                setTimeout(() => this.updateConnectionStatus('online'), 1000);
            }
        }, 30000); // 30 segundos

    }

    stopAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }
    }

    showAutoRefreshNotification(message, isSubtle = false) {
        // Notificación más sutil para actualizaciones automáticas
        const notification = document.createElement('div');
        notification.className = `new-posts-notification ${isSubtle ? 'auto-subtle' : 'auto-refresh'}`;
        notification.innerHTML = message;

        document.body.appendChild(notification);

        setTimeout(() => notification.classList.add('show'), 100);

        // Duración más corta para actualizaciones automáticas
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 1500);
    }


}

// Inicializar dashboard cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new RealtimeDashboard();
});