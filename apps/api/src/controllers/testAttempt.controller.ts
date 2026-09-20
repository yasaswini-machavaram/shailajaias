import type { Response } from 'express';
import type { AuthRequest } from '../middlewares/auth.middleware.js';
import { TestAttempt, User, TestSeries } from '../models/index.js';

export const getAttemptStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Not authorized' });
            return;
        }

        const { ptsId, testIndex } = req.params;
        const testIdx = parseInt(testIndex, 10);

        if (isNaN(testIdx)) {
            res.status(400).json({ success: false, message: 'Invalid test index' });
            return;
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }

        // Check if user has full access (Mentorship or purchased PTS)
        const isMentorship = user.isMentorshipStudent || false;
        const isPurchased = user.purchasedPtsGroups?.some((id) => id.toString() === ptsId) || false;
        const hasFullAccess = isMentorship || isPurchased;

        const attemptRecord = await TestAttempt.findOne({
            userId: user._id,
            ptsId,
            testIndex: testIdx,
        });

        const attemptCount = attemptRecord ? attemptRecord.attemptCount : 0;
        const allowedToTake = hasFullAccess || attemptCount < 2;

        res.json({
            success: true,
            data: {
                ptsId,
                testIndex: testIdx,
                attemptCount,
                hasFullAccess,
                allowedToTake,
                remainingFreeAttempts: hasFullAccess ? null : Math.max(0, 2 - attemptCount),
            },
        });
    } catch (error) {
        console.error('Get attempt status error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const recordAttempt = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Not authorized' });
            return;
        }

        const { ptsId, testIndex } = req.body;
        const testIdx = parseInt(testIndex, 10);

        if (!ptsId || isNaN(testIdx)) {
            res.status(400).json({ success: false, message: 'ptsId and valid testIndex required' });
            return;
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }

        const isMentorship = user.isMentorshipStudent || false;
        const isPurchased = user.purchasedPtsGroups?.some((id) => id.toString() === ptsId) || false;
        const hasFullAccess = isMentorship || isPurchased;

        let attemptRecord = await TestAttempt.findOne({
            userId: user._id,
            ptsId,
            testIndex: testIdx,
        });

        if (!attemptRecord) {
            attemptRecord = new TestAttempt({
                userId: user._id,
                ptsId,
                testIndex: testIdx,
                attemptCount: 1,
                lastAttemptAt: new Date(),
            });
        } else {
            if (!hasFullAccess && attemptRecord.attemptCount >= 2) {
                res.status(403).json({
                    success: false,
                    message: 'Free attempt limit reached (2 attempts max). Purchase test series for unlimited attempts.',
                });
                return;
            }
            attemptRecord.attemptCount += 1;
            attemptRecord.lastAttemptAt = new Date();
        }

        await attemptRecord.save();

        res.json({
            success: true,
            message: 'Attempt recorded',
            data: {
                ptsId,
                testIndex: testIdx,
                attemptCount: attemptRecord.attemptCount,
                hasFullAccess,
                allowedToTake: hasFullAccess || attemptRecord.attemptCount < 2,
                remainingFreeAttempts: hasFullAccess ? null : Math.max(0, 2 - attemptRecord.attemptCount),
            },
        });
    } catch (error) {
        console.error('Record attempt error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
