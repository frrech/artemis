import { ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  const product = {
    id: 'product-1',
    name: 'Caderno artesanal',
    description: 'Feito à mão',
    stockQuantity: 4,
    unitPrice: 15.5,
  };
  let prisma: {
    product: {
      create: jest.Mock;
      findUnique: jest.Mock;
      delete: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let service: ProductsService;

  beforeEach(() => {
    prisma = {
      product: {
        create: jest.fn().mockResolvedValue(product),
        findUnique: jest.fn().mockResolvedValue(product),
        delete: jest.fn().mockResolvedValue(product),
      },
      $transaction: jest.fn(
        (operation: (transaction: typeof prisma) => Promise<unknown>) =>
          operation(prisma),
      ),
    };
    service = new ProductsService(prisma as unknown as PrismaService);
  });

  it('trims product text and stores an empty description as null', async () => {
    await service.create({
      name: '  Caderno artesanal  ',
      description: '   ',
      stockQuantity: 4,
      unitPrice: 15.5,
    });

    expect(prisma.product.create).toHaveBeenCalledWith({
      data: {
        name: 'Caderno artesanal',
        description: null,
        stockQuantity: 4,
        unitPrice: 15.5,
      },
    });
  });

  it('does not delete products that have sales', async () => {
    prisma.product.findUnique.mockResolvedValue({
      id: product.id,
      _count: { sales: 1 },
    });

    await expect(service.remove(product.id)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.product.delete).not.toHaveBeenCalled();
  });

  it('deletes products without sales in a transaction', async () => {
    prisma.product.findUnique.mockResolvedValue({
      id: product.id,
      _count: { sales: 0 },
    });

    await expect(service.remove(product.id)).resolves.toEqual({
      deleted: true,
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.product.delete).toHaveBeenCalledWith({
      where: { id: product.id },
    });
  });
});
