import "vitest"

declare module "vitest" {
  export interface ProvidedContext {
    mongoUri: string
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __MONGO_URI__: string
}
