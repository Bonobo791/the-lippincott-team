// The contact route's only CMS boundary. Tests exercise the real route and
// Sierra validation without querying Tina or submitting real customer leads.
let loadPages = async () => [];

export function setPageLoader(loader) {
	loadPages = loader;
}

export function listPages() {
	return loadPages();
}
