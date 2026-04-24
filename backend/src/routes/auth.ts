import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { User } from '../models/User';
import { config } from '../config';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();
const googleClient = new OAuth2Client(config.googleClientId);

// Used groqApiKey temporarily as JWT secret if no explicit JWT_SECRET exists
const getJwtSecret = () => config.groqApiKey || 'fallback_secret';

// POST /api/auth/register
router.post(
  '/register',
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { name, email, password, school, role } = req.body;

      const existingUser = await User.findOne({ email });
      if (existingUser) return res.status(400).json({ error: 'Email already in use' });

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      const userRole = role === 'teacher' || role === 'student' ? role : 'student';
      const user = await User.create({ name, email, passwordHash, school, role: userRole });
      
      const token = jwt.sign({ id: user._id, role: user.role }, getJwtSecret(), { expiresIn: '7d' });

      return res.status(201).json({
        token,
        user: { id: user._id, name: user.name, email: user.email, role: user.role, school: user.school, phone: user.phone, designation: user.designation, bio: user.bio, subjects: user.subjects, city: user.city, state: user.state, branch: user.branch, degree: user.degree },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error during registration' });
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email });
      if (!user) return res.status(401).json({ error: 'Invalid email or password' });

      const isMatch = await user.comparePassword(password);
      if (!isMatch) return res.status(401).json({ error: 'Invalid email or password' });

      const token = jwt.sign({ id: user._id, role: user.role }, getJwtSecret(), { expiresIn: '7d' });

      return res.json({
        token,
        user: { id: user._id, name: user.name, email: user.email, role: user.role, school: user.school, phone: user.phone, designation: user.designation, bio: user.bio, subjects: user.subjects, city: user.city, state: user.state, branch: user.branch, degree: user.degree },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error during login' });
    }
  }
);

// POST /api/auth/google
router.post('/google', async (req: Request, res: Response) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: 'Google ID token required' });

    // Verify the Google ID Token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: config.googleClientId !== 'your-google-client-id.apps.googleusercontent.com' ? config.googleClientId : undefined,
    });
    const payload = ticket.getPayload();
    if (!payload?.email) return res.status(400).json({ error: 'Invalid Google token' });

    const { email, name, picture } = payload;

    // Find or Create user
    let user = await User.findOne({ email });
    if (!user) {
      const generatedPassword = await bcrypt.hash(Math.random().toString(36).slice(-10), 10);
      user = await User.create({
        name: name || 'Google User',
        email,
        passwordHash: generatedPassword, 
        role: 'teacher',
      });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, getJwtSecret(), { expiresIn: '7d' });

    return res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, school: user.school, phone: user.phone, designation: user.designation, bio: user.bio, subjects: user.subjects, city: user.city, state: user.state, branch: user.branch, degree: user.degree },
    });
  } catch (err) {
    console.error('Google Auth Error:', err);
    return res.status(401).json({ error: 'Failed to authenticate with Google' });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?.id).select('-passwordHash');
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    return res.json({ 
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        school: user.school,
        phone: user.phone,
        designation: user.designation,
        bio: user.bio,
        subjects: user.subjects,
        city: user.city,
        state: user.state,
        branch: user.branch,
        degree: user.degree
      } 
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// PUT /api/auth/profile
router.put('/profile', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { name, phone, bio, school, designation, subjects, city, state, branch, degree } = req.body;
    const user = await User.findById(req.user?.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (bio !== undefined) user.bio = bio;
    if (school !== undefined) user.school = school;
    if (designation !== undefined) user.designation = designation;
    if (subjects !== undefined && Array.isArray(subjects)) user.subjects = subjects;
    if (city !== undefined) user.city = city;
    if (state !== undefined) user.state = state;
    if (branch !== undefined) user.branch = branch;
    if (degree !== undefined) user.degree = degree;

    await user.save();

    return res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        school: user.school,
        phone: user.phone,
        bio: user.bio,
        designation: user.designation,
        subjects: user.subjects,
        city: user.city,
        state: user.state,
        branch: user.branch,
        degree: user.degree,
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;
