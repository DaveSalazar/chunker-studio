import type { ChunkerApi } from "./index";

declare global {
  interface Window {
    chunker: ChunkerApi;
  }
}

export {};
