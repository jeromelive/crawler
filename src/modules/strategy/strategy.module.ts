import { Module } from '@nestjs/common';
import { StrategyService } from './strategy.service';
import { StrategyController } from './strategy.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Crawler } from '../crawler/entity/crawler.entity';
import { CrawlerHis } from '../crawler/entity/crawler-his.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Crawler, CrawlerHis])],
  providers: [StrategyService],
  controllers: [StrategyController]
})
export class StrategyModule {}
