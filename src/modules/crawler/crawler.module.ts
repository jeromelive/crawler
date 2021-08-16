import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrawlerController } from './crawler.controller';
import { CrawlerService } from './crawler.service';
import { Crawler } from './entity/crawler.entity';
import { CrawlerHis } from './entity/crawler-his.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Crawler, CrawlerHis])],
  controllers: [CrawlerController],
  providers: [CrawlerService]
})
export class CrawlerModule {}
