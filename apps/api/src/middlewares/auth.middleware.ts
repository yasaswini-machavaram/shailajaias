import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, Session } from '../models/index.js';
import type { IUser } from '../models/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

// Debounce session lastActive updates to once per 60 seconds per device
const sessionUpdateCache = new Map<string, number>();
const SESSION_UPDATE_INTERVAL = 60_000; // 1 minute

export interface AuthRequest extends Request {
    user?: IUser;
}

export interface JwtPayload {
    id: string;
    email?: string;
    role: 'admin' | 'student';
    tokenVersion?: number;
    deviceId?: string;
}

/**
 * Generate JWT token (admin portal — no session tracking)
 */
export const generateToken = (user: IUser): string => {
    const payload: JwtPayload = {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
    };

    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};

/**
 * Verify JWT token middleware
 * Also validates tokenVersion and touches session lastActive (debounced)
 */
export const protect = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        let token: string | undefined;

        if (req.headers.authorization?.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            res.status(401).json({ error: 'Not authorized, no token' });
            return;
        }

        const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
        const user = await User.findById(decoded.id);

        if (!user) {
            res.status(401).json({ error: 'User not found' });
            return;
        }

        if (user.status === 'suspended') {
            res.status(403).json({ error: 'Your account has been suspended. Please contact support.' });
            return;
        }

        // Validate tokenVersion (if present in token — student tokens have it)
        if (decoded.tokenVersion !== undefined && decoded.tokenVersion !== user.tokenVersion) {
            res.status(401).json({ error: 'Session expired. You have been logged out from all devices. Please log in again.' });
            return;
        }

        // Touch session lastActive (debounced to once per minute per device)
        if (decoded.deviceId) {
            const cacheKey = `${decoded.id}:${decoded.deviceId}`;
            const lastUpdate = sessionUpdateCache.get(cacheKey) || 0;
            const now = Date.now();

            if (now - lastUpdate > SESSION_UPDATE_INTERVAL) {
                sessionUpdateCache.set(cacheKey, now);
                // Fire and forget — don't block the request
                Session.updateOne(
                    { userId: decoded.id, deviceId: decoded.deviceId },
                    { lastActive: new Date() }
                ).exec().catch(() => { /* silently ignore */ });
            }
        }

        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Not authorized, token failed' });
    }
};

/**
 * Admin only middleware
 */
export const adminOnly = (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): void => {
    if (req.user?.role !== 'admin') {
        res.status(403).json({ error: 'Admin access required' });
        return;
    }
    next();
};

export default { protect, adminOnly, generateToken };
