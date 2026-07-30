/**
 * Per-collection data loaders + the data shapes they return.
 *
 * Loaders call the generated Tina client and pipe the result through
 * `requestWithMetadata()` so the editor overlay flows in when the page
 * renders inside the admin iframe and `tinaField()` has its metadata.
 *
 * Types below are pure derivations — no hand-written shapes. Each one is
 * either inferred from a loader's return type (`CmsConfig`/`CmsPage`/
 * `CmsBlog`) or `Extract`/index-accessed off those. The Tina collection
 * is the source of truth; regen with `tinacms dev` and everything
 * downstream updates.
 */
import type { TinaRichTextContent } from '@tinacms/astro';
import { requestWithMetadata } from '@tinacms/astro/data';
import client from '../../tina/__generated__/client';

/**
 * Reject slugs that could escape the content directory when interpolated
 * into a relativePath (the /tina-island endpoint takes these from the URL).
 */
const assertSafePath = (value: string) => {
	if (value.includes('..') || value.includes('\\') || value.startsWith('/'))
		throw new Error(`Unsafe content path: ${value}`);
};

// Memoized: the config is site-global and several consumers (Base chrome,
// ContactForm rail) need it per page — one in-flight/resolved promise serves
// them all instead of a Tina query per consumer. Content can't change
// mid-build; in dev the seeded-cache workflow already expects a restart.
const fetchConfig = () =>
	requestWithMetadata(client.queries.config({ relativePath: 'config.json' }));
let configCache: ReturnType<typeof fetchConfig> | null = null;
export const getConfig = () => (configCache ??= fetchConfig());

export const getPage = (slug: string) => {
	assertSafePath(slug);
	return requestWithMetadata(client.queries.page({ relativePath: `${slug}.mdx` }), { priority: 'primary' });
};

export const getBlog = (slug: string) => {
	assertSafePath(slug);
	return requestWithMetadata(client.queries.blog({ relativePath: `${slug}.mdx` }), { priority: 'primary' });
};

export async function listPages() {
	const result = await client.queries.pageConnection();
	return (result.data.pageConnection.edges ?? [])
		.flatMap((edge) => (edge?.node ? [edge.node] : []));
}

export async function listBlogs() {
	const result = await client.queries.blogConnection();
	return (result.data.blogConnection.edges ?? [])
		.flatMap((edge) => (edge?.node ? [edge.node] : []))
		.sort((a, b) => {
			const ad = a.pubDate ? new Date(a.pubDate).valueOf() : 0;
			const bd = b.pubDate ? new Date(b.pubDate).valueOf() : 0;
			return bd - ad;
		});
}

export const getTeamMember = (slug: string) => {
	assertSafePath(slug);
	return requestWithMetadata(client.queries.team({ relativePath: `${slug}.mdx` }), { priority: 'primary' });
};

export async function listTeam() {
	const result = await client.queries.teamConnection();
	return (result.data.teamConnection.edges ?? [])
		.flatMap((edge) => (edge?.node ? [edge.node] : []))
		.sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || (a.name ?? '').localeCompare(b.name ?? ''));
}

export const getCommunity = (path: string) => {
	assertSafePath(path);
	return requestWithMetadata(client.queries.community({ relativePath: `${path}.mdx` }), { priority: 'primary' });
};

export async function listCommunities() {
	const result = await client.queries.communityConnection();
	return (result.data.communityConnection.edges ?? [])
		.flatMap((edge) => (edge?.node ? [edge.node] : []));
}

/** Public URL path of a community doc, e.g. "northwest-houston-real-estate/cypress-tx-real-estate". */
export const communityPath = (node: { _sys: { breadcrumbs: string[] } }) => node._sys.breadcrumbs.join('/');

export type CmsConfig = Awaited<ReturnType<typeof getConfig>>['data']['config'];
export type CmsPage = Awaited<ReturnType<typeof getPage>>['data']['page'];
export type CmsBlog = Awaited<ReturnType<typeof getBlog>>['data']['blog'];
export type CmsTeam = Awaited<ReturnType<typeof getTeamMember>>['data']['team'];

export type CmsCommunity = Awaited<ReturnType<typeof getCommunity>>['data']['community'];
export type CommunityFaq = NonNullable<NonNullable<CmsCommunity['faqs']>[number]>;

