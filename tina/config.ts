import { defineConfig } from "tinacms";

// The tinacms CLI runs this file in plain Node, so .env is not auto-loaded —
// load it explicitly for local builds (Node >= 20.6). Hosted builds (Netlify
// etc.) inject these vars into the process env instead.
try {
  process.loadEnvFile();
} catch {
  // no .env file present (e.g. CI) — rely on the process environment
}

import { BlogCollection } from "./collections/blog";
import { CommunityCollection } from "./collections/community";
import { GlobalConfigCollection } from "./collections/global-config";
import { PageCollection } from "./collections/page";
import { TeamCollection } from "./collections/team";

// Your hosting provider likely exposes this as an environment variable
const branch =
  process.env.GITHUB_BRANCH ||
  process.env.VERCEL_GIT_COMMIT_REF ||
  process.env.WORKERS_CI_BRANCH || // Cloudflare Workers Builds
  process.env.CF_PAGES_BRANCH || // Cloudflare Pages
  process.env.HEAD || // Netlify
  process.env.COOLIFY_BRANCH || // Coolify (injected into builds/containers)
  "main";

export default defineConfig({
  branch,

  // Get this from tina.io
  clientId: process.env.PUBLIC_TINA_CLIENT_ID,
  // Get this from tina.io
  token: process.env.TINA_TOKEN,

  build: {
    outputFolder: "admin",
    publicFolder: "public",
  },
  media: {
    tina: {
      mediaRoot: "",
      publicFolder: "public",
    },
  },
  // See docs on content modeling for more info on how to setup new content models: https://tina.io/docs/schema/
  schema: {
    collections: [
      BlogCollection,
      PageCollection,
      TeamCollection,
      CommunityCollection,
      GlobalConfigCollection,
    ],
  },
});
