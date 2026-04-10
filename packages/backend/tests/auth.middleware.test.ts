import type { Request, Response, NextFunction } from 'express';
import { isAuthenticated } from '../src/middleware/auth.middleware';

describe('isAuthenticated', () => {
  const prevEnv = process.env.NODE_ENV;
  const prevToken = process.env.INTERNAL_SERVICE_TOKEN;

  afterEach(() => {
    process.env.NODE_ENV = prevEnv;
    process.env.INTERNAL_SERVICE_TOKEN = prevToken;
  });

  it('allows requests with matching x-internal-service when INTERNAL_SERVICE_TOKEN is set', () => {
    process.env.NODE_ENV = 'production';
    process.env.INTERNAL_SERVICE_TOKEN = 'secret-token';

    const req = {
      get: (name: string) => (name === 'x-internal-service' ? 'secret-token' : undefined),
      isAuthenticated: () => false,
    } as unknown as Request;

    const next = jest.fn() as NextFunction;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;

    isAuthenticated(req, res, next);

    expect(next).toHaveBeenCalled();
    expect((res.status as jest.Mock).mock.calls.length).toBe(0);
  });

  it('rejects when token header does not match', () => {
    process.env.NODE_ENV = 'production';
    process.env.INTERNAL_SERVICE_TOKEN = 'secret-token';

    const req = {
      get: (name: string) => (name === 'x-internal-service' ? 'wrong' : undefined),
      isAuthenticated: () => false,
    } as unknown as Request;

    const next = jest.fn() as NextFunction;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;

    isAuthenticated(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
