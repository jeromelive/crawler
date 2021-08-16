import { Controller, Get, Query } from '@nestjs/common';
import { StrategyDto } from './dto/strategy.dto';
import { StrategyService } from './strategy.service';

@Controller('strategy')
export class StrategyController {
  constructor(private strategyService: StrategyService) {}

  @Get()
  run(@Query() strategyDto: StrategyDto) {
    return this.strategyService.run(strategyDto)
  }
}
