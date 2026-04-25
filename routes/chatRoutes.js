import express from 'express';
import { sendMessage, clearConversation, getConversations } from '../controllers/chatController.js';
import { rateLimiter, requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.post('/send', rateLimiter, requireAuth, sendMessage);
router.get('/conversations', requireAuth, getConversations);
router.delete('/conversation/:id', requireAuth, clearConversation);

export default router;

