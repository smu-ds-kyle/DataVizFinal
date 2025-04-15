/**
 * DistributionUtils.js
 * 
 * A utility class that centralizes distribution-related calculations
 * to avoid duplication between ChartManager and DistributionManager.
 */
class DistributionUtils {
    /**
     * Calculates the actual value for a lane in a specific distribution
     * @param {number} laneIndex - Index of the lane
     * @param {number} numLanes - Total number of lanes
     * @param {string} distribution - Distribution type
     * @param {object} config - Configuration object containing distribution parameters
     * @returns {number} The actual value for the lane
     */
    static getLaneValue(laneIndex, numLanes, distribution, config) {
      switch(distribution) {
        case 'uniform': {
          const min = config.uniform.min;
          const max = config.uniform.max;
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
    
    /**
     * Calculates the distribution value (PDF/PMF) for a specific lane
     * @param {number} i - Lane index
     * @param {number} numBins - Total number of lanes/bins
     * @param {string} distribution - Distribution type
     * @param {object} config - Configuration object containing distribution parameters
     * @returns {number} The probability value for the lane
     */
    static getDistributionValueForLane(i, numBins, distribution, config) {
      switch(distribution) {
        case 'normal': {
          const mean = config.normal.mean;
          const stdDev = config.normal.stdDev;
          
          const meanLane = (numBins - 1) / 2;
          const x = mean + ((i - meanLane) / (numBins / 6)) * stdDev;
          
          return jStat.normal.pdf(x, mean, stdDev);
        }
        case 'poisson': {
          const lambda = config.poisson.lambda;
          
          const k = Math.floor(i * (lambda * 3 / numBins));
          if (k < 0) return 0;
          
          return jStat.poisson.pdf(k, lambda);
        }
        case 'gamma': {
          const alpha = config.gamma.alpha;
          const beta = config.gamma.beta;
          
          const x = i * (alpha * beta * 3 / numBins);
          
          if (x <= 0) return 0;
          
          return jStat.gamma.pdf(x, alpha, beta);
        }
        case 'binomial': {
          const n = config.binomial.n;
          const p = config.binomial.p;
          
          const k = Math.floor(i * (n / numBins));
          
          if (k < 0 || k > n) return 0;
          
          return jStat.binomial.pdf(k, n, p);
        }
        case 'exponential': {
          const rate = config.exponential.rate;
          
          const x = i * (5 / rate / numBins);
          
          return jStat.exponential.pdf(x, rate);
        }
        case 'student-t': {
          const dof = config.student_t.dof;
          
          const meanLane = (numBins - 1) / 2;
          const x = ((i - meanLane) / (numBins / 6));
          
          return jStat.studentt.pdf(x, dof);
        }
        case 'uniform':
        default: {
          if (numBins <= 1) return 1;
          return 1 / numBins;
        }
      }
    }
    
    /**
     * Calculate distribution statistics
     * @param {string} distribution - Distribution type
     * @param {object} config - Configuration object containing distribution parameters
     * @returns {object} Object with mean and standard deviation
     */
    static calculateDistributionStats(distribution, config) {
      switch(distribution) {
        case 'normal': 
          return {
            mean: config.normal.mean,
            stdDev: config.normal.stdDev
          };
        case 'uniform': {
          const min = config.uniform.min;
          const max = config.uniform.max;
          const mean = (min + max) / 2;
          const stdDev = Math.sqrt(Math.pow(max - min, 2) / 12);
          return { mean, stdDev };
        }
        case 'poisson':
          return {
            mean: config.poisson.lambda,
            stdDev: Math.sqrt(config.poisson.lambda)
          };
        case 'gamma': {
          const mean = config.gamma.alpha * config.gamma.beta;
          const stdDev = Math.sqrt(config.gamma.alpha * config.gamma.beta * config.gamma.beta);
          return { mean, stdDev };
        }
        case 'binomial': {
          const binomialMean = config.binomial.n * config.binomial.p;
          const binomialStdDev = Math.sqrt(config.binomial.n * config.binomial.p * (1 - config.binomial.p));
          return { 
            mean: binomialMean,
            stdDev: binomialStdDev
          };
        }
        case 'exponential': {
          const rate = config.exponential.rate;
          const expMean = 1 / rate;
          const expStdDev = 1 / rate;
          return { 
            mean: expMean,
            stdDev: expStdDev
          };
        }
        case 'student-t': {
          const dof = config.student_t.dof;
          const mean = 0;
          let stdDev;
          
          if (dof > 2) {
            stdDev = Math.sqrt(dof / (dof - 2));
          } else {
            stdDev = dof > 1 ? 10 : 100; // Large but finite value for visualization
          }
          
          return { mean, stdDev };
        }
        default:
          return { mean: 0, stdDev: 1 };
      }
    }
    
    /**
     * Calculate distribution range for visualization
     * @param {string} distribution - Distribution type
     * @param {object} config - Configuration object containing distribution parameters
     * @returns {object} Object with min, max, displayMin, displayMax
     */
    static getDistributionRange(distribution, config) {
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
          const min = config.uniform.min;
          const max = config.uniform.max;
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
    
    /**
     * Generate PDF data points based on distribution
     * @param {object} rangeInfo - Range information for the distribution
     * @param {number} numPoints - Number of points to generate
     * @param {string} distribution - Distribution type
     * @param {object} config - Configuration object containing distribution parameters
     * @returns {Array} Array of {x, y} points representing the PDF
     */
    static generatePDFData(rangeInfo, numPoints, step, distribution, config) {
      const data = [];
      
      for (let i = 0; i <= numPoints; i++) {
        const x = rangeInfo.min + i * step;
        let y;
        
        switch(distribution) {
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
      
      return data;
    }
    
    /**
     * Efficiently calculate basic statistics (mean and standard deviation)
     * @param {Array} values - Array of numerical values
     * @returns {object} Object with mean and standard deviation
     */
    static calculateBasicStats(values) {
      if (!values || values.length === 0) return { mean: 0, stdDev: 0 };
      
      // Use a numerically stable algorithm for computing mean and variance (Welford's algorithm)
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
  }