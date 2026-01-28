import { Router } from 'express';
import passport from 'passport';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Register Local
router.post('/register', async (req, res) => {
    const { email, password, name } = req.body;

    try {
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const user = await prisma.user.create({
            data: {
                email,
                passwordHash,
                name,
                provider: 'LOCAL'
            },
        });

        req.login(user, (err) => {
            if (err) return res.status(500).json({ message: 'Login failed after registration' });
            return res.json({ message: 'Registered successfully', user: { id: user.id, email: user.email, name: user.name } });
        });
    } catch (error) {
        res.status(500).json({ message: 'Registration failed', error });
    }
});

// Login Local
router.post('/login', passport.authenticate('local'), (req, res) => {
    const user = req.user as any;
    res.json({ message: 'Logged in successfully', user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

// Microsoft Auth
router.get('/microsoft', passport.authenticate('microsoft', { prompt: 'select_account' }));

router.get(
    '/microsoft/callback',
    passport.authenticate('microsoft', { failureRedirect: '/login?error=microsoft_auth_failed' }),
    (req, res) => {
        // Successful authentication, redirect home.
        // In production this usually redirects to the frontend URL
        const frontendUrl = process.env.CORS_ORIGINS?.split(',')[0] || 'http://localhost:3010';
        res.redirect(`${frontendUrl}?login=success`);
    }
);

// Logout
router.post('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);
        res.json({ message: 'Logged out successfully' });
    });
});

// Current User
router.get('/me', (req, res) => {
    if (req.isAuthenticated()) {
        const user = req.user as any;
        res.json({ isAuthenticated: true, user: { id: user.id, email: user.email, name: user.name, role: user.role, avatarUrl: user.avatarUrl } });
    } else {
        res.json({ isAuthenticated: false });
    }
});

export default router;
