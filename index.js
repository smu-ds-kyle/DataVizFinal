document.addEventListener('DOMContentLoaded', function() {

    var welcomeModal = new bootstrap.Modal(document.getElementById('welcomeModal'));
        welcomeModal.show();

    

    const canvas = document.getElementById('simulation-canvas');
    const ctx = canvas.getContext('2d');
    
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const resetBtn = document.getElementById('resetBtn');
    const distributionSelect = document.getElementById('distributionSelect');
    
    const distributionParams = document.querySelectorAll('.distribution-params');
    
    const numLanes = document.getElementById('numLanes');
    const numLanesValue = document.getElementById('numLanesValue');
    const ballSpeed = document.getElementById('ballSpeed');
    const ballSpeedValue = document.getElementById('ballSpeedValue');
    const genRate = document.getElementById('genRate');
    const genRateValue = document.getElementById('genRateValue');
    const ballLifetime = document.getElementById('ballLifetime');
    const ballLifetimeValue = document.getElementById('ballLifetimeValue');
    const ballSize = document.getElementById('ballSize');
    const ballSizeValue = document.getElementById('ballSizeValue');
    
    const totalBallsEl = document.getElementById('totalBalls');
    const activeBallsEl = document.getElementById('activeBalls');
    

    const uniformMin = document.getElementById('uniformMin');
    const uniformMinValue = document.getElementById('uniformMinValue');
    const uniformMax = document.getElementById('uniformMax');
    const uniformMaxValue = document.getElementById('uniformMaxValue');
    
    
    const normalMean = document.getElementById('normalMean');
    const normalMeanValue = document.getElementById('normalMeanValue');
    const normalStdDev = document.getElementById('normalStdDev');
    const normalStdDevValue = document.getElementById('normalStdDevValue');


    const poissonLambda = document.getElementById('poissonLambda');
    const poissonLambdaValue = document.getElementById('poissonLambdaValue');
    
    const gammaAlpha = document.getElementById('gammaAlpha');
    const gammaAlphaValue = document.getElementById('gammaAlphaValue');
    const gammaBeta = document.getElementById('gammaBeta');
    const gammaBetaValue = document.getElementById('gammaBetaValue');
    
    const binomialN = document.getElementById('binomialN');
    const binomialNValue = document.getElementById('binomialNValue');
    const binomialP = document.getElementById('binomialP');
    const binomialPValue = document.getElementById('binomialPValue');
    
    const exponentialRate = document.getElementById('exponentialRate');
    const exponentialRateValue = document.getElementById('exponentialRateValue');

    const studentTMean = document.getElementById('studentTMean');
const studentTMeanValue = document.getElementById('studentTMeanValue');
const studentTStdDev = document.getElementById('studentTStdDev');
const studentTStdDevValue = document.getElementById('studentTStdDevValue');
const studentTDof = document.getElementById('studentTDof');
const studentTDofValue = document.getElementById('studentTDofValue');

    let randomNormal = d3.randomNormal(0, 1);
    let randomGamma = d3.randomGamma(2, 2);
    let randomBinomial = d3.randomBinomial(10, 0.5);
    let randomExponential = d3.randomExponential(1);
    let randomPoisson = d3.randomPoisson(5);
    let randomUniform = d3.randomUniform(0, 1);
    let randomStudentT;
    const pdfChartContainer = document.getElementById('pdfChart');
    const distributionChartContainer = document.getElementById('distributionChart');
    const histogramChartContainer = document.getElementById('histogramChart');

    let lastFrameTime = Date.now();

const themeToggleBtn = document.getElementById('themeToggleBtn');
let isDarkMode = true;



themeToggleBtn.addEventListener('click', function() {
    if (isDarkMode) {
        disableDarkMode();
    } else {
        enableDarkMode();
    }
});

function enableDarkMode() {
    document.body.classList.add('dark-mode');
    themeToggleBtn.innerHTML = '<i class="theme-icon">🌙</i><span class="ms-2">Dark Mode</span>';
    isDarkMode = true;
    localStorage.setItem('darkMode', 'true');
    
    updatePDFChart();
    updateDistributionChart();
    if (totalBallsCreated > 0) {
        updateHistogramChart();
    }
    
    drawLanes();
    drawBalls();
}

function disableDarkMode() {
    document.body.classList.remove('dark-mode');
    themeToggleBtn.innerHTML = '<i class="theme-icon">☀️</i><span class="ms-2">Light Mode</span>';
    isDarkMode = false;
    localStorage.setItem('darkMode', 'false');
    
    updatePDFChart();
    updateDistributionChart();
    if (totalBallsCreated > 0) {
        updateHistogramChart();
    }
    
    drawLanes();
    drawBalls();
}



    
    let isRunning = false;
    let animationId = null;
    let balls = [];
    let totalBallsCreated = 0;
    let lastBallTime = 0;
    let laneHistogram = [];
    let laneHistogramRealValues = [];
    
    let config = {
        numLanes: parseInt(numLanes.value),
        ballSpeed: parseInt(ballSpeed.value),
        genRate: parseFloat(genRate.value),
        ballLifetime: parseInt(ballLifetime.value) * 1000,
        ballSize: parseInt(ballSize.value),
        distribution: distributionSelect.value,
        
        uniform: {
            min: parseFloat(uniformMin?.value || 0),
            max: parseFloat(uniformMax?.value || 1),
            mean: .5
        },
        normal: {
            mean: parseFloat(normalMean?.value || 0),
            stdDev: parseFloat(normalStdDev?.value || 1)
        },
        poisson: {
            lambda: parseFloat(poissonLambda?.value || 5)
        },
        gamma: {
            alpha: parseFloat(gammaAlpha?.value || 2),
            beta: parseFloat(gammaBeta?.value || 2)
        },
        binomial: {
            n: parseInt(binomialN?.value || 10),
            p: parseFloat(binomialP?.value || 0.5)
        },
        exponential: {
            rate: parseFloat(exponentialRate?.value || 1)
        },
        student_t: {
            dof: parseInt(studentTDof?.value || 5)
        }
    };
    
    let lanes = [];
    
    function updateLanes() {
        const laneWidth = canvas.width / config.numLanes;
        lanes = [];
        laneHistogram = Array(config.numLanes).fill(0);
        
        for (let i = 0; i < config.numLanes; i++) {
            lanes.push({
                x: i * laneWidth + laneWidth / 2,
                width: laneWidth
            });
        }
        
        updatePDFChart();
        updateDistributionChart();
    }
    
    function showDistributionParams(distribution) {
        distributionParams.forEach(param => {
            param.style.display = 'none';
        });
        
        const selectedParams = document.getElementById(`${distribution}-params`);
        if (selectedParams) {
            selectedParams.style.display = 'block';
        }
    }
    
    function updateDistributionGenerators() {
        randomNormal = d3.randomNormal(config.normal.mean, config.normal.stdDev);
        randomGamma = d3.randomGamma(config.gamma.alpha, config.gamma.beta);
        randomBinomial = d3.randomBinomial(config.binomial.n, config.binomial.p);
        randomExponential = d3.randomExponential(config.exponential.rate);
        randomPoisson = d3.randomPoisson(config.poisson.lambda);
        const { min, max } = getUniformMinMax();
        randomUniform = d3.randomUniform(min, max);
    }
    
    

    function getUniformMinMax() {
    return {
        min: config.uniform.min,
        max: config.uniform.max
    };
}

    function getUniformValue(i, numBins) {
        const { min, max } = getUniformMinMax();
        
        if (numBins <= 1) return 1;
        return 1 / numBins;
    }
    
    function getNormalValue(i, numBins) {
        const mean = config.normal.mean;
        const stdDev = config.normal.stdDev;
        
        const meanLane = (numBins - 1) / 2;
        const x = mean + ((i - meanLane) / (numBins / 6)) * stdDev;
        
        return jStat.normal.pdf(x, mean, stdDev);
    }
    
    function getPoissonValue(i, numBins) {
        const lambda = config.poisson.lambda;
        
        const k = Math.floor(i * (lambda * 3 / numBins));
        if (k < 0) return 0;
        
        return jStat.poisson.pdf(k, lambda);
    }

   
    
    function getGammaValue(i, numBins) {
    const alpha = config.gamma.alpha;
    const beta = config.gamma.beta;
    
    const x = i * (alpha * beta * 3 / numBins);
    
    if (x <= 0) return 0;
    
    return jStat.gamma.pdf(x, alpha, beta);
}

function getBinomialValue(i, numBins) {
    const n = config.binomial.n;
    const p = config.binomial.p;
    
    const k = Math.floor(i * (n / numBins));
    
    if (k < 0 || k > n) return 0;
    
    return jStat.binomial.pdf(k, n, p);
}

function getExponentialValue(i, numBins) {
    const rate = config.exponential.rate;
    
    const x = i * (5 / rate / numBins);
    
    return jStat.exponential.pdf(x, rate);
}
    
    function updatePDFChart() {
        pdfChartContainer.innerHTML = '';
        
        const margin = {top: 20, right: 30, bottom: 40, left: 50};
        const width = pdfChartContainer.clientWidth - margin.left - margin.right;
        const height = pdfChartContainer.clientHeight - margin.top - margin.bottom;
        
        const svg = d3.select('#pdfChart')
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
        
    
        
        const rangeInfo = getDistributionRange(config.distribution, config);
        
        const numPoints = 200;
        
        const step = (rangeInfo.max - rangeInfo.min) / numPoints;
        const data = [];
        
        for (let i = 0; i <= numPoints; i++) {
            const x = rangeInfo.min + i * step;
            let y;
            
            switch(config.distribution) {
                case 'normal':
                    y = jStat.normal.pdf(x, config.normal.mean, config.normal.stdDev);
                    break;
                case 'gamma':
                    if (x <= 0) {
                        y = 0;
                    } else {
                        y = jStat.gamma.pdf(x, config.gamma.alpha, config.gamma.beta);
                    }
                    break;
                case 'poisson':
                    const k = Math.round(x);
                    if (k < 0) {
                        y = 0;
                    } else {
                        y = jStat.poisson.pdf(k, config.poisson.lambda);
                    }
                    break;
                case 'binomial':
                    const k_bin = Math.round(x);
                    if (k_bin < 0 || k_bin > config.binomial.n) {
                        y = 0;
                    } else {
                        y = jStat.binomial.pdf(k_bin, config.binomial.n, config.binomial.p);
                    }
                    break;
                case 'exponential':
                    y = x >= 0 ? jStat.exponential.pdf(x, config.exponential.rate) : 0;
                    break;
                case 'student-t':
                    y = jStat.studentt.pdf(x, config.student_t.dof);
                    break;
                case 'uniform':
                    y = jStat.uniform.pdf(x, rangeInfo.min, rangeInfo.max);
                    break;
            }
            
            data.push({x: x, y: y});
        }
        
        const displayData = data.filter(point => 
            point.x >= rangeInfo.displayMin && 
            point.x <= rangeInfo.displayMax
        );
        
        const x = d3.scaleLinear()
            .domain([rangeInfo.min, rangeInfo.max])
            .range([0, width]);
        
        const y = d3.scaleLinear()
            .domain([0, d3.max(displayData, d => d.y) * 1.1])
            .nice()
            .range([height, 0]);
        
        const backgroundColor = isDarkMode ? "#1e1e1e" : "#f8f9fa";
        const axisColor = isDarkMode ? "#b0b0b0" : "#333";
        const gridColor = isDarkMode ? "#333" : "#e0e0e0";
        const lineColor = isDarkMode ? "#36a2eb" : "steelblue";
        const areaColor = isDarkMode ? "rgba(54, 162, 235, 0.2)" : "rgba(70, 130, 180, 0.3)";
        const textColor = isDarkMode ? "#e0e0e0" : "#333";
        
        svg.append("rect")
            .attr("width", width)
            .attr("height", height)
            .attr("fill", backgroundColor)
            .attr("rx", 4);
        
        svg.append("g")
            .attr("class", "grid")
            .attr("stroke", gridColor)
            .attr("stroke-opacity", 0.1)
            .call(d3.axisLeft(y).ticks(5).tickSize(-width).tickFormat(""));
        
        svg.append("g")
            .attr("class", "grid")
            .attr("stroke", gridColor)
            .attr("stroke-opacity", 0.1)
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x).tickSize(-height).tickFormat(""));
        
        const line = d3.line()
            .x(d => x(d.x))
            .y(d => y(d.y))
            .curve(d3.curveBasis);
        
        const area = d3.area()
            .x(d => x(d.x))
            .y0(height)
            .y1(d => y(d.y))
            .curve(d3.curveBasis);
        
        svg.append("path")
            .datum(displayData)
            .attr("fill", areaColor)
            .attr("d", area);
        
        svg.append("path")
            .datum(displayData)
            .attr("fill", "none")
            .attr("stroke", lineColor)
            .attr("stroke-width", 2)
            .attr("d", line);
        
        const xAxis = svg.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x).ticks(5));
        
        const yAxis = svg.append('g')
            .call(d3.axisLeft(y).ticks(5));
        
        svg.selectAll(".domain, .tick line")
            .attr("stroke", axisColor);
        
        svg.selectAll(".tick text")
            .attr("fill", textColor);
        
        svg.append("text")
            .attr("text-anchor", "middle")
            .attr("x", width / 2)
            .attr("y", height + margin.bottom - 10)
            .style("font-size", "12px")
            .attr("fill", textColor)
        
        svg.append("text")
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .attr("y", -margin.left + 15)
            .attr("x", -height / 2)
            .style("font-size", "12px")
            .attr("fill", textColor)
            .text("Probability Density");
        
        const stats = calculateDistributionStats(config.distribution, config);
