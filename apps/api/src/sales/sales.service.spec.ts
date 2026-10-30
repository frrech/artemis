import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SalesService } from './sales.service';

describe('SalesService', () => {
  const product = {
    id: 'product-1',
    unitPrice: new Prisma.Decimal('15.50'),
    stockQuantity: 8,
  };
  let transaction: {
    product: {
      findUnique: jest.Mock;
      updateMany: jest.Mock;
      update: jest.Mock;
    };
    sale: {
      create: jest.Mock;
      findUnique: jest.Mock;
      delete: jest.Mock;
    };
  };
  let service: SalesService;

  beforeEach(() => {
    transaction = {
      product: {
        findUnique: jest.fn().mockResolvedValue(product),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockResolvedValue(product),
      },
      sale: {
        create: jest.fn().mockResolvedValue({ id: 'sale-1' }),
        findUnique: jest.fn(),
        delete: jest.fn().mockResolvedValue({ id: 'sale-1' }),
      },
    };
    const prisma = {
      $transaction: jest.fn(
        (operation: (client: typeof transaction) => Promise<unknown>) =>
          operation(transaction),
      ),
    };
    service = new SalesService(prisma as unknown as PrismaService);
  });

  it('decrements stock and records the product price when creating a sale', async () => {
    await service.create({ productId: product.id, quantity: 3 });

    expect(transaction.product.updateMany).toHaveBeenCalledWith({
      where: { id: product.id, stockQuantity: { gte: 3 } },
      data: { stockQuantity: { decrement: 3 } },
    });
    expect(transaction.sale.create).toHaveBeenCalledWith({
      data: {
        productId: product.id,
        quantity: 3,
        unitPrice: product.unitPrice,
      },
      include: { product: true },
    });
  });

  it('rejects sales when the requested quantity is not in stock', async () => {
    transaction.product.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.create({ productId: product.id, quantity: 9 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction.sale.create).not.toHaveBeenCalled();
  });

  it('restores stock before deleting a sale', async () => {
    transaction.sale.findUnique.mockResolvedValue({
      id: 'sale-1',
      productId: product.id,
      quantity: 2,
    });

    await service.remove('sale-1');

    expect(transaction.product.update).toHaveBeenCalledWith({
      where: { id: product.id },
      data: { stockQuantity: { increment: 2 } },
    });
    expect(transaction.sale.delete).toHaveBeenCalledWith({
      where: { id: 'sale-1' },
    });
  });
});
