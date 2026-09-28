/// <reference types="vite/client" />
declare module "virtual:viewer-identity" {
  const identity: { sha256: string; mode: string };
  export default identity;
}
