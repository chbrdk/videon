// @ts-nocheck
import { Router } from 'express';
import passport from 'passport';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

const router = Router();
const prisma = new PrismaClient();

// Multer Config for Avatars
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = process.env.AVATARS_STORAGE_PATH || '/app/storage/avatars';
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        const filename = `${req.user ? (req.user as any).id : 'unknown'}_${timestamp}${ext}`;
        cb(null, filename);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const safeTypes = ['image/png', 'image/jpeg', 'image/webp'];
        if (safeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'));
        }
    }
});

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
router.post('/login', (req, res, next) => {
    console.log('➡️ Login route hit:', { email: req.body.email, headers: req.headers });
    next();
}, passport.authenticate('local'), (req, res) => {
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

// Update Password
router.put('/password', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: 'Unauthorized' });

    const user = req.user as any;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Current and new password are required' });
    }

    try {
        // Fetch user with password hash
        const dbUser = await prisma.user.findUnique({ where: { id: user.id } });

        if (!dbUser || !dbUser.passwordHash) {
            return res.status(400).json({ message: 'User not found or has no password set' });
        }

        // Verify current password
        const valid = await bcrypt.compare(currentPassword, dbUser.passwordHash);
        if (!valid) {
            return res.status(400).json({ message: 'Incorrect current password' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);

        await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash }
        });

        res.json({ message: 'Password updated successfully' });
    } catch (e) {
        res.status(500).json({ message: 'Failed to update password', error: e });
    }
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

// Avatar Upload
router.post('/me/avatar', (req, res, next) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: 'Unauthorized' });
    next();
}, upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

        const user = req.user as any;
        const avatarUrl = `/api/auth/avatars/${req.file.filename}`;

        // Update DB
        await prisma.user.update({
            where: { id: user.id },
            data: { avatarUrl }
        });

        // Update session user? Depends on passport strategy.
        // Usually passport uses ID from session to fetch User, so next request will have new data.

        res.json({ message: 'Avatar updated', avatarUrl });
    } catch (e) {
        console.error('Avatar upload error:', e);
        res.status(500).json({ message: 'Upload failed' });
    }
});

// Serve Avatar
router.get('/avatars/:filename', (req, res) => {
    const { filename } = req.params;
    const avatarsPath = process.env.AVATARS_STORAGE_PATH || '/app/storage/avatars';
    const filePath = path.join(avatarsPath, filename);

    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).json({ message: 'Avatar not found' });
    }
});

export default router;
