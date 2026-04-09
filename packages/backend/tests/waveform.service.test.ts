import fs from 'fs';
import os from 'os';
import path from 'path';
import { WaveformService } from '../src/services/waveform.service';

describe('WaveformService', () => {
  it('uses a writable temp dir by default in test env', () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';

    const svc = new WaveformService();
    const cacheDir = (svc as any).cacheDir as string;

    expect(cacheDir).toContain(path.join(os.tmpdir(), 'videon'));
    expect(fs.existsSync(cacheDir)).toBe(true);

    process.env.NODE_ENV = prev;
  });
});

