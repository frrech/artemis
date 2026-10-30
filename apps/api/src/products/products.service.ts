import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.product.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException('Produto não encontrado.');
    }
    return product;
  }

  create(input: CreateProductDto) {
    return this.prisma.product.create({
      data: {
        ...input,
        name: input.name.trim(),
        description: input.description?.trim() || null,
      },
    });
  }

  async update(id: string, input: UpdateProductDto) {
    try {
      return await this.prisma.product.update({
        where: { id },
        data: {
          ...input,
          ...(input.name !== undefined && { name: input.name.trim() }),
          ...(input.description !== undefined && {
            description: input.description.trim() || null,
          }),
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Produto não encontrado.');
      }
      throw error;
    }
  }

  async remove(id: string) {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const product = await transaction.product.findUnique({
          where: { id },
          select: { id: true, _count: { select: { sales: true } } },
        });
        if (!product) {
          throw new NotFoundException('Produto não encontrado.');
        }
        if (product._count.sales > 0) {
          throw new ConflictException(
            'Não é possível remover um produto que possui vendas registradas.',
          );
        }
        await transaction.product.delete({ where: { id } });
        return { deleted: true };
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('Produto não encontrado.');
        }
        if (error.code === 'P2003') {
          throw new ConflictException(
            'Não é possível remover um produto que possui vendas registradas.',
          );
        }
      }
      throw error;
    }
  }
}
