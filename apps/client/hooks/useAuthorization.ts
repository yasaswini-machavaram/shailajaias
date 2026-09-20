'use client';

import { useStudentAuth } from '../contexts/StudentAuthContext';
import { IVideoItem } from '@repo/types';

export function useAuthorization() {
    const { user, isLoggedIn } = useStudentAuth();

    const isMentorshipStudent = !!user?.isMentorshipStudent;

    const hasPtsAccess = (ptsId?: string): boolean => {
        if (!ptsId) return false;
        if (isMentorshipStudent) return true;
        if (!user || !user.purchasedPtsGroups) return false;
        return user.purchasedPtsGroups.some((id) => id.toString() === ptsId.toString());
    };

    const hasMtsAccess = (mtsId?: string): boolean => {
        if (!mtsId) return false;
        if (isMentorshipStudent) return true;
        if (!user || !user.purchasedMtsGroups) return false;
        return user.purchasedMtsGroups.some((id) => id.toString() === mtsId.toString());
    };

    const hasCourseAccess = (courseId?: string, parentCourseGroupId?: string): boolean => {
        if (isMentorshipStudent) return true;
        if (!user) return false;

        if (courseId && user.purchasedCourses?.some((id) => id.toString() === courseId.toString())) {
            return true;
        }

        if (parentCourseGroupId && user.purchasedCourseGroups?.some((id) => id.toString() === parentCourseGroupId.toString())) {
            return true;
        }

        return false;
    };

    const isPracticeLockedForVideo = (video?: IVideoItem, courseId?: string): boolean => {
        if (!video) return true;
        // Hard admin override
        if (video.isPracticeLocked) return true;
        // Mentorship or purchased course unlocks
        if (hasCourseAccess(courseId)) return false;
        // Default locked for non-purchased students
        return true;
    };

    const isHelpLockedForVideo = (video?: IVideoItem, courseId?: string): boolean => {
        if (!video) return true;
        // Hard admin override
        if (video.isHelpLocked) return true;
        // Mentorship or purchased course unlocks
        if (hasCourseAccess(courseId)) return false;
        // Default locked for non-purchased students
        return true;
    };

    return {
        isLoggedIn,
        isMentorshipStudent,
        hasPtsAccess,
        hasMtsAccess,
        hasCourseAccess,
        isPracticeLockedForVideo,
        isHelpLockedForVideo,
    };
}
