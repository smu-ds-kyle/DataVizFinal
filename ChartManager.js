class ChartManager {
    constructor(app) {
      this.app = app;
      
      this.pdfChartSvg = null;
      this.distributionChartSvg = null;
      this.histogramChartSvg = null;
      
      this.chartMargin = {top: 20, right: 30, bottom: 40, left: 50};
      this.transitionDuration = 300;
      
      this.colors = this.getThemeColors();
      
      this.lastChartUpdateTime = 0;
      this.chartUpdateInterval = 200;
      this.pendingHistogramUpdate = false;
      
      this.lastTheoreticalAxisTicks = null;

      this.cachedChartData = {
        pdf: null,
        distribution: null,
        histogram: null
      };
    }
    
    getThemeColors() {
    const isDarkMode = this.app.isDarkMode;

    if (isDarkMode) {
      return {
        backgroundColor: "#1e1e1e",
        axisColor: "#8a8d93",
        gridColor: "#2c2c2c",
        textColor: "#e0e0e0",
        lineColor: "#fda509",
        areaColor: "rgba(253, 165, 9, 0.15)",
        meanLineColor: "#ff6b6b",
        stdDevLineColor: "#748ffc"
      };
    } else {
      return {
        backgroundColor: "#f8f9fa",
        axisColor: "#6c757d",
        gridColor: "#e0e0e0",
        textColor: "#212529",
        lineColor: "steelblue",
        areaColor: "rgba(70, 130, 180, 0.3)",
        meanLineColor: "red",
        stdDevLineColor: "blue"
      };
    }
  }
    
    initCharts() {
     
      this.updatePDFChart(true);
      this.updateDistributionChart(true);
    }
    
    requestHistogramUpdate() {
      if (!this.pendingHistogramUpdate) {
        this.pendingHistogramUpdate = true;
        
        const now = performance.now();
        const timeSinceLastUpdate = now - this.lastChartUpdateTime;
        
        if (timeSinceLastUpdate >= this.chartUpdateInterval) {
          this.performHistogramUpdate();
        } else {
          setTimeout(() => {
            this.performHistogramUpdate();
          }, this.chartUpdateInterval - timeSinceLastUpdate);
        }
      }
    }
    
    performHistogramUpdate() {
      this.updateHistogramChart();
      this.lastChartUpdateTime = performance.now();
      this.pendingHistogramUpdate = false;
    }
    
    createTransition() {
      return d3.transition().duration(this.transitionDuration);
    }
    
    setupChartStructure(container, forceRecreate = false, svgRef) {
      if (!container || container.clientWidth <= 0 || container.clientHeight <= 0) {
        return svgRef;
      }
      
      const width = container.clientWidth - this.chartMargin.left - this.chartMargin.right;
      const height = container.clientHeight - this.chartMargin.top - this.chartMargin.bottom;
      
      if (svgRef && !forceRecreate) {
        const currentWidth = svgRef.attr('width') - this.chartMargin.left - this.chartMargin.right;
        const currentHeight = svgRef.attr('height') - this.chartMargin.top - this.chartMargin.bottom;
        
        if (currentWidth === width && currentHeight === height) {
          return svgRef;
        }
      }
      
      if (!svgRef || forceRecreate) {
        container.innerHTML = '';
        
        const svg = d3.select(container)
          .append('svg')
          .attr('width', width + this.chartMargin.left + this.chartMargin.right)
          .attr('height', height + this.chartMargin.top + this.chartMargin.bottom)
          .append('g')
          .attr('transform', `translate(${this.chartMargin.left},${this.chartMargin.top})`);
        
        svg.append("rect")
          .attr("class", "chart-background")
          .attr("width", width)
          .attr("height", height)
          .attr("rx", 4);
        
        svg.append("g").attr("class", "grid-group");
        svg.append("g").attr("class", "area-group");
        svg.append("g").attr("class", "line-group");
        svg.append("g").attr("class", "bars-group");
        svg.append("g").attr("class", "x-axis-group").attr('transform', `translate(0,${height})`);
        svg.append("g").attr("class", "y-axis-group");
        svg.append("g").attr("class", "stats-group");
        svg.append("g").attr("class", "markers-group");
        
        svg.append("text")
          .attr("class", "x-axis-label")
          .attr("text-anchor", "middle")
          .attr("x", width / 2)
          .attr("y", height + this.chartMargin.bottom - 5)
          .style("font-size", "12px");
        
        svg.append("text")
          .attr("class", "y-axis-label")
          .attr("text-anchor", "middle")
          .attr("transform", "rotate(-90)")
          .attr("y", -this.chartMargin.left + 15)
          .attr("x", -height / 2)
          .style("font-size", "12px");
        
        svg.append('text')
          .attr("class", "stats-text")
          .attr('x', width / 2)
          .attr('y', -10)
          .attr('text-anchor', 'middle')
          .style('font-size', '14px');
        
        return svg;
      } else {
        d3.select(container).select('svg')
          .attr('width', width + this.chartMargin.left + this.chartMargin.right)
          .attr('height', height + this.chartMargin.top + this.chartMargin.bottom);
          
        svgRef.select(".chart-background")
          .attr("width", width)
          .attr("height", height);
          
        svgRef.select(".x-axis-group")
          .attr('transform', `translate(0,${height})`);
          
        svgRef.select(".x-axis-label")
          .attr("x", width / 2)
          .attr("y", height + this.chartMargin.bottom - 5);
          
        svgRef.select(".y-axis-label")
          .attr("x", -height / 2);
          
        svgRef.select(".stats-text")
          .attr('x', width / 2);
      }
      
      return svgRef;
    }
    
    getChartDimensions(container) {
      return {
        width: container.clientWidth - this.chartMargin.left - this.chartMargin.right,
        height: container.clientHeight - this.chartMargin.top - this.chartMargin.bottom
      };
    }
    
    applyChartTheme(svg) {
        if (!svg) return this.getThemeColors();
        
        this.colors = this.getThemeColors();
        
        svg.select(".chart-background")
          .transition(this.createTransition())
          .attr("fill", this.colors.backgroundColor);
        
        svg.selectAll(".domain, .tick line")
          .attr("stroke", this.colors.axisColor);
          
        svg.selectAll(".tick text")
          .attr("fill", this.colors.textColor);
        
        svg.select(".x-axis-label")
          .attr("fill", this.colors.textColor);
          
        svg.select(".y-axis-label")
          .attr("fill", this.colors.textColor);
        
        return this.colors;
      }
    
    setupGridLines(gridGroup, scale, width, height, isHorizontal = true) {
      if (!gridGroup) return;
      
      const gridLines = gridGroup.selectAll(isHorizontal ? ".y-grid" : ".x-grid")
        .data(scale.ticks(5));
        
      gridLines.exit().remove();
      
      if (isHorizontal) {
        gridLines.enter()
          .append("line")
          .attr("class", "y-grid")
          .merge(gridLines)
          .transition(this.createTransition())
          .attr("x1", 0)
          .attr("x2", width)
          .attr("y1", d => scale(d))
          .attr("y2", d => scale(d))
          .attr("stroke", this.colors.gridColor)
          .attr("stroke-opacity", 0.1);
      } else {
        gridLines.enter()
          .append("line")
          .attr("class", "x-grid")
          .merge(gridLines)
          .transition(this.createTransition())
          .attr("x1", d => scale(d))
          .attr("x2", d => scale(d))
          .attr("y1", 0)
          .attr("y2", height)
          .attr("stroke", this.colors.gridColor)
          .attr("stroke-opacity", 0.1);
      }
    }
    
   drawLineChart(svg, data, x, y, height) {
  if (!svg || !data || data.length === 0) return;
  
  const validData = data.filter(d => !isNaN(d.y));
  
  if (validData.length === 0) return;
  
  const curveType = this.app.config.distribution === 'uniform' ? d3.curveLinear : d3.curveBasis;
  
  const line = d3.line()
    .x(d => x(d.x))
    .y(d => y(d.y))
    .defined(d => !isNaN(d.y))
    .curve(curveType);
  
  const area = d3.area()
    .x(d => x(d.x))
    .y0(height)
    .y1(d => y(d.y))
    .defined(d => !isNaN(d.y))
    .curve(curveType);
  
  const areaPath = svg.select(".area-group").selectAll(".pdf-area")
    .data([validData]);
    
  areaPath.enter()
    .append("path")
    .attr("class", "pdf-area")
    .merge(areaPath)
    .transition(this.createTransition())
    .attr("fill", this.colors.areaColor)
    .attr("d", area);
  
  const linePath = svg.select(".line-group").selectAll(".pdf-line")
    .data([validData]);
    
  linePath.enter()
    .append("path")
    .attr("class", "pdf-line")
    .merge(linePath)
    .transition(this.createTransition())
    .attr("fill", "none")
    .attr("stroke", this.colors.lineColor)
    .attr("stroke-width", 2)
    .attr("d", line);
}
    
drawBarChart(svg, data, xScale, yScale, height, width, colorFn = null) {
    if (!svg || !data || data.length === 0) return;

    if (!colorFn) {
        const maxValue = d3.max(data, d => d.value || 0.001);
        colorFn = d => {
            if (isNaN(d.value) || d.value <= 0) return this.app.isDarkMode ? "#444" : "#ddd";
            const intensity = 0.3 + (d.value / maxValue) * 0.7;
            return this.app.isDarkMode ?
                d3.interpolatePlasma(intensity) :
                d3.interpolateBlues(intensity);
        };
    }

    const barPadding = 1;

    const isScaleBand = typeof xScale.bandwidth === 'function';

    const bars = svg.select(".bars-group").selectAll('.bar')
        .data(data, d => d.bin);

    bars.exit()
        .transition(this.createTransition())
        .attr('y', height)
        .attr('height', 0)
        .remove();

    bars.enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', d => isScaleBand ? xScale(d.bin) : xScale(d.binStart))
        .attr('y', height)
        .attr('width', d => isScaleBand ? xScale.bandwidth() : Math.max(0, xScale(d.binEnd) - xScale(d.binStart) - barPadding))
        .attr('height', 0)
        .merge(bars)
        .transition(this.createTransition())
        .attr('x', d => isScaleBand ? xScale(d.bin) : xScale(d.binStart))
        .attr('y', d => {
            const pos = yScale(d.value || 0);
            return isNaN(pos) ? height : pos;
        })
        .attr('width', d => isScaleBand ? xScale.bandwidth() : Math.max(0, xScale(d.binEnd) - xScale(d.binStart) - barPadding))
        .attr('height', d => {
            const h = height - yScale(d.value || 0);
            return isNaN(h) || h < 0 ? 0 : h;
        })
        .attr('fill', colorFn);
}
    
    setupAxes(svg, x, y, width, height, options = {}) {
      if (!svg) return;
      
      const {
        xTickFormat = null,
        yTickFormat = '.0%',
        xTicks = 5,
        yTicks = 5,
        xTickValues = null
      } = options;
      
      const xAxis = d3.axisBottom(x)
        .ticks(xTicks);
      
      if (xTickValues) {
        xAxis.tickValues(xTickValues);
      }
      
      if (xTickFormat) {
        xAxis.tickFormat(xTickFormat);
      }
      
      const yAxis = d3.axisLeft(y)
        .ticks(yTicks);
      
      if (yTickFormat) {
        yAxis.tickFormat(d3.format(yTickFormat));
      }
      
      svg.select(".x-axis-group")
        .transition(this.createTransition())
        .call(xAxis);
        
      svg.select(".y-axis-group")
        .transition(this.createTransition())
        .call(yAxis);
    }
    
    updateStatsText(svg, stats) {
      if (!svg || !stats) return;
      
      svg.select(".stats-text")
        .attr("fill", this.colors.textColor)
        .text(`μ = ${stats.mean.toFixed(2)}, σ = ${stats.stdDev.toFixed(2)}`);
    }
    
    updatePDFChart(forceRecreate = false) {
      const container = this.app.pdfChartContainer;
      if (!container) return;
      
      this.pdfChartSvg = this.setupChartStructure(container, forceRecreate, this.pdfChartSvg);
      if (!this.pdfChartSvg) return;
      
      const { width, height } = this.getChartDimensions(container);
      this.applyChartTheme(this.pdfChartSvg);
      
      this.pdfChartSvg.select(".y-axis-label")
        .text("Probability Density");
      
      const rangeInfo = this.app.distributionManager.getDistributionRange(
        this.app.config.distribution, 
        this.app.config
      );
      
      const cacheKey = `pdf-${this.app.config.distribution}-${JSON.stringify(this.app.config[this.app.config.distribution])}`;
      let displayData;
      
      if (this.cachedChartData.pdf && this.cachedChartData.pdf.key === cacheKey) {
        displayData = this.cachedChartData.pdf.data;
      } else {
        let numPoints
        if(this.app.config.distribution === 'uniform') {
            numPoints = 5;
        }
        else{
            numPoints = 200;
        }
        
        const step = (rangeInfo.max - rangeInfo.min) / numPoints;
        const data = this.app.distributionManager.generatePDFData(rangeInfo, numPoints, step);
        
        displayData = data.filter(point => 
          point.x >= rangeInfo.displayMin && 
          point.x <= rangeInfo.displayMax
        );
        
        this.cachedChartData.pdf = {
          key: cacheKey,
          data: displayData
        };
      }
      
      const x = d3.scaleLinear()
        .domain([rangeInfo.displayMin, rangeInfo.displayMax])
        .range([0, width]);
      
      const y = d3.scaleLinear()
        .domain([0, d3.max(displayData, d => d.y) * 1.1])
        .nice()
        .range([height, 0]);
      
      this.setupGridLines(this.pdfChartSvg.select(".grid-group"), y, width, height);
      
      this.drawLineChart(this.pdfChartSvg, displayData, x, y, height);
      
      this.setupAxes(this.pdfChartSvg, x, y, width, height);
      
      const stats = this.app.distributionManager.calculateDistributionStats(
        this.app.config.distribution, 
        this.app.config
      );
      this.updateStatsText(this.pdfChartSvg, stats);
      
      this.updateStandardDeviationMarkers(
        this.pdfChartSvg.select(".markers-group"),
        x,
        stats,
        width,
        height,
        this.colors.textColor,
        { 
          meanLineColor: this.colors.meanLineColor, 
          stdDevLineColor: this.colors.stdDevLineColor 
        },
        this.app.config.distribution
      );
    }
    
    updateDistributionChart(forceRecreate = false) {
      const container = this.app.distributionChartContainer;
      if (!container) return;
      
      this.distributionChartSvg = this.setupChartStructure(container, forceRecreate, this.distributionChartSvg);
      if (!this.distributionChartSvg) return;
      
      const { width, height } = this.getChartDimensions(container);
      this.applyChartTheme(this.distributionChartSvg);
      
      this.distributionChartSvg.select(".y-axis-label")
        .text("Probability");
      
        const cacheKey = `dist-${this.app.config.distribution}-${this.app.config.numLanes}-${JSON.stringify(this.app.config[this.app.config.distribution])}`;
        let data;
        
        if (this.cachedChartData.distribution && this.cachedChartData.distribution.key === cacheKey) {
          data = this.cachedChartData.distribution.data;
        } else {
        const rangeInfo = this.app.distributionManager.getDistributionRange(
          this.app.config.distribution, 
          this.app.config
        );
        
        data = [];
        for (let i = 0; i < this.app.config.numLanes; i++) {
          const actualValue = this.app.distributionManager.getLaneValue(i, this.app.config.numLanes, this.app.config.distribution);
          
          if (actualValue >= rangeInfo.displayMin && actualValue <= rangeInfo.displayMax) {
            let value = this.app.distributionManager.getDistributionValueForLane(i, this.app.config.numLanes, this.app.config.distribution);
            
            data.push({
              bin: i,
              value: value,
              actualValue: actualValue
            });
          }
        }
        
        const sum = data.reduce((acc, d) => acc + d.value, 0);
        if (sum > 0) {
          data.forEach(d => d.value = d.value / sum);
        }
        
        this.cachedChartData.distribution = {
          key: cacheKey,
          data: data
        };
      }
      
      const xBin = d3.scaleBand()
        .domain(data.map(d => d.bin))
        .range([0, width])
        .padding(0.1);
      
      const rangeInfo = this.app.distributionManager.getDistributionRange(
        this.app.config.distribution, 
        this.app.config
      );
      const x = d3.scaleLinear()
        .domain([rangeInfo.displayMin, rangeInfo.displayMax])
        .range([0, width]);
      
      const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.value) || 0.01])
        .nice()
        .range([height, 0]);
      
      this.setupGridLines(this.distributionChartSvg.select(".grid-group"), y, width, height);
      
      const barColorFn = d => {
        if (isNaN(d.value) || d.value <= 0) return this.app.isDarkMode ? "#444" : "#ddd";
        const maxVal = d3.max(data, d => d.value) || 0.01;
        const intensity = 0.3 + d.value / maxVal * 0.7;
        return this.app.isDarkMode ? 
          d3.interpolatePlasma(intensity) :
          d3.interpolateBlues(intensity);
      };
      
      this.drawBarChart(this.distributionChartSvg, data, xBin, y, height, barColorFn);
      
      const percentilePositions = [0, 0.25, 0.5, 0.75, 1];
      const selectedBins = percentilePositions.map(p => Math.floor(p * (data.length - 1)));
      
      this.setupAxes(this.distributionChartSvg, xBin, y, width, height, {
        xTickValues: selectedBins.map(b => data[b]?.bin).filter(Boolean),
        xTickFormat: idx => {
          const binData = data.find(d => d.bin === idx);
          return binData ? binData.actualValue.toFixed(1) : '';
        },
        yTickFormat: '.0%'
      });
      
      const stats = this.app.distributionManager.calculateDistributionStats(
        this.app.config.distribution, 
        this.app.config
      );
      this.updateStatsText(this.distributionChartSvg, stats);
      
      this.updateStandardDeviationMarkers(
        this.distributionChartSvg.select(".markers-group"),
        x,
        stats,
        width,
        height,
        this.colors.textColor,
        { 
          meanLineColor: this.colors.meanLineColor, 
          stdDevLineColor: this.colors.stdDevLineColor 
        },
        this.app.config.distribution
      );
    }
    
    resetHistogramChart() {
      if (this.histogramChartSvg) {
        if (this.app.histogramChartContainer) {
          this.app.histogramChartContainer.innerHTML = '';
        }
        
        this.histogramChartSvg = null;
        
        this.cachedChartData.histogram = null;
      }
    }
    
