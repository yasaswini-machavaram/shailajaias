import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';

// Use same secret as middleware
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

// OTPless credentials
const OTPLESS_CLIENT_ID = process.env.OTPLESS_CLIENT_ID || '';
const OTPLESS_CLIENT_SECRET = process.env.OTPLESS_CLIENT_SECRET || '';

// In-memory OTP store for dev mode
const otpStore = new Map<string, { otp: string; expiresAt: number }>();

// Generate JWT token
const generateToken = (id: string): string => {
    return jwt.sign({ id }, JWT_SECRET, {
        expiresIn: '30d',
    });
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
                token: generateToken(user._id.toString()),
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
                token: generateToken(user._id.toString()),
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
        const { token } = req.body;

        if (!token) {
            res.status(400).json({ success: false, message: 'OTPless token is required' });
            return;
        }

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
            // Returning student — generate JWT and return
            res.json({
                success: true,
                data: {
                    _id: user._id,
                    name: user.name,
                    phone: user.phone,
                    role: user.role,
                    token: generateToken(user._id.toString()),
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

            res.status(201).json({
                success: true,
                data: {
                    _id: user._id,
                    name: user.name,
                    phone: user.phone,
                    role: user.role,
                    token: generateToken(user._id.toString()),
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
        const { phone, otp } = req.body;

        if (!phone || !otp) {
            res.status(400).json({ success: false, message: 'Phone number and OTP are required' });
            return;
        }

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

            res.json({
                success: true,
                data: {
                    _id: user._id,
                    name: user.name,
                    phone: user.phone,
                    email: user.email,
                    role: user.role,
                    status: user.status,
                    token: generateToken(user._id.toString()),
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

            res.status(201).json({
                success: true,
                data: {
                    _id: user._id,
                    name: user.name,
                    phone: user.phone,
                    role: user.role,
                    status: user.status,
                    token: generateToken(user._id.toString()),
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

