const DEFAULT_SIERRA_LEADS_URL = 'https://api.sierrainteractivedev.com/leads';
const REQUEST_TIMEOUT_MS = 10_000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

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

interface SierraResponse {
	success?: boolean;
	data?: {
		leadId?: unknown;
		agentUserId?: unknown;
	};
	[key: string]: unknown;
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

export interface InterestOption {
	label: string;
	leadType: '1' | '2' | '3';
}

/** Fallback "I want to" options — the rendered form's set when the CMS block lists none. */
export const DEFAULT_INTEREST_OPTIONS: readonly InterestOption[] = [
	{ label: 'Sell my home', leadType: '2' },
	{ label: 'Buy a home', leadType: '1' },
	{ label: 'Buy and sell at once', leadType: '3' },
	{ label: 'Relocate to Northwest Houston', leadType: '1' },
	{ label: 'Get a home valuation', leadType: '2' },
];

const INTEREST_LEAD_TYPES = new Map<string, SierraLead['leadType']>(
	DEFAULT_INTEREST_OPTIONS.map((o) => [o.label, Number(o.leadType) as SierraLead['leadType']]),
);

/** Submitted values the form actually renders ("<leadType>|<label>"). */
export const interestOptionValues = (options: readonly { label: string; leadType: string }[]) =>
	new Set(options.map((o) => `${o.leadType}|${o.label}`));

// CMS-managed options submit "<leadType>|<label>" so editors can add options
// without a code change; bare labels fall back to the built-in map. When the
// endpoint knows the configured option set, typed values must match it —
// otherwise a crafted "2|spam" writes arbitrary labels with a valid lead type.
function parseInterest(raw: string, allowedValues?: ReadonlySet<string>): { interest: string; leadType: SierraLead['leadType'] } {
	const typed = /^([123])\|(.+)$/.exec(raw);
	if (typed?.[2].trim()) {
		if (allowedValues && !allowedValues.has(raw)) {
			throw new Error('Contact form submission has an unsupported interest.');
		}
		return { interest: typed[2].trim(), leadType: Number(typed[1]) as SierraLead['leadType'] };
	}
	return { interest: raw, leadType: leadTypeForInterest(raw) };
}

function leadTypeForInterest(interest: string): SierraLead['leadType'] {
	const leadType = INTEREST_LEAD_TYPES.get(interest);
	if (!leadType) throw new Error('Contact form submission has an unsupported interest.');
	return leadType;
}

export function toSierraLead(data: Record<string, string>, password: string, allowedInterests?: ReadonlySet<string>): SierraLead {
	const name = requiredFormValue(data, 'name', 'name');
	const email = requiredFormValue(data, 'email', 'email address');
	if (!EMAIL_PATTERN.test(email)) throw new Error('Contact form submission has an invalid email address.');
	if (!password) throw new Error('Sierra lead password is required.');

	const [firstName, ...lastName] = name.split(/\s+/);
	const { interest, leadType } = parseInterest(requiredFormValue(data, 'interest', 'interest'), allowedInterests);
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
		source: 'thelippincottteamlistings.com contact form',
		leadType,
		note: ['Website consultation request', `Interest: ${interest}`, ...(message ? [`Message:\n${message}`] : [])].join('\n\n'),
	};
}

function errorDetail(result: SierraResponse) {
	const values = ['message', 'error', 'errors', 'errorMessage', 'detail', 'title'].flatMap((key) => {
		const value = result[key];
		if (typeof value === 'string') return [value];
		if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
		return [];
	});
	return values.join('; ').replace(/\b\S+@\S+\.\S+\b/g, '[redacted-email]').slice(0, 500);
}

function nonJsonResponseError(response: Response) {
	const contentType = response.headers.get('content-type');
	const cfRay = response.headers.get('cf-ray');
	const isHtmlForbiddenResponse = response.status === 403 && contentType?.split(';', 1)[0].trim().toLowerCase() === 'text/html';
	const details = [`HTTP status ${response.status}`];
	if (contentType) details.push(`content-type: ${contentType}`);
	if (cfRay) details.push(`cf-ray: ${cfRay}${isHtmlForbiddenResponse ? ' (investigate with Sierra support)' : ''}`);
	const diagnostics = details.join(', ');

	if (isHtmlForbiddenResponse) {
		return `Sierra lead creation failed with ${diagnostics}: non-JSON response (possible gateway/edge block).`;
	}
	return response.ok
		? `Sierra returned a non-JSON response (${diagnostics}).`
		: `Sierra lead creation failed with ${diagnostics}: non-JSON response.`;
}

export async function createSierraLead(lead: SierraLead, apiKey: string, fetcher: typeof fetch = fetch) {
	const leadsUrl = process.env.SIERRA_API_URL ?? DEFAULT_SIERRA_LEADS_URL;
	let response: Response;
	try {
		response = await fetcher(leadsUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Sierra-ApiKey': apiKey,
				'Sierra-OriginatingSystemName': 'thelippincottteamlistings.com',
			},
			body: JSON.stringify(lead),
			signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
		});
	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : 'Unknown error';
		console.error('[sierra-contact] Request failed:', errorMsg);
		throw new Error(`Sierra lead request did not complete: ${errorMsg}`);
	}

	let result: SierraResponse;
	try {
		result = await response.json();
	} catch {
		throw new Error(nonJsonResponseError(response));
	}

	const detail = errorDetail(result);
	if (!response.ok) throw new Error(`Sierra lead creation failed with HTTP status ${response.status}${detail ? `: ${detail}` : ''}.`);
	if (result.success !== true) throw new Error(`Sierra reported lead creation failure${detail ? `: ${detail}` : ''}.`);
	if (typeof result.data?.leadId !== 'number') throw new Error('Sierra success response is missing a lead ID.');

	return {
		leadId: result.data.leadId,
		...(typeof result.data.agentUserId === 'number' ? { agentUserId: result.data.agentUserId } : {}),
	};
}

/** Client errors (bad form payloads) vs. server/Sierra failures, for HTTP status mapping. */
export class ContactValidationError extends Error {}

export type ContactForwardResult = { forwarded: true; leadId: number } | { forwarded: false };

/**
 * Host-neutral lead forwarding for the "contact" form: validates the payload,
 * mints the Sierra password, and creates the lead. Ignores submissions whose
 * `form-name` is not "contact" (like the old Netlify formSubmitted handler).
 */
export async function forwardContactLead(
	data: Record<string, string>,
	apiKey: string,
	fetcher: typeof fetch = fetch,
	allowedInterests?: ReadonlySet<string>,
): Promise<ContactForwardResult> {
	if (data['form-name'] !== 'contact') return { forwarded: false };

	if (!apiKey) throw new Error('SIERRA_API_KEY is not configured.');

	// Web Crypto (available on every host runtime) — 16 hex chars, same shape
	// as node:crypto's randomBytes(8).toString('hex') but without the
	// node:crypto dependency (Cloudflare Workers only shims it under
	// nodejs_compat).
	const password = Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) =>
		b.toString(16).padStart(2, '0'),
	).join('');
	let lead: SierraLead;
	try {
		lead = toSierraLead(data, password, allowedInterests);
	} catch (error) {
		throw new ContactValidationError(error instanceof Error ? error.message : 'Invalid contact form submission.');
	}

	const result = await createSierraLead(lead, apiKey, fetcher);
	console.info(`[sierra-contact] Lead created. leadId=${result.leadId}`);
	return { forwarded: true, leadId: result.leadId };
}
