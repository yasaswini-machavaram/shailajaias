import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import {
    getMentorRoster,
    getMentorChats,
    sendMentorChat,
    getMentorEvaluations,
    sendMentorBroadcast,
    tagInactiveStudent,
    getMenteeDossier,
    saveMenteeNotes,
    getMentorRequests,
    reviewMentorRequest,
} from '../controllers/mentorPortal.controller.js';

const router: Router = Router();

router.use(protect);

router.get('/roster', getMentorRoster);
router.get('/requests', getMentorRequests);
router.post('/requests/:id/review', reviewMentorRequest);
router.get('/chat', getMentorChats);
router.post('/chat/send', sendMentorChat);
router.get('/evaluation', getMentorEvaluations);
router.post('/broadcast', sendMentorBroadcast);
router.post('/tag-inactive', tagInactiveStudent);
router.get('/mentee/:id', getMenteeDossier);
router.post('/mentee/:id/notes', saveMenteeNotes);

export default router;
