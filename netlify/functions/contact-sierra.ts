import { randomBytes } from 'node:crypto';
import { createSierraLead, toSierraLead } from './_shared/sierra-contact.js';

type FormSubmittedEvent = { data: Record<string, string> };

export default {
	async formSubmitted(event: FormSubmittedEvent) {
		if (event.data['form-name'] && event.data['form-name'] !== 'contact') return;

		try {
			const apiKey = process.env.SIERRA_API_KEY;
			if (!apiKey) throw new Error('SIERRA_API_KEY is not configured.');

			const result = await createSierraLead(toSierraLead(event.data, randomBytes(8).toString('hex')), apiKey);
			console.info(`[sierra-contact] Lead created. leadId=${result.leadId}`);
		} catch (error) {
			// ponytail: no create retry without a Sierra idempotency key; add one if Sierra supports it.
			console.error('[sierra-contact] Lead creation failed.', error instanceof Error ? error.message : 'Unknown error');
			throw error;
		}
	},
};
