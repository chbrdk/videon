import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { isAuthenticated } from '../middleware/auth.middleware';

const router = Router();
const userController = new UserController();

// Middleware to check if user is admin
const isAdmin = (req: any, res: any, next: any) => {
    if (req.user && req.user.role === 'ADMIN') {
        return next();
    }
    return res.status(403).json({ error: 'Access denied. Admin rights required.' });
};

// Basic authenticated routes
router.use(isAuthenticated);
router.get('/search', (req, res) => userController.searchUsers(req, res));

// Admin-only routes
router.use(isAdmin);
router.get('/', (req, res) => userController.getAllUsers(req, res));
router.post('/', (req, res) => userController.createUser(req, res));
router.delete('/:id', (req, res) => userController.deleteUser(req, res));

export default router;
