import { Router } from 'express';

const router = Router();

// File routes will be implemented in the next phase
router.get('/', (req, res) => {
  res.status(200).json({ message: 'File routes - Coming soon' });
});

export default router;