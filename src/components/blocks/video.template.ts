import type { Template } from 'tinacms';

export const videoBlockSchema: Template = {
	name: 'video',
	label: 'Video',
	fields: [
		{ type: 'string', label: 'Url (YouTube/Vimeo embed or watch URL, or a self-hosted MP4/WebM)', name: 'url' },
		{ type: 'image', label: 'Poster (self-hosted files only)', name: 'poster' },
		{ type: 'boolean', label: 'Auto Play', name: 'autoPlay' },
		{ type: 'boolean', label: 'Loop', name: 'loop' },
	],
	ui: { defaultItem: { url: 'https://www.youtube.com/watch?v=j8egYW7Jpgk' } },
};
