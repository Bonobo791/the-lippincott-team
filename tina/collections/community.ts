import type { Collection } from "tinacms";
import { heroBlockSchema } from "../../src/components/blocks/hero.template";
import { splitBlockSchema } from "../../src/components/blocks/split.template";
import { featuresBlockSchema } from "../../src/components/blocks/features.template";
import { statsBlockSchema } from "../../src/components/blocks/stats.template";
import { contentBlockSchema } from "../../src/components/blocks/content.template";
import { faqBlockSchema } from "../../src/components/blocks/faq.template";
import { ctaBlockSchema } from "../../src/components/blocks/cta.template";

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
    {
      type: "object", list: true, name: "blocks", label: "Page Sections",
      ui: { visualSelector: true },
      templates: [
        heroBlockSchema,
        splitBlockSchema,
        featuresBlockSchema,
        statsBlockSchema,
        contentBlockSchema,
        faqBlockSchema,
        ctaBlockSchema,
      ],
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
