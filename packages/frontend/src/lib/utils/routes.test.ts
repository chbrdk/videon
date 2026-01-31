import { describe, it, expect } from 'vitest';
import { isPathPublic } from './routes';

describe('isPathPublic', () => {
  it('erkennt /login als öffentlich', () => {
    expect(isPathPublic('/login')).toBe(true);
    expect(isPathPublic('/login/')).toBe(true);
  });

  it('erkennt /register als öffentlich', () => {
    expect(isPathPublic('/register')).toBe(true);
    expect(isPathPublic('/register/')).toBe(true);
  });

  it('erkennt base-prefixed Pfade (/videon/login)', () => {
    expect(isPathPublic('/videon/login')).toBe(true);
    expect(isPathPublic('/videon/login/')).toBe(true);
    expect(isPathPublic('/videon/register')).toBe(true);
  });

  it('lehnt geschützte Routen ab', () => {
    expect(isPathPublic('/')).toBe(false);
    expect(isPathPublic('/search')).toBe(false);
    expect(isPathPublic('/search/')).toBe(false);
    expect(isPathPublic('/videos')).toBe(false);
    expect(isPathPublic('/videos/123')).toBe(false);
    expect(isPathPublic('/settings')).toBe(false);
  });

  it('behandelt leere/ungültige Eingaben', () => {
    expect(isPathPublic('')).toBe(false);
    expect(isPathPublic(null as unknown as string)).toBe(false);
    expect(isPathPublic(undefined as unknown as string)).toBe(false);
  });
});
