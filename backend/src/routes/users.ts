import { Router } from 'express';

const router = Router();

// User routes will be implemented in the next phase
router.get('/', (req, res) => {
  res.status(200).json({ message: 'User routes - Coming soon' });
});

export default router;