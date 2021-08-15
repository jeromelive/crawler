import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrawlerController } from './crawler.controller';
import { CrawlerService } from './crawler.service';
import { Crawler } from './entity/crawler.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Crawler])],
  controllers: [CrawlerController],
  providers: [CrawlerService]
})
export class CrawlerModule {}