svg.append('text')
    .attr('x', width / 2)
    .attr('y', -10)
    .attr('text-anchor', 'middle')
    .style('font-size', '14px')
    .attr("fill", textColor)
    .text(`μ = ${stats.mean.toFixed(2)}, σ = ${stats.stdDev.toFixed(2)}`);


    addStandardDeviationMarkers(
        svg, 
        x, 
        stats, 
        width, 
        height, 
        textColor, 
        {
            meanLineColor: isDarkMode ? "#ff5555" : "red",
            stdDevLineColor: isDarkMode ? "#6666ff" : "blue"
        },
        config.distribution
    );

    }

    function getStudentTValue(i, numBins) {
        const dof = config.student_t.dof;
        
        const meanLane = (numBins - 1) / 2;
        const x = ((i - meanLane) / (numBins / 6));
        
        return jStat.studentt.pdf(x, dof);
    }


    function getLaneValue(laneIndex, numLanes, distribution) {
        switch(distribution) {
            case 'uniform': {
                const { min, max } = getUniformMinMax();
                return min + (laneIndex / (numLanes - 1)) * (max - min);
            }
            case 'normal': {
                const mean = config.normal.mean;
                const stdDev = config.normal.stdDev;
                return mean + ((laneIndex / (numLanes - 1)) * 8 - 4) * stdDev;
            }
            case 'exponential': {
                const rate = config.exponential.rate;
                const mean = 1 / rate;
                return (laneIndex / (numLanes - 1)) * (5 * mean);
            }
            case 'poisson': {
                const lambda = config.poisson.lambda;
                return (laneIndex / (numLanes - 1)) * (3 * lambda);
            }
            case 'gamma': {
                const alpha = config.gamma.alpha;
                const beta = config.gamma.beta;
                const mean = alpha * beta;
                return (laneIndex / (numLanes - 1)) * (3 * mean);
            }
            case 'binomial': {
                const n = config.binomial.n;
                return (laneIndex / (numLanes - 1)) * n;
            }
            case 'student-t': {
                const range = config.student_t.dof < 5 ? 10 : 6;
                return ((laneIndex / (numLanes - 1)) * range - range/2);
            }
            default:
                return laneIndex;
        }
    }
    
    function updateDistributionChart() {
        distributionChartContainer.innerHTML = '';
        
        const margin = {top: 20, right: 30, bottom: 40, left: 50};
        const width = distributionChartContainer.clientWidth - margin.left - margin.right;
        const height = distributionChartContainer.clientHeight - margin.top - margin.bottom;
        
        const svg = d3.select('#distributionChart')
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
        
        const rangeInfo = getDistributionRange(config.distribution, config);
        
        const data = [];
        for (let i = 0; i < config.numLanes; i++) {
            const actualValue = getLaneValue(i, config.numLanes, config.distribution);
            
            if (actualValue >= rangeInfo.displayMin && actualValue <= rangeInfo.displayMax) {
                let value;
                switch(config.distribution) {
                    case 'normal':
                        value = getNormalValue(i, config.numLanes);
                        break;
                    case 'poisson':
                        value = getPoissonValue(i, config.numLanes);
                        break;
                    case 'gamma':
                        value = getGammaValue(i, config.numLanes);
                        break;
                    case 'binomial':
                        value = getBinomialValue(i, config.numLanes);
                        break;
                    case 'exponential':
                        value = getExponentialValue(i, config.numLanes);
                        break;
                    case 'student-t':
                        value = getStudentTValue(i, config.numLanes);
                        break;
                    case 'uniform':
                    default:
                        value = getUniformValue(i, config.numLanes);
                }
                
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
        
        const xBin = d3.scaleBand()
            .domain(data.map(d => d.bin))
            .range([0, width])
            .padding(0.1);

        const x = d3.scaleLinear()
        .domain([rangeInfo.min, rangeInfo.max])
        .range([0, width]);
        
        const y = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.value) || 0.01])
            .nice()
            .range([height, 0]);
        
        const backgroundColor = isDarkMode ? "#1e1e1e" : "#f8f9fa";
        const axisColor = isDarkMode ? "#b0b0b0" : "#333";
        const gridColor = isDarkMode ? "#333" : "#e0e0e0";
        const textColor = isDarkMode ? "#e0e0e0" : "#333";
        const percentileLineColor = isDarkMode ? "#999" : "#999";
        const medianLineColor = isDarkMode ? "#ff5555" : "red";
    
        const barColorScheme = isDarkMode ? 
            d => d3.interpolateInferno(0.3 + d.value / d3.max(data, d => d.value || 0.001) * 0.5) :
            d => d3.interpolateBlues(0.3 + d.value / d3.max(data, d => d.value || 0.001) * 0.7);
        
        svg.append("rect")
            .attr("width", width)
            .attr("height", height)
            .attr("fill", backgroundColor)
            .attr("rx", 4);
        
        svg.append("g")
            .attr("class", "grid")
            .attr("stroke", gridColor)
            .attr("stroke-opacity", 0.1)
            .call(d3.axisLeft(y).ticks(5).tickSize(-width).tickFormat(""));
        
        svg.selectAll('.bar')
            .data(data)
            .enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('x', d => xBin(d.bin))
            .attr('y', d => {
                const pos = y(d.value || 0);
                return isNaN(pos) ? height : pos;
            })
            .attr('width', xBin.bandwidth())
            .attr('height', d => {
                const h = height - y(d.value || 0);
                return isNaN(h) || h < 0 ? 0 : h;
            })
            .attr('fill', d => {
                if (isNaN(d.value) || d.value <= 0) return isDarkMode ? "#444" : "#ddd";
                return barColorScheme(d);
            });
        
        const percentilePositions = [0, 0.25, 0.5, 0.75, 1];
        const selectedBins = percentilePositions.map(p => Math.floor(p * (data.length - 1)));
        
        const xAxis = d3.axisBottom(xBin)
            .tickValues(selectedBins.map(b => data[b].bin))
            .tickFormat(idx => {
                const binData = data.find(d => d.bin === idx);
                return binData ? binData.actualValue.toFixed(1) : '';
            });
        
        const xAxisGroup = svg.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${height})`)
            .call(xAxis);
        
     
        const yAxis = svg.append('g')
            .call(d3.axisLeft(y).ticks(5, '.0%'));
        
        svg.selectAll(".domain, .tick line")
            .attr("stroke", axisColor);
        
        svg.selectAll(".tick text")
            .attr("fill", textColor);
        
        svg.append("text")
            .attr("text-anchor", "middle")
            .attr("x", width / 2)
            .attr("y", height + margin.bottom - 5)
            .style("font-size", "12px")
            .attr("fill", textColor)
        
        svg.append("text")
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .attr("y", -margin.left + 15)
            .attr("x", -height / 2)
            .style("font-size", "12px")
            .attr("fill", textColor)
            .text("Probability");
        
        const stats = calculateDistributionStats(config.distribution, config);
svg.append('text')
    .attr('x', width / 2)
    .attr('y', -10)
    .attr('text-anchor', 'middle')
    .style('font-size', '14px')
    .attr("fill", textColor)
    .text(`μ = ${stats.mean.toFixed(2)}, σ = ${stats.stdDev.toFixed(2)}`);

    addStandardDeviationMarkers(
        svg, 
        x, 
        stats, 
        width, 
        height, 
        textColor, 
        {
            meanLineColor: isDarkMode ? "#ff5555" : "red",
            stdDevLineColor: isDarkMode ? "#6666ff" : "blue"
        },
        config.distribution
    );

    }
    
  
    function updateHistogramChart() {
        if (totalBallsCreated === 0) return;
        
        histogramChartContainer.innerHTML = '';
        
        const margin = {top: 20, right: 30, bottom: 40, left: 50};
        const width = histogramChartContainer.clientWidth - margin.left - margin.right;
        const height = histogramChartContainer.clientHeight - margin.top - margin.bottom;
        
        const svg = d3.select('#histogramChart')
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
        
        const rangeInfo = getDistributionRange(config.distribution, config);
        
        const data = laneHistogram.map((count, i) => ({
            bin: i,
            count: count,
            frequency: count / totalBallsCreated,
            actualValue: getLaneValue(i, config.numLanes, config.distribution)
        })).filter(d => 
            d.actualValue >= rangeInfo.displayMin && 
            d.actualValue <= rangeInfo.displayMax
        );
        
        const xBin = d3.scaleBand()
            .domain(data.map(d => d.bin))
            .range([0, width])
            .padding(0.1);
        
        const x = d3.scaleLinear()
        .domain([rangeInfo.min, rangeInfo.max])
        .range([0, width]);
        
        const y = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.frequency) || 0.01])
            .nice()
            .range([height, 0]);
        
        const backgroundColor = isDarkMode ? "#1e1e1e" : "#f8f9fa";
        const axisColor = isDarkMode ? "#b0b0b0" : "#333";
        const gridColor = isDarkMode ? "#333" : "#e0e0e0";
        const textColor = isDarkMode ? "#e0e0e0" : "#333";
       
        
        svg.append("rect")
            .attr("width", width)
            .attr("height", height)
            .attr("fill", backgroundColor)
            .attr("rx", 4);
        
        svg.append("g")
            .attr("class", "grid")
            .attr("stroke", gridColor)
            .attr("stroke-opacity", 0.1)
            .call(d3.axisLeft(y).ticks(5).tickSize(-width).tickFormat(""));
        
        svg.selectAll('.bar')
            .data(data)
            .enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('x', d => xBin(d.bin))
            .attr('y', d => {
                const pos = y(d.frequency || 0);
                return isNaN(pos) ? height : pos;
            })
            .attr('width', xBin.bandwidth())
            .attr('height', d => {
                const h = height - y(d.frequency || 0);
                return isNaN(h) || h < 0 ? 0 : h;
            })
            .attr('fill', d => {
                if (isNaN(d.frequency) || d.frequency <= 0) return isDarkMode ? "#444" : "#ddd";
                const maxVal = d3.max(data, d => d.frequency) || 0.01;
                const intensity = 0.3 + d.frequency / maxVal * 0.7;
                return d3.interpolateOranges(intensity);
            });
        
        const percentilePositions = [0, 0.25, 0.5, 0.75, 1];
        const selectedBins = percentilePositions.map(p => Math.floor(p * (data.length - 1)));
        
        const xAxis = d3.axisBottom(xBin)
            .tickValues(selectedBins.map(b => data[b].bin))
            .tickFormat(idx => {
                const binData = data.find(d => d.bin === idx);
                return binData ? binData.actualValue.toFixed(1) : '';
            });
        
        const xAxisGroup = svg.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${height})`)
            .call(xAxis);
        
        
        svg.selectAll(".domain, .tick line")
            .attr("stroke", axisColor);
        
        svg.selectAll(".tick text")
            .attr("fill", textColor);
        
        const yAxis = svg.append('g')
            .call(d3.axisLeft(y).ticks(5, '.0%'));
        
        svg.append("text")
            .attr("text-anchor", "middle")
            .attr("x", width / 2)
            .attr("y", height + margin.bottom - 5)
            .style("font-size", "12px")
            .attr("fill", textColor)
        
        svg.append("text")
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .attr("y", -margin.left + 15)
            .attr("x", -height / 2)
            .style("font-size", "12px")
            .attr("fill", textColor)
            .text("Frequency");
        
        const stats = calculateSimulatedStats(laneHistogramRealValues);
        svg.append('text')
            .attr('x', width / 2)
            .attr('y', -10)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .attr("fill", textColor)
            .text(`μ = ${stats.mean.toFixed(2)}, σ = ${stats.stdDev.toFixed(2)}`);

            addStandardDeviationMarkers(
                svg, 
                x, 
                stats, 
                width, 
                height, 
                textColor, 
                {
                    meanLineColor: isDarkMode ? "#ff5555" : "red",
                    stdDevLineColor: isDarkMode ? "#6666ff" : "blue"
                },
                config.distribution
            );
    }
    
    updateLanes();

    function addStandardDeviationMarkers(svg, xScale, stats, width, height, textColor, options = {}, distribution) {
        const {
            meanLineColor = 'red',
            stdDevLineColor = 'blue',
        } = options;
    
        const positiveOnlyDistributions = ['exponential', 'gamma', 'poisson'];
    
        svg.append('line')
            .attr('x1', xScale(stats.mean))
            .attr('x2', xScale(stats.mean))
            .attr('y1', 0)
            .attr('y2', height)
            .attr('stroke', meanLineColor)
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '5,5');

        svg.append('text')
            .attr('x', xScale(stats.mean))
            .attr('y', height + 40)
            .attr('fill', textColor)
            .style('font-size', '12px')
            .text(`μ`);
    
        const stdDevPositions = [1, 2, 3];
        
        stdDevPositions.forEach(multiplier => {
            svg.append('line')
                .attr('x1', xScale(stats.mean + multiplier * stats.stdDev))
                .attr('x2', xScale(stats.mean + multiplier * stats.stdDev))
                .attr('y1', 0)
                .attr('y2', height)
                .attr('stroke', stdDevLineColor)
                .attr('stroke-width', 1)
                .attr('stroke-dasharray', '3,3');
            
            if (!positiveOnlyDistributions.includes(distribution)) {
                svg.append('line')
                    .attr('x1', xScale(stats.mean - multiplier * stats.stdDev))
                    .attr('x2', xScale(stats.mean - multiplier * stats.stdDev))
                    .attr('y1', 0)
                    .attr('y2', height)
                    .attr('stroke', stdDevLineColor)
                    .attr('stroke-width', 1)
                    .attr('stroke-dasharray', '3,3');
            } else {
                const negStdDev = stats.mean - multiplier * stats.stdDev;
                if (negStdDev > 0) {
                    svg.append('line')
                        .attr('x1', xScale(negStdDev))
                        .attr('x2', xScale(negStdDev))
                        .attr('y1', 0)
                        .attr('y2', height)
                        .attr('stroke', stdDevLineColor)
                        .attr('stroke-width', 1)
                        .attr('stroke-dasharray', '3,3');
                }
            }
            
            svg.append('text')
                .attr('x', xScale(stats.mean + multiplier * stats.stdDev) + 5)
                .attr('y', height + 40)
                .attr('fill', textColor)
                .style('font-size', '12px')
                .text(`+${multiplier}σ`);
            
            if (!positiveOnlyDistributions.includes(distribution)) {
                svg.append('text')
                    .attr('x', xScale(stats.mean - multiplier * stats.stdDev) - 25)
                    .attr('y', height + 40)
                    .attr('fill', textColor)
                    .style('font-size', '12px')
                    .text(`-${multiplier}σ`);
            } else {
                const negStdDev = stats.mean - multiplier * stats.stdDev;
                if (negStdDev > 0) {
                    svg.append('text')
                        .attr('x', xScale(negStdDev) - 25)
                        .attr('y', height + 40)
                        .attr('fill', textColor)
                        .style('font-size', '12px')
                        .text(`-${multiplier}σ`);
                }
            }
        });
    }
    
    function getUniformLane() {
        
        const uniformValue = randomUniform();
        
        laneHistogramRealValues.push(uniformValue);
        
        const scaledLane = Math.floor(
            ((uniformValue - config.uniform.min) / (config.uniform.max - config.uniform.min)) * (config.numLanes - 1)
        );
        
        return Math.max(0, Math.min(config.numLanes - 1, scaledLane));
    }
    
    function getNormalLane() {
        const normalValue = randomNormal();
        const meanLane = (config.numLanes - 1) / 2;
        
        const normalizedValue = (normalValue - config.normal.mean) / config.normal.stdDev;
        const scaledLane = normalizedValue * (config.numLanes / 6) + meanLane;

        if (scaledLane < 0 || scaledLane >= config.numLanes) {
            return getNormalLane();
        }
        
        const floorLane = Math.floor(scaledLane);
        const ceilLane = Math.ceil(scaledLane);
        const fraction = scaledLane - floorLane;
        
        const selectedLane = Math.random() < fraction ? ceilLane : floorLane;
        
        laneHistogramRealValues.push(normalValue)
        return Math.max(0, Math.min(config.numLanes - 1, selectedLane));
    }

