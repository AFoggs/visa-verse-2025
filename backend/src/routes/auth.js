import { Router } from 'express';
import { getAuth } from '../config/firebase.js';

const router = Router();

// Verify token endpoint (for frontend to validate tokens)
router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const auth = getAuth();
    const decodedToken = await auth.verifyIdToken(token);

    res.json({
      valid: true,
      uid: decodedToken.uid,
      email: decodedToken.email,
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ valid: false, error: 'Invalid token' });
  }
});

export default router;
