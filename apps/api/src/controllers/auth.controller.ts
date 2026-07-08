import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User, Session } from '../models/index.js';

// Use same secret as middleware
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
const MAX_DEVICES = 3;

// OTPless credentials
const OTPLESS_CLIENT_ID = process.env.OTPLESS_CLIENT_ID || '';
const OTPLESS_CLIENT_SECRET = process.env.OTPLESS_CLIENT_SECRET || '';

// In-memory OTP store for dev mode
const otpStore = new Map<string, { otp: string; expiresAt: number }>();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Generate JWT token with tokenVersion and deviceId embedded */
const generateToken = (id: string, tokenVersion: number, deviceId: string): string => {
    return jwt.sign({ id, tokenVersion, deviceId }, JWT_SECRET, {
        expiresIn: '30d',
    });
};

/** Parse User-Agent string into a human-readable device name */
const parseDeviceName = (ua: string): string => {
    if (!ua) return 'Unknown Device';

    let browser = 'Browser';
    let os = 'Device';

    // Detect browser
    if (ua.includes('Edg/') || ua.includes('Edge')) browser = 'Edge';
    else if (ua.includes('OPR') || ua.includes('Opera')) browser = 'Opera';
    else if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
    else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
    else if (ua.includes('Firefox')) browser = 'Firefox';

    // Detect OS
    if (ua.includes('iPhone')) os = 'iPhone';
    else if (ua.includes('iPad')) os = 'iPad';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('Mac OS X') || ua.includes('Macintosh')) os = 'macOS';
    else if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Linux')) os = 'Linux';

    return `${browser} on ${os}`;
};

/** Create or update a session and enforce the device limit */
const upsertSession = async (
    userId: string,
    deviceId: string,
    userAgent: string
): Promise<{ allowed: boolean; error?: string }> => {
    // Check if this device already has a session
    const existingSession = await Session.findOne({ userId, deviceId });

    if (existingSession) {
        // Same device logging in again — just update
        existingSession.lastActive = new Date();
        existingSession.deviceName = parseDeviceName(userAgent);
        await existingSession.save();
        return { allowed: true };
    }

    // New device — check device count
    const sessionCount = await Session.countDocuments({ userId });

    if (sessionCount >= MAX_DEVICES) {
        return {
            allowed: false,
            error: `You are already logged in on ${MAX_DEVICES} devices. Please log out from one device first, or use "Logout All Devices" from your profile.`,
        };
    }

    // Create new session
    await Session.create({
        userId,
        deviceId,
        deviceName: parseDeviceName(userAgent),
        lastActive: new Date(),
    });

    return { allowed: true };
};

/**
 * Verify OTPless token via their REST API
 * Returns user details (phone, name) if valid
 */
const verifyOtplessToken = async (token: string): Promise<{
    success: boolean;
    phone_number?: string;
    name?: string;
    error?: string;
}> => {
    try {
        const response = await fetch('https://auth.otpless.app/auth/v1/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token,
                client_id: OTPLESS_CLIENT_ID,
                client_secret: OTPLESS_CLIENT_SECRET,
            }),
        });

        const data = (await response.json()) as any;

        if (!response.ok || !data.phone_number) {
            return { success: false, error: data.message || 'Token verification failed' };
        }

        return {
            success: true,
            phone_number: data.phone_number || data.national_phone_number,
            name: data.name || 'Student',
        };
    } catch (error) {
        console.error('OTPless verification error:', error);
        return { success: false, error: 'OTPless service unavailable' };
    }
};

