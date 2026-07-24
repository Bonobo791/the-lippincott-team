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
    { type: "string", name: "phone", label: "Phone" },
    { type: "string", name: "email", label: "Email" },
    { type: "image", name: "photo", label: "Photo" },
    {
      type: "string", name: "description", label: "Meta Description (SEO)",
      ui: { component: "textarea" },
    },
    {
      type: "number", name: "order", label: "Roster Order",
      description: "Lower numbers appear first in the About page roster grid.",
    },
    { type: "rich-text", name: "bio", label: "Bio", isBody: true },
  ],
};
