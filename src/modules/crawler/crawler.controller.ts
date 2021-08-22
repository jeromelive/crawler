import { Controller, Get, Query } from '@nestjs/common';
import { CrawlerService } from './crawler.service';
import { CodeDto } from './dto/code.dto';
import { HisDto } from './dto/his.dto';

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

  @Get('his')
  getOneHis(@Query() his: HisDto) {
    return this.crawlerService.getOneHis(his)
  }

  @Get('jisilu')
  crawlerJisilu() {
    return this.crawlerService.crawlerJisilu()
  }

  @Get('test')
  getTest() {
    return this.crawlerService.test()
  }

  @Get('test1')
  getTest1() {
    return this.crawlerService.test1()
  }

  @Get('hanlerError')
  hanlerError() {
    return this.crawlerService.hanlerError()
  }
  
  @Get('getNaN')
  getNan() {
    return this.crawlerService.searchDblowNaN()
  }

  @Get('getJisiluHis')
  getJisiluHis(@Query() his: HisDto) {
    return this.crawlerService.getJisiluHis({
      bond_id: his.code,
      last_chg_dt: his.time
    })
  }
}
