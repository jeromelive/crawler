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

  @Get('shuangdi')
  runShuangDi(@Query() strategyDto: StrategyDto) {
    return this.strategyService.runShuangDi(strategyDto)
  }

  @Get('premium')
  runPremium(@Query() strategyDto: StrategyDto) {
    return this.strategyService.runPremium(strategyDto)
  }

  @Get('premium130')
  runPremium130(@Query() strategyDto: StrategyDto) {
    return this.strategyService.runPremium130(strategyDto)
  }

  @Get('runPremiumTop')
  runPremiumTop(@Query() strategyDto: StrategyDto) {
    return this.strategyService.runPremiumTop(strategyDto)
  }
}
