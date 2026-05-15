import { SetMetadata } from '@nestjs/common';
import { IS_PUBLIC_KEY } from './jwt-auth.guard';

/**
 * Decorator to mark a route as publicly accessible (bypasses JwtAuthGuard).
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
