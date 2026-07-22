declare module 'workbox-core' {
  export interface FetchEvent extends Event {
    request: Request;
  }
}

export {};
