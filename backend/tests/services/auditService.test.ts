import auditService from '../../src/services/auditService';
import { prisma } from '../../src/app';

jest.mock('../../src/app', () => ({
  prisma: {
    auditLog: {
      create: jest.fn(),
    },
  },
}));

jest.mock('../../src/utils/logger', () => ({
  error: jest.fn(),
}));

const createMock = prisma.auditLog.create as jest.Mock;

describe('auditService.recordEvent', () => {
  beforeEach(() => {
    createMock.mockClear();
    createMock.mockResolvedValue(undefined);
  });

  it('omits metadata when not provided', async () => {
    await auditService.recordEvent({
      action: 'TEST_ACTION',
    });

    expect(createMock).toHaveBeenCalledTimes(1);
    const [{ data }] = createMock.mock.calls[0] as [{ data: Record<string, unknown> }];
    expect(data.metadata).toBeUndefined();
  });

  it('passes metadata when provided', async () => {
    const metadata = { important: true };

    await auditService.recordEvent({
      action: 'TEST_ACTION_WITH_METADATA',
      metadata,
    });

    expect(createMock).toHaveBeenCalledTimes(1);
    const [{ data }] = createMock.mock.calls[0] as [{ data: Record<string, unknown> }];
    expect(data.metadata).toEqual(metadata);
  });
});
