import CodeBlock from './CodeBlock.astro';
import TableScroll from './TableScroll.astro';
import YouTubeEmbed from './YouTubeEmbed.astro';
import MediaImage from './MediaImage.astro';
import MediaLink from './MediaLink.astro';

export const mdxComponents = { YouTubeEmbed, code_block: CodeBlock, table: TableScroll, img: MediaImage, a: MediaLink };
