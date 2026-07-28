import type { Collection } from "tinacms";
import { heroBlockSchema } from "../../src/components/blocks/hero.template";
import { splitBlockSchema } from "../../src/components/blocks/split.template";
import { featuresBlockSchema } from "../../src/components/blocks/features.template";
import { statsBlockSchema } from "../../src/components/blocks/stats.template";
import { contentBlockSchema } from "../../src/components/blocks/content.template";
import { faqBlockSchema } from "../../src/components/blocks/faq.template";
import { ctaBlockSchema } from "../../src/components/blocks/cta.template";
import { guideHeroBlockSchema } from "../../src/components/blocks/guideHero.template";
import { statLedgerBlockSchema } from "../../src/components/blocks/statLedger.template";
import { priceLadderBlockSchema } from "../../src/components/blocks/priceLadder.template";
import { calloutRailBlockSchema } from "../../src/components/blocks/calloutRail.template";
import { dataTableBlockSchema } from "../../src/components/blocks/dataTable.template";
import { photoCardGridBlockSchema } from "../../src/components/blocks/photoCardGrid.template";
import { categoryTilesBlockSchema } from "../../src/components/blocks/categoryTiles.template";
import { routeLedgerBlockSchema } from "../../src/components/blocks/routeLedger.template";
import { tradeOffsBlockSchema } from "../../src/components/blocks/tradeOffs.template";
import { notePanelBlockSchema } from "../../src/components/blocks/notePanel.template";
import { proofStageBlockSchema } from "../../src/components/blocks/proofStage.template";
import { relatedChipsBlockSchema } from "../../src/components/blocks/relatedChips.template";
import { guideCtaBlockSchema } from "../../src/components/blocks/guideCta.template";

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
        guideHeroBlockSchema,
        statLedgerBlockSchema,
        priceLadderBlockSchema,
        calloutRailBlockSchema,
        dataTableBlockSchema,
        photoCardGridBlockSchema,
        categoryTilesBlockSchema,
        routeLedgerBlockSchema,
        tradeOffsBlockSchema,
        notePanelBlockSchema,
        proofStageBlockSchema,
        relatedChipsBlockSchema,
        guideCtaBlockSchema,
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
