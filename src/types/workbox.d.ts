declare module 'workbox-precaching' {
  export function precacheAndRoute(manifest: any): void;
}

declare module 'workbox-routing' {
  export function registerRoute(callback: any, handler: any): void;
}

declare module 'workbox-strategies' {
  export class StaleWhileRevalidate {
    constructor(options?: any);
  }
  export class CacheFirst {
    constructor(options?: any);
  }
}

declare module 'workbox-expiration' {
  export class ExpirationPlugin {
    constructor(options?: any);
  }
}

declare module 'workbox-cacheable-response' {
  export class CacheableResponsePlugin {
    constructor(options?: any);
  }
}

declare global {
  interface ServiceWorkerGlobalScope {
    __WB_MANIFEST: any;
  }
}

export {};
