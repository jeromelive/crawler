import { Controller, Get, Query } from '@nestjs/common';
import { CrawlerService } from './crawler.service';
import { CodeDto } from './dto/code.dto';

@Controller('crawler')
export class CrawlerController {
  constructor(private crawlerService: CrawlerService) {}

  @Get()
  crawler() {
    return this.crawlerService.crawl()
  }

  @Get('stock')
  getOne(@Query() code: CodeDto) {
    return this.crawlerService.getOne(code)
  }
}
