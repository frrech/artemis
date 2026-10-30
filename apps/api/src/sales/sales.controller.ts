import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CreateSaleDto, UpdateSaleDto } from './dto/sale.dto';
import { SalesService } from './sales.service';

@Controller('sales')
@UseGuards(AuthGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get()
  findAll() {
    return this.salesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.salesService.findOne(id);
  }

  @Post()
  create(@Body() input: CreateSaleDto) {
    return this.salesService.create(input);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() input: UpdateSaleDto) {
    return this.salesService.update(id, input);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.salesService.remove(id);
  }
}
