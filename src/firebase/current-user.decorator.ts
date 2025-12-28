import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { User } from '@generated/prisma/client';

export interface RequestWithUser extends Request {
  user: User;
}

export type AuthenticatedUser = User;

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      throw new Error(
        'User not found in request. Ensure FirebaseAuthGuard is applied.',
      );
    }

    return user;
  },
);