function getPoissonLane() {
    const k = randomPoisson();
    
    const maxExpectedValue = config.poisson.lambda * 3;
    const scaledLane = Math.floor((k / maxExpectedValue) * (config.numLanes - 1));
    
    laneHistogramRealValues.push(k)
    return Math.max(0, Math.min(config.numLanes - 1, scaledLane));
}
    
function getGammaLane() {
    const alpha = config.gamma.alpha;
    const beta = config.gamma.beta;
    
    const mean = alpha * beta;
    const stdDev = Math.sqrt(alpha * beta * beta);
    
    const maxWithinRange = mean + 3 * stdDev;
    
    let gammaValue;
    do {
        gammaValue = randomGamma();
    } while (gammaValue > maxWithinRange);
    
    const scaledLane = Math.floor((gammaValue / maxWithinRange) * (config.numLanes - 1));
    
    laneHistogramRealValues.push(gammaValue)
    return Math.max(0, Math.min(config.numLanes - 1, scaledLane));
}
    
function getBinomialLane() {
    const n = config.binomial.n;
    const p = config.binomial.p;
    
    const mean = n * p;
    const stdDev = Math.sqrt(n * p * (1 - p));
    
    const maxWithinRange = Math.min(n, mean + 3 * stdDev);
    
    let binomialValue;
    do {
        binomialValue = randomBinomial();
    } while (binomialValue > maxWithinRange);
    
    const scaledLane = Math.floor((binomialValue / n) * (config.numLanes - 1));
    
    laneHistogramRealValues.push(binomialValue)
    return Math.max(0, Math.min(config.numLanes - 1, scaledLane));
}
    