// ─── Endpoints ────────────────────────────────────────────────────────────────

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password, name, role } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            res.status(400).json({ success: false, message: 'User already exists' });
            return;
        }

        // Create user (password hashing happens in model pre-save hook)
        const user = await User.create({
            email,
            password,
            name,
            role: role || 'student',
        });

        res.status(201).json({
            success: true,
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user._id.toString(), user.tokenVersion, 'admin-portal'),
            },
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            res.status(400).json({ success: false, message: 'Please provide email and password' });
            return;
        }

        // Check for user
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
            return;
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
            return;
        }

        res.json({
            success: true,
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user._id.toString(), user.tokenVersion, 'admin-portal'),
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Login/Register via WhatsApp (OTPless)
// @route   POST /api/auth/whatsapp
// @access  Public
export const whatsappLogin = async (req: Request, res: Response): Promise<void> => {
    try {
        const { token, deviceId } = req.body;

        if (!token) {
            res.status(400).json({ success: false, message: 'OTPless token is required' });
            return;
        }

        const clientDeviceId = deviceId || 'unknown-device';
        const userAgent = req.headers['user-agent'] || '';

        // Verify OTPless token
        const verification = await verifyOtplessToken(token);
        if (!verification.success || !verification.phone_number) {
            res.status(401).json({ success: false, message: verification.error || 'Verification failed' });
            return;
        }

        const phone = verification.phone_number;
        const name = verification.name || 'Student';

        // Check if user already exists by phone
        let user = await User.findOne({ phone });

        if (user) {
            // Enforce device limit
            const sessionResult = await upsertSession(user._id.toString(), clientDeviceId, userAgent);
            if (!sessionResult.allowed) {
                res.status(409).json({ success: false, message: sessionResult.error });
                return;
            }

            res.json({
                success: true,
                data: {
                    _id: user._id,
                    name: user.name,
                    phone: user.phone,
                    role: user.role,
                    token: generateToken(user._id.toString(), user.tokenVersion, clientDeviceId),
                    isNewUser: false,
                },
            });
        } else {
            // New student — create account
            user = await User.create({
                phone,
                name,
                role: 'student',
                authProvider: 'whatsapp',
            });

            // Create first session (no limit check needed for new users)
            await Session.create({
                userId: user._id,
                deviceId: clientDeviceId,
                deviceName: parseDeviceName(userAgent),
                lastActive: new Date(),
            });

            res.status(201).json({
                success: true,
                data: {
                    _id: user._id,
                    name: user.name,
                    phone: user.phone,
                    role: user.role,
                    token: generateToken(user._id.toString(), user.tokenVersion, clientDeviceId),
                    isNewUser: true,
                },
            });
        }
    } catch (error) {
        console.error('WhatsApp login error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as Request & { user: { _id: string; name: string; email: string; phone?: string; role: string } }).user;
        res.json({
            success: true,
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
            },
        });
    } catch (error) {
        console.error('GetMe error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Send Mock OTP (Dev Mode)
// @route   POST /api/auth/send-otp
// @access  Public
export const sendOtp = async (req: Request, res: Response): Promise<void> => {
    try {
        const { phone } = req.body;

        if (!phone) {
            res.status(400).json({ success: false, message: 'Phone number is required' });
            return;
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes expiry

        // Store OTP
        otpStore.set(phone, { otp, expiresAt });

        // Print OTP to developer console
        console.log('\n========================================');
        console.log(`📲  [DEV MODE] OTP FOR PHONE: ${phone}`);
        console.log(`🔑  OTP CODE: ${otp}`);
        console.log(`⏳  Expires in 5 minutes`);
        console.log('========================================\n');

        res.json({
            success: true,
            message: 'OTP sent successfully (Check server terminal or browser console for code)',
            devOtp: otp,
        });
    } catch (error) {
        console.error('Send OTP error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Verify Mock OTP and Login/Register
// @route   POST /api/auth/verify-otp
// @access  Public
export const verifyOtp = async (req: Request, res: Response): Promise<void> => {
    try {
        const { phone, otp, deviceId } = req.body;

        if (!phone || !otp) {
            res.status(400).json({ success: false, message: 'Phone number and OTP are required' });
            return;
        }

        const clientDeviceId = deviceId || 'unknown-device';
        const userAgent = req.headers['user-agent'] || '';

        // Retrieve OTP
        const record = otpStore.get(phone);

        if (!record) {
            res.status(400).json({ success: false, message: 'No OTP requested for this number' });
            return;
        }

        // Check expiry
        if (Date.now() > record.expiresAt) {
            otpStore.delete(phone);
            res.status(400).json({ success: false, message: 'OTP has expired' });
            return;
        }

        // Verify OTP
        if (record.otp !== otp) {
            res.status(400).json({ success: false, message: 'Invalid OTP code' });
            return;
        }

        // OTP is valid, remove it
        otpStore.delete(phone);

        // Find or create student user
        let user = await User.findOne({ phone });

        if (user) {
            // Check if suspended
            if (user.status === 'suspended') {
                res.status(403).json({ success: false, message: 'Your account has been suspended. Please contact support.' });
                return;
            }

            // Enforce device limit
            const sessionResult = await upsertSession(user._id.toString(), clientDeviceId, userAgent);
            if (!sessionResult.allowed) {
                res.status(409).json({ success: false, message: sessionResult.error });
                return;
            }

            res.json({
                success: true,
                data: {
                    _id: user._id,
                    name: user.name,
                    phone: user.phone,
                    email: user.email,
                    role: user.role,
                    status: user.status,
                    token: generateToken(user._id.toString(), user.tokenVersion, clientDeviceId),
                    isNewUser: false,
                },
            });
        } else {
            // New student signup
            user = await User.create({
                phone,
                name: 'Student', // Default name, can edit on profile
                role: 'student',
                authProvider: 'whatsapp',
                status: 'active',
            });

            // Create first session
            await Session.create({
                userId: user._id,
                deviceId: clientDeviceId,
                deviceName: parseDeviceName(userAgent),
                lastActive: new Date(),
            });

            res.status(201).json({
                success: true,
                data: {
                    _id: user._id,
                    name: user.name,
                    phone: user.phone,
                    role: user.role,
                    status: user.status,
                    token: generateToken(user._id.toString(), user.tokenVersion, clientDeviceId),
                    isNewUser: true,
                },
            });
        }
    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Update student profile details (name, email)
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, email } = req.body;
        const userId = (req as Request & { user?: { _id: string } }).user?._id;

        if (!userId) {
            res.status(401).json({ success: false, message: 'Not authorized' });
            return;
        }

        const user = await User.findById(userId);
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }

        if (user.status === 'suspended') {
            res.status(403).json({ success: false, message: 'Your account has been suspended' });
            return;
        }

        // Update fields if provided
        if (name !== undefined) user.name = name;
        if (email !== undefined) {
            // Check email uniqueness if email changed and is not null/empty
            if (email && email !== user.email) {
                const emailExists = await User.findOne({ email });
                if (emailExists) {
                    res.status(400).json({ success: false, message: 'Email is already in use' });
                    return;
                }
            }
            user.email = email || undefined; // Clear email if set to empty string
        }

        await user.save();

        res.json({
            success: true,
            data: {
                _id: user._id,
                name: user.name,
                phone: user.phone,
                email: user.email,
                role: user.role,
                status: user.status,
            },
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ─── New Session Management Endpoints ─────────────────────────────────────────

// @desc    Refresh token (silent refresh)
// @route   POST /api/auth/refresh-token
// @access  Private
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
        const authUser = (req as Request & { user?: { _id: string } }).user;
        if (!authUser) {
            res.status(401).json({ success: false, message: 'Not authorized' });
            return;
        }

        // Extract deviceId from the current JWT
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            res.status(401).json({ success: false, message: 'No token' });
            return;
        }

        const decoded = jwt.decode(token) as { id: string; tokenVersion?: number; deviceId?: string } | null;
        const deviceId = decoded?.deviceId || req.body.deviceId || 'unknown-device';

        // Verify user and session
        const user = await User.findById(authUser._id);
        if (!user) {
            res.status(401).json({ success: false, message: 'User not found' });
            return;
        }

        // Verify session still exists
        const session = await Session.findOne({ userId: user._id, deviceId });
        if (!session) {
            res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
            return;
        }

        // Update session activity
        session.lastActive = new Date();
        await session.save();

        // Issue new token
        const newToken = generateToken(user._id.toString(), user.tokenVersion, deviceId);

        res.json({
            success: true,
            token: newToken,
        });
    } catch (error) {
        console.error('Refresh token error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Logout from all devices
// @route   POST /api/auth/logout-all
// @access  Private
export const logoutAll = async (req: Request, res: Response): Promise<void> => {
    try {
        const authUser = (req as Request & { user?: { _id: string } }).user;
        if (!authUser) {
            res.status(401).json({ success: false, message: 'Not authorized' });
            return;
        }

        // Increment tokenVersion — invalidates ALL existing JWTs
        await User.findByIdAndUpdate(authUser._id, { $inc: { tokenVersion: 1 } });

        // Delete all session records
        const result = await Session.deleteMany({ userId: authUser._id });

        res.json({
            success: true,
            message: `Logged out from all devices. ${result.deletedCount} session(s) removed.`,
        });
    } catch (error) {
        console.error('Logout all error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get active device sessions
// @route   GET /api/auth/devices
// @access  Private
export const getDevices = async (req: Request, res: Response): Promise<void> => {
    try {
        const authUser = (req as Request & { user?: { _id: string } }).user;
        if (!authUser) {
            res.status(401).json({ success: false, message: 'Not authorized' });
            return;
        }

        // Get current device ID from JWT
        const token = req.headers.authorization?.split(' ')[1];
        const decoded = token ? (jwt.decode(token) as { deviceId?: string } | null) : null;
        const currentDeviceId = decoded?.deviceId || '';

        const sessions = await Session.find({ userId: authUser._id })
            .sort({ lastActive: -1 })
            .lean();

        const devices = sessions.map((s) => ({
            deviceId: s.deviceId,
            deviceName: s.deviceName,
            lastActive: s.lastActive,
            isCurrent: s.deviceId === currentDeviceId,
        }));

        res.json({ success: true, data: devices });
    } catch (error) {
        console.error('Get devices error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Remove a specific device session
// @route   DELETE /api/auth/devices/:deviceId
// @access  Private
export const removeDevice = async (req: Request, res: Response): Promise<void> => {
    try {
        const authUser = (req as Request & { user?: { _id: string } }).user;
        if (!authUser) {
            res.status(401).json({ success: false, message: 'Not authorized' });
            return;
        }

        const { deviceId } = req.params;

        const result = await Session.findOneAndDelete({
            userId: authUser._id,
            deviceId,
        });

        if (!result) {
            res.status(404).json({ success: false, message: 'Device session not found' });
            return;
        }

        // Check if user removed their own current device
        const token = req.headers.authorization?.split(' ')[1];
        const decoded = token ? (jwt.decode(token) as { deviceId?: string } | null) : null;
        const isSelf = decoded?.deviceId === deviceId;

        res.json({
            success: true,
            message: 'Device removed successfully.',
            isSelf,
        });
    } catch (error) {
        console.error('Remove device error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
