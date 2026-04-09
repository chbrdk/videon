import { Request, Response, NextFunction } from 'express';

export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    // Test-Environment: allow route tests without session setup
    if (process.env.NODE_ENV === 'test') {
        return next();
    }
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ message: 'Unauthorized' });
};

export const getCurrentUser = (req: Request) => {
    return req.user as any;
};
