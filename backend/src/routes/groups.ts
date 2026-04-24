import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { Group } from '../models/Group';
import { Assignment } from '../models/Assignment';
import { User } from '../models/User';

const router = Router();

// Create a random 6-character code
const generateJoinCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// POST /api/groups - Create a new group (Teacher only)
router.post(
  '/',
  requireAuth,
  [body('name').notEmpty().withMessage('Name is required')],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      if (req.user?.role !== 'teacher' && req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Only teachers can create groups' });
      }

      const { name, description } = req.body;
      const joinCode = generateJoinCode();

      const group = await Group.create({
        name,
        description,
        joinCode,
        owner: req.user.id,
        members: [],
        assignments: [],
      });

      return res.status(201).json({ group });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
  }
);

// POST /api/groups/join - Join a group using a code
router.post(
  '/join',
  requireAuth,
  [body('joinCode').notEmpty().withMessage('Join code is required')],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { joinCode } = req.body;
      const group = await Group.findOne({ joinCode: joinCode.toUpperCase() });

      if (!group) return res.status(404).json({ error: 'Invalid join code' });

      // Check if user is already a member or is the owner
      if (group.owner.toString() === req.user!.id) {
        return res.status(400).json({ error: 'You are the owner of this group' });
      }

      if (group.members.some((memberId) => memberId.toString() === req.user!.id)) {
        return res.status(400).json({ error: 'You have already joined this group' });
      }

      // Add user to group
      group.members.push(new mongoose.Types.ObjectId(req.user!.id));
      await group.save();

      return res.json({ message: 'Successfully joined group', group });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
  }
);

// GET /api/groups - Get all groups for the connected user
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Find groups where user is owner or member
    const groups = await Group.find({
      $or: [{ owner: userId }, { members: userId }],
    })
      .populate('owner', 'name email avatar')
      .populate('members', 'name email')
      .sort({ createdAt: -1 });

    return res.json({ groups });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/groups/:id - Get a single group detail
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const groupId = req.params.id;

    if (!mongoose.isValidObjectId(groupId)) {
      return res.status(400).json({ error: 'Invalid group ID' });
    }

    const group = await Group.findById(groupId)
      .populate('owner', 'name email')
      .populate('members', 'name email role')
      .populate({
        path: 'assignments',
        select: 'title subject className dueDate createdAt status',
        options: { sort: { createdAt: -1 } }
      });

    if (!group) return res.status(404).json({ error: 'Group not found' });

    // Ensure only owner or members can view
    const isOwner = group.owner._id.toString() === userId;
    const isMember = group.members.some((m: any) => m._id.toString() === userId);

    if (!isOwner && !isMember) {
      return res.status(403).json({ error: 'You do not have access to this group' });
    }

    return res.json({ group, role: isOwner ? 'owner' : 'participant' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/groups/:id/leave - Leave a group
router.post('/:id/leave', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const groupId = req.params.id;

    if (!mongoose.isValidObjectId(groupId)) {
      return res.status(400).json({ error: 'Invalid group ID' });
    }

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    if (group.owner.toString() === userId) {
      return res.status(400).json({ error: 'Owner cannot leave the group. Delete it instead.' });
    }

    const memberIndex = group.members.findIndex((m) => m.toString() === userId);
    if (memberIndex === -1) {
      return res.status(400).json({ error: 'You are not a member of this group' });
    }

    group.members.splice(memberIndex, 1);
    await group.save();

    return res.json({ message: 'Left group successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/groups/:id - Delete (Archive) a group
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const groupId = req.params.id;

    if (!mongoose.isValidObjectId(groupId)) {
      return res.status(400).json({ error: 'Invalid group ID' });
    }

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    if (group.owner.toString() !== userId && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Only the owner can delete this group' });
    }

    await Group.findByIdAndDelete(groupId);
    return res.json({ message: 'Group deleted successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
