// Only the Tina query boundary is replaced; the production loaders and Tina
// metadata/preview handling run unchanged in config-cache.test.mjs.
let configLoader;
export function setConfigLoader(loader) {
	configLoader = loader;
}

export default {
	queries: {
		config: (variables) => configLoader(variables),
		team: async (variables) => ({
			data: { team: { _sys: { filename: variables.relativePath.replace(/\.mdx$/, '') } } },
			query: 'query Team($relativePath: String!) { team(relativePath: $relativePath) { name } }',
			variables,
		}),
	},
};
