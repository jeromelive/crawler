import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrawlerController } from './crawler.controller';
import { CrawlerService } from './crawler.service';
import { Crawler } from './entity/crawler.entity';
import { CrawlerHis } from './entity/crawler-his.entity';
import { Jisilu } from './entity/jisilu.entity';
import { JisiluHis } from './entity/jisilu-his.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Crawler, CrawlerHis, Jisilu, JisiluHis])],
  controllers: [CrawlerController],
  providers: [CrawlerService]
})
export class CrawlerModule {}