updateHistogramChart() {
    if (this.app.totalBallsCreated === 0) {
        this.resetHistogramChart();
        return;
    }

    
    const container = this.app.histogramChartContainer;
    if (!container) return;

    const isInitialSetup = !this.histogramChartSvg;
    this.histogramChartSvg = this.setupChartStructure(container, isInitialSetup, this.histogramChartSvg);
    if (!this.histogramChartSvg) return;

    const { width, height } = this.getChartDimensions(container);
    this.applyChartTheme(this.histogramChartSvg);

    this.histogramChartSvg.select(".y-axis-label").text("Frequency");

    const realValues = this.app.distributionManager.laneHistogramRealValues;
    if (!realValues || realValues.length === 0) {
        return;
    }

    const rangeInfo = this.app.distributionManager.getDistributionRange(
        this.app.config.distribution,
        this.app.config
    );

    if (rangeInfo.displayMin === undefined || rangeInfo.displayMax === undefined || rangeInfo.displayMin >= rangeInfo.displayMax) {
      console.error("Invalid display range for histogram:", rangeInfo);
      return;
    }

    const numBins = this.app.config.numLanes;
    if (numBins <= 0) {
        console.error("Number of bins must be positive:", numBins);
        return;
    }

    const thresholds = [];
    const step = numBins > 1 ? (rangeInfo.displayMax - rangeInfo.displayMin) / numBins : (rangeInfo.displayMax - rangeInfo.displayMin);
    for (let i = 0; i <= numBins; i++) {
        const boundary = rangeInfo.displayMin + i * step;
        thresholds.push(boundary);
    }
    thresholds[numBins] = rangeInfo.displayMax;


    const histogram = d3.histogram()
        .domain([rangeInfo.displayMin, rangeInfo.displayMax])
        .thresholds(thresholds.slice(1))
        .value(d => d);

    const bins = histogram(realValues);

    const data = bins.map((bin, i) => ({
        bin: i,
        binStart: bin.x0,
        binEnd: bin.x1,
        count: bin.length,
        value: realValues.length > 0 ? bin.length / realValues.length : 0
    }));


    const x = d3.scaleLinear()
        .domain([rangeInfo.displayMin, rangeInfo.displayMax])
        .range([0, width]);

    const maxValue = d3.max(data, d => d.value) || 0.01;

    const y = d3.scaleLinear()
        .domain([0, maxValue * 1.1]).nice()
        .range([height, 0]);


    this.setupGridLines(this.histogramChartSvg.select(".grid-group"), y, width, height);

    const barColorFn = d => {
        if (isNaN(d.value) || d.value <= 0) return this.app.isDarkMode ? "#444" : "#ddd";
        const intensity = maxValue > 0 ? 0.3 + (d.value / maxValue) * 0.7 : 0.3;
        return this.app.isDarkMode ?
        d3.interpolatePlasma(intensity) :
        d3.interpolateBlues(intensity);
    };

    this.drawBarChart(this.histogramChartSvg, data, x, y, height, width, barColorFn);

    let theoStats = this.app.distributionManager.calculateDistributionStats(
        this.app.config.distribution, 
        this.app.config
      );
    let distRange = this.app.distributionManager.getDistributionRange(
        this.app.config.distribution, 
        this.app.config
      );

    
    const tickValues = [
        theoStats.mean - 4 * theoStats.stdDev,
        theoStats.mean - 3 * theoStats.stdDev,
        theoStats.mean - 2 * theoStats.stdDev,
        theoStats.mean - 1 * theoStats.stdDev,
        theoStats.mean,
        theoStats.mean + 1 * theoStats.stdDev,
        theoStats.mean + 2 * theoStats.stdDev,
        theoStats.mean + 3 * theoStats.stdDev,
        theoStats.mean + 4 * theoStats.stdDev
    ].filter(val => val >= distRange.displayMin && val <= distRange.displayMax);

    
    this.setupAxes(this.histogramChartSvg, x, y, width, height, {
        xTickValues: tickValues,
        xTickFormat: d3.format(".1f"),
        yTickFormat: '.0%'
    });


    const stats = this.app.distributionManager.calculateSimulatedStats(realValues);
    this.updateStatsText(this.histogramChartSvg, stats);

    this.updateStandardDeviationMarkers(
        this.histogramChartSvg.select(".markers-group"),
        x,
        stats,
        width,
        height,
        this.colors.textColor,
        {
            meanLineColor: this.colors.meanLineColor,
            stdDevLineColor: this.colors.stdDevLineColor
        },
        this.app.config.distribution
    );
}
    
    updateStandardDeviationMarkers(markerGroup, xScale, stats, width, height, textColor, options, distribution) {
      if (!markerGroup || !stats) return;
      
      markerGroup.selectAll("*").remove();
      
      const {
        meanLineColor = 'red',
        stdDevLineColor = 'blue',
      } = options;
      
      const positiveOnlyDistributions = ['exponential', 'gamma', 'poisson'];
      
      markerGroup.append('line')
        .attr('x1', xScale(stats.mean))
        .attr('x2', xScale(stats.mean))
        .attr('y1', 0)
        .attr('y2', height)
        .attr('stroke', meanLineColor)
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5,5');
      
      markerGroup.append('text')
        .attr('x', xScale(stats.mean))
        .attr('y', height + 40)
        .attr('fill', textColor)
        .style('font-size', '12px')
        .text(`μ`);
      
      const stdDevPositions = [1, 2, 3];
      
      stdDevPositions.forEach(multiplier => {
        markerGroup.append('line')
          .attr('x1', xScale(stats.mean + multiplier * stats.stdDev))
          .attr('x2', xScale(stats.mean + multiplier * stats.stdDev))
          .attr('y1', 0)
          .attr('y2', height)
          .attr('stroke', stdDevLineColor)
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '3,3');
        
        markerGroup.append('text')
          .attr('x', xScale(stats.mean + multiplier * stats.stdDev) + 5)
          .attr('y', height + 40)
          .attr('fill', textColor)
          .style('font-size', '12px')
          .text(`+${multiplier}σ`);
        
        if (!positiveOnlyDistributions.includes(distribution)) {
          markerGroup.append('line')
            .attr('x1', xScale(stats.mean - multiplier * stats.stdDev))
            .attr('x2', xScale(stats.mean - multiplier * stats.stdDev))
            .attr('y1', 0)
            .attr('y2', height)
            .attr('stroke', stdDevLineColor)
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '3,3');
          
          markerGroup.append('text')
            .attr('x', xScale(stats.mean - multiplier * stats.stdDev) - 25)
            .attr('y', height + 40)
            .attr('fill', textColor)
            .style('font-size', '12px')
            .text(`-${multiplier}σ`);
        } else {
          const negStdDev = stats.mean - multiplier * stats.stdDev;
          if (negStdDev > 0) {
            markerGroup.append('line')
              .attr('x1', xScale(negStdDev))
              .attr('x2', xScale(negStdDev))
              .attr('y1', 0)
              .attr('y2', height)
              .attr('stroke', stdDevLineColor)
              .attr('stroke-width', 1)
              .attr('stroke-dasharray', '3,3');
            
            markerGroup.append('text')
              .attr('x', xScale(negStdDev) - 25)
              .attr('y', height + 40)
              .attr('fill', textColor)
              .style('font-size', '12px')
              .text(`-${multiplier}σ`);
          }
        }
      });
    }

    getDistributionValueForLane(i, numBins, distribution) {
        return this.app.distributionManager.getDistributionValueForLane(i, numBins, distribution);
    }

    getLaneValue(laneIndex, numLanes, distribution) {
        return this.app.distributionManager.getLaneValue(laneIndex, numLanes, distribution);
    }
}