import type { Collection, TinaField } from "tinacms";
import { labelLinkFields } from "../schema-fields";

const agentChipList = (name: string, label: string, description: string): TinaField => ({
  name, label, type: "object", list: true, description,
  ui: { itemProps: (item) => ({ label: item.label }) },
  fields: labelLinkFields(true),
});

const linkButtonField = (
  name: string, label: string, description: string, linkDescription: string,
): TinaField => ({
  name, label, description, type: "object",
  fields: labelLinkFields(false, linkDescription),
});

export const GlobalConfigCollection: Collection = {
  name: "config",
  label: "Global Config",
  path: "src/content/config",
  format: "json",
  ui: {
    global: true,
  },
  fields: [
    {
      name: "seo",
      label: "Site Identity & SEO",
      description:
        "Site-wide identity. These values appear on every page — the Site Name is shown in the header navigation and used as the default browser title; the Description is the default for search results and social shares.",
      type: "object",
      fields: [
        {
          name: "title",
          label: "Site Name",
          type: "string",
          required: true,
          description:
            "Shown in the header navigation on every page. Lives in Global Config because it's the same site-wide — each page sets its own browser title via the Meta Title field on the page, and this Site Name is used as the fallback if a page is ever missing one.",
        },
        {
          name: "description",
          label: "Default Meta Description (SEO)",
          type: "string",
          required: true,
          description:
            "Default description shown in search results and social-sharing previews when a page does not provide its own.",
        },
        {
          name: "siteOwner",
          label: "Site Owner (shown in footer)",
          required: true,
          type: "string",
          description: "Your name or company name. Displayed in the site footer.",
          ui: {
            defaultValue: "Your name here"
          },
        },
        {
          name: 'logo',
          label: 'Logo',
          type: 'image',
          description: 'Shown next to the Site Name in the header navigation.',
        },
        {
          name: 'brandSubtitle',
          label: 'Brokerage Subtitle',
          type: 'string',
          description: 'Small line under the site name in the header and footer (e.g. "eXp Realty").',
        },
        {
          name: 'socialImage',
          label: 'Default Social Share Image',
          type: 'image',
          description: "Fallback Open Graph/Twitter card image for pages that don't set their own.",
        }
        //Add more site settings here...
      ],
    },
    linkButtonField("headerCta", "Header Button",
      "The red button at the right end of the header navigation (desktop and mobile menu).",
      "e.g. /contact-us/"),
    linkButtonField("preferredSources", '"Add to Preferred Sources" Button',
      "Google Preferred Sources link shown in the footer and at the top of blog articles.",
      "e.g. https://www.google.com/preferences/source?q=yourdomain.com"),
    {
      name: "legalLinks",
      label: "Legal Links",
      description: "Privacy/terms links shown in the footer Resources column and the bottom legal row.",
      type: "object",
      list: true,
      ui: {
        itemProps: (item) => ({ label: item.title }),
      },
      fields: [
        { name: "title", label: "Link Label", type: "string", required: true },
        { name: "link", label: "Link URL", type: "string", required: true },
      ],
    },
    {
      name: "agentPages",
      label: "Agent Bio Pages",
      description:
        "Shared copy on the /about/<name>/ bio pages. Use {name} where the agent's first name should appear; wrap the italic accent phrase in **…**.",
      type: "object",
      fields: [
        { name: "eyebrow", label: "Eyebrow", type: "string", description: 'Small label above the agent\'s name (e.g. "Meet your local expert").' },
        { name: "workHeading", label: "Contact Section Heading", type: "string", description: 'Heading above the contact ledger, e.g. "Work with **{name} directly.**"' },
        { name: "teamHeading", label: "Teammates Section Heading", type: "string" },
        agentChipList("leadChips", "Leading Team Chips",
          "Fixed links shown before the teammate chips (e.g. \"Full roster\")."),
        agentChipList("chips", "Extra Team Chips",
          "Fixed links in the teammates chips row (the current agent's teammates are added automatically before these)."),
        { name: "ctaHeading", label: "Bottom CTA Heading", type: "string" },
        { name: "ctaBody", label: "Bottom CTA Text", type: "string", ui: { component: "textarea" } },
        {
          name: "proof",
          label: "Proof Band",
          description: "The dark metrics band in the middle of every agent bio page.",
          type: "object",
          fields: [
            { name: "eyebrow", label: "Eyebrow", type: "string" },
            { name: "title", label: "Heading", type: "string", description: "Wrap the accent phrase in **…**." },
            {
              name: "metrics", label: "Metrics", type: "object", list: true,
              ui: { itemProps: (item) => ({ label: item.label }) },
              fields: [
                { name: "value", label: "Number", type: "number", required: true },
                { name: "suffix", label: "Suffix", type: "string", description: 'e.g. "+", "×"' },
                { name: "label", label: "Label", type: "string" },
                { name: "source", label: "Source Note", type: "string" },
              ],
            },
          ],
        },
      ],
    },
    {
      name: "blogPost",
      label: "Blog Article Page",
      description: "Shared copy on /blog/<post>/ article pages.",
      type: "object",
      fields: [
        { name: "shortAnswerLabel", label: '"The short answer" Label', type: "string" },
        { name: "tocLabel", label: "Table-of-Contents Label", type: "string" },
        { name: "aboutAuthorLabel", label: '"About the author" Label', type: "string" },
        { name: "relatedEyebrow", label: "Related Reads Eyebrow", type: "string" },
        { name: "relatedHeading", label: "Related Reads Heading", type: "string", description: "Wrap the accent phrase in **…**." },
        { name: "ctaTitle", label: "Inline CTA Heading", type: "string", description: "The consultation panel at the end of every article." },
        { name: "ctaBody", label: "Inline CTA Text", type: "string", ui: { component: "textarea" } },
        { name: "ctaLabel", label: "Inline CTA Button Label", type: "string" },
        { name: "ctaLink", label: "Inline CTA Button Link", type: "string" },
      ],
    },
    {
      name: "marketTable",
      label: "Market Comparison Table",
      description:
        "Labels for the \"Northwest Houston at a Glance\" table shown on the home, buy and sell pages. The rows themselves come from the Communities data table on the Northwest Houston page.",
      type: "object",
      fields: [
        { name: "heading", label: "Heading", type: "string" },
        { name: "caption", label: "Screen-Reader Caption", type: "string" },
        { name: "areaLabel", label: 'Column: "Area"', type: "string" },
        { name: "medianLabel", label: 'Column: "Median list"', type: "string" },
        { name: "daysLabel", label: 'Column: "Days on market"', type: "string" },
        { name: "linkLabel", label: "Footer Link Label", type: "string" },
        { name: "link", label: "Footer Link URL", type: "string", description: "e.g. /northwest-houston-real-estate/#communities" },
      ],
    },
    {
      name: "nav",
      label: "Navigation Menu",
      description:
        "Links shown in the header navigation. Reorder, add, or remove items below. The Site Name shown to the left of these links is set in Site Identity & SEO above.",
      type: "object",
      list: true,
      ui: {
        itemProps: (item) => {
          return {
            label: item.title
          };
        },
      },
      fields: [
        {
          name: "title",
          label: "Link Label",
          description: "The text shown in the nav for this link.",
          type: "string",
          required: true
        },
        {
          name: "link",
          label: "Link URL",
          description: "Where this nav item points (e.g. /about or https://example.com).",
          type: "string",
          required: true

        },
        {
          name: "children",
          label: "Dropdown Links",
          description:
            "Optional. When set, this nav item shows a dropdown of these links instead of being a plain link.",
          type: "object",
          list: true,
          ui: {
            itemProps: (item) => {
              return {
                label: item.title
              };
            },
          },
          fields: [
            {
              name: "title",
              label: "Link Label",
              type: "string",
              required: true
            },
            {
              name: "link",
              label: "Link URL",
              type: "string",
              required: true
            },
            {
              name: "children",
              label: "Nested Dropdown Links",
              description: "Optional. Use for neighborhoods or other links grouped under this community.",
              type: "object",
              list: true,
              ui: {
                itemProps: (item) => {
                  return {
                    label: item.title
                  };
                },
              },
              fields: [
                {
                  name: "title",
                  label: "Link Label",
                  type: "string",
                  required: true
                },
                {
                  name: "link",
                  label: "Link URL",
                  type: "string",
                  required: true
                }
              ]
            }
          ]
        }
      ]
    },
    {
      name: "contactLinks",
      label: "Contact Links",
      type: "object",
      list: true,
      ui: {
        itemProps: (item) => {
          return {
            label: item.title
          }
        },
      },
      fields: [
        {
          name: "title",
          label: "Title",
          type: "string"
        },
        {
          name: "link",
          label: "Link",
          type: "string"
        },
        {
          name: "icon",
          label: "Icon",
          description: "Any Tabler icon name, e.g. tabler:brand-x, tabler:book-2, tabler:brand-github. Browse at https://icones.js.org/collection/tabler",
          type: "string"
        }
      ],
    },
    {
      name: "contact",
      label: "Contact Info",
      description:
        "Office address, phone, and email. Shown in the footer Contact section; the phone also appears in the header top bar.",
      type: "object",
      fields: [
        {
          name: "address",
          label: "Office Address",
          type: "string",
          description: "One line per address line — lines render separated by a line break.",
          ui: {
            component: "textarea"
          }
        },
        {
          name: "phone",
          label: "Phone Number",
          type: "string",
          description: "Display format, e.g. 713-494-1818. The tel: link is derived from the digits."
        },
        {
          name: "email",
          label: "Email",
          type: "string",
          description: "Shown in the footer Contact section."
        }
      ],
    },
    {
      name: "footerBlurb",
      label: "Footer Blurb",
      description: "Short brokerage/about paragraph shown in the site footer.",
      type: "string",
      ui: {
        component: "textarea"
      }
    },

    // Add other config fields here...
  ]
}
