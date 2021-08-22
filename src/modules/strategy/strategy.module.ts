import { Module } from '@nestjs/common';
import { StrategyService } from './strategy.service';
import { StrategyController } from './strategy.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Crawler } from '../crawler/entity/crawler.entity';
import { CrawlerHis } from '../crawler/entity/crawler-his.entity';
import { Jisilu } from '../crawler/entity/jisilu.entity';
import { JisiluHis } from '../crawler/entity/jisilu-his.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Crawler, CrawlerHis, Jisilu, JisiluHis])],
  providers: [StrategyService],
  controllers: [StrategyController]
})
export class StrategyModule {}
