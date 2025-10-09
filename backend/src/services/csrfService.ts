import crypto from 'crypto';
import logger from '../utils/logger';

type TokenEntry = {
  expiresAt: number;
  userId?: string;
  singleUse: boolean;
};

/**
 * Simple in-memory CSRF token store with TTL and single-use enforcement.
 * This implementation is suitable for single-instance deployments and can be
 * swapped with a distributed store (e.g., Redis) by re-implementing this class.
 */
class CsrfService {
  private static readonly TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes
  private static readonly MAX_TOKENS = 10000;
  private static tokens: Map<string, TokenEntry> = new Map();

  /**
   * Generates a new CSRF token and stores it with expiry.
   */
  static generateToken(userId?: string, singleUse = true): string {
    this.cleanupExpiredTokens();

    if (this.tokens.size >= this.MAX_TOKENS) {
      logger.warn('CSRF token store at capacity. Purging oldest tokens.');
      this.evictOldestTokens(Math.ceil(this.MAX_TOKENS / 10));
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + this.TOKEN_TTL_MS;

    this.tokens.set(token, { expiresAt, userId, singleUse });
    return token;
  }

  /**
   * Validates and optionally consumes a CSRF token.
   */
  static consumeToken(token: string, userId?: string): boolean {
    const entry = this.tokens.get(token);

    if (!entry) {
      return false;
    }

    if (entry.expiresAt < Date.now()) {
      this.tokens.delete(token);
      return false;
    }

    if (entry.userId && userId && entry.userId !== userId) {
      return false;
    }

    if (entry.singleUse) {
      this.tokens.delete(token);
    }

    return true;
  }

  /**
   * Removes expired tokens from the store.
   */
  private static cleanupExpiredTokens(): void {
    const now = Date.now();
    for (const [token, entry] of this.tokens.entries()) {
      if (entry.expiresAt < now) {
        this.tokens.delete(token);
      }
    }
  }

  /**
   * Evicts the oldest tokens to control memory usage.
   */
  private static evictOldestTokens(count: number): void {
    const tokens = Array.from(this.tokens.entries())
      .sort(([, a], [, b]) => a.expiresAt - b.expiresAt)
      .slice(0, count);

    for (const [token] of tokens) {
      this.tokens.delete(token);
    }
  }
}

export default CsrfService;
