const SIERRA_LEADS_URL = 'https://api.sierrainteractivedev.com/leads';
const REQUEST_TIMEOUT_MS = 10_000;

export interface SierraLead {
	firstName: string;
	lastName?: string;
	email: string;
	phone?: string;
	password: string;
	leadStatus: 'New';
	sendRegistrationEmail: true;
	sourceType: 'SierraApi';
	source: string;
	leadType: 1 | 2 | 3;
	note: string;
}

function formValue(data: Record<string, string>, key: string) {
	const value = data[key];
	return typeof value === 'string' ? value.trim() : '';
}

function requiredFormValue(data: Record<string, string>, key: string, label: string) {
	const value = formValue(data, key);
	if (!value) throw new Error(`Contact form submission is missing a ${label}.`);
	return value;
}

function leadTypeForInterest(interest: string): SierraLead['leadType'] {
	switch (interest) {
		case 'Buy a home':
		case 'Relocate to Northwest Houston':
			return 1;
		case 'Sell my home':
		case 'Get a home valuation':
			return 2;
		case 'Buy and sell at once':
			return 3;
		default:
			throw new Error('Contact form submission has an unsupported interest.');
	}
}

export function toSierraLead(data: Record<string, string>, password: string): SierraLead {
	const name = requiredFormValue(data, 'name', 'name');
	const email = requiredFormValue(data, 'email', 'email address');
	if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('Contact form submission has an invalid email address.');
	if (!password) throw new Error('Sierra lead password is required.');

	const [firstName, ...lastName] = name.split(/\s+/);
	const interest = requiredFormValue(data, 'interest', 'interest');
	const phone = formValue(data, 'phone');
	const message = formValue(data, 'message').replace(/\r\n?/g, '\n');

	return {
		firstName,
		...(lastName.length > 0 ? { lastName: lastName.join(' ') } : {}),
		email,
		...(phone ? { phone } : {}),
		password,
		leadStatus: 'New',
		sendRegistrationEmail: true,
		sourceType: 'SierraApi',
		source: 'lippincottteam.com contact form',
		leadType: leadTypeForInterest(interest),
		note: ['Website consultation request', `Interest: ${interest}`, ...(message ? [`Message:\n${message}`] : [])].join('\n\n'),
	};
}

export async function createSierraLead(lead: SierraLead, apiKey: string, fetcher: typeof fetch = fetch) {
	let response: Response;
	try {
		response = await fetcher(SIERRA_LEADS_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Sierra-ApiKey': apiKey,
				'Sierra-OriginatingSystemName': 'lippincottteam.com',
			},
			body: JSON.stringify(lead),
			signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
		});
	} catch {
		throw new Error('Sierra lead request did not complete.');
	}

	if (!response.ok) throw new Error(`Sierra lead creation failed with HTTP status ${response.status}.`);

	let result: { success?: unknown };
	try {
		result = await response.json();
	} catch {
		throw new Error('Sierra returned a non-JSON response.');
	}
	if (result.success !== true) throw new Error('Sierra reported lead creation failure.');
}
