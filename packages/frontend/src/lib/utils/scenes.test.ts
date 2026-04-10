import { describe, it, expect } from 'vitest';
import { dedupeScenesById } from './scenes';

describe('dedupeScenesById', () => {
  it('removes duplicate sceneId', () => {
    const rows = [
      { sceneId: 'a', startTime: 0 },
      { sceneId: 'a', startTime: 1 },
      { sceneId: 'b', startTime: 2 },
    ];
    expect(dedupeScenesById(rows)).toHaveLength(2);
  });

  it('dedupes by id when sceneId missing', () => {
    const rows = [{ id: 'x' }, { id: 'x' }, { id: 'y' }];
    expect(dedupeScenesById(rows as any)).toHaveLength(2);
  });
});
