// lib/mock-data/index.ts
// Centralized mock data registry for all API routes.

import riskCritical from './risk-critical.json';
import riskSafe from './risk-safe.json';
import riskMedium from './risk-medium.json';
import genesisCyberbrew from './genesis-cyberbrew.json';
import monitor84 from './monitor-84percent.json';

export const MOCK_RESPONSES = {
  // Risk Engine mock responses
  'risk-critical': riskCritical,
  'risk-safe': riskSafe,
  'risk-medium': riskMedium,

  // Token Genesis mock response
  'genesis-cyberbrew': genesisCyberbrew,

  // Dividend Monitor mock response
  'monitor-84percent': monitor84,
} as const;

// Default mock responses per endpoint
export const MOCK_DEFAULTS = {
  '/api/risk/scan': riskCritical,      // Show the scary one by default for demo
  '/api/genesis/generate': genesisCyberbrew,
  '/api/monitor/poll': monitor84,
} as const;

export {
  riskCritical,
  riskSafe,
  riskMedium,
  genesisCyberbrew,
  monitor84,
};
