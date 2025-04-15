class DistributionManager {
    constructor(app) {
        this.app = app;
        
        this.laneHistogram = [];
        this.laneHistogramRealValues = [];
        this.laneHistogramPlotValues = [];
        
        this.distributionGenerators = {
            randomNormal: null,
            randomGamma: null,
            randomBinomial: null,
            randomExponential: null,
            randomPoisson: null,
            randomUniform: null,
            randomStudent: null
        };
        
        this.distributionValueCache = new Map();
        this.laneValueCache = new Map();
        this.cacheKeyPrefix = '';
        
        this.cachedStats = {};
        this.cachedRanges = {};
    }
    
    initializeGenerators() {
        this.updateDistributionGenerators();
    }

    updateDistributionGenerators() {
        try {
            Object.keys(this.distributionGenerators).forEach(key => {
                const type = key.replace('random', '').toLowerCase();
                this.distributionGenerators[key] = this.createDistributionGenerator(type);
            });
            
            this.cacheKeyPrefix = `${this.app.config.distribution}-${Date.now()}`;
            this.distributionValueCache.clear();
            this.laneValueCache.clear();
            this.cachedStats = {};
            this.cachedRanges = {};
        } catch (error) {
            console.error("Error updating distribution generators:", error);
            this.setFallbackGenerators();
        }
    }
   
    createDistributionGenerator(type) {
        switch(type) {
            case 'normal':
                const { mean, stdDev } = this.app.config.normal;
                return d3.randomNormal(mean, stdDev);
            case 'gamma':
                const { alpha, beta } = this.app.config.gamma;
                return d3.randomGamma(alpha, beta);
            case 'binomial':
                const { n, p } = this.app.config.binomial;
                return d3.randomBinomial(n, p);
            case 'exponential':
                const { rate } = this.app.config.exponential;
                return d3.randomExponential(rate);
            case 'poisson':
                const { lambda } = this.app.config.poisson;
                return d3.randomPoisson(lambda);
            case 'uniform':
                const { min, max } = this.getUniformMinMax();
                return d3.randomUniform(min, max);
            case 'student':
                const { dof } = this.app.config.student_t;
                return this.randomStudent();
            default:
                return d3.randomUniform(0, 1);
        }
    }
    
    createCustomStudentTGenerator(dof) {
        return () => {
            const z = d3.randomNormal(0, 1)();
            let chiSquare = 0;
            
            for (let i = 0; i < dof; i++) {
                const normal = d3.randomNormal(0, 1)();
                chiSquare += normal * normal;
            }
            
            return z / Math.sqrt(chiSquare / dof);
        };
    }
    
    randomStudent(){
        return () => jStat.studentt.sample(this.app.config.student_t.dof);
    }

    getUniformMinMax() {
        return {
          min: this.app.config.uniform.min,
          max: this.app.config.uniform.max
        };
    }

    setFallbackGenerators() {
        this.distributionGenerators.randomNormal = d3.randomNormal(0, 1);
        this.distributionGenerators.randomGamma = d3.randomGamma(2, 2);
        this.distributionGenerators.randomBinomial = d3.randomBinomial(10, 0.5);
        this.distributionGenerators.randomExponential = d3.randomExponential(1);
        this.distributionGenerators.randomPoisson = d3.randomPoisson(5);
        this.distributionGenerators.randomUniform = d3.randomUniform(0, 1);
        this.distributionGenerators.randomStudent = this.randomStudent();
    }
    
    resetHistogram(numLanes) {
        this.laneHistogram = Array(numLanes).fill(0);
        this.laneHistogramRealValues = [];
        this.laneHistogramPlotValues = [];
    }
    
    getDistributionLane(distribution) {
        const generatorName = `random${distribution.charAt(0).toUpperCase() + distribution.slice(1)}`;
        const generator = this.distributionGenerators[generatorName];
        
        
        const value = generator();
        this.laneHistogramRealValues.push(value);
        
        let scaledLane;
        const numLanes = this.app.config.numLanes;
        
        switch(distribution) {
            case 'normal': {
                
                const meanLane = ((numLanes - 1) / 2) + 1;
                const normalizedValue = (value - this.app.config.normal.mean) / this.app.config.normal.stdDev;
                scaledLane = normalizedValue * (numLanes / 8) + meanLane;
                
                break;
            }
            case 'poisson': {
                const lambda = this.app.config.poisson.lambda;
                scaledLane = Math.floor((value / (3 * lambda)) * numLanes);
                break;
            }
            case 'gamma': {
                const { alpha, beta } = this.app.config.gamma;
                const mean = alpha * beta;
                const stdDev = Math.sqrt(alpha * beta * beta);
                
                let scaleFactor;
                if (alpha <= 1) {
                    scaleFactor = mean + 4 * stdDev;
                } else if (alpha <= 3) {
                    scaleFactor = mean + 3 * stdDev;
                } else {
                    scaleFactor = 4 * mean;
                }
                
                scaledLane = Math.floor((value / scaleFactor) * numLanes);
                

                if(scaledLane >= numLanes) {
                    let prob = 1 - jStat.gamma.cdf(value, alpha, beta);
                    let rand = Math.random();

                    if (rand < prob) {scaledLane = numLanes - 1;}
                    else{scaledLane = Math.floor(mean / scaleFactor * numLanes); }

                    break;
                }

                if (scaledLane < 0) scaledLane = 0;
                
                break;
            }
            case 'binomial': {
                const { n } = this.app.config.binomial;
                scaledLane = Math.floor((value / n) * numLanes);
                break;
            }
            case 'exponential': {
                const { rate } = this.app.config.exponential;
                const mean = 1 / rate;
                scaledLane = Math.floor((value / (5 * mean)) * numLanes);
                break;
            }
            case 'student': {
                const { dof } = this.app.config.student_t;
                const range = dof < 5 ? 10 : 6;
                const meanLane = (numLanes - 1) / 2;
                scaledLane = meanLane + (value / range) * numLanes / 2;
                break;
            }
            case 'uniform':
default: {
    const { min, max } = this.app.config.uniform;
    
    
    if (value <= min) return 0;
    if (value >= max) return this.app.config.numLanes - 1;
    
    const normalizedPosition = (value - min) / (max - min);
    const exactBin = normalizedPosition * this.app.config.numLanes;
    
    return Math.floor(exactBin);
}
        }
        
       

        const laneIndex = this.clampLane(Math.floor(scaledLane));
        this.laneHistogramPlotValues.push(value);
        
        if(scaledLane <= numLanes) {
            this.laneHistogram[laneIndex]++;
           
            return laneIndex;
        }
        return null;
    }
    
    getNextLane() {
        return this.getDistributionLane(this.app.config.distribution);
    }
    
    clampLane(lane) {
        return Math.max(0, Math.min(this.app.config.numLanes - 1, lane));
    }
    
    getDistributionValueForLane(i, numBins, distribution) {
        const cacheKey = `${this.cacheKeyPrefix}-value-${i}-${numBins}-${distribution}`;
        
        if (this.distributionValueCache.has(cacheKey)) {
            return this.distributionValueCache.get(cacheKey);
        }
        
        let value;
        switch(distribution) {
            case 'normal':
                value = this.getNormalValue(i, numBins);
                break;
            case 'poisson':
                value = this.getPoissonValue(i, numBins);
                break;
            case 'gamma':
                value = this.getGammaValue(i, numBins);
                break;
            case 'binomial':
                value = this.getBinomialValue(i, numBins);
                break;
            case 'exponential':
                value = this.getExponentialValue(i, numBins);
                break;
            case 'student':
                value = this.getStudentTValue(i, numBins);
                break;
            case 'uniform':
            default:
                value = this.getUniformValue(i, numBins);
        }
        
        this.distributionValueCache.set(cacheKey, value);
        return value;
    }
    
    getLaneValue(laneIndex, numLanes, distribution) {
        const cacheKey = `${this.cacheKeyPrefix}-lane-${laneIndex}-${numLanes}-${distribution}`;
        
        if (this.laneValueCache.has(cacheKey)) {
            return this.laneValueCache.get(cacheKey);
        }
        
        let value;
        switch(distribution) {
            case 'uniform': {
                const min = this.app.config.uniform.min;
                const max = this.app.config.uniform.max;
                value = min + (laneIndex / (numLanes - 1)) * (max - min);
                break;
            }
            case 'normal': {
                const mean = this.app.config.normal.mean;
                const stdDev = this.app.config.normal.stdDev;
                value = mean + ((laneIndex / (numLanes - 1)) * 8 - 4) * stdDev;
                break;
            }
            case 'exponential': {
                const rate = this.app.config.exponential.rate;
                const mean = 1 / rate;
                value = (laneIndex / (numLanes - 1)) * (5 * mean);
                break;
            }
            case 'poisson': {
                const lambda = this.app.config.poisson.lambda;
                value = (laneIndex / (numLanes - 1)) * (3 * lambda);
                break;
            }
            case 'gamma': {
                const alpha = this.app.config.gamma.alpha;
                const beta = this.app.config.gamma.beta;
                const mean = alpha * beta;
                const stdDev = Math.sqrt(alpha * beta * beta);
                
                let scaleFactor;
                if (alpha <= 1) {
                    scaleFactor = mean + 4 * stdDev;
                } else if (alpha <= 3) {
                    scaleFactor = mean + 3 * stdDev;
                } else {
                    scaleFactor = 4 * mean;
                }
                
                return (laneIndex / (numLanes - 1)) * scaleFactor;
            }
            case 'binomial': {
                const n = this.app.config.binomial.n;
                value = (laneIndex / (numLanes - 1)) * n;
                break;
            }
            case 'student': {
                const range = this.app.config.student_t.dof < 5 ? 10 : 6;
                value = ((laneIndex / (numLanes - 1)) * range - range/2);
                break;
            }
            default:
                value = laneIndex;
        }
        
        this.laneValueCache.set(cacheKey, value);
        return value;
    }
    
    getUniformValue(i, numBins) {
        if (numBins <= 1) return 1;
        return 1 / numBins;
    }
    
    getNormalValue(i, numBins) {
        const mean = this.app.config.normal.mean;
        const stdDev = this.app.config.normal.stdDev;
        
        const meanLane = (numBins - 1) / 2;
        const x = mean + ((i - meanLane) / (numBins / 6)) * stdDev;
        
        return jStat.normal.pdf(x, mean, stdDev);
    }
    
    getPoissonValue(i, numBins) {
        const lambda = this.app.config.poisson.lambda;
        
        const k = Math.floor(i * (lambda * 3 / numBins));
        if (k < 0) return 0;
        
        return jStat.poisson.pdf(k, lambda);
    }
    
    getGammaValue(i, numBins) {
        const alpha = this.app.config.gamma.alpha;
        const beta = this.app.config.gamma.beta;
        
        const x = i * (alpha * beta * 3 / numBins);
        
        if (x <= 0) return 0;
        
        return jStat.gamma.pdf(x, alpha, beta);
    }
    
    getBinomialValue(i, numBins) {
        const n = this.app.config.binomial.n;
        const p = this.app.config.binomial.p;
        
        const k = Math.floor(i * (n / numBins));
        
        if (k < 0 || k > n) return 0;
        
        return jStat.binomial.pdf(k, n, p);
    }
    
    getExponentialValue(i, numBins) {
        const rate = this.app.config.exponential.rate;
        
        const x = i * (5 / rate / numBins);
        
        return jStat.exponential.pdf(x, rate);
    }
    
    getStudentTValue(i, numBins) {
        const dof = this.app.config.student_t.dof;
        
        const meanLane = (numBins - 1) / 2;
        const x = ((i - meanLane) / (numBins / 6));
        
        return jStat.studentt.pdf(x, dof);
    }
    
    calculateDistributionStats(distribution, config) {
        const cacheKey = `stats-${distribution}-${JSON.stringify(config[distribution])}`;
        if (this.cachedStats[cacheKey]) {
            return this.cachedStats[cacheKey];
        }
        
        let stats;
        switch(distribution) {
            case 'normal': 
                stats = {
                    mean: config.normal.mean,
                    stdDev: config.normal.stdDev
                };
                break;
            case 'uniform': {
                const min = config.uniform.min;
                const max = config.uniform.max;
                const mean = (min + max) / 2;
                const stdDev = Math.sqrt(Math.pow(max - min, 2) / 12);
                stats = { mean, stdDev };
                break;
            }
            case 'poisson':
                stats = {
                    mean: config.poisson.lambda,
                    stdDev: Math.sqrt(config.poisson.lambda)
                };
                break;
            case 'gamma': {
                const mean = config.gamma.alpha * config.gamma.beta;
                const stdDev = Math.sqrt(config.gamma.alpha * config.gamma.beta * config.gamma.beta);
                stats = { mean, stdDev };
                break;
            }
            case 'binomial': {
                const binomialMean = config.binomial.n * config.binomial.p;
                const binomialStdDev = Math.sqrt(config.binomial.n * config.binomial.p * (1 - config.binomial.p));
                stats = { 
                    mean: binomialMean,
                    stdDev: binomialStdDev
                };
                break;
            }
            case 'exponential': {
                const rate = config.exponential.rate;
                const expMean = 1 / rate;
                const expStdDev = 1 / rate;
                stats = { 
                    mean: expMean,
                    stdDev: expStdDev
                };
                break;
            }
            case 'student': {
                const dof = config.student_t.dof;
                const mean = 0;
                let stdDev;
                
                if (dof > 2) {
                    stdDev = Math.sqrt(dof / (dof - 2));
                } else {
                    stdDev = dof > 1 ? 10 : 100;
                }
                
                stats = { mean, stdDev };
                break;
            }
            default:
                stats = { mean: 0, stdDev: 1 };
        }
        
        this.cachedStats[cacheKey] = stats;
        return stats;
    }
    
    calculateBasicStats(values) {
        if (!values || values.length === 0) return { mean: 0, stdDev: 0 };
        
        let mean = 0;
        let M2 = 0;
        let count = 0;
        
        for (let i = 0; i < values.length; i++) {
            count++;
            const delta = values[i] - mean;
            mean += delta / count;
            const delta2 = values[i] - mean;
            M2 += delta * delta2;
        }
        
        const variance = count > 1 ? M2 / count : 0;
        
        return { 
            mean, 
            stdDev: Math.sqrt(variance) 
        };
    }
    
    calculateHistogramStats() {
        return this.calculateBasicStats(this.laneHistogramRealValues);
    }
    
    calculateSimulatedStats(values) {
        return this.calculateBasicStats(values);
    }
    
    getDistributionRange(distribution, config) {
        console.log(distribution)
        console.log(config)
        const cacheKey = `range-${distribution}-${JSON.stringify(config[distribution])}`;
        if (this.cachedRanges[cacheKey]) {
            return this.cachedRanges[cacheKey];
        }
        
        let range;
        switch(distribution) {
            case 'normal': {
                const mean = config.normal.mean;
                const stdDev = config.normal.stdDev;
                range = {
                    min: mean - 4 * stdDev,
                    max: mean + 4 * stdDev,
                    displayMin: mean - 4 * stdDev,
                    displayMax: mean + 4 * stdDev
                };
                break;
            }
            case 'gamma': {
                const alpha = config.gamma.alpha;
                const beta = config.gamma.beta;
                const mean = alpha * beta;
                const stdDev = Math.sqrt(alpha * beta * beta);
                
                let scaleFactor;
                if (alpha <= 1) {
                    scaleFactor = mean + 4 * stdDev;
                } else if (alpha <= 3) {
                    scaleFactor = mean + 3 * stdDev;
                } else {
                    scaleFactor = 4 * mean;
                }
                
                return {
                    min: 0,
                    max: scaleFactor,
                    displayMin: 0,
                    displayMax: scaleFactor
                };
                break;
            
            }
            case 'binomial': {
                const n = config.binomial.n;
                const p = config.binomial.p;
                const mean = n * p;
                const stdDev = Math.sqrt(n * p * (1 - p));
                range = {
                    min: Math.max(0, mean - 4 * stdDev),
                    max: Math.min(n, mean + 4 * stdDev),
                    displayMin: Math.max(0, mean - 4 * stdDev),
                    displayMax: Math.min(n, mean + 4 * stdDev)
                };
                break;
            }
            case 'exponential': {
                const rate = config.exponential.rate;
                const mean = 1 / rate;
                const stdDev = mean;
                range = {
                    min: 0,
                    max: mean + 4 * stdDev,
                    displayMin: 0,
                    displayMax: mean + 4 * stdDev
                };
                break;
            }
            case 'poisson': {
                const lambda = config.poisson.lambda;
                const mean = lambda;
                const stdDev = Math.sqrt(lambda);
                range = {
                    min: Math.max(0, mean - 4 * stdDev),
                    max: mean + 4 * stdDev,
                    displayMin: Math.max(0, mean - 4 * stdDev),
                    displayMax: mean + 4 * stdDev
                };
                break;
            }
            case 'uniform': {
                const min = config.uniform.min;
                const max = config.uniform.max;
                const mean = (min + max) / 2;
                const stdDev = Math.sqrt(Math.pow(max - min, 2) / 12);
                range = {
                    min: mean,
                    max: mean,
                    displayMin: mean - 3 * stdDev,
                    displayMax: mean + 3 * stdDev
                };
                break;
            }
            case 'student': {
                const dof = config.student_t.dof;
                const range_dof = dof < 5 ? 10 : 6;
                
                range = {
                    min: -range_dof/2,
                    max: range_dof/2,
                    displayMin: -range_dof/2,
                    displayMax: range_dof/2
                };
                break;
            }
            default:
                range = { min: 0, max: 1, displayMin: 0, displayMax: 1 };
        }
        
        this.cachedRanges[cacheKey] = range;
        return range;
    }

    generatePDFData(rangeInfo, numPoints, step) {
        const cacheKey = `pdf-${this.app.config.distribution}-${JSON.stringify(rangeInfo)}-${numPoints}`;
        if (this.pdfDataCache && this.pdfDataCache.key === cacheKey) {
          return this.pdfDataCache.data;
        }
        
        const data = [];
        
        if (this.app.config.distribution === 'uniform') {
          let min = this.app.config.uniform.min;
          let max = this.app.config.uniform.max; 
          if (min > max) [min, max] = [max, min];
          
          if (Math.abs(max - min) < 1e-10) {
            max = min + 0.1;
          }
          
          const pdfHeight = 1 / (max - min);
          
          const epsilon = (max - min) * 0.001;
          
          data.push({x: min - epsilon, y: 0});
          data.push({x: min, y: 0});
          data.push({x: min, y: pdfHeight});
          data.push({x: min + epsilon, y: pdfHeight});
          data.push({x: max - epsilon, y: pdfHeight});
          data.push({x: max, y: pdfHeight});
          data.push({x: max, y: 0});
          data.push({x: max + epsilon, y: 0});
        } else {
          for (let i = 0; i <= numPoints; i++) {
            const x = rangeInfo.min + i * step;
            let y;
            
            switch(this.app.config.distribution) {
              case 'normal':
                y = jStat.normal.pdf(x, this.app.config.normal.mean, this.app.config.normal.stdDev);
                break;
              case 'gamma':
                if (x <= 0) {
                  y = 0;
                } else {
                  y = jStat.gamma.pdf(x, this.app.config.gamma.alpha, this.app.config.gamma.beta);
                }
                break;
              case 'poisson':
                const k = Math.round(x);
                if (k < 0) {
                  y = 0;
                } else {
                  y = jStat.poisson.pdf(k, this.app.config.poisson.lambda);
                }
                break;
              case 'binomial':
                const k_bin = Math.round(x);
                if (k_bin < 0 || k_bin > this.app.config.binomial.n) {
                  y = 0;
                } else {
                  y = jStat.binomial.pdf(k_bin, this.app.config.binomial.n, this.app.config.binomial.p);
                }
                break;
              case 'exponential':
                y = x >= 0 ? jStat.exponential.pdf(x, this.app.config.exponential.rate) : 0;
                break;
              case 'student':
                y = jStat.studentt.pdf(x, this.app.config.student_t.dof);
                break;
            }
            
            data.push({x: x, y: y});
          }
        }
        
        this.pdfDataCache = {
          key: cacheKey,
          data: data
        };
        
        return data;
      }
    }