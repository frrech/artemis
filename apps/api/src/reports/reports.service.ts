import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async monthlySales(year = new Date().getFullYear()) {
    const sales = await this.prisma.sale.findMany({
      where: {
        soldAt: {
          gte: new Date(Date.UTC(year, 0, 1)),
          lt: new Date(Date.UTC(year + 1, 0, 1)),
        },
      },
      select: { soldAt: true, quantity: true, unitPrice: true },
    });

    const months = Array.from({ length: 12 }, (_, index) => ({
      month: index + 1,
      total: new Prisma.Decimal(0),
      salesCount: 0,
    }));
    for (const sale of sales) {
      const month = months[sale.soldAt.getUTCMonth()];
      const unitPrice = new Prisma.Decimal(sale.unitPrice.toString());
      month.total = month.total.plus(unitPrice.mul(sale.quantity));
      month.salesCount += 1;
    }

    return {
      year,
      months: months.map(({ month, total, salesCount }) => ({
        month,
        total: total.toFixed(2),
        salesCount,
      })),
    };
  }
}
