# Plan 2: Schema, Blocks & Routes (team/community collections)

**Spec:** `docs/superpowers/specs/2026-07-24-wordpress-to-astro-tina-migration-design.md` (Section 2).
**Builds on:** Plan 1 (merged via PR #3). Local `feat/lippincott-restyle` is fully merged into `origin/main` — start a fresh branch from `origin/main`.
**Execution:** subagent-driven-development, same as Plan 1. First execution step: copy this file to `docs/superpowers/plans/2026-07-24-schema-blocks-routes.md`, commit it on the new branch.

**Goal:** Add the `team` and `community` Tina collections, their routes (`/about/<slug>/`, `/northwest-houston-real-estate/*`, `/northwest-houston-schools-real-estate/*`), visual-editing islands, and three new blocks (FAQ accordion, team roster grid, community card grid). Build stays green throughout; real content arrives in Plan 3.

**Spec deviations (deliberate, minor):**
- Spec's "VideoEmbed block" is **not built** — the existing `video` block already does YouTube (click-to-load facade), Vimeo, and arbitrary 16:9 embeds (`src/components/blocks/Video.astro`). Nothing to add.
- Hub pages stay in the flat `page` collection (single-segment filenames like `northwest-houston-real-estate.mdx` work with the existing catch-all route) — matches the spec.

## Verified codebase facts (from reading current source)

- Collections live in `tina/collections/`, registered in `tina/config.ts` `schema.collections` array: `[BlogCollection, PageCollection, GlobalConfigCollection]`.
- Collection pattern (`tina/collections/blog.ts`): `name`, `path: "src/content/blog"`, `format: "mdx"`, `ui.router({ document })`, `fields`. Rich-text body uses `isBody: true`.
- `src/lib/data.ts`: loaders use `requestWithMetadata(client.queries.X(...))` for single docs, plain `client.queries.xConnection()` for lists; all types are `Awaited<ReturnType<...>>` derivations or `Extract<PageBlock, { __typename: '...' }>`.
- `src/lib/islands.ts`: registry entries `{ fetch, component, wrapper: { tag }, propsFromData }`; query types imported from `../../tina/__generated__/types`.
- Route pattern (`src/pages/blog/[...slug].astro`): `getStaticPaths` from list loader → `{ params: { slug: node._sys.filename } }`; page renders `<Layout><TinaIsland name=... params={{ slug }} primary><Body data={data} /></TinaIsland></Layout>`; 404 via `return new Response('Not Found', { status: 404 })`.
- `Base` layout props: `{ title: string; description: string; image?: string }`.
- Nested Tina files: `_sys.breadcrumbs` = path segments relative to collection root, last = filename (no extension). For `src/content/community/northwest-houston-real-estate/cypress-tx-real-estate.mdx` → `['northwest-houston-real-estate', 'cypress-tx-real-estate']`. URL = `'/' + breadcrumbs.join('/') + '/'`.
- Routing: the new prefix routes (`about/[...slug].astro` etc.) only generate their member paths in `getStaticPaths`, so `/about/` and `/northwest-houston-real-estate/` themselves remain owned by the flat page collection — no conflicts.
- Block pair convention: `src/components/blocks/<Name>.astro` + `<name>.template.ts` exporting `const <name>BlockSchema: Template`; registered in `tina/collections/page.ts` `templates` array; dispatched in `Blocks.astro` switch on `__typename` (`PageBlocks<PascalCase>`); `__typename` for `teamGrid` → `PageBlocksTeamGrid`, `communityGrid` → `PageBlocksCommunityGrid`, `faq` → `PageBlocksFaq`.
- Existing UI: `Section.astro` (`<Section class="...">`, props `background?`), `cn()` at `src/lib/cn`, `mdxComponents` at `src/components/mdx/components.ts`, `Icon` from `astro-icon/components` (Tabler names).
- `tsconfig.json` excludes `tina/collections` — loose typing in template `itemProps` is fine.
- Tina field names: letters/numbers/underscores only. Verification: `pnpm build:local` exit 0 (regenerates gitignored `tina/__generated__/`). No test suite.

## Global Constraints

- pnpm only; `pnpm build:local` must pass after every task; `npx astro check` clean at the end. **Note:** `pnpm build:local` is a per-task *gate* only — visual/frontend iteration (screenshot fix-and-reshoot rounds) should run against `npx astro dev` (not `pnpm dev`), not rebuilds; see the `visual-loop` skill.
- Types in `src/lib/data.ts` are pure derivations — never hand-write content shapes.
- Every editable element gets `data-tina-field={tinaField(data, 'fieldName')}`; list items get bare `tinaField(item)`; nullable Tina lists guarded with `?? []` + `.filter(x => x !== null)`.
- `tina/__generated__/` is gitignored — never hand-edit, never commit.
- Commit `tina/tina-lock.json` when the build regenerates it (via `git add -A`).
- No React; interactivity is vanilla JS or zero-JS (`<details>`).

---

### Task 0: Branch setup

```bash
git checkout main && git pull
git checkout -b feat/lippincott-schema
```

Copy this plan to `docs/superpowers/plans/2026-07-24-schema-blocks-routes.md` and commit:
`git add docs/superpowers/plans && git commit -m "docs: add plan 2 (schema, blocks, routes)"`

---

### Task 1: Team collection + loaders + sample entry

**Files:**
- Create: `tina/collections/team.ts`
- Modify: `tina/config.ts` (register collection)
- Modify: `src/lib/data.ts` (loaders + types)
- Create: `src/content/team/amy-lippincott-2.mdx` (sample; real content in Plan 3)

**Step 1 — `tina/collections/team.ts`:**

```ts
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
```

**Step 2 — register in `tina/config.ts`:** add `import { TeamCollection } from "./collections/team";` (matching the existing import style) and add `TeamCollection` to the `collections` array after `PageCollection`.

**Step 3 — `src/lib/data.ts` additions** (after the `listBlogs` function):

```ts
export const getTeamMember = (slug: string) =>
	requestWithMetadata(client.queries.team({ relativePath: `${slug}.mdx` }), { priority: 'primary' });

export async function listTeam() {
	const result = await client.queries.teamConnection();
	return (result.data.teamConnection.edges ?? [])
		.flatMap((edge) => (edge?.node ? [edge.node] : []))
		.sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || (a.name ?? '').localeCompare(b.name ?? ''));
}
```

and after the `CmsBlog` type:

```ts
export type CmsTeam = Awaited<ReturnType<typeof getTeamMember>>['data']['team'];
```

**Step 4 — sample entry `src/content/team/amy-lippincott-2.mdx`:**

```mdx
---
name: Amy Lippincott
role: Team Lead / Realtor
phone: 713-494-1818
email: amy@lippincottteam.com
description: Amy Lippincott, Team Lead of The Lippincott Team at eXp Realty.
order: 1
---

Sample bio — replaced by migrated content in Plan 3.
```

**Step 5 — verify:** `pnpm build:local` exit 0 (regenerates client with `team` queries).

**Step 6 — commit:** `git add -A && git commit -m "feat: add team collection with loaders"`

---

### Task 2: Team route + TeamBody island

**Files:**
- Create: `src/components/islands/TeamBody.astro`
- Create: `src/pages/about/[...slug].astro`
- Modify: `src/lib/islands.ts`

**Step 1 — `src/components/islands/TeamBody.astro`:**

```astro
---
import TinaMarkdown from '@tinacms/astro/TinaMarkdown.astro';
import { tinaField } from '@tinacms/astro/tina-field';
import { Icon } from 'astro-icon/components';
import type { CmsTeam } from '../../lib/data';
import { mdxComponents } from '../mdx/components';

interface Props { data?: CmsTeam | null }

const { data } = Astro.props;
---
{data && (
	<div class="mx-auto max-w-4xl px-6 py-12">
		<div class="flex flex-col items-start gap-8 md:flex-row">
			{data.photo && (
				<img src={data.photo} alt={data.name ?? ''} width={400} height={400} data-tina-field={tinaField(data, 'photo')} class="w-full max-w-xs rounded-2xl border object-cover" />
			)}
			<div class="flex-1">
				<h1 data-tina-field={tinaField(data, 'name')} class="text-4xl font-semibold tracking-tight">{data.name}</h1>
				{data.role && <p data-tina-field={tinaField(data, 'role')} class="mt-1 text-lg text-muted-foreground">{data.role}</p>}
				<div class="mt-4 flex flex-col gap-2 text-sm">
					{data.phone && (
						<a href={`tel:${data.phone}`} data-tina-field={tinaField(data, 'phone')} class="inline-flex items-center gap-2 transition-colors hover:text-primary">
							<Icon name="tabler:phone" class="size-4" />{data.phone}
						</a>
					)}
					{data.email && (
						<a href={`mailto:${data.email}`} data-tina-field={tinaField(data, 'email')} class="inline-flex items-center gap-2 transition-colors hover:text-primary">
							<Icon name="tabler:mail" class="size-4" />{data.email}
						</a>
					)}
				</div>
			</div>
		</div>
		{data.bio && (
			<div data-tina-field={tinaField(data, 'bio')} class="prose prose-lg mt-10 max-w-none">
				<TinaMarkdown content={data.bio} components={mdxComponents} />
			</div>
		)}
	</div>
)}
```

**Step 2 — `src/pages/about/[...slug].astro`:**

```astro
---
import Base from '../../layouts/Base.astro';
import TinaIsland from '@tinacms/astro/TinaIsland.astro';
import TeamBody from '../../components/islands/TeamBody.astro';
import { getTeamMember, listTeam } from '../../lib/data';
import { islands } from '../../lib/islands';

export async function getStaticPaths() {
	const members = await listTeam();
	return members.map((node) => ({ params: { slug: node._sys.filename } }));
}

const slug = (Astro.params.slug ?? '').toString();
const member = await getTeamMember(slug);
const data = member.data?.team;
if (!data) return new Response('Not Found', { status: 404 });
---

<Base title={`${data.name ?? 'Team Member'} | The Lippincott Team`} description={data.description ?? ''}>
	<TinaIsland name="team" wrapper={islands.team.wrapper} params={{ slug }} primary>
		<TeamBody data={data} />
	</TinaIsland>
</Base>
```

**Step 3 — `src/lib/islands.ts`:** add `TeamQuery` to the generated-types import, `CmsTeam` to the data import, `getTeamMember` to the loaders import, `TeamBody` component import, and this entry after `blog`:

```ts
	team: {
		fetch: (_request, params) => getTeamMember(params.get('slug') ?? ''),
		component: TeamBody,
		wrapper: { tag: 'article' },
		propsFromData: (data) => ({
			data: (data as QueryResult<TeamQuery>).data?.team as CmsTeam | undefined,
		}),
	},
```

**Step 4 — verify:** `pnpm build:local` exit 0; `test -f dist/client/about/amy-lippincott-2/index.html && echo OK`.

**Step 5 — commit:** `git add -A && git commit -m "feat: team member route and island"`

---

### Task 3: TeamGrid block

**Files:**
- Create: `src/components/blocks/TeamGrid.astro`
- Create: `src/components/blocks/teamGrid.template.ts`
- Modify: `tina/collections/page.ts` (register template)
- Modify: `src/components/blocks/Blocks.astro` (dispatch)
- Modify: `src/lib/data.ts` (types)

**Step 1 — `src/components/blocks/teamGrid.template.ts`:**

```ts
import type { Template } from 'tinacms';

export const teamGridBlockSchema: Template = {
	name: 'teamGrid',
	label: 'Team Roster Grid',
	fields: [
		{ type: 'string', label: 'Title', name: 'title' },
		{ type: 'string', label: 'Description', name: 'description', ui: { component: 'textarea' } },
	],
	ui: { defaultItem: { title: 'Meet the Team' } },
};
```

**Step 2 — `src/components/blocks/TeamGrid.astro`:**

```astro
---
import { tinaField } from '@tinacms/astro/tina-field';
import Section from '../ui/Section.astro';
import { listTeam } from '../../lib/data';
import type { TeamGridBlock } from '../../lib/data';

interface Props { data: TeamGridBlock }

const { data } = Astro.props;
const members = await listTeam();
---
<Section>
	{data.title && <h2 data-tina-field={tinaField(data, 'title')} class="text-center text-3xl font-semibold tracking-tight">{data.title}</h2>}
	{data.description && <p data-tina-field={tinaField(data, 'description')} class="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">{data.description}</p>}
	<div class="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
		{members.map((member) => (
			<a href={`/about/${member._sys.filename}/`} class="group rounded-2xl border p-6 text-center transition-shadow hover:shadow-lg">
				{member.photo && <img src={member.photo} alt={member.name ?? ''} width={300} height={300} class="mx-auto size-32 rounded-full object-cover" />}
				<h3 class="mt-4 text-lg font-semibold transition-colors group-hover:text-primary">{member.name}</h3>
				{member.role && <p class="mt-1 text-sm text-muted-foreground">{member.role}</p>}
			</a>
		))}
	</div>
</Section>
```

**Step 3 — register:** in `tina/collections/page.ts`, import `teamGridBlockSchema` from `../../src/components/blocks/teamGrid.template` and add it to the `templates` array.

**Step 4 — dispatch:** in `Blocks.astro`, add `import TeamGrid from './TeamGrid.astro';` and `case 'PageBlocksTeamGrid': return <TeamGrid data={block} />;`.

**Step 5 — types:** in `src/lib/data.ts`, add after the `SplitBlock` line:

```ts
export type TeamGridBlock = Extract<PageBlock, { __typename: 'PageBlocksTeamGrid' }>;
```

**Step 6 — verify:** `pnpm build:local` exit 0.

**Step 7 — commit:** `git add -A && git commit -m "feat: team roster grid block"`

---

### Task 4: Community collection + loaders + sample entry

**Files:**
- Create: `tina/collections/community.ts`
- Modify: `tina/config.ts`
- Modify: `src/lib/data.ts`
- Create: `src/content/community/northwest-houston-real-estate/cypress-tx-real-estate.mdx` (sample)

**Step 1 — `tina/collections/community.ts`:**

```ts
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
```

**Step 2 — register** `CommunityCollection` in `tina/config.ts` (after `TeamCollection`).

**Step 3 — `src/lib/data.ts` additions:**

```ts
export const getCommunity = (path: string) =>
	requestWithMetadata(client.queries.community({ relativePath: `${path}.mdx` }), { priority: 'primary' });

export async function listCommunities() {
	const result = await client.queries.communityConnection();
	return (result.data.communityConnection.edges ?? [])
		.flatMap((edge) => (edge?.node ? [edge.node] : []));
}

/** Public URL path of a community doc, e.g. "northwest-houston-real-estate/cypress-tx-real-estate". */
export const communityPath = (node: { _sys: { breadcrumbs: string[] } }) => node._sys.breadcrumbs.join('/');
```

and after the `CmsTeam` type:

```ts
export type CmsCommunity = Awaited<ReturnType<typeof getCommunity>>['data']['community'];
export type CommunityFaq = NonNullable<NonNullable<CmsCommunity['faqs']>[number]>;
```

**Step 4 — sample entry `src/content/community/northwest-houston-real-estate/cypress-tx-real-estate.mdx`:**

```mdx
---
title: Cypress, TX
description: Homes for sale and living in Cypress, Texas.
intro: Sample intro — replaced by migrated content in Plan 3.
faqs:
  - question: Is Cypress TX a good place to live?
    answer: |
      Sample answer.
---

Sample body — replaced by migrated content in Plan 3.
```

**Step 5 — verify:** `pnpm build:local` exit 0.

**Step 6 — commit:** `git add -A && git commit -m "feat: add community collection with loaders"`

---

### Task 5: Community routes + CommunityBody island + shared FaqAccordion

**Files:**
- Create: `src/components/ui/FaqAccordion.astro`
- Create: `src/components/islands/CommunityBody.astro`
- Create: `src/pages/northwest-houston-real-estate/[...slug].astro`
- Create: `src/pages/northwest-houston-schools-real-estate/[...slug].astro`
- Modify: `src/lib/islands.ts`

**Step 1 — `src/components/ui/FaqAccordion.astro`** (zero-JS accordion, shared by the FAQ block and community pages):

```astro
---
import TinaMarkdown from '@tinacms/astro/TinaMarkdown.astro';
import { Icon } from 'astro-icon/components';
import { mdxComponents } from '../mdx/components';
import type { RichText } from '../../lib/data';

interface FaqLike {
	question?: string | null;
	answer?: RichText | null;
}

interface Props {
	items: FaqLike[];
	tinaFieldFor?: (item: FaqLike) => string | undefined;
}

const { items, tinaFieldFor } = Astro.props;
---
<div class="divide-y rounded-2xl border">
	{items.map((item) => (
		<details class="group px-6 py-4" data-tina-field={tinaFieldFor?.(item)}>
			<summary class="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold [&::-webkit-details-marker]:hidden">
				{item.question}
				<Icon name="tabler:chevron-down" class="size-5 shrink-0 transition-transform group-open:rotate-180" />
			</summary>
			{item.answer && (
				<div class="prose mt-3 max-w-none text-muted-foreground">
					<TinaMarkdown content={item.answer} components={mdxComponents} />
				</div>
			)}
		</details>
	))}
</div>
```

**Step 2 — `src/components/islands/CommunityBody.astro`:**

```astro
---
import TinaMarkdown from '@tinacms/astro/TinaMarkdown.astro';
import { tinaField } from '@tinacms/astro/tina-field';
import type { CmsCommunity } from '../../lib/data';
import { mdxComponents } from '../mdx/components';
import FaqAccordion from '../ui/FaqAccordion.astro';

interface Props { data?: CmsCommunity | null }

const { data } = Astro.props;
const faqs = (data?.faqs ?? []).filter(f => f !== null);
---
{data && (
	<article>
		{data.heroImage && (
			<div data-tina-field={tinaField(data, 'heroImage')} class="mx-auto max-w-5xl px-6">
				<img src={data.heroImage} alt={data.title ?? ''} width={1020} height={510} class="w-full rounded-2xl border object-cover shadow-lg" />
			</div>
		)}
		<div class="mx-auto max-w-3xl px-6 py-12">
			<h1 data-tina-field={tinaField(data, 'title')} class="text-4xl font-semibold tracking-tight lg:text-5xl">{data.title}</h1>
			{data.intro && <p data-tina-field={tinaField(data, 'intro')} class="mt-4 text-lg text-muted-foreground">{data.intro}</p>}
			{data.body && (
				<div data-tina-field={tinaField(data, 'body')} class="prose prose-lg mt-8 max-w-none">
					<TinaMarkdown content={data.body} components={mdxComponents} />
				</div>
			)}
			{faqs.length > 0 && (
				<div class="mt-12">
					<h2 class="text-2xl font-semibold tracking-tight">Frequently Asked Questions</h2>
					<div class="mt-6" data-tina-field={tinaField(data, 'faqs')}>
						<FaqAccordion items={faqs} tinaFieldFor={(item) => tinaField(item)} />
					</div>
				</div>
			)}
		</div>
	</article>
)}
```

**Step 3 — `src/pages/northwest-houston-real-estate/[...slug].astro`:**

```astro
---
import Base from '../../layouts/Base.astro';
import TinaIsland from '@tinacms/astro/TinaIsland.astro';
import CommunityBody from '../../components/islands/CommunityBody.astro';
import { communityPath, getCommunity, listCommunities } from '../../lib/data';
import { islands } from '../../lib/islands';

const PREFIX = 'northwest-houston-real-estate';

// NOTE: Astro compiles getStaticPaths in an isolated scope — module-level
// consts like PREFIX are unavailable there, so the literal is repeated locally.
export async function getStaticPaths() {
	const prefix = 'northwest-houston-real-estate';
	const entries = await listCommunities();
	return entries
		.map((node) => communityPath(node))
		.filter((path) => path.startsWith(`${prefix}/`))
		.map((path) => ({ params: { slug: path.slice(prefix.length + 1) } }));
}

const rest = (Astro.params.slug ?? '').toString();
const path = `${PREFIX}/${rest}`;
const entry = await getCommunity(path);
const data = entry.data?.community;
if (!data) return new Response('Not Found', { status: 404 });
---

<Base title={`${data.title ?? ''} | The Lippincott Team`} description={data.description ?? ''}>
	<TinaIsland name="community" wrapper={islands.community.wrapper} params={{ path }} primary>
		<CommunityBody data={data} />
	</TinaIsland>
</Base>
```

**Step 4 — `src/pages/northwest-houston-schools-real-estate/[...slug].astro`:** identical to Step 3 except BOTH `const PREFIX` at module level and the local `const prefix` inside `getStaticPaths` change to `'northwest-houston-schools-real-estate'` (Astro's isolated `getStaticPaths` scope is why the literal appears twice — miss either one and the routes and the page lookup disagree).

**Step 5 — `src/lib/islands.ts`:** add `CommunityQuery` to the generated-types import, `CmsCommunity` to the data import, `getCommunity` to the loaders import, `CommunityBody` import, and this entry after `team`:

```ts
	community: {
		fetch: (_request, params) => getCommunity(params.get('path') ?? ''),
		component: CommunityBody,
		wrapper: { tag: 'article' },
		propsFromData: (data) => ({
			data: (data as QueryResult<CommunityQuery>).data?.community as CmsCommunity | undefined,
		}),
	},
```

**Step 6 — verify:** `pnpm build:local` exit 0; `test -f dist/client/northwest-houston-real-estate/cypress-tx-real-estate/index.html && echo OK`. Also confirm the sample FAQ answer renders: `grep -c "Is Cypress TX a good place to live" dist/client/northwest-houston-real-estate/cypress-tx-real-estate/index.html` ≥ 1.

**Step 7 — commit:** `git add -A && git commit -m "feat: community routes and island"`

---

### Task 6: FAQ block

**Files:**
- Create: `src/components/blocks/Faq.astro`
- Create: `src/components/blocks/faq.template.ts`
- Modify: `tina/collections/page.ts`
- Modify: `src/components/blocks/Blocks.astro`
- Modify: `src/lib/data.ts`

**Step 1 — `src/components/blocks/faq.template.ts`:**

```ts
import type { Template } from 'tinacms';

export const faqBlockSchema: Template = {
	name: 'faq',
	label: 'FAQ Accordion',
	fields: [
		{ type: 'string', label: 'Title', name: 'title' },
		{ type: 'string', label: 'Description', name: 'description', ui: { component: 'textarea' } },
		{
			type: 'object', label: 'Questions', name: 'items', list: true,
			ui: { itemProps: (i: { question?: string }) => ({ label: i.question ?? '' }) },
			fields: [
				{ type: 'string', label: 'Question', name: 'question', required: true },
				{ type: 'rich-text', label: 'Answer', name: 'answer' },
			],
		},
	],
	ui: { defaultItem: { title: 'Frequently Asked Questions' } },
};
```

**Step 2 — `src/components/blocks/Faq.astro`:**

```astro
---
import { tinaField } from '@tinacms/astro/tina-field';
import Section from '../ui/Section.astro';
import FaqAccordion from '../ui/FaqAccordion.astro';
import type { FaqBlock } from '../../lib/data';

interface Props { data: FaqBlock }

const { data } = Astro.props;
const items = (data.items ?? []).filter(i => i !== null);
---
<Section>
	{data.title && <h2 data-tina-field={tinaField(data, 'title')} class="text-center text-3xl font-semibold tracking-tight">{data.title}</h2>}
	{data.description && <p data-tina-field={tinaField(data, 'description')} class="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">{data.description}</p>}
	{items.length > 0 && (
		<div class="mx-auto mt-10 max-w-3xl">
			<FaqAccordion items={items} tinaFieldFor={(item) => tinaField(item)} />
		</div>
	)}
</Section>
```

**Step 3 — register** `faqBlockSchema` in `tina/collections/page.ts`.

**Step 4 — dispatch:** `case 'PageBlocksFaq': return <Faq data={block} />;` + import in `Blocks.astro`.

**Step 5 — types in `src/lib/data.ts`:**

```ts
export type FaqBlock = Extract<PageBlock, { __typename: 'PageBlocksFaq' }>;
export type FaqItem = NonNullable<NonNullable<FaqBlock['items']>[number]>;
```

**Step 6 — verify:** `pnpm build:local` exit 0.

**Step 7 — commit:** `git add -A && git commit -m "feat: faq accordion block"`

---

### Task 7: CommunityGrid block + AGENTS.md + final verification

**Files:**
- Create: `src/components/blocks/CommunityGrid.astro`
- Create: `src/components/blocks/communityGrid.template.ts`
- Modify: `tina/collections/page.ts`
- Modify: `src/components/blocks/Blocks.astro`
- Modify: `src/lib/data.ts`
- Modify: `AGENTS.md`

**Step 1 — `src/components/blocks/communityGrid.template.ts`:**

```ts
import type { Template } from 'tinacms';

export const communityGridBlockSchema: Template = {
	name: 'communityGrid',
	label: 'Community Card Grid',
	fields: [
		{ type: 'string', label: 'Title', name: 'title' },
		{ type: 'string', label: 'Description', name: 'description', ui: { component: 'textarea' } },
		{
			type: 'string', label: 'Section', name: 'prefix', required: true,
			description: 'Which collection subtree to show as cards.',
			options: [
				{ label: 'Communities', value: 'northwest-houston-real-estate' },
				{ label: 'Schools', value: 'northwest-houston-schools-real-estate' },
			],
		},
	],
	ui: { defaultItem: { title: 'Explore Communities', prefix: 'northwest-houston-real-estate' } },
};
```

**Step 2 — `src/components/blocks/CommunityGrid.astro`:**

```astro
---
import { tinaField } from '@tinacms/astro/tina-field';
import Section from '../ui/Section.astro';
import { communityPath, listCommunities } from '../../lib/data';
import type { CommunityGridBlock } from '../../lib/data';

interface Props { data: CommunityGridBlock }

const { data } = Astro.props;
const prefix = data.prefix ?? 'northwest-houston-real-estate';
// Direct children of the prefix (one level deep), sorted by title.
const entries = (await listCommunities())
	.map((node) => ({ node, path: communityPath(node) }))
	.filter(({ path }) => path.startsWith(`${prefix}/`) && path.slice(prefix.length + 1).split('/').length === 1)
	.sort((a, b) => (a.node.title ?? '').localeCompare(b.node.title ?? ''));
---
<Section>
	{data.title && <h2 data-tina-field={tinaField(data, 'title')} class="text-center text-3xl font-semibold tracking-tight">{data.title}</h2>}
	{data.description && <p data-tina-field={tinaField(data, 'description')} class="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">{data.description}</p>}
	<div class="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
		{entries.map(({ node, path }) => (
			<a href={`/${path}/`} class="group overflow-hidden rounded-2xl border transition-shadow hover:shadow-lg">
				{node.heroImage && <img src={node.heroImage} alt={node.title ?? ''} width={600} height={400} class="aspect-[3/2] w-full object-cover" />}
				<div class="p-5">
					<h3 class="text-lg font-semibold transition-colors group-hover:text-primary">{node.title}</h3>
					{node.description && <p class="mt-1 line-clamp-2 text-sm text-muted-foreground">{node.description}</p>}
				</div>
			</a>
		))}
	</div>
</Section>
```

**Step 3 — register** `communityGridBlockSchema` in `tina/collections/page.ts`.

**Step 4 — dispatch:** `case 'PageBlocksCommunityGrid': return <CommunityGrid data={block} />;` + import.

**Step 5 — types in `src/lib/data.ts`:**

```ts
export type CommunityGridBlock = Extract<PageBlock, { __typename: 'PageBlocksCommunityGrid' }>;
```

**Step 6 — AGENTS.md updates** (keep the file current):
- In Code organization, `tina/collections/` entry: change "blog.ts, page.ts, global-config.ts" to include `team.ts` and `community.ts`.
- Blocks bullet: add Faq, TeamGrid, CommunityGrid to the block list.
- `src/pages/` bullet: add `about/[...slug].astro` (team bios) and the two community prefix routes.
- `src/components/ui/` mention: FaqAccordion now lives there.

**Step 7 — final verification:** `pnpm build:local` exit 0 AND `npx astro check` → 0 errors.

**Step 8 — commit:** `git add -A && git commit -m "feat: community card grid block"`

---

## Done-when (Plan 2 exit criteria)

- `pnpm build:local` and `npx astro check` pass.
- Collections visible in the Tina admin: Team Members, Communities & Schools.
- Sample routes render: `/about/amy-lippincott-2/`, `/northwest-houston-real-estate/cypress-tx-real-estate/`.
- Three new blocks selectable in the page collection's visual selector: FAQ Accordion, Team Roster Grid, Community Card Grid.
- Island registry has `team` and `community` entries; visual editing works on those pages in `pnpm dev` + `/admin`.
- AGENTS.md reflects the new collections/blocks/routes.
- Ready for Plan 3 (WP REST API → content migration into these collections).

## Execution notes

- Execute with subagent-driven-development exactly as Plan 1: fresh branch (`feat/lippincott-schema`), task-brief per task, implementer + task reviewer per task, ledger at `.superpowers/sdd/progress.md` (start a fresh section for Plan 2), final whole-branch review, then finishing-a-development-branch (user chose PR flow last time).
- `tina/tina-lock.json` will churn on schema changes — commit it via `git add -A`.
- Deferred-from-Plan-1 items folded into this plan where natural: none (footer contact-info editability stays for Plan 4 decision).
