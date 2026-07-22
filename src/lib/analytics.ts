// src/lib/analytics.ts
import ReactGA from 'react-ga4';

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || '';

export const initGA = () => {
  if (GA_MEASUREMENT_ID && import.meta.env.PROD) {
    ReactGA.initialize(GA_MEASUREMENT_ID);
    console.log('✅ Google Analytics initialized');
  }
};

export const trackPageView = (path: string, title?: string) => {
  if (import.meta.env.PROD && GA_MEASUREMENT_ID) {
    ReactGA.send({ hitType: 'pageview', page: path, title });
  }
};

export const trackEvent = (category: string, action: string, label?: string, value?: number) => {
  if (import.meta.env.PROD && GA_MEASUREMENT_ID) {
    ReactGA.event({ category, action, label, value });
  }
};

export const trackError = (error: Error, context?: string) => {
  trackEvent('Error', error.name, `${context || 'App'}: ${error.message}`);
};