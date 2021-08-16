import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrawlerHis } from '../crawler/entity/crawler-his.entity';
import { Crawler } from '../crawler/entity/crawler.entity';
import { StrategyDto } from './dto/strategy.dto';

@Injectable()
export class StrategyService {
  list: CrawlerHis[]

  constructor(
    @InjectRepository(Crawler) private readonly crawlerRepository: Repository<Crawler>,
    @InjectRepository(CrawlerHis) private readonly cralerHisRepository: Repository<CrawlerHis>
  ) {
    this.list = []
  }

  async run(strategyDto: StrategyDto) {
    const {date} = strategyDto
    while(new Date(date).getTime() <= Date.now()) {
      const [hiss, total] = await this.cralerHisRepository
      .createQueryBuilder('crawlerHis')
      .where('crawlerHis.time = :time', {time: date})
      .orderBy('crawlerHis.premiumRate')
      .limit(10)
      .getManyAndCount()
    }
    
    return {
      // date,
      // hiss,
      // total
    }
  }
}
