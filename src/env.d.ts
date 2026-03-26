/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly GITHUB_CLIENT_ID: string;
  readonly GITHUB_CLIENT_SECRET: string;
  readonly SITE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace App {
  interface Locals {
    session?: import("./lib/types").GitHubSession;
  }
}
