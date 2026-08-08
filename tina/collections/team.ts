import type { Collection } from "tinacms";

export const TeamCollection: Collection = {
  name: "team",
  label: "Team Members",
  path: "src/content/team",
  format: "mdx",
  ui: {
    router({ document }) {
      return `/about/${document._sys.filename}/`;
    },
  },
  fields: [
    { type: "string", name: "name", label: "Name", isTitle: true, required: true },
    { type: "string", name: "role", label: "Role / Title" },
    {
      type: "string", name: "location", label: "Based In (Location)",
      description: "Agent's home market shown on the bio page and in structured data (e.g. \"Dallas, TX\"). Defaults to Northwest Houston, TX.",
    },
    {
      type: "string", name: "headline", label: "Headline",
      description: "Optional H1 override for the bio page. Wrap the italic accent phrase in **…** (e.g. Amy Lippincott, **broker and founder.**). Defaults to the agent's name.",
    },
    { type: "string", name: "phone", label: "Phone" },
    { type: "string", name: "email", label: "Email" },
    { type: "image", name: "photo", label: "Photo" },
    {
      type: "image", name: "marketLogo", label: "Market Logo",
      description: "Optional market-specific team logo (e.g. Lippincott Team Dallas) shown under the bio on the agent page.",
    },
    {
      type: "string", name: "description", label: "Meta Description (SEO)",
      ui: { component: "textarea" },
    },
    {
      type: "number", name: "order", label: "Roster Order",
      description: "Lower numbers appear first in the About page roster grid.",
    },
    {
      type: "boolean", name: "featured", label: "Show in team roster",
      description: "Include this member in the About page roster grid. Bio pages are unaffected.",
    },
    { type: "rich-text", name: "bio", label: "Bio", isBody: true },
  ],
};
