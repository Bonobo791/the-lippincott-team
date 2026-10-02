import type { Collection } from 'tinacms';
import { homeTemplate } from '../../src/components/standalone/home.template';
import { blogIndexTemplate, reviewsTemplate } from '../../src/components/standalone/reviews.template';
import { buySellFields, utilityFields } from '../../src/components/standalone/shared-fields.template';

const ROUTES: Record<string, string> = {
	home: '/',
	buy: '/buy/',
	sell: '/sell/',
	reviews: '/reviews/',
	'blog-index': '/blog/',
	'not-found': '/404',
	'thank-you': '/contact-us/thank-you/',
};

/**
 * Singleton pages whose layouts are bespoke (home, buy, sell, reviews, blog
 * index, 404, thank-you). Unlike the Pages collection, these aren't block
 * builders — each doc uses a fixed template matching its route's layout, so
 * editors change copy without restructuring the page.
 */
export const StandaloneCollection: Collection = {
	name: 'standalone',
	label: 'Site Pages',
	path: 'src/content/standalone',
	format: 'mdx',
	ui: {
		router: ({ document }) => ROUTES[document._sys.filename] ?? '/',
		// Seven fixed singletons — each ROUTES key must keep an existing doc.
		// Creating extras adds pages nothing renders; deleting one 404s a route.
		allowedActions: { create: false, delete: false, createFolder: false, createNestedFolder: false },
	},
	templates: [
		homeTemplate,
		{ name: 'buy', label: 'Buy Page', fields: buySellFields('buyers') },
		{ name: 'sell', label: 'Sell Page', fields: buySellFields('sellers') },
		reviewsTemplate,
		blogIndexTemplate,
		{ name: 'notFound', label: '404 Page', fields: utilityFields() },
		{ name: 'thankYou', label: 'Thank-You Page', fields: utilityFields() },
	],
};
