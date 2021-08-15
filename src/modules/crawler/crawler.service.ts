import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios'
import { Repository } from 'typeorm';
import { CrawlerHis } from './entity/crawler-his.entity';
import { Crawler } from './entity/crawler.entity';
import { Result } from './inteface/result';

@Injectable()
export class CrawlerService {

  page: number;
  pages: number
  
  constructor(
    @InjectRepository(Crawler) private readonly crawlerRepository: Repository<Crawler>,
    @InjectRepository(CrawlerHis) private readonly crawlerHisRepository: Repository<CrawlerHis>
  ) {
    this.page = 0
    this.pages = 1
  }

  async crawl():Promise<string> {
    while(this.page < this.pages) {
      this.page = this.page + 1
      const res = await axios.get(`http://datacenter-web.eastmoney.com/api/data/v1/get?sortColumns=PUBLIC_START_DATE&sortTypes=-1&pageSize=50&pageNumber=${this.page}&reportName=RPT_BOND_CB_LIST&columns=ALL&quoteColumns=f2~01~CONVERT_STOCK_CODE~CONVERT_STOCK_PRICE%2Cf235~10~SECURITY_CODE~TRANSFER_PRICE%2Cf236~10~SECURITY_CODE~TRANSFER_VALUE%2Cf2~10~SECURITY_CODE~CURRENT_BOND_PRICE%2Cf237~10~SECURITY_CODE~TRANSFER_PREMIUM_RATIO%2Cf239~10~SECURITY_CODE~RESALE_TRIG_PRICE%2Cf240~10~SECURITY_CODE~REDEEM_TRIG_PRICE%2Cf23~01~CONVERT_STOCK_CODE~PBV_RATIO&source=WEB&client=WEB`)
      const resultData = res.data.result || {}
      const {pages, data} = <Result>resultData
      this.pages = pages
      
      if(data) {
        let stockIndex = 0
        while(stockIndex < data.length) {
          stockIndex+=1
          const crawler = new Crawler()
          crawler.code = data[stockIndex].SECURITY_CODE
          crawler.name = data[stockIndex].SECURITY_NAME_ABBR
          crawler.stockCode = data[stockIndex].CONVERT_STOCK_CODE
          crawler.interestRate = data[stockIndex].INTEREST_RATE_EXPLAIN
          crawler.transferPrice = data[stockIndex].TRANSFER_VALUE
          crawler.issueScale = data[stockIndex].ACTUAL_ISSUE_SCALE
          crawler.price = data[stockIndex].TRANSFER_VALUE
          crawler.yieldToMaturyty = data[stockIndex].TRANSFER_PREMIUM_RATIO
          crawler.listingDte = data[stockIndex].LISTING_DATE

          const stockRes = await axios.get(`https://push2his.eastmoney.com/api/qt/stock/kline/get?fields1=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61&beg=0&end=20500101&ut=fa5fd1943c7b386f172d6893dbfba10b&rtntype=6&secid=0.${data[stockIndex].SECURITY_CODE}&klt=101&fqt=1`)
          const stockRes1 = await axios.get(`https://push2his.eastmoney.com/api/qt/stock/kline/get?fields1=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61&beg=0&end=20500101&ut=fa5fd1943c7b386f172d6893dbfba10b&rtntype=6&secid=0.${data[stockIndex].CONVERT_STOCK_CODE}&klt=101&fqt=1`)
          const stockData = stockRes.data.data.klines || []
          let stockData1 = stockRes1.data.data.klines || []
          stockData1 = stockData1.slice(stockData1.length - stockData.length)

          stockData1.map((item) => {
            const arr = item.split(',')
            const crawlerHis = new CrawlerHis()
            crawlerHis.code = data[stockIndex].SECURITY_CODE
            crawlerHis.time = arr[0]
            crawlerHis.openPrice = ''
            crawlerHis.closePrice = ''
            crawlerHis.stockOpenPrice = ''
            crawlerHis.stockClosePrice = ''
            crawlerHis.highPrice = ''
            crawlerHis.lowPrice = ''
            crawlerHis.volume = ''
            crawlerHis.tradingVolume = ''
            crawlerHis.amplitude = ''
            crawlerHis.turnoverRate = ''
            crawlerHis.premiumRate = ''
          })

          const result = await this.crawlerRepository.save(crawler);
        }
      }
    }
    return 'ok'
  }
}
