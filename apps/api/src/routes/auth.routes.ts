import { Router } from 'express';
import {
    register,
    login,
    whatsappLogin,
    getMe,
    sendOtp,
    verifyOtp,
    updateProfile,
    refreshToken,
    logoutAll,
    getDevices,
    removeDevice,
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

// @route   POST /api/auth/refresh-token
// @desc    Silent token refresh — issues new 30d JWT
// @access  Private
router.post('/refresh-token', protect, refreshToken);

// @route   POST /api/auth/logout-all
// @desc    Logout from all devices (increments tokenVersion)
// @access  Private
router.post('/logout-all', protect, logoutAll);

// @route   GET /api/auth/devices
// @desc    List active device sessions
// @access  Private
router.get('/devices', protect, getDevices);

// @route   DELETE /api/auth/devices/:deviceId
// @desc    Remove a specific device session
// @access  Private
router.delete('/devices/:deviceId', protect, removeDevice);

export default router;

