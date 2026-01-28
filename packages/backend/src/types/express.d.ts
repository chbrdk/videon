import { User } from '@prisma/client';

declare global {
    namespace Express {
        // eslint-disable-next-line @typescript-eslint/no-empty-interface
        interface User extends User { }

        interface Request {
            login(user: any, done: (err: any) => void): void;
            login(user: any, options: any, done: (err: any) => void): void;
            logout(done: (err: any) => void): void;
            isAuthenticated(): boolean;
        }
    }
}
