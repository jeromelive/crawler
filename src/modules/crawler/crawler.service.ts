import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios'
import { Repository } from 'typeorm';
import { CrawlerHis } from './entity/crawler-his.entity';
import { Crawler } from './entity/crawler.entity';
import { Result } from './interface/result';
import { CodeDto } from './dto/code.dto';

@Injectable()
export class CrawlerService {

  page: number;
  pages: number;
  
  constructor(
    @InjectRepository(Crawler) private readonly crawlerRepository: Repository<Crawler>,
    @InjectRepository(CrawlerHis) private readonly crawlerHisRepository: Repository<CrawlerHis>
  ) {
    this.page = 0
    this.pages = 1
  }

  async crawl():Promise<Record<string, string>> {
    while(this.page < this.pages) {
      this.page = this.page + 1
      console.log(`-------------正在爬取第${this.page}页-------------`)
      const res = await axios.get(`http://datacenter-web.eastmoney.com/api/data/v1/get?sortColumns=PUBLIC_START_DATE&sortTypes=-1&pageSize=50&pageNumber=${this.page}&reportName=RPT_BOND_CB_LIST&columns=ALL&quoteColumns=f2~01~CONVERT_STOCK_CODE~CONVERT_STOCK_PRICE%2Cf235~10~SECURITY_CODE~TRANSFER_PRICE%2Cf236~10~SECURITY_CODE~TRANSFER_VALUE%2Cf2~10~SECURITY_CODE~CURRENT_BOND_PRICE%2Cf237~10~SECURITY_CODE~TRANSFER_PREMIUM_RATIO%2Cf239~10~SECURITY_CODE~RESALE_TRIG_PRICE%2Cf240~10~SECURITY_CODE~REDEEM_TRIG_PRICE%2Cf23~01~CONVERT_STOCK_CODE~PBV_RATIO&source=WEB&client=WEB`)
      const resultData = res.data.result || {}
      const {pages, data} = <Result>resultData
      this.pages = pages
      
      if(data) {
        let stockIndex = 0
        while(stockIndex < data.length) {
          const crawler = new Crawler()
          const innerIndex = stockIndex
          console.log(`-------------正在爬取第${data[innerIndex].SECURITY_CODE}----${data[innerIndex].SECURITY_NAME_ABBR}-------------`)
          crawler.code = data[innerIndex].SECURITY_CODE || ''
          crawler.name = data[innerIndex].SECURITY_NAME_ABBR || ''
          crawler.stockCode = data[innerIndex].CONVERT_STOCK_CODE || ''
          crawler.interestRate = data[innerIndex].INTEREST_RATE_EXPLAIN || ''
          crawler.transferPrice = data[innerIndex].TRANSFER_VALUE || 0
          crawler.issueScale = data[innerIndex].ACTUAL_ISSUE_SCALE || 0
          crawler.price = data[innerIndex].TRANSFER_VALUE || 0
          crawler.yieldToMaturyty = data[innerIndex].TRANSFER_PREMIUM_RATIO || 0
          crawler.listingDate = data[innerIndex].LISTING_DATE || new Date()

          const stockRes = await axios.get(`https://push2his.eastmoney.com/api/qt/stock/kline/get?fields1=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61&beg=0&end=20500101&ut=fa5fd1943c7b386f172d6893dbfba10b&rtntype=6&secid=0.${data[innerIndex].SECURITY_CODE}&klt=101&fqt=1`)
          if(stockRes && stockRes.data && stockRes.data.data && stockRes.data.data.klines && stockRes.data.data.klines.length !== 0) {
            const stockRes1 = await axios.get(`https://push2his.eastmoney.com/api/qt/stock/kline/get?fields1=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61&beg=0&end=20500101&ut=fa5fd1943c7b386f172d6893dbfba10b&rtntype=6&secid=0.${data[innerIndex].CONVERT_STOCK_CODE}&klt=101&fqt=1`)
            const stockData = stockRes.data.data.klines || []
            let stockData1 = stockRes1.data.data.klines || []
            stockData1 = stockData1.slice(stockData1.length - stockData.length)
  
            const crawlerHiss = stockData.map((item, index) => {
              const arr = item.split(',')
              const arr1 = stockData1[index].split(',')
              const crawlerHis = new CrawlerHis()
              crawlerHis.code = data[innerIndex].SECURITY_CODE
              crawlerHis.time = arr[0]
              crawlerHis.openPrice = arr[1]
              crawlerHis.closePrice = arr[2]
              crawlerHis.stockOpenPrice = arr1[1]
              crawlerHis.stockClosePrice = arr1[2]
              // crawlerHis.highPrice = arr[3]
              // crawlerHis.lowPrice = arr[4]
              // crawlerHis.volume = arr[5]
              // crawlerHis.tradingVolume = arr[6]
              // crawlerHis.amplitude = arr[7]
              // crawlerHis.turnoverRate = arr[10]
              // 转股溢价率
              crawlerHis.premiumRate = (arr[2] - data[innerIndex].TRANSFER_VALUE) / data[innerIndex].TRANSFER_VALUE
              crawlerHis.crawler = crawler
              return crawlerHis
            })
            crawler.crawlerHiss = crawlerHiss
            await this.crawlerHisRepository.save(crawlerHiss)
            await this.crawlerRepository.save(crawler)
            console.log(`-------------爬取${data[innerIndex].SECURITY_CODE}----${data[innerIndex].SECURITY_NAME_ABBR}完成-------------`)
          }
          stockIndex+=1
        }
      }
      console.log(`-------------爬取第${this.page}页完成-------------`)
    }
    return {
      ok: '爬取成功'
    }
  }

  async getOne(codeDto: CodeDto) {
    const {code} = codeDto
    const stockDetail = await this.crawlerRepository
    .createQueryBuilder('crawler')
    .where('crawler.code = :code', {code})
    .leftJoinAndSelect('crawler.crawlerHiss', 'crawlerHis')
    .getMany()

    if(!stockDetail) {
      throw new NotFoundException('找不到该可转债')
    }

    return stockDetail
  }
}
