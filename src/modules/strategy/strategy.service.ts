import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrawlerHis } from '../crawler/entity/crawler-his.entity';
import { Crawler } from '../crawler/entity/crawler.entity';
import { StrategyDto } from './dto/strategy.dto';
import * as moment from 'moment';

@Injectable()
export class StrategyService {

  constructor(
    @InjectRepository(Crawler) private readonly crawlerRepository: Repository<Crawler>,
    @InjectRepository(CrawlerHis) private readonly cralerHisRepository: Repository<CrawlerHis>
  ) {}

  async run(strategyDto: StrategyDto) {
    const {time, count} = strategyDto
    let timestamp = new Date(time).getTime()
    // 当前持仓
    let crawlerHisList: CrawlerHis[] = []
    // 当前时间
    const nowstamp = Date.now()
    // 盈利
    let profit = 0
    // 持仓盈利
    let haveProfit = 0
    // 所需资金
    let funds = 0
    // 资金峰值
    let maxFunds = 0
    while(timestamp <= nowstamp) {
      let index = 0
      const tempList = [...crawlerHisList]
      const length = tempList.length
      const foramtDate = moment(timestamp).format('YYYY-MM-DD')
      const date = new Date(timestamp)

      crawlerHisList = []
      
      console.log(`${foramtDate}>>>盈利${profit}`)

      while(index < length) {
        const his = await this.cralerHisRepository
        .createQueryBuilder('crawlerHis')
        .where('crawlerHis.code = :code', {code: tempList[index].code})
        .andWhere('crawlerHis.time = :time', {time: date})
        .getOne()

        if(his && his.openPrice >=  130) { // 开盘价大于 130 元，卖掉
          profit = profit + (his.openPrice - tempList[index].closePrice) * 10
          funds = funds - (tempList[index].closePrice * 10)
          console.log(`${foramtDate}>>>卖出：${tempList[index].code} 买入价:${tempList[index].closePrice} 价格：${his.openPrice} 盈利：${his.openPrice - tempList[index].closePrice}`)
        } else { 
          crawlerHisList.push(tempList[index]) // 保存没有卖出的可转债
        }
        
        index += 1
      }
      
      let hiss = await this.cralerHisRepository
      .createQueryBuilder('crawlerHis')
      .where('crawlerHis.time = :time', {time: date})
      .orderBy('crawlerHis.premiumRate')
      .addOrderBy('crawlerHis.closePrice')
      // .orderBy('crawlerHis.closePrice')
      .limit(count)
      .getMany()

      // 只买入收盘价小于 130 并且转股溢价率少一零的可转债
      const hisss: CrawlerHis[] = []
      hiss.forEach((item: CrawlerHis) => {
        if(item.closePrice < 100 && item.premiumRate < 0.1) {
          hisss.push(item)
          funds = funds + item.closePrice * 10
          console.log(`${foramtDate}>>>买入：${item.code} 买入价：${item.closePrice} 转股溢价率：${Math.round(item.premiumRate * 10000)/100}%`)
        }
      })

      // 更新最新持仓
      crawlerHisList = crawlerHisList.concat(hisss)

      // 时间戳加一天
      timestamp = timestamp + 86400000
      maxFunds = Math.max(maxFunds, funds)
      console.log(`${foramtDate}>>>所需资金：${funds}`)
    }

    let haveIndex = 0
    while(haveIndex < crawlerHisList.length) {
      const his = await this.cralerHisRepository
      .createQueryBuilder('crawlerHis')
      .where('crawlerHis.code = :code', {code: crawlerHisList[haveIndex].code})
      .orderBy('crawlerHis.time', 'DESC')
      .getOne()
      haveProfit = haveProfit + (his.closePrice - crawlerHisList[haveIndex].closePrice)
      haveIndex++
    }

    console.log(`所需资金峰值：${maxFunds}，持仓金额：${funds}，持仓收益：${haveProfit}，已盈利：${profit}`)
  
    return {
      profit,
      hiss: crawlerHisList
    }
  }
}
