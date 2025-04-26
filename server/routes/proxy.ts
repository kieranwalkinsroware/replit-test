import express, { Request, Response } from 'express';
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';
import { FalConfigError } from '../services/falai-errors';
import type { ServerResponse, IncomingMessage } from 'http';
import type { ClientRequest } from 'http';

const proxyRouter = express.Router();

/**
 * API Proxy configuration - this helps overcome network/DNS issues
 * by using the direct IP address for the Fal.ai API
 */

// This dictionary maps from API names to their direct IP addresses or alternate URLs
const API_ENDPOINTS = {
  // Fal.ai endpoint - try multiple IP addresses that could work
  'fal': 'https://api.fal.ai' // Direct URL as fallback
};

// Alternative IP addresses to try if the main one fails
const ALTERNATE_IPS = [
  'https://34.142.140.121', // Possible IP for api.fal.ai
  'https://34.142.140.122',
  'https://34.141.149.50'
];

// Check if the FAL_KEY is available, it will be needed for authenticated requests
if (!process.env.FAL_KEY) {
  throw new FalConfigError("FAL_KEY environment variable is not set");
}

// Enable logging for all proxy requests
const logProvider = () => {
  return {
    log: console.log,
    debug: console.debug,
    info: console.info,
    warn: console.warn,
    error: console.error
  };
};

// Create a proxy middleware for the Fal.ai API
proxyRouter.use('/fal-proxy/*', createProxyMiddleware({
  target: API_ENDPOINTS.fal,
  changeOrigin: true,
  pathRewrite: {
    '^/api/fal-proxy': ''  // Remove '/api/fal-proxy' and use the rest as the request path
  },
  logProvider,
  // Handle request
  onProxyReq: (proxyReq: ClientRequest, req: IncomingMessage) => {
    // Add the authorization header with the Fal API key
    proxyReq.setHeader('Authorization', `Key ${process.env.FAL_KEY || ''}`);
    
    // Log proxied requests in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[PROXY] ${req.method} ${req.url} -> ${API_ENDPOINTS.fal}${req.url?.replace('/api/fal-proxy', '')}`);
    }
  },
  // Handle errors
  onError: (err: Error, req: IncomingMessage, res: ServerResponse) => {
    console.error('[PROXY ERROR]', err);
    
    // Try to convert the response to Express response object
    const response = res as unknown as Response;
    response.status(500).json({ 
      error: 'Proxy connection error',
      message: err.message,
      details: 'There was an error connecting to the external API service',
      alternateIPs: ALTERNATE_IPS
    });
  }
}));

// Add separate routes for each alternate IP as fallbacks
ALTERNATE_IPS.forEach((ip, index) => {
  proxyRouter.use(`/fal-proxy-alt${index + 1}/*`, createProxyMiddleware({
    target: ip,
    changeOrigin: true,
    pathRewrite: {
      [`^/api/fal-proxy-alt${index + 1}`]: ''  // Remove '/api/fal-proxy-altX' and use the rest as the request path
    },
    onProxyReq: (proxyReq: ClientRequest, req: IncomingMessage) => {
      proxyReq.setHeader('Authorization', `Key ${process.env.FAL_KEY || ''}`);
      console.log(`[PROXY-ALT${index + 1}] ${req.method} ${req.url} -> ${ip}${req.url?.replace(`/api/fal-proxy-alt${index + 1}`, '')}`);
    }
  }));
});

export default proxyRouter;