function getExponentialLane() {
    const rate = config.exponential.rate;
    
    const mean = 1 / rate;
    const stdDev = mean;
    
    const maxWithinRange = mean + 3 * stdDev;
    
    let exponentialValue;
    do {
        exponentialValue = randomExponential();
    } while (exponentialValue > maxWithinRange);
    
    const scaledLane = Math.floor((exponentialValue / maxWithinRange) * (config.numLanes - 1));
    
    laneHistogramRealValues.push(exponentialValue)
    return Math.max(0, Math.min(config.numLanes - 1, scaledLane));
}
    
    function getNextLane() {
        switch(config.distribution) {
            case 'normal':
                return getNormalLane();
            case 'poisson':
                return getPoissonLane();
            case 'gamma':
                return getGammaLane();
            case 'binomial':
                return getBinomialLane();
            case 'student-t':
                return getStudentTLane();
            case 'exponential':
                return getExponentialLane();
            case 'uniform':
            default:
                return getUniformLane();
        }
    }

    function getStudentTLane() {
        const dof = config.student_t.dof;
        
        
        const normalValue = jStat.normal.sample(0, 1);
        
        const chiSquaredValue = jStat.chisquare.sample(dof);
        
        const tValue = normalValue / Math.sqrt(chiSquaredValue / dof);
        
        laneHistogramRealValues.push(tValue);
        
        const meanLane = (config.numLanes - 1) / 2;
        
        const scaleFactor = dof < 5 ? config.numLanes / 10 : config.numLanes / 6;
        const scaledLane = tValue * scaleFactor + meanLane;
        
        if (scaledLane < 0 || scaledLane >= config.numLanes) {
            return getStudentTLane();
        }
        
        const floorLane = Math.floor(scaledLane);
        const ceilLane = Math.ceil(scaledLane);
        const fraction = scaledLane - floorLane;
        
        const selectedLane = Math.random() < fraction ? ceilLane : floorLane;
        
        return Math.max(0, Math.min(config.numLanes - 1, selectedLane));
    }
    
    function getNextLane() {
        switch(config.distribution) {
            case 'normal':
                return getNormalLane();
            case 'poisson':
                return getPoissonLane();
            case 'gamma':
                return getGammaLane();
            case 'binomial':
                return getBinomialLane();
            case 'student-t':
                return getStudentTLane();
            case 'exponential':
                return getExponentialLane();
            case 'uniform':
            default:
                return getUniformLane();
        }
    }

    function getDistributionRange(distribution, config) {
        switch(distribution) {
            case 'normal': {
                const mean = config.normal.mean;
                const stdDev = config.normal.stdDev;
                return {
                    min: mean - 4 * stdDev,
                    max: mean + 4 * stdDev,
                    displayMin: mean - 4 * stdDev,
                    displayMax: mean + 4 * stdDev
                };
            }
            case 'gamma': {
                const alpha = config.gamma.alpha;
                const beta = config.gamma.beta;
                const mean = alpha * beta;
                const stdDev = Math.sqrt(alpha * beta * beta);
                return {
                    min: 0,
                    max: mean + 4 * stdDev,
                    displayMin: 0,
                    displayMax: mean + 3 * stdDev
                };
            }
            case 'binomial': {
                const n = config.binomial.n;
                const p = config.binomial.p;
                const mean = n * p;
                const stdDev = Math.sqrt(n * p * (1 - p));
                return {
                    min: Math.max(0, mean - 4 * stdDev),
                    max: Math.min(n, mean + 4 * stdDev),
                    displayMin: Math.max(0, mean - 3 * stdDev),
                    displayMax: Math.min(n, mean + 3 * stdDev)
                };
            }
            case 'exponential': {
                const rate = config.exponential.rate;
                const mean = 1 / rate;
                const stdDev = mean;
                return {
                    min: 0,
                    max: mean + 4 * stdDev,
                    displayMin: 0,
                    displayMax: mean + 3 * stdDev
                };
            }
            case 'poisson': {
                const lambda = config.poisson.lambda;
                const mean = lambda;
                const stdDev = Math.sqrt(lambda);
                return {
                    min: Math.max(0, mean - 4 * stdDev),
                    max: mean + 4 * stdDev,
                    displayMin: Math.max(0, mean - 3 * stdDev),
                    displayMax: mean + 3 * stdDev
                };
            }
            case 'uniform': {
                const { min, max } = getUniformMinMax();
                const mean = (min + max) / 2;
                const stdDev = Math.sqrt(Math.pow(max - min, 2) / 12);
                return {
                    min: mean - 4 * stdDev,
                    max: mean + 4 * stdDev,
                    displayMin: mean - 4 * stdDev,
                    displayMax: mean + 4 * stdDev
                };
            }
            case 'student-t': {
                const dof = config.student_t.dof;
                
                const range = dof < 5 ? 10 : 6;
                
                return {
                    min: -range/2,
                    max: range/2,
                    displayMin: -range/2,
                    displayMax: range/2
                };
            }
            default:
                return { min: 0, max: 1, displayMin: 0, displayMax: 1 };
        }
    }
    
    function createBall() {
        const laneIndex = getNextLane();
        const lane = lanes[laneIndex];
        
        const ball = {
            x: lane.x,
            y: canvas.height - config.ballSize,
            color: d3.interpolateRainbow(laneIndex / config.numLanes),
            laneIndex: laneIndex,
            createdAt: Date.now()
        };
        
        balls.push(ball);
        laneHistogram[laneIndex]++;
        totalBallsCreated++;
        
        return ball;
    }
    
    function updateBalls() {
        const now = Date.now();
        const deltaTime = (now - lastFrameTime) / 1000;
        lastFrameTime = now;
        
        const lifetime = config.ballLifetime;
        
        balls = balls.filter(ball => (now - ball.createdAt) < lifetime);
        
        balls.forEach(ball => {
            ball.y -= config.ballSpeed * deltaTime;
        });
        
        if (now - lastBallTime > (1000 / config.genRate)) {
            createBall();
            lastBallTime = now;
        }
    }
    
    function drawLanes() {
        ctx.fillStyle = isDarkMode ? "#1e1e1e" : "#f8f9fa";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.strokeStyle = isDarkMode ? "#444" : "#dee2e6";
        ctx.lineWidth = 1;
        lanes.forEach((lane, index) => {
            if (index > 0) {
                const x = lane.x - lane.width / 2;
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, canvas.height);
                ctx.stroke();
            }
        });
    }
    
    function drawBalls() {
        balls.forEach(ball => {
            ctx.fillStyle = ball.color;
            ctx.beginPath();
            ctx.arc(ball.x, ball.y, config.ballSize, 0, Math.PI * 2);
            ctx.fill();
        });
    }
    
    function updateStats() {
        totalBallsEl.textContent = totalBallsCreated;
        activeBallsEl.textContent = balls.length;
        
        if (totalBallsCreated % 10 === 0 && totalBallsCreated > 0) {
            updateHistogramChart();
        }
    }

