import assert from 'node:assert/strict';
import contactSierra from '../contact-sierra.js';
import { createSierraLead, toSierraLead } from './sierra-contact.js';

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
	sendRegistrationEmail: false,
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
await createSierraLead(buyerLead, 'api-key', async (input, init) => {
	request = new Request(input, init);
	return Response.json({ success: true });
});
assert.equal(request?.url, 'https://api.sierrainteractivedev.com/leads');
assert.equal(request?.method, 'POST');
assert.equal(request?.headers.get('Sierra-ApiKey'), 'api-key');
assert.equal(request?.headers.get('Sierra-OriginatingSystemName'), 'lippincottteam.com');
assert.deepEqual(await request?.json(), buyerLead);

await assert.rejects(
	createSierraLead(buyerLead, 'api-key', async () => Response.json({ success: false })),
	/Sierra reported lead creation failure/,
);
await assert.rejects(
	createSierraLead(buyerLead, 'api-key', async () => new Response('Unavailable', { status: 503 })),
	/HTTP status 503/,
);
await assert.rejects(
	createSierraLead(buyerLead, 'api-key', async () => new Response('Not JSON')),
	/non-JSON response/,
);
await assert.rejects(
	createSierraLead(buyerLead, 'api-key', async () => { throw new Error('Network down'); }),
	/did not complete/,
);

const originalApiKey = process.env.SIERRA_API_KEY;
const originalFetch = globalThis.fetch;
let forwarded = false;
process.env.SIERRA_API_KEY = 'api-key';
globalThis.fetch = async () => {
	forwarded = true;
	return Response.json({ success: true });
};
try {
	await contactSierra.formSubmitted({ data: baseForm });
	assert.equal(forwarded, true);
} finally {
	globalThis.fetch = originalFetch;
	if (originalApiKey === undefined) delete process.env.SIERRA_API_KEY;
	else process.env.SIERRA_API_KEY = originalApiKey;
}

await contactSierra.formSubmitted({ data: { 'form-name': 'another-form' } });
