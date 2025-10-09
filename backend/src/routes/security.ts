import { Router, Response } from 'express';
import CsrfService from '../services/csrfService';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

/**
 * GET /api/security/csrf-token
 * Returns a single-use CSRF token that must be supplied in the `x-csrf-token` header
 * for subsequent state-changing requests.
 */
router.get('/csrf-token', (req: AuthenticatedRequest, res: Response) => {
  const token = CsrfService.generateToken(req.user?.id);

  res.status(200).json({
    success: true,
    data: {
      token,
      expiresIn: 15 * 60, // seconds
    },
  });
});

export default router;
