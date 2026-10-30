import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { compare, hash } from 'bcryptjs';
import { createHash, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from './authenticated-user';
import { LoginDto, RegisterDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(input: RegisterDto) {
    const setupSecret = this.config.get<string>('INITIAL_SETUP_SECRET');
    if (
      !setupSecret ||
      !timingSafeEqual(
        createHash('sha256').update(input.setupSecret).digest(),
        createHash('sha256').update(setupSecret).digest(),
      )
    ) {
      throw new UnauthorizedException('Código de configuração inválido.');
    }

    const email = input.email.trim().toLowerCase();
    const passwordHash = await hash(input.password, 12);

    try {
      const user = await this.prisma.$transaction(
        async (transaction) => {
          if ((await transaction.user.count()) > 0) {
            throw new ConflictException(
              'A conta inicial já foi criada. Entre com seu e-mail e senha.',
            );
          }
          return transaction.user.create({
            data: { email, passwordHash },
            select: { id: true, email: true },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      return this.createSession(user);
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Já existe uma conta com este e-mail.');
        }
        if (error.code === 'P2034') {
          throw new ConflictException(
            'A conta inicial já foi criada. Entre com seu e-mail e senha.',
          );
        }
      }
      throw error;
    }
  }

  async getSetupStatus(): Promise<{ registrationAvailable: boolean }> {
    return {
      registrationAvailable: (await this.prisma.user.count()) === 0,
    };
  }

  async login(input: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email.trim().toLowerCase() },
    });

    if (!user || !(await compare(input.password, user.passwordHash))) {
      throw new UnauthorizedException('E-mail ou senha incorretos.');
    }

    return this.createSession({ id: user.id, email: user.email });
  }

  async getUser(id: string): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true },
    });
    if (!user) {
      throw new UnauthorizedException('Sua sessão não é mais válida.');
    }
    return user;
  }

  private async createSession(user: AuthenticatedUser) {
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
    });
    return { accessToken, user };
  }
}
