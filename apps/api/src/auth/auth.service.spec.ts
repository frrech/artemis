import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { validate } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/auth.dto';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  it('accepts a long setup secret used by the registration form', async () => {
    const dto = Object.assign(new RegisterDto(), {
      email: 'owner@example.com',
      setupSecret: 's'.repeat(169),
      password: 'a-secure-password',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects an invalid initial setup code before creating an account', async () => {
    const prisma = { $transaction: jest.fn() };
    const service = new AuthService(
      prisma as unknown as PrismaService,
      { signAsync: jest.fn() } as unknown as JwtService,
      { get: () => 'private-shop-setup-secret' } as unknown as ConfigService,
    );

    await expect(
      service.register({
        email: 'owner@example.com',
        setupSecret: 'incorrect-setup-code',
        password: 'a-secure-password',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('creates the initial account with a password hash and signs it in', async () => {
    const createdUser = { id: 'user-1', email: 'owner@example.com' };
    let savedEmail = '';
    let savedPasswordHash = '';
    const create = jest.fn(
      (input: { data: { email: string; passwordHash: string } }) => {
        savedEmail = input.data.email;
        savedPasswordHash = input.data.passwordHash;
        return Promise.resolve(createdUser);
      },
    );
    const prisma = {
      $transaction: jest.fn(
        (operation: (client: { user: unknown }) => Promise<unknown>) =>
          operation({
            user: {
              count: jest.fn().mockResolvedValue(0),
              create,
            },
          }),
      ),
    };
    const jwtService = {
      signAsync: jest.fn().mockResolvedValue('signed-token'),
    };
    const service = new AuthService(
      prisma as unknown as PrismaService,
      jwtService as unknown as JwtService,
      { get: () => 'private-shop-setup-secret' } as unknown as ConfigService,
    );

    const session = await service.register({
      email: ' Owner@Example.com ',
      setupSecret: 'private-shop-setup-secret',
      password: 'a-secure-password',
    });

    expect(create).toHaveBeenCalledTimes(1);
    expect(savedEmail).toBe('owner@example.com');
    expect(savedPasswordHash).toMatch(/^\$2[aby]\$/);
    expect(savedPasswordHash).not.toBe('a-secure-password');
    expect(session).toEqual({
      accessToken: 'signed-token',
      user: createdUser,
    });
  });

  it('does not allow a second public account to access the shop', async () => {
    const create = jest.fn();
    const prisma = {
      $transaction: jest.fn(
        (operation: (client: { user: unknown }) => Promise<unknown>) =>
          operation({
            user: {
              count: jest.fn().mockResolvedValue(1),
              create,
            },
          }),
      ),
    };
    const service = new AuthService(
      prisma as unknown as PrismaService,
      { signAsync: jest.fn() } as unknown as JwtService,
      { get: () => 'private-shop-setup-secret' } as unknown as ConfigService,
    );

    await expect(
      service.register({
        email: 'another@example.com',
        setupSecret: 'private-shop-setup-secret',
        password: 'a-secure-password',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(create).not.toHaveBeenCalled();
  });
});