function calculateDistributionStats(distribution, config) {
    switch(distribution) {
        case 'normal': 
            return {
                mean: config.normal.mean,
                stdDev: config.normal.stdDev
            };
        case 'uniform': {
            const { min, max } = getUniformMinMax();
            const mean = (min + max) / 2;
            const stdDev = Math.sqrt(Math.pow(max - min, 2) / 12);
            return { mean, stdDev };
        }
        case 'poisson':
            return {
                mean: config.poisson.lambda,
                stdDev: Math.sqrt(config.poisson.lambda)
            };
        case 'gamma':
            const mean = config.gamma.alpha * config.gamma.beta;
            const stdDev = Math.sqrt(config.gamma.alpha * config.gamma.beta * config.gamma.beta);
            return { mean, stdDev };
        case 'binomial':
            const binomialMean = config.binomial.n * config.binomial.p;
            const binomialStdDev = Math.sqrt(config.binomial.n * config.binomial.p * (1 - config.binomial.p));
            return { 
                mean: binomialMean,
                stdDev: binomialStdDev
            };
        case 'exponential':
            const rate = config.exponential.rate;
            const expMean = 1 / rate;
            const expStdDev = 1 / rate;
            return { 
                mean: expMean,
                stdDev: expStdDev
            };
            case 'student-t': {
                const dof = config.student_t.dof;
                
                const mean = 0;
                
                let stdDev;
                if (dof > 2) {
                    stdDev = Math.sqrt(dof / (dof - 2));
                } else {
                    stdDev = 100;
                }
                
                return { mean, stdDev };
            }
        default:
            return { mean: 0, stdDev: 1 };
    }
}

