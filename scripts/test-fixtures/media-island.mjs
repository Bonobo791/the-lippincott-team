import { requestWithMetadata } from '@tinacms/astro/data';
export const islands = {};
export let savedVideo = '/uploads/video.mp4';
export function setMediaIsland(component, video) {
  savedVideo = video;
  islands.page = {
    fetch: () => requestWithMetadata(Promise.resolve({
      data: { page: { blocks: [{ __typename: 'PageBlocksVideo', url: savedVideo, poster: '/uploads/poster.webp' }] } },
      query: 'query Page { page { blocks { url poster } } }', variables: {},
    }), { priority: 'primary' }),
    component, wrapper: { tag: 'main' },
    propsFromData: result => ({ data: result.data.page.blocks[0] }),
  };
}
