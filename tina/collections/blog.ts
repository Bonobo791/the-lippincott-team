import type { Collection } from "tinacms";
import { youTubeEmbedTemplate } from "../../src/components/mdx/YouTubeEmbed.template";

export const BlogCollection: Collection = {

  name: "blog",
  label: "Blogs",
  path: "src/content/blog",
  format: "mdx",
  ui: {
    router({ document }) {
      return `/blog/${document._sys.filename}`;
    },
  },
  fields: [
    {
      type: "string",
      name: "title",
      label: "Title",
      isTitle: true,
      required: true,
    },
    {
      name: "description",
      label: "Description",
      type: "string",
    },
    {
      name: "seoTitle",
      label: "Meta Title (SEO)",
      type: "string",
      description:
        'Overrides the meta title (the visible H1 stays the Title field). Keep under 60 characters including the brand. Falls back to "Title | The Lippincott Team".',
      ui: {
        validate: (value?: string) => {
          const length = value?.trim().length ?? 0;
          if (length > 60) {
            return `Meta titles should stay under 60 characters including the brand (currently ${length}).`;
          }
        },
      },
    },
    {
      name: "pubDate",
      label: "Publication Date",
      type: "datetime",
    },
    {
      name: "category",
      label: "Category",
      type: "string",
      options: ["Communities", "Buying", "Selling", "Pricing", "Financing", "Market", "Relocating", "Living"],
      description: "Shown as the kicker label on the blog index and article page.",
    },
    {
      name: "updatedDate",
      label: "Updated Date",
      type: "datetime",
    },
    {
      name: "heroImage",
      label: "Hero Image",
      type: "image",
    },
    {
      type: "rich-text",
      name: "body",
      label: "Body",
      isBody: true,
      templates: [youTubeEmbedTemplate],
    },
  ],
}