function calculateSimulatedStats(values) {
   
    if (values.length === 0) return { mean: 0, stdDev: 0 };

    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;

    const variance = values.reduce((acc, value) => {
        const diff = value - mean;
        return acc + diff * diff;
    }, 0) / values.length;

    const stdDev = Math.sqrt(variance);
    return { mean, stdDev };
}


    
    function animate() {
        updateBalls();
        drawLanes();
        drawBalls();
        updateStats();
        
        if (isRunning) {
            animationId = requestAnimationFrame(animate);
        }
    }
    
    function startSimulation() {
        if (!isRunning) {
            isRunning = true;
            lastBallTime = Date.now();
            lastFrameTime = Date.now();
            animate();
            
            updateControlsState();
        }
    }
    
    function stopSimulation() {
        isRunning = false;
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        
        updateControlsState();
    }
    
    function updateControlsState() {
        numLanes.disabled = isRunning;
        
        numLanes.style.opacity = isRunning ? 0.6 : 1;
        document.querySelector('label[for="numLanes"]').style.opacity = isRunning ? 0.6 : 1;
    }

    function resetSimulation() {
        stopSimulation();
        balls = [];
        totalBallsCreated = 0;
        laneHistogram = Array(config.numLanes).fill(0);
        laneHistogramRealValues = [];
        updateStats();
        drawLanes();
        histogramChartContainer.innerHTML = '';
    }

    function updateBallSizeConstraints() {
        const canvas = document.getElementById('simulation-canvas');
        
        const canvasWidth = canvas.width;
        
        const laneWidth = canvasWidth / config.numLanes;
        
        const newBallSize = Math.max(2, Math.floor(laneWidth) - 2) / 2;
        
        ballSize.value = newBallSize;
        ballSizeValue.textContent = newBallSize;
        
        config.ballSize = newBallSize;
    }
    
    startBtn.addEventListener('click', startSimulation);
    stopBtn.addEventListener('click', stopSimulation);
    resetBtn.addEventListener('click', resetSimulation);
    
    numLanes.addEventListener('input', function() {
        config.numLanes = parseInt(this.value);
        numLanesValue.textContent = this.value;
        
        config.uniform.width = parseFloat(this.value);
        laneHistogram = Array(config.numLanes).fill(0);
        updateBallSizeConstraints();
        updateDistributionGenerators();
        updateLanes();
        drawLanes();
    });
    
    ballSpeed.addEventListener('input', function() {
        config.ballSpeed = parseFloat(this.value);
        ballSpeedValue.textContent = this.value;
    });
    
    genRate.addEventListener('input', function() {
        config.genRate = parseFloat(this.value);
        genRateValue.textContent = this.value;
    });
    
    ballLifetime.addEventListener('input', function() {
        config.ballLifetime = parseInt(this.value) * 1000;
        ballLifetimeValue.textContent = this.value;
    });
    
    ballSize.addEventListener('input', function() {
        config.ballSize = parseInt(this.value);
        ballSizeValue.textContent = this.value;
    });
    
 

