import assert from 'node:assert/strict';
import { ContactValidationError, createSierraLead, forwardContactLead, toSierraLead, type SierraLead } from './sierra-contact.js';

const baseForm = {
	name: 'Jordan Meyers',
	email: 'jordan@example.com',
	phone: ' (713) 555-0142 ',
	interest: 'Buy a home',
	message: 'Looking in Cypress.\r\nReady this fall.',
};

const buyerLead = toSierraLead(baseForm, 'test-password');
assert.deepEqual(buyerLead, {
	firstName: 'Jordan',
	lastName: 'Meyers',
	email: 'jordan@example.com',
	phone: '(713) 555-0142',
	password: 'test-password',
	leadStatus: 'New',
	sendRegistrationEmail: true,
	sourceType: 'SierraApi',
	source: 'lippincottteam.com contact form',
	leadType: 1,
	note: 'Website consultation request\n\nInterest: Buy a home\n\nMessage:\nLooking in Cypress.\nReady this fall.',
});

assert.equal(toSierraLead({ ...baseForm, interest: 'Sell my home', phone: '', message: '' }, 'test-password').leadType, 2);
assert.equal(toSierraLead({ ...baseForm, interest: 'Get a home valuation' }, 'test-password').leadType, 2);
assert.equal(toSierraLead({ ...baseForm, interest: 'Buy and sell at once' }, 'test-password').leadType, 3);
assert.equal(toSierraLead({ ...baseForm, interest: 'Relocate to Northwest Houston' }, 'test-password').leadType, 1);
assert.throws(() => toSierraLead({ ...baseForm, email: 'not-an-email' }, 'test-password'), /invalid email/);
assert.throws(() => toSierraLead({ ...baseForm, interest: 'Unknown' }, 'test-password'), /unsupported interest/);

let request: Request | undefined;
const created = await createSierraLead(buyerLead, 'api-key', async (input, init) => {
	request = new Request(input, init);
	return Response.json({ success: true, data: { leadId: 345678, agentUserId: 234567 } });
});
assert.deepEqual(created, { leadId: 345678, agentUserId: 234567 });
assert.equal(request?.url, 'https://api.sierrainteractivedev.com/leads');
assert.equal(request?.method, 'POST');
assert.equal(request?.headers.get('Sierra-ApiKey'), 'api-key');
assert.equal(request?.headers.get('Sierra-OriginatingSystemName'), 'lippincottteam.com');
assert.deepEqual(await request?.json(), buyerLead);

await assert.rejects(
	createSierraLead(buyerLead, 'api-key', async () => Response.json({ success: false, errorMessage: 'Lead type is invalid' })),
	/Sierra reported lead creation failure: Lead type is invalid/,
);
await assert.rejects(
	createSierraLead(buyerLead, 'api-key', async () => Response.json({ success: false })),
	/Sierra reported lead creation failure/,
);
await assert.rejects(
	createSierraLead(buyerLead, 'api-key', async () => new Response('Unavailable', { status: 503 })),
	/HTTP status 503/,
);
await assert.rejects(
	createSierraLead(buyerLead, 'api-key', async () => new Response('Not JSON', { status: 400 })),
	/HTTP status 400/,
);
await assert.rejects(
	createSierraLead(buyerLead, 'api-key', async () => { throw new Error('Network down'); }),
	/did not complete/,
);

const originalApiKey = process.env.SIERRA_API_KEY;
const originalFetch = globalThis.fetch;
let forwarded = false;
let generatedPassword = '';
process.env.SIERRA_API_KEY = 'api-key';
globalThis.fetch = async (_input, init) => {
	forwarded = true;
	generatedPassword = (JSON.parse(String(init?.body)) as SierraLead).password;
	return Response.json({ success: true, data: { leadId: 345678 } });
};
try {
	const result = await forwardContactLead({ ...baseForm, 'form-name': 'contact' }, 'api-key');
	assert.deepEqual(result, { forwarded: true, leadId: 345678 });
	assert.equal(forwarded, true);
	assert.match(generatedPassword, /^[0-9a-f]{16}$/);

	forwarded = false;
	assert.deepEqual(await forwardContactLead({ 'form-name': 'another-form' }, 'api-key'), { forwarded: false });
	assert.equal(forwarded, false);

	assert.deepEqual(await forwardContactLead({ ...baseForm }, 'api-key'), { forwarded: false });
	assert.equal(forwarded, false);

	await assert.rejects(forwardContactLead({ ...baseForm, 'form-name': 'contact' }, ''), /SIERRA_API_KEY is not configured/);
	await assert.rejects(
		forwardContactLead({ ...baseForm, email: 'not-an-email', 'form-name': 'contact' }, 'api-key'),
		ContactValidationError,
	);
	await assert.rejects(
		forwardContactLead({ ...baseForm, interest: 'Unknown', 'form-name': 'contact' }, 'api-key'),
		/unsupported interest/,
	);
} finally {
	globalThis.fetch = originalFetch;
	if (originalApiKey === undefined) delete process.env.SIERRA_API_KEY;
	else process.env.SIERRA_API_KEY = originalApiKey;
}

const originalLeadsUrl = process.env.SIERRA_API_URL;
try {
	process.env.SIERRA_API_URL = 'https://leads.example.com/api/leads';
	let capturedUrl = '';
	const envLead = await createSierraLead(buyerLead, 'api-key', async (input) => {
		capturedUrl = new Request(input).url;
		return Response.json({ success: true, data: { leadId: 345679 } });
	});
	assert.equal(envLead.leadId, 345679);
	assert.equal(capturedUrl, 'https://leads.example.com/api/leads');
} finally {
	if (originalLeadsUrl === undefined) delete process.env.SIERRA_API_URL;
	else process.env.SIERRA_API_URL = originalLeadsUrl;
}
