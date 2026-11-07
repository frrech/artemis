import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSaleDto, UpdateSaleDto } from './dto/sale.dto';

const saleRelations = { product: true } as const;

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.sale.findMany({
      include: saleRelations,
      orderBy: { soldAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: saleRelations,
    });
    if (!sale) {
      throw new NotFoundException('Venda não encontrada.');
    }
    return sale;
  }

  async create(input: CreateSaleDto) {
    return this.prisma.$transaction(async (transaction) => {
      const product = await transaction.product.findUnique({
        where: { id: input.productId },
      });
      if (!product) {
        throw new NotFoundException('Produto não encontrado.');
      }

      const stockUpdate = await transaction.product.updateMany({
        where: { id: input.productId, stockQuantity: { gte: input.quantity } },
        data: { stockQuantity: { decrement: input.quantity } },
      });
      if (stockUpdate.count === 0) {
        throw new BadRequestException('Estoque insuficiente para esta venda.');
      }

      return transaction.sale.create({
        data: {
          productId: product.id,
          quantity: input.quantity,
          unitPrice: product.unitPrice,
          ...(input.soldAt && { soldAt: new Date(input.soldAt) }),
        },
        include: saleRelations,
      });
    });
  }

  async update(id: string, input: UpdateSaleDto) {
    return this.prisma.$transaction(async (transaction) => {
      const previous = await transaction.sale.findUnique({
        where: { id },
        include: { product: true },
      });
      if (!previous) {
        throw new NotFoundException('Venda não encontrada.');
      }

      const productId = input.productId ?? previous.productId;
      const quantity = input.quantity ?? previous.quantity;
      const changedProduct = productId !== previous.productId;
      let unitPrice = previous.unitPrice;

      if (changedProduct) {
        const newProduct = await transaction.product.findUnique({
          where: { id: productId },
        });
        if (!newProduct) {
          throw new NotFoundException('Produto não encontrado.');
        }
        unitPrice = newProduct.unitPrice;
        await transaction.product.update({
          where: { id: previous.productId },
          data: { stockQuantity: { increment: previous.quantity } },
        });
        const stockUpdate = await transaction.product.updateMany({
          where: { id: productId, stockQuantity: { gte: quantity } },
          data: { stockQuantity: { decrement: quantity } },
        });
        if (stockUpdate.count === 0) {
          throw new BadRequestException(
            'Estoque insuficiente para atualizar esta venda.',
          );
        }
      } else if (quantity > previous.quantity) {
        const stockUpdate = await transaction.product.updateMany({
          where: {
            id: productId,
            stockQuantity: { gte: quantity - previous.quantity },
          },
          data: { stockQuantity: { decrement: quantity - previous.quantity } },
        });
        if (stockUpdate.count === 0) {
          throw new BadRequestException(
            'Estoque insuficiente para atualizar esta venda.',
          );
        }
      } else if (quantity < previous.quantity) {
        await transaction.product.update({
          where: { id: productId },
          data: { stockQuantity: { increment: previous.quantity - quantity } },
        });
      }

      return transaction.sale.update({
        where: { id },
        data: {
          productId,
          quantity,
          ...(changedProduct && { unitPrice }),
          ...(input.soldAt && { soldAt: new Date(input.soldAt) }),
        },
        include: saleRelations,
      });
    });
  }

  async remove(id: string) {
    return this.prisma.$transaction(async (transaction) => {
      const sale = await transaction.sale.findUnique({ where: { id } });
      if (!sale) {
        throw new NotFoundException('Venda não encontrada.');
      }
      await transaction.product.update({
        where: { id: sale.productId },
        data: { stockQuantity: { increment: sale.quantity } },
      });
      await transaction.sale.delete({ where: { id } });
      return { deleted: true };
    });
  }
}