export type PageBlock = NonNullable<NonNullable<CmsPage['blocks']>[number]>;
export type PageBlockTypename = PageBlock['__typename'];
export type CommunityBlock = NonNullable<NonNullable<CmsCommunity['blocks']>[number]>;

export type HeroBlock = Extract<PageBlock, { __typename: 'PageBlocksHero' }>;
export type CalloutBlock = Extract<PageBlock, { __typename: 'PageBlocksCallout' }>;
export type FeaturesBlock = Extract<PageBlock, { __typename: 'PageBlocksFeatures' }>;
export type StatsBlock = Extract<PageBlock, { __typename: 'PageBlocksStats' }>;
export type CtaBlock = Extract<PageBlock, { __typename: 'PageBlocksCta' }>;
export type ContentBlock = Extract<PageBlock, { __typename: 'PageBlocksContent' }>;
export type TestimonialBlock = Extract<PageBlock, { __typename: 'PageBlocksTestimonial' }>;
export type VideoBlock = Extract<PageBlock, { __typename: 'PageBlocksVideo' }>;
export type SplitBlock = Extract<PageBlock, { __typename: 'PageBlocksSplit' }>;
export type TeamGridBlock = Extract<PageBlock, { __typename: 'PageBlocksTeamGrid' }>;
export type FaqBlock = Extract<PageBlock, { __typename: 'PageBlocksFaq' }>;
export type CommunityGridBlock = Extract<PageBlock, { __typename: 'PageBlocksCommunityGrid' }>;
export type ContactFormBlock = Extract<PageBlock, { __typename: 'PageBlocksContactForm' }>;
export type FaqItem = NonNullable<NonNullable<FaqBlock['items']>[number]>;

// Community guide blocks (shared by the page and community collections).
export type GuideHeroBlock = Extract<PageBlock, { __typename: 'PageBlocksGuideHero' }>;
export type StatLedgerBlock = Extract<PageBlock, { __typename: 'PageBlocksStatLedger' }>;
export type PriceLadderBlock = Extract<PageBlock, { __typename: 'PageBlocksPriceLadder' }>;
export type CalloutRailBlock = Extract<PageBlock, { __typename: 'PageBlocksCalloutRail' }>;
export type DataTableBlock = Extract<PageBlock, { __typename: 'PageBlocksDataTable' }>;
export type PhotoCardGridBlock = Extract<PageBlock, { __typename: 'PageBlocksPhotoCardGrid' }>;
export type CategoryTilesBlock = Extract<PageBlock, { __typename: 'PageBlocksCategoryTiles' }>;
export type RouteLedgerBlock = Extract<PageBlock, { __typename: 'PageBlocksRouteLedger' }>;
export type TradeOffsBlock = Extract<PageBlock, { __typename: 'PageBlocksTradeOffs' }>;
export type NotePanelBlock = Extract<PageBlock, { __typename: 'PageBlocksNotePanel' }>;
export type ProofStageBlock = Extract<PageBlock, { __typename: 'PageBlocksProofStage' }>;
export type RelatedChipsBlock = Extract<PageBlock, { __typename: 'PageBlocksRelatedChips' }>;
export type GuideCtaBlock = Extract<PageBlock, { __typename: 'PageBlocksGuideCta' }>;
export type ChecklistSplitBlock = Extract<PageBlock, { __typename: 'PageBlocksChecklistSplit' }>;
export type StepsSplitBlock = Extract<PageBlock, { __typename: 'PageBlocksStepsSplit' }>;

export type CmsConfigNav = NonNullable<NonNullable<CmsConfig['nav']>[number]>;
export type CmsConfigNavChild = NonNullable<NonNullable<CmsConfigNav['children']>[number]>;
export type CmsConfigContactLink = NonNullable<NonNullable<CmsConfig['contactLinks']>[number]>;
export type CmsConfigSeo = NonNullable<CmsConfig['seo']>;

export type Action = NonNullable<NonNullable<HeroBlock['actions']>[number]>;
export type ImageField = NonNullable<HeroBlock['image']>;
export type FeatureItem = NonNullable<NonNullable<FeaturesBlock['items']>[number]>;
export type StatItem = NonNullable<NonNullable<StatsBlock['stats']>[number]>;
export type TestimonialItem = NonNullable<NonNullable<TestimonialBlock['testimonials']>[number]>;

/** Tina rich-text bodies are typed as `any` in the generated client; this is what `<TinaMarkdown>` expects. */
export type RichText = TinaRichTextContent;
