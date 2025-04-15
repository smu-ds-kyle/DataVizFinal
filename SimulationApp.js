
class SimulationApp {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.isRunning = false;
        this.isUniformDist = false;
        this.isSimRunning = false;
        this.animationId = null;
        this.balls = [];
        this.lanes = [];
        this.totalBallsCreated = 0;
        this.lastBallTime = 0;
        this.lastFrameTime = Date.now();
        this.isDarkMode = localStorage.getItem('darkMode') === 'true';

        this.lastLaneCount = 0;
        this.lastCanvasWidth = 0;
        this.lastCanvasHeight = 0;

        this.ballPool = [];
        this.maxPoolSize = 1000;

        this.config = {
            numLanes: DEFAULT_CONFIG.numLanes,
            ballSpeed: DEFAULT_CONFIG.ballSpeed,
            genRate: DEFAULT_CONFIG.genRate,
            ballLifetime: DEFAULT_CONFIG.ballLifetime * 1000,
            ballSize: DEFAULT_CONFIG.ballSize,
            distribution: DISTRIBUTIONS.NORMAL,

            uniform: {},
            normal: {},
            poisson: {},
            gamma: {},
            binomial: {},
            exponential: {},
            student_t: {}
        };

        this.distributionManager = new DistributionManager(this);
        this.chartManager = new ChartManager(this);
    }

    init() {
        this.setupDOM();
        this.setupEventListeners();
        this.setupDistributions();
        this.updateLanes();
        this.drawInitialState();
        this.chartManager.initCharts();

        this.distributionManager.resetHistogram(this.config.numLanes);

        if (this.isDarkMode) {
            this.enableDarkMode(false);
        } else {
            this.disableDarkMode(false);
        }

        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        if (this.welcomeModal) {
            this.welcomeModal.show();
        }
        this.lastFrameTime = performance.now();
    }

    setupDOM() {
        this.canvas = document.getElementById('simulation-canvas');
        this.ctx = this.canvas.getContext('2d');

        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.themeToggleBtn = document.getElementById('themeToggleBtn');

        this.pdfChartContainer = document.getElementById('pdfChart');
        this.distributionChartContainer = document.getElementById('distributionChart');
        this.histogramChartContainer = document.getElementById('histogramChart');

        this.distributionSelect = document.getElementById('distributionSelect');
        this.distributionParams = document.querySelectorAll('.distribution-params');

        this.numLanes = document.getElementById('numLanes');
        this.numLanesValue = document.getElementById('numLanesValue');
        this.ballSpeed = document.getElementById('ballSpeed');
        this.ballSpeedValue = document.getElementById('ballSpeedValue');
        this.genRate = document.getElementById('genRate');
        this.genRateValue = document.getElementById('genRateValue');
        this.ballLifetime = document.getElementById('ballLifetime');
        this.ballLifetimeValue = document.getElementById('ballLifetimeValue');
        this.ballSize = document.getElementById('ballSize');
        this.ballSizeValue = document.getElementById('ballSizeValue');

        this.numLanes.value = this.config.numLanes;
        this.numLanesValue.textContent = this.config.numLanes;
        this.ballSpeed.value = this.config.ballSpeed;
        this.ballSpeedValue.textContent = this.config.ballSpeed;
        this.genRate.value = this.config.genRate;
        this.genRateValue.textContent = this.config.genRate;
        this.ballLifetime.value = this.config.ballLifetime / 1000;
        this.ballLifetimeValue.textContent = this.config.ballLifetime / 1000;
        this.ballSize.value = this.config.ballSize;
        this.ballSizeValue.textContent = this.config.ballSize;
        this.distributionSelect.value = this.config.distribution;

        this.totalBallsEl = document.getElementById('totalBalls');
        this.activeBallsEl = document.getElementById('activeBalls');

        this.setupDistributionParams();

        const welcomeModalElement = document.getElementById('welcomeModal');
        if (welcomeModalElement) {
            this.welcomeModal = new bootstrap.Modal(welcomeModalElement);
        }
    }

    setupDistributionParams() {
        this.uniformMin = document.getElementById('uniformMin');
        this.uniformMinValue = document.getElementById('uniformMinValue');
        this.uniformMax = document.getElementById('uniformMax');
        this.uniformMaxValue = document.getElementById('uniformMaxValue');

        this.normalMean = document.getElementById('normalMean');
        this.normalMeanValue = document.getElementById('normalMeanValue');
        this.normalStdDev = document.getElementById('normalStdDev');
        this.normalStdDevValue = document.getElementById('normalStdDevValue');

        this.poissonLambda = document.getElementById('poissonLambda');
        this.poissonLambdaValue = document.getElementById('poissonLambdaValue');

        this.gammaAlpha = document.getElementById('gammaAlpha');
        this.gammaAlphaValue = document.getElementById('gammaAlphaValue');
        this.gammaBeta = document.getElementById('gammaBeta');
        this.gammaBetaValue = document.getElementById('gammaBetaValue');

        this.binomialN = document.getElementById('binomialN');
        this.binomialNValue = document.getElementById('binomialNValue');
        this.binomialP = document.getElementById('binomialP');
        this.binomialPValue = document.getElementById('binomialPValue');

        this.exponentialRate = document.getElementById('exponentialRate');
        this.exponentialRateValue = document.getElementById('exponentialRateValue');

        this.studentTDof = document.getElementById('studentTDof');
        this.studentTDofValue = document.getElementById('studentTDofValue');
    }

    setupDistributions() {
        this.config.uniform = {
            min: parseFloat(this.uniformMin?.value || 1),
            max: parseFloat(this.uniformMax?.value || 9)
        };
        if (this.uniformMin) this.uniformMinValue.textContent = this.config.uniform.min;
        if (this.uniformMax) this.uniformMaxValue.textContent = this.config.uniform.max;

        this.config.normal = {
            mean: parseFloat(this.normalMean?.value || 0),
            stdDev: parseFloat(this.normalStdDev?.value || 1)
        };
        if (this.normalMean) this.normalMeanValue.textContent = this.config.normal.mean;
        if (this.normalStdDev) this.normalStdDevValue.textContent = this.config.normal.stdDev;

        this.config.poisson = {
            lambda: parseFloat(this.poissonLambda?.value || 5)
        };
        if (this.poissonLambda) this.poissonLambdaValue.textContent = this.config.poisson.lambda;

        this.config.gamma = {
            alpha: parseFloat(this.gammaAlpha?.value || 2),
            beta: parseFloat(this.gammaBeta?.value || 2)
        };
        if (this.gammaAlpha) this.gammaAlphaValue.textContent = this.config.gamma.alpha;
        if (this.gammaBeta) this.gammaBetaValue.textContent = this.config.gamma.beta;

        this.config.binomial = {
            n: parseInt(this.binomialN?.value || 10),
            p: parseFloat(this.binomialP?.value || 0.5)
        };
        if (this.binomialN) this.binomialNValue.textContent = this.config.binomial.n;
        if (this.binomialP) this.binomialPValue.textContent = this.config.binomial.p;


        this.config.exponential = {
            rate: parseFloat(this.exponentialRate?.value || 1)
        };
        if (this.exponentialRate) this.exponentialRateValue.textContent = this.config.exponential.rate;

        this.config.student_t = {
            dof: parseInt(this.studentTDof?.value || 5)
        };
        if (this.studentTDof) this.studentTDofValue.textContent = this.config.student_t.dof;


        this.showDistributionParams(this.config.distribution);
        this.distributionManager.updateDistributionGenerators();
    }

    setupEventListeners() {
        this.startBtn.addEventListener('click', () => this.startSimulation());
        this.stopBtn.addEventListener('click', () => this.stopSimulation());
        this.resetBtn.addEventListener('click', () => this.resetSimulation());
        this.themeToggleBtn.addEventListener('click', () => this.toggleTheme());

        this.distributionSelect.addEventListener('change', () => {
            this.config.distribution = this.distributionSelect.value;
            this.showDistributionParams(this.config.distribution);

            if (this.config.distribution === DISTRIBUTIONS.UNIFORM) {

                this.isUniformDist = true;
                if (typeof this.updateMinMaxRelationship === 'function') {
                    console.log("Uniform selected, triggering updateMinMaxRelationship...");
                    this.updateMinMaxRelationship();
                } else {
                    console.warn("updateMinMaxRelationship function not found.");
                }

            }
            else{
                this.isUniformDist = false;
                let mod = this.config.numLanes % 2

                if(mod == 0){
                    let newLanes = this.config.numLanes + 1
                    this.config.numLanes = newLanes;
                    this.numLanes.value = newLanes;
                    this.numLanesValue.textContent = newLanes;
                    this.updateLanes();
                    this.distributionManager.resetHistogram(newLanes);
                    this.redrawStaticElements()
                }
            }
            this.updateControlsState();
            this.distributionManager.updateDistributionGenerators();
            this.chartManager.updatePDFChart();
            this.chartManager.updateDistributionChart();
            this.resetSimulation();
        });

        this.setupSimulationSliders();

        this.setupDistributionSliders();
    }
    updateMinMaxRelationship() {
        const minValue = parseFloat(this.uniformMin.value);
        const maxValue = parseFloat(this.uniformMax.value);
        
        this.uniformMin.setAttribute('max', maxValue);
        this.uniformMax.setAttribute('min', minValue);
        
        this.uniformMinValue.textContent = minValue;
        this.uniformMaxValue.textContent = maxValue;
        
        this.config.uniform.min = minValue;
        this.config.uniform.max = maxValue;
        
        if (this.config.distribution === 'uniform') {
            const newLanes = this.findNiceLaneCount(minValue, maxValue);
            
            if (newLanes !== this.config.numLanes) {
                this.config.numLanes = newLanes;
                this.numLanes.value = newLanes;
                this.numLanesValue.textContent = newLanes;
                this.updateLanes();
                this.distributionManager.resetHistogram(newLanes);
                this.redrawStaticElements();
            }
        }
    };

    setupSimulationSliders() {
        this.numLanes.addEventListener('input', (e) => {
            this.config.numLanes = parseInt(e.target.value);
            this.numLanesValue.textContent = e.target.value;
            this.updateBallSizeConstraints();
            this.distributionManager.resetHistogram(this.config.numLanes);
            this.chartManager.updateDistributionChart(false);
            this.updateLanes();
            this.redrawStaticElements();
        });

        this.ballSpeed.addEventListener('input', (e) => {
            this.config.ballSpeed = parseFloat(e.target.value);
            this.ballSpeedValue.textContent = e.target.value;
        });

        this.genRate.addEventListener('input', (e) => {
            this.config.genRate = parseFloat(e.target.value);
            this.genRateValue.textContent = e.target.value;
        });

        this.ballLifetime.addEventListener('input', (e) => {
            this.config.ballLifetime = parseInt(e.target.value) * 1000;
            this.ballLifetimeValue.textContent = e.target.value;
        });

        this.ballSize.addEventListener('input', (e) => {
            this.config.ballSize = parseInt(e.target.value);
            this.ballSizeValue.textContent = e.target.value;
        });
    }

    setupDistributionSliders() {
        const updateDist = () => {
            this.distributionManager.updateDistributionGenerators();
            this.chartManager.updatePDFChart();
            this.chartManager.updateDistributionChart();
            this.resetSimulation();
        };


    
if (this.uniformMin && this.uniformMax) {

    
    this.updateMinMaxRelationship();
    
    this.uniformMin.addEventListener('input', (e) => {
        this.updateMinMaxRelationship();
        updateDist();
    });
    
    this.uniformMax.addEventListener('input', (e) => {
        this.updateMinMaxRelationship();
        updateDist();
    });
}

        if (this.normalMean) {
            this.normalMean.addEventListener('input', (e) => {
                this.config.normal.mean = parseFloat(e.target.value);
                this.normalMeanValue.textContent = e.target.value;
                updateDist();
            });
        }
        if (this.normalStdDev) {
            this.normalStdDev.addEventListener('input', (e) => {
                this.config.normal.stdDev = parseFloat(e.target.value);
                this.normalStdDevValue.textContent = e.target.value;
                updateDist();
            });
        }

        if (this.poissonLambda) {
            this.poissonLambda.addEventListener('input', (e) => {
                this.config.poisson.lambda = parseFloat(e.target.value);
                this.poissonLambdaValue.textContent = e.target.value;
                updateDist();
            });
        }

         if (this.gammaAlpha) {
            this.gammaAlpha.addEventListener('input', (e) => {
                this.config.gamma.alpha = parseFloat(e.target.value);
                this.gammaAlphaValue.textContent = e.target.value;
                updateDist();
            });
        }
         if (this.gammaBeta) {
            this.gammaBeta.addEventListener('input', (e) => {
                this.config.gamma.beta = parseFloat(e.target.value);
                this.gammaBetaValue.textContent = e.target.value;
                updateDist();
            });
        }

        if (this.binomialN) {
            this.binomialN.addEventListener('input', (e) => {
                this.config.binomial.n = parseInt(e.target.value);
                this.binomialNValue.textContent = e.target.value;
                updateDist();
            });
        }
        if (this.binomialP) {
            this.binomialP.addEventListener('input', (e) => {
                this.config.binomial.p = parseFloat(e.target.value);
                this.binomialPValue.textContent = e.target.value;
                updateDist();
            });
        }

        if (this.exponentialRate) {
            this.exponentialRate.addEventListener('input', (e) => {
                this.config.exponential.rate = parseFloat(e.target.value);
                this.exponentialRateValue.textContent = e.target.value;
                updateDist();
            });
        }

         if (this.studentTDof) {
            this.studentTDof.addEventListener('input', (e) => {
                this.config.student_t.dof = parseInt(e.target.value);
                this.studentTDofValue.textContent = e.target.value;
                updateDist();
            });
        }
    }

    showDistributionParams(distribution) {
        this.distributionParams.forEach(param => {
            param.style.display = 'none';
        });

        const selectedParams = document.getElementById(`${distribution}-params`);
        if (selectedParams) {
            selectedParams.style.display = 'block';
        }
    }

    startSimulation() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.lastBallTime = performance.now();
            this.lastFrameTime = performance.now();
            this.animate(performance.now());
            this.updateControlsState();
        }
    }

    stopSimulation() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        this.updateControlsState();
    }

    resetSimulation() {
        this.stopSimulation();

        while (this.balls.length > 0) {
            const ball = this.balls.pop();
            if (this.ballPool.length < this.maxPoolSize) {
                this.ballPool.push(ball);
            }
        }

        this.totalBallsCreated = 0;

        this.distributionManager.resetHistogram(this.config.numLanes);

        this.chartManager.resetHistogramChart();
        this.updateStats();
        this.redrawStaticElements();
    }

    animate(timestamp) {
        const deltaTime = Math.min((timestamp - this.lastFrameTime) / 1000, 0.1);
        this.lastFrameTime = timestamp;

        if (this.isRunning) {
            this.updateBalls(deltaTime);
        }


        this.ctx.fillStyle = this.isDarkMode ? "#1e1e1e" : "#f8f9fa";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.drawLaneLines();

        this.drawBalls();


        this.updateStats();

        if (this.isRunning || this.animationId) {
             this.animationId = requestAnimationFrame((ts) => this.animate(ts));
        }
        if (!this.isRunning) {
            this.animationId = null;
        }
    }

    toggleTheme() {
        if (this.isDarkMode) {
            this.disableDarkMode();
        } else {
            this.enableDarkMode();
        }
    }

    enableDarkMode(redraw = true) {
        document.body.classList.add('dark-mode');
        this.themeToggleBtn.innerHTML = '<i class="theme-icon">🌙</i><span class="ms-2">Dark Mode</span>';
        this.isDarkMode = true;
        localStorage.setItem('darkMode', 'true');

        this.chartManager.updatePDFChart();
        this.chartManager.updateDistributionChart();
        if (this.totalBallsCreated > 0 || this.balls.length > 0) {
            this.chartManager.updateHistogramChart();
        }

        if (redraw) {
            this.redrawStaticElements();
            this.drawBalls();
        }
    }

    disableDarkMode(redraw = true) {
        document.body.classList.remove('dark-mode');
        this.themeToggleBtn.innerHTML = '<i class="theme-icon">☀️</i><span class="ms-2">Light Mode</span>';
        this.isDarkMode = false;
        localStorage.setItem('darkMode', 'false');

        this.chartManager.updatePDFChart();
        this.chartManager.updateDistributionChart();
        if (this.totalBallsCreated > 0 || this.balls.length > 0) {
            this.chartManager.updateHistogramChart();
        }

        if (redraw) {
            this.redrawStaticElements();
            this.drawBalls();
        }
    }

    updateControlsState() {
        const disableDuringRun = [
            this.numLanes,
            this.distributionSelect,
            ...this.distributionParams,
            ...document.querySelectorAll('.distribution-params input'),
            ...document.querySelectorAll('.distribution-params select')
        ];

        disableDuringRun.forEach(el => {
             if (el) {
                el.disabled = this.isRunning;
                el.style.opacity = this.isRunning ? 0.6 : 1;
                const label = document.querySelector(`label[for="${el.id}"]`);
                if (label) {
                    label.style.opacity = this.isRunning ? 0.6 : 1;
                }
             }
        });

    const numLanesContainer = this.numLanes.closest('.slider-container');
    if (this.numLanes && numLanesContainer) {
        const shouldDisableNumLanes = this.isRunning || this.isUniformDist;
        this.numLanes.disabled = shouldDisableNumLanes;

        numLanesContainer.style.opacity = shouldDisableNumLanes ? 0.6 : 1;
        numLanesContainer.style.pointerEvents = shouldDisableNumLanes ? 'none' : 'auto';

        if (this.isUniformDist && !this.isRunning) {
            this.numLanes.title = "Number of lanes is automatically adjusted for Uniform distribution based on Min/Max range.";
            const numLanesLabel = numLanesContainer.querySelector('label');
             if(numLanesLabel) numLanesLabel.title = this.numLanes.title;
        } else {
             this.numLanes.title = "";
             const numLanesLabel = numLanesContainer.querySelector('label');
             if(numLanesLabel) numLanesLabel.title = "";
        }
    }

  

        this.startBtn.disabled = this.isRunning;
        this.stopBtn.disabled = !this.isRunning;
        this.resetBtn.disabled = this.isRunning;
    }


    updateBallSizeConstraints() {
        const canvasWidth = this.canvas.width;
        if (!canvasWidth || this.config.numLanes <= 0) return;

        const laneWidth = canvasWidth / this.config.numLanes;
        const maxBallSize = Math.max(1, Math.floor(laneWidth / 2) - 1);

        const minBallSize = parseInt(this.ballSize.min) || 1;

        this.ballSize.max = maxBallSize;

        if (this.config.ballSize > maxBallSize) {
            this.config.ballSize = maxBallSize;
            this.ballSize.value = maxBallSize;
            this.ballSizeValue.textContent = maxBallSize;
        } else if (this.config.ballSize < minBallSize) {
             this.config.ballSize = minBallSize;
             this.ballSize.value = minBallSize;
             this.ballSizeValue.textContent = minBallSize;
        }
    }


    resizeCanvas() {
        const container = this.canvas.parentElement;
        if (!container) return;
        const containerWidth = container.clientWidth - 30;

        this.canvas.width = Math.max(100, containerWidth);

        this.updateBallSizeConstraints();
        this.updateLanes();

        this.redrawStaticElements();
        this.drawBalls();

        this.chartManager.updatePDFChart();
        this.chartManager.updateDistributionChart();
        if (this.totalBallsCreated > 0 || this.balls.length > 0) {
            this.chartManager.updateHistogramChart();
        }
    }

    updateLanes() {
        if (!this.canvas || this.config.numLanes <= 0) {
             this.lanes = [];
             return;
        }
        const laneWidth = this.canvas.width / this.config.numLanes;
        this.lanes = [];

        for (let i = 0; i < this.config.numLanes; i++) {
            this.lanes.push({
                x: i * laneWidth + laneWidth / 2,
                width: laneWidth
            });
        }
        this.lastLaneCount = this.config.numLanes;
        this.lastCanvasWidth = this.canvas.width;
        this.lastCanvasHeight = this.canvas.height;
    }


    redrawStaticElements() {
        if (!this.ctx || !this.canvas) return;
        this.ctx.fillStyle = this.isDarkMode ? "#1e1e1e" : "#f8f9fa";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawLaneLines();
    }
    
    drawInitialState() {
        this.redrawStaticElements();
    }

    drawLaneLines() {
        if (!this.ctx || this.lanes.length <= 1) return;

        this.ctx.strokeStyle = this.isDarkMode ? "#444" : "#dee2e6";
        this.ctx.lineWidth = 1;

        this.lanes.forEach((lane, index) => {
            if (index > 0) {
                const x = lane.x - lane.width / 2;
                this.ctx.beginPath();
                this.ctx.moveTo(x, 0);
                this.ctx.lineTo(x, this.canvas.height);
                this.ctx.stroke();
            }
        });
    }

    drawBalls() {
        if (!this.ctx) return;
        this.balls.forEach(ball => {
            this.ctx.fillStyle = ball.color;
            this.ctx.beginPath();
            this.ctx.arc(ball.x, ball.y, this.config.ballSize, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }


    updateBalls(deltaTime) {
        const now = performance.now();
        const currentLifetime = this.config.ballLifetime;
        const currentBallSize = this.config.ballSize;
        const currentSpeed = this.config.ballSpeed;

        let i = 0;
        while (i < this.balls.length) {
            const ball = this.balls[i];

            const lifetimeExpired = (now - ball.createdAt >= currentLifetime);
            const offScreen = (ball.y < -currentBallSize);

            if (lifetimeExpired || offScreen) {
                if (this.ballPool.length < this.maxPoolSize) {
                    this.ballPool.push(ball);
                }
                this.balls[i] = this.balls[this.balls.length - 1];
                this.balls.pop();
            } else {
                ball.y -= currentSpeed * deltaTime;
                i++;
            }
        }

        const timeSinceLastBall = now - this.lastBallTime;
        const ballsToCreate = Math.floor(timeSinceLastBall * (this.config.genRate / 1000));

        if (ballsToCreate > 0 && this.lanes.length > 0) {
            for (let j = 0; j < ballsToCreate; j++) {
                this.createBall();
            }
            this.lastBallTime += ballsToCreate * (1000 / this.config.genRate);
            if (this.lastBallTime > now) {
                 this.lastBallTime = now;
            }
        }
    }

    findNiceLaneCount(min, max) {
        const range = Math.abs(max - min);
        
        return range * 2
        
      }

    createBall() {
        if (this.lanes.length === 0) return null;

        const laneIndex = this.distributionManager.getNextLane();
        if (laneIndex === null || laneIndex < 0 || laneIndex >= this.lanes.length) {
            console.warn("Invalid lane index generated:", laneIndex);
            return null;
        }
        const lane = this.lanes[laneIndex];
        const ballSize = this.config.ballSize;


let ballColor;
const normalizedLane = this.config.numLanes > 1 ? laneIndex / (this.config.numLanes - 1) : 0.5;

if (this.isDarkMode) {
    ballColor = d3.interpolateInferno(normalizedLane * 0.9 + 0.1);
} else {
    ballColor = d3.interpolateBlues(normalizedLane * 0.9 + 0.2);
}


        let ball;
        if (this.ballPool.length > 0) {
            ball = this.ballPool.pop();
            ball.x = lane.x;
            ball.y = this.canvas.height + ballSize;
            ball.color = ballColor;
            ball.laneIndex = laneIndex;
            ball.createdAt = performance.now();
        } else {
            ball = {
                x: lane.x,
                y: this.canvas.height + ballSize,
                color: ballColor,
                laneIndex: laneIndex,
                createdAt: performance.now(),
            };
        }

        this.balls.push(ball);
        this.totalBallsCreated++;

        
        this.chartManager.requestHistogramUpdate();


        return ball;
    }

    updateStats() {
        this.totalBallsEl.textContent = this.totalBallsCreated;
        this.activeBallsEl.textContent = this.balls.length;

    }
}