uniformMin.addEventListener('input', function() {
    config.uniform.min = parseFloat(this.value);
    uniformMinValue.textContent = this.value;
    updateDistributionGenerators();
    updatePDFChart();
    updateDistributionChart();
});

uniformMax.addEventListener('input', function() {
    config.uniform.max = parseFloat(this.value);
    uniformMaxValue.textContent = this.value;
    updateDistributionGenerators();
    updatePDFChart();
    updateDistributionChart();
});

    normalMean.addEventListener('input', function() {
        config.normal.mean = parseFloat(this.value);
        normalMeanValue.textContent = this.value;
        updateDistributionGenerators();
        updatePDFChart();
        updateDistributionChart();
    });
    
    normalStdDev.addEventListener('input', function() {
        config.normal.stdDev = parseFloat(this.value);
        normalStdDevValue.textContent = this.value;
        updateDistributionGenerators();
        updatePDFChart();
        updateDistributionChart();
    });
    
    poissonLambda.addEventListener('input', function() {
        config.poisson.lambda = 1/parseFloat(this.value);
        poissonLambdaValue.textContent = this.value;
        updateDistributionGenerators();
        updatePDFChart();
        updateDistributionChart();
    });
    
    gammaAlpha.addEventListener('input', function() {
        config.gamma.alpha = parseFloat(this.value);
        gammaAlphaValue.textContent = this.value;
        updateDistributionGenerators();
        updatePDFChart();
        updateDistributionChart();
    });
    
    gammaBeta.addEventListener('input', function() {
        config.gamma.beta = parseFloat(this.value);
        gammaBetaValue.textContent = this.value;
        updateDistributionGenerators();
        updatePDFChart();
        updateDistributionChart();
    });
    
    binomialN.addEventListener('input', function() {
        config.binomial.n = parseInt(this.value);
        binomialNValue.textContent = this.value;
        updateDistributionGenerators();
        updatePDFChart();
        updateDistributionChart();
    });
    
    binomialP.addEventListener('input', function() {
        config.binomial.p = parseFloat(this.value);
        binomialPValue.textContent = this.value;
        updateDistributionGenerators();
        updatePDFChart();
        updateDistributionChart();
    });
    
    exponentialRate.addEventListener('input', function() {
        config.exponential.rate = parseFloat(this.value);
        exponentialRateValue.textContent = this.value;
        updateDistributionGenerators();
        updatePDFChart();
        updateDistributionChart();
    });

studentTDof.addEventListener('input', function() {
    config.student_t.dof = parseInt(this.value);
    studentTDofValue.textContent = this.value;
    config.student_t.mean = jStat.studentt.mean(config.student_t.dof);
    config.student_t.stdDev = Math.sqrt(jStat.studentt.variance(config.student_t.dof));
    updateDistributionGenerators();
    updatePDFChart();
    updateDistributionChart();
});
    
    distributionSelect.addEventListener('change', function() {
        config.distribution = this.value;
        showDistributionParams(this.value);
        resetSimulation();
        updateDistributionGenerators();
        updatePDFChart();
        updateDistributionChart();
    });
    
    showDistributionParams('uniform');
    updateDistributionGenerators();
    
    drawLanes();
    updatePDFChart();
    updateDistributionChart();
    
    function resizeCanvas() {
        const container = canvas.parentElement;
        canvas.width = container.clientWidth - 30;
        updateLanes();
        drawLanes();
        drawBalls();
        
        updateBallSizeConstraints();
        updatePDFChart();
        updateDistributionChart();
        if (totalBallsCreated > 0) {
            updateHistogramChart();
        }
    }
    

if (localStorage.getItem('darkMode') === 'true') {
    enableDarkMode();
}
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
});