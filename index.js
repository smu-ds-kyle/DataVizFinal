const DISTRIBUTIONS = {
  UNIFORM: 'uniform',
  NORMAL: 'normal',
  POISSON: 'poisson',
  GAMMA: 'gamma',
  BINOMIAL: 'binomial',
  EXPONENTIAL: 'exponential',
  STUDENT_T: 'student-t'
};

const DEFAULT_CONFIG = {
  numLanes: 51,
  ballSpeed: 30,
  genRate: 10,
  ballLifetime: 20,
  ballSize: 8
};

document.addEventListener('DOMContentLoaded', function() {
  const app = new SimulationApp();
  app.init();
});