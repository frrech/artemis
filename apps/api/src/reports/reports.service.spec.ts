import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  it('returns all monthly totals and counts for the requested year', async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        soldAt: new Date('2026-01-05T12:00:00.000Z'),
        quantity: 2,
        unitPrice: new Prisma.Decimal('10.25'),
      },
      {
        soldAt: new Date('2026-01-20T12:00:00.000Z'),
        quantity: 1,
        unitPrice: new Prisma.Decimal('8.50'),
      },
      {
        soldAt: new Date('2026-02-01T00:00:00.000Z'),
        quantity: 3,
        unitPrice: new Prisma.Decimal('4.00'),
      },
    ]);
    const service = new ReportsService({
      sale: { findMany },
    } as unknown as PrismaService);

    const result = await service.monthlySales(2026);

    expect(result.year).toBe(2026);
    expect(result.months).toHaveLength(12);
    expect(result.months[0]).toEqual({
      month: 1,
      total: '29.00',
      salesCount: 2,
    });
    expect(result.months[1]).toEqual({
      month: 2,
      total: '12.00',
      salesCount: 1,
    });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          soldAt: {
            gte: new Date('2026-01-01T00:00:00.000Z'),
            lt: new Date('2027-01-01T00:00:00.000Z'),
          },
        },
      }),
    );
  });

  it('calculates totals from SQLite floating-point prices without rounding errors', async () => {
    const service = new ReportsService({
      sale: {
        findMany: jest.fn().mockResolvedValue([
          {
            soldAt: new Date('2026-03-01T12:00:00.000Z'),
            quantity: 3,
            unitPrice: 0.1,
          },
        ]),
      },
    } as unknown as PrismaService);

    const result = await service.monthlySales(2026);

    expect(result.months[2]).toEqual({
      month: 3,
      total: '0.30',
      salesCount: 1,
    });
  });
});
