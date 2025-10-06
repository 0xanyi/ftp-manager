import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deactivateUser,
  reactivateUser,
  getUserChannels,
  updateUserChannels
} from '../controllers/userController';

const router = Router();

// All user management routes require authentication and ADMIN role
router.use(authenticate);
router.use(authorize(['ADMIN']));

/**
 * GET /api/users
 * Get list of users with pagination and filtering
 * Query params: page, limit, search, role, sortBy, sortOrder, isActive
 */
router.get('/', getUsers);

/**
 * GET /api/users/:id
 * Get user by ID
 */
router.get('/:id', getUserById);

/**
 * POST /api/users
 * Create a new user
 */
router.post('/', createUser);

/**
 * PUT /api/users/:id
 * Update user
 */
router.put('/:id', updateUser);

/**
 * DELETE /api/users/:id
 * Deactivate user (soft delete)
 */
router.delete('/:id', deactivateUser);

/**
 * POST /api/users/:id/reactivate
 * Reactivate user
 */
router.post('/:id/reactivate', reactivateUser);

/**
 * GET /api/users/:id/channels
 * Get user's channel assignments
 */
router.get('/:id/channels', getUserChannels);

/**
 * PUT /api/users/:id/channels
 * Update user's channel assignments
 */
router.put('/:id/channels', updateUserChannels);

export default router;