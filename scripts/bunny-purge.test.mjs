// Unit tests for scripts/bunny-purge.mjs (node:test, no dependencies).
// Run with: node --test scripts/bunny-purge.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { main } from './bunny-purge.mjs';

const PULL_ZONE = 'https://api.bunny.net/pullzone/12/purgeCache';

function response(status, body = '') {
	return {
		ok: status >= 200 && status < 300,
		status,
		text: async () => body,
	};
}

// A fetch that records every call and routes them through `handler(url, calls)`.
function fakeFetch(handler) {
	const calls = [];
	const fetchImpl = async (url, options) => {
		calls.push({ url: String(url), options });
		return handler(String(url), options, calls);
	};
	fetchImpl.calls = calls;
	return fetchImpl;
}

test('full purge is a no-op without credentials', async () => {
	assert.equal(await main([], {}), 0);
	assert.equal(await main([], { BUNNY_API_KEY: 'k' }, fakeFetch(() => response(204))), 0);
});

test('full purge succeeds on 204 and fails loudly on 500', async () => {
	const okFetch = fakeFetch(() => response(204));
	assert.equal(await main([], { BUNNY_API_KEY: 'k', BUNNY_PULL_ZONE_ID: '12' }, okFetch), 0);
	assert.deepEqual(okFetch.calls.map((c) => c.url), [PULL_ZONE]);
	assert.equal(okFetch.calls[0].options.method, 'POST');
	assert.equal(okFetch.calls[0].options.headers.AccessKey, 'k');

	const badFetch = fakeFetch(() => response(500));
	assert.equal(await main([], { BUNNY_API_KEY: 'k', BUNNY_PULL_ZONE_ID: '12' }, badFetch), 1);
});

test('wait-for-commit polls until the marker matches, then purges', async () => {
	const sha = 'a'.repeat(40);
	let markerCalls = 0;
	const fetchImpl = fakeFetch((url) => {
		if (url.startsWith('https://origin.example/__moderaty_commit.txt')) {
			markerCalls += 1;
			return response(200, markerCalls >= 2 ? sha : 'stale');
		}
		if (url === PULL_ZONE) return response(204);
		return response(500);
	});
	const result = await main(
		['--wait-for-commit', sha, '--origin', 'https://origin.example', '--timeout', '5', '--interval', '1'],
		{ BUNNY_API_KEY: 'k', BUNNY_PULL_ZONE_ID: '12' },
		fetchImpl,
	);
	assert.equal(result, 0);
	assert.ok(markerCalls >= 2, `expected >=2 marker polls, got ${markerCalls}`);
	assert.equal(fetchImpl.calls.filter((c) => c.url === PULL_ZONE).length, 1);
});

test('wait-for-commit times out loudly when the marker never appears', async () => {
	const fetchImpl = fakeFetch(() => response(200, 'stale'));
	const result = await main(
		['--wait-for-commit', 'b'.repeat(40), '--origin', 'https://origin.example', '--timeout', '1', '--interval', '1'],
		{ BUNNY_API_KEY: 'k', BUNNY_PULL_ZONE_ID: '12' },
		fetchImpl,
	);
	assert.equal(result, 1);
	// Never purged blindly:
	assert.equal(fetchImpl.calls.filter((c) => c.url === PULL_ZONE).length, 0);
});

test('wait-for-commit requires an origin', async () => {
	const result = await main(
		['--wait-for-commit', 'c'.repeat(40)],
		{ BUNNY_API_KEY: 'k', BUNNY_PULL_ZONE_ID: '12' },
		fakeFetch(() => response(204)),
	);
	assert.equal(result, 1);
});

test('wait-for-commit requires a valid commit SHA argument', async () => {
	const fetchImpl = fakeFetch(() => response(204));
	assert.equal(await main(['--wait-for-commit'], { BUNNY_API_KEY: 'k', BUNNY_PULL_ZONE_ID: '12' }, fetchImpl), 1);
	assert.equal(await main(['--wait-for-commit', 'not-a-sha!'], { BUNNY_API_KEY: 'k', BUNNY_PULL_ZONE_ID: '12' }, fetchImpl), 1);
});

test('wait-for-commit without credentials is a no-op', async () => {
	const fetchImpl = fakeFetch(() => response(204));
	assert.equal(await main(['--wait-for-commit', 'd'.repeat(40), '--origin', 'https://origin.example'], {}, fetchImpl), 0);
	assert.equal(fetchImpl.calls.length, 0);
});

test('per-URL purge resolves site paths and rejects foreign URLs', async () => {
	const okFetch = fakeFetch(() => response(204));
	assert.equal(await main(['/pricing/', '/blog/'], { BUNNY_API_KEY: 'k', SITE_URL: 'https://example.com' }, okFetch), 0);
	assert.equal(okFetch.calls.length, 2);
	assert.ok(okFetch.calls[0].url.includes('url=https%3A%2F%2Fexample.com%2Fpricing%2F'));

	const badFetch = fakeFetch(() => response(204));
	assert.equal(await main(['https://evil.example/x'], { BUNNY_API_KEY: 'k', SITE_URL: 'https://example.com' }, badFetch), 1);
	assert.equal(badFetch.calls.length, 0);
});

test('per-URL purge fails loudly on upstream errors', async () => {
	const fetchImpl = fakeFetch(() => response(429));
	assert.equal(await main(['/pricing/'], { BUNNY_API_KEY: 'k', SITE_URL: 'https://example.com' }, fetchImpl), 1);
});

test('per-URL purge requires SITE_URL', async () => {
	const fetchImpl = fakeFetch(() => response(204));
	assert.equal(await main(['/pricing/'], { BUNNY_API_KEY: 'k' }, fetchImpl), 1);
});
