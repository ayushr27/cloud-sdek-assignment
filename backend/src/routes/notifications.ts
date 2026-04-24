import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { Notification } from '../models/Notification';

const router = Router();

// GET /api/notifications - Get all notifications for the user
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const notifications = await Notification.find({ user: req.user!.id })
      .sort({ createdAt: -1 })
      .limit(50);
    return res.json({ notifications });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error fetching notifications' });
  }
});

// POST /api/notifications/read - Mark notifications as read
router.post('/read', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { notificationIds } = req.body;
    
    if (notificationIds && Array.isArray(notificationIds)) {
      await Notification.updateMany(
        { _id: { $in: notificationIds }, user: req.user!.id },
        { $set: { read: true } }
      );
    } else {
      // Mark all as read if no specific IDs passed
      await Notification.updateMany(
        { user: req.user!.id, read: false },
        { $set: { read: true } }
      );
    }

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error updating notifications' });
  }
});

export default router;
