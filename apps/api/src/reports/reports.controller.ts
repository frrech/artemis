import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { MonthlySalesQueryDto } from './dto/monthly-sales.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(AuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('monthly-sales')
  getMonthlySales(@Query() query: MonthlySalesQueryDto) {
    return this.reportsService.monthlySales(query.year);
  }
}
