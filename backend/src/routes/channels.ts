import { Router } from 'express';

const router = Router();

// Channel routes will be implemented in the next phase
router.get('/', (req, res) => {
  res.status(200).json({ message: 'Channel routes - Coming soon' });
});

export default router;