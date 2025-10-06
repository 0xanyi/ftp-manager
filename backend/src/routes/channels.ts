import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  createChannel,
  getAllChannels,
  getChannelById,
  getUserChannels,
  updateChannel,
  deleteChannel,
  assignUserToChannel,
  removeUserFromChannel,
  getChannelUsers,
  getAvailableUsers,
} from '../controllers/channelController';
import {
  createChannelSchema,
  updateChannelSchema,
  assignUserToChannelSchema,
  removeUserFromChannelSchema,
  idParamsSchema,
  channelIdParamsSchema,
  paginationQuerySchema,
} from '../utils/validation';
import { validateRequest, validateParams, validateQuery } from '../middleware/validateRequest';

const router = Router();

// Public routes (authenticated)
router.get('/user', authenticate, getUserChannels);
router.get('/:id', authenticate, validateParams(idParamsSchema), getChannelById);

// Admin only routes
router.post('/', authenticate, authorize(['ADMIN']), validateRequest(createChannelSchema), createChannel);
router.get('/', authenticate, authorize(['ADMIN']), validateQuery(paginationQuerySchema), getAllChannels);
router.put('/:id', authenticate, authorize(['ADMIN']), validateParams(idParamsSchema), validateRequest(updateChannelSchema), updateChannel);
router.delete('/:id', authenticate, authorize(['ADMIN']), validateParams(idParamsSchema), deleteChannel);

// User-Channel assignment routes (Admin only)
router.post(
  '/assign',
  authenticate,
  authorize(['ADMIN']),
  validateRequest(assignUserToChannelSchema),
  assignUserToChannel
);

router.post(
  '/remove',
  authenticate,
  authorize(['ADMIN']),
  validateRequest(removeUserFromChannelSchema),
  removeUserFromChannel
);

router.get('/:channelId/users', authenticate, authorize(['ADMIN']), validateParams(channelIdParamsSchema), getChannelUsers);
router.get('/:channelId/available-users', authenticate, authorize(['ADMIN']), validateParams(channelIdParamsSchema), getAvailableUsers);

export default router;