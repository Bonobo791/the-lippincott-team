import type { Collection } from 'tinacms';
import { heroBlockSchema } from '../../src/components/blocks/hero.template';
import { featuresBlockSchema } from '../../src/components/blocks/features.template';
import { statsBlockSchema } from '../../src/components/blocks/stats.template';
import { ctaBlockSchema } from '../../src/components/blocks/cta.template';
import { testimonialBlockSchema } from '../../src/components/blocks/testimonial.template';
import { calloutBlockSchema } from '../../src/components/blocks/callout.template';
import { contentBlockSchema } from '../../src/components/blocks/content.template';
import { videoBlockSchema } from '../../src/components/blocks/video.template';
import { splitBlockSchema } from '../../src/components/blocks/split.template';
import { teamGridBlockSchema } from '../../src/components/blocks/teamGrid.template';
import { trustStripBlockSchema } from '../../src/components/blocks/trustStrip.template';
import { faqBlockSchema } from '../../src/components/blocks/faq.template';
import { communityGridBlockSchema } from '../../src/components/blocks/communityGrid.template';
import { contactFormBlockSchema } from '../../src/components/blocks/contactForm.template';
import { testimonialShowcaseBlockSchema } from '../../src/components/blocks/testimonialShowcase.template';
import { awardsBlockSchema } from '../../src/components/blocks/awards.template';
import { teamBannerBlockSchema } from '../../src/components/blocks/teamBanner.template';
import { guideHeroBlockSchema } from '../../src/components/blocks/guideHero.template';
import { statLedgerBlockSchema } from '../../src/components/blocks/statLedger.template';
import { priceLadderBlockSchema } from '../../src/components/blocks/priceLadder.template';
import { calloutRailBlockSchema } from '../../src/components/blocks/calloutRail.template';
import { dataTableBlockSchema } from '../../src/components/blocks/dataTable.template';
import { photoCardGridBlockSchema } from '../../src/components/blocks/photoCardGrid.template';
import { categoryTilesBlockSchema } from '../../src/components/blocks/categoryTiles.template';
import { routeLedgerBlockSchema } from '../../src/components/blocks/routeLedger.template';
import { tradeOffsBlockSchema } from '../../src/components/blocks/tradeOffs.template';
import { notePanelBlockSchema } from '../../src/components/blocks/notePanel.template';
import { proofStageBlockSchema } from '../../src/components/blocks/proofStage.template';
import { relatedChipsBlockSchema } from '../../src/components/blocks/relatedChips.template';
import { guideCtaBlockSchema } from '../../src/components/blocks/guideCta.template';

export const PageCollection: Collection = {
	name: 'page',
	label: 'Pages',
	path: 'src/content/page',
	format: 'mdx',
	ui: {
		router: ({ document }) => `/${document._sys.filename}`,
	},
	fields: [
		{
			name: 'seoTitle',
			label: 'Meta Title (SEO)',
			type: 'string',
			isTitle: true,
			required: true,
			description:
				"Shown in the browser tab and search results — not on the page itself. To change the heading visitors see at the top of the page, edit the Headline of the page's Hero block (if it has one) in Page Sections below.",
		},
		{
			type: 'object',
			list: true,
			name: 'blocks',
			label: 'Page Sections',
			description:
				"The visible content of the page. When the page starts with a Hero block, its Headline is the main on-page heading — edit that to change what visitors see at the top.",
			ui: { visualSelector: true },
			templates: [
				heroBlockSchema,
				calloutBlockSchema,
				featuresBlockSchema,
				statsBlockSchema,
				ctaBlockSchema,
				contentBlockSchema,
				testimonialBlockSchema,
				videoBlockSchema,
				splitBlockSchema,
				teamGridBlockSchema,
				trustStripBlockSchema,
				faqBlockSchema,
				communityGridBlockSchema,
				contactFormBlockSchema,
				testimonialShowcaseBlockSchema,
				awardsBlockSchema,
				teamBannerBlockSchema,
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
	],
};
