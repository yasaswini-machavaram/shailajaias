import { Router } from 'express';
import {
    register,
    login,
    whatsappLogin,
    getMe,
    sendOtp,
    verifyOtp,
    updateProfile,
} from '../controllers/auth.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router: ReturnType<typeof Router> = Router();

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', register);

// @route   POST /api/auth/login
// @desc    Login user and return JWT
// @access  Public
router.post('/login', login);

// @route   POST /api/auth/whatsapp
// @desc    Login/Register via WhatsApp (OTPless)
// @access  Public
router.post('/whatsapp', whatsappLogin);

// @route   POST /api/auth/send-otp
// @desc    Send mock OTP
// @access  Public
router.post('/send-otp', sendOtp);

// @route   POST /api/auth/verify-otp
// @desc    Verify mock OTP
// @access  Public
router.post('/verify-otp', verifyOtp);

// @route   PUT /api/auth/profile
// @desc    Update student profile (name, email)
// @access  Private
router.put('/profile', protect, updateProfile);

// @route   GET /api/auth/me
// @desc    Get current logged in user
// @access  Private
router.get('/me', protect, getMe);

export default router;

