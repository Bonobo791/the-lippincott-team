import type { Collection } from "tinacms";

export const CommunityCollection: Collection = {
  name: "community",
  label: "Communities & Schools",
  path: "src/content/community",
  format: "mdx",
  ui: {
    router({ document }) {
      return `/${document._sys.breadcrumbs.join("/")}/`;
    },
  },
  fields: [
    { type: "string", name: "title", label: "Title", isTitle: true, required: true },
    {
      type: "string", name: "description", label: "Meta Description (SEO)",
      ui: { component: "textarea" },
    },
    { type: "image", name: "heroImage", label: "Hero Image" },
    {
      type: "string", name: "intro", label: "Intro",
      ui: { component: "textarea" },
    },
    { type: "rich-text", name: "body", label: "Body", isBody: true },
    {
      type: "object", name: "faqs", label: "FAQs", list: true,
      ui: {
        itemProps: (item) => {
          return { label: item.question };
        },
      },
      fields: [
        { type: "string", name: "question", label: "Question", required: true },
        { type: "rich-text", name: "answer", label: "Answer" },
      ],
    },
  ],
};
