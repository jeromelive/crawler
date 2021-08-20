import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios'
import { Repository } from 'typeorm';
import { CrawlerHis } from './entity/crawler-his.entity';
import { Crawler } from './entity/crawler.entity';
import { Result } from './interface/result';
import { CodeDto } from './dto/code.dto';
import { HisDto } from './dto/his.dto';

@Injectable()
export class CrawlerService {

  page: number;
  pages: number;
  noStartNum: number;
  okNum: number;
  ceaseNum: number;
  count: number;
  
  constructor(
    @InjectRepository(Crawler) private readonly crawlerRepository: Repository<Crawler>,
    @InjectRepository(CrawlerHis) private readonly crawlerHisRepository: Repository<CrawlerHis>
  ) {
    this.page = 0
    this.pages = 1
    this.noStartNum = 0
    this.okNum = 0
    this.ceaseNum = 0
    this.count = 0
  }

  async crawl():Promise<Record<string, number>> {
    const startTime = Date.now()
    while(this.page < this.pages) {
      this.page = this.page + 1
      const pageTime = Date.now()
      const res = await axios.get(`http://datacenter-web.eastmoney.com/api/data/v1/get?sortColumns=PUBLIC_START_DATE&sortTypes=-1&pageSize=50&pageNumber=${this.page}&reportName=RPT_BOND_CB_LIST&columns=ALL&quoteColumns=f2~01~CONVERT_STOCK_CODE~CONVERT_STOCK_PRICE%2Cf235~10~SECURITY_CODE~TRANSFER_PRICE%2Cf236~10~SECURITY_CODE~TRANSFER_VALUE%2Cf2~10~SECURITY_CODE~CURRENT_BOND_PRICE%2Cf237~10~SECURITY_CODE~TRANSFER_PREMIUM_RATIO%2Cf239~10~SECURITY_CODE~RESALE_TRIG_PRICE%2Cf240~10~SECURITY_CODE~REDEEM_TRIG_PRICE%2Cf23~01~CONVERT_STOCK_CODE~PBV_RATIO&source=WEB&client=WEB`)
      console.log(`爬取第${this.page}页，请求时间${(Date.now() - pageTime) / 1000}s`)
      const resultData = res.data.result || {}
      const {pages, data, count} = <Result>resultData
      this.pages = pages
      this.count = count
      
      if(data) {
        let stockIndex = 0
        while(stockIndex < data.length) {
          const innerIndex = stockIndex

          // 终止日期小于当前时间
          if(new Date(data[innerIndex].CEASE_DATE).getTime() > Date.now()) {
            let crawler = await this.crawlerRepository
            .createQueryBuilder('crawler')
            .where('crawler.code = :code', {code: data[innerIndex].SECUCODE})
            .getOne()
            if(!crawler) {
              console.log(`新增-${data[innerIndex].SECUCODE}-${data[innerIndex].SECURITY_NAME_ABBR}`)
              crawler = new Crawler()
              crawler.code = data[innerIndex].SECUCODE || ''
              crawler.name = data[innerIndex].SECURITY_NAME_ABBR || ''
              crawler.stockCode = data[innerIndex].CONVERT_STOCK_CODE || ''
              crawler.interestRate = data[innerIndex].INTEREST_RATE_EXPLAIN || ''
              crawler.transferPrice = data[innerIndex].TRANSFER_VALUE || 0
              crawler.issueScale = data[innerIndex].ACTUAL_ISSUE_SCALE || 0
              crawler.price = data[innerIndex].TRANSFER_VALUE || 0
              crawler.yieldToMaturyty = data[innerIndex].TRANSFER_PREMIUM_RATIO || 0
              crawler.listingDate = data[innerIndex].LISTING_DATE || new Date()
            }

            this.okNum = this.okNum + 1
            
            const url = `https://push2his.eastmoney.com/api/qt/stock/kline/get?fields1=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61&beg=0&end=20500101&ut=fa5fd1943c7b386f172d6893dbfba10b&rtntype=6&secid=${(data[innerIndex].SECUCODE && data[innerIndex].SECUCODE.indexOf('SH') !== -1) ? '1' : '0'}.${data[innerIndex].SECURITY_CODE}&klt=101&fqt=1`
            const url1 = `https://push2his.eastmoney.com/api/qt/stock/kline/get?fields1=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61&beg=0&end=20500101&ut=fa5fd1943c7b386f172d6893dbfba10b&rtntype=6&secid=${(data[innerIndex].SECUCODE && data[innerIndex].SECUCODE.indexOf('SH') !== -1)  ? '1' : '0'}.${data[innerIndex].CONVERT_STOCK_CODE}&klt=101&fqt=1`
            const stockTime = Date.now()
            const stockRes = await axios.get(url)
            console.log(`可转债-${data[innerIndex].SECUCODE}-${data[innerIndex].SECURITY_NAME_ABBR}-请求时间${(Date.now() - stockTime) / 1000}s`)
            if(stockRes && stockRes.data && stockRes.data.data && stockRes.data.data.klines && stockRes.data.data.klines.length !== 0) {
              const stock1Time = Date.now()
              const stockRes1 = await axios.get(url1)
              console.log(`正股-${data[innerIndex].CONVERT_STOCK_CODE}-${data[innerIndex].SECURITY_SHORT_NAME}-请求时间${(Date.now() - stock1Time) / 1000}s`)
              
              const stockData = stockRes.data.data.klines || []
              let stockData1 = stockRes1.data.data.klines || []
              stockData1 = stockData1.slice(stockData1.length - stockData.length)

              const crawlerHiss = []
              const crawlerHisTime = Date.now()
              for(let index = 0; index < stockData.length; index++) {
                const arr = stockData[index].split(',')
                const arr1 = stockData1[index].split(',')
                if(arr[0] !== arr1[0]) {
                  console.log(`可转债${data[innerIndex].SECUCODE}-${data[innerIndex].SECURITY_NAME_ABBR}-${arr[0]}`)
                  console.log(`正股${data[innerIndex].CONVERT_STOCK_CODE}-${data[innerIndex].SECURITY_SHORT_NAME}-${arr1[0]}`)
                  break;
                }
                const crawlerHisDetail = await this.crawlerHisRepository
                .createQueryBuilder('crawlerHis')
                .where('crawlerHis.code = :code', {code: data[innerIndex].SECUCODE})
                .andWhere('crawlerHis.time = :time', {time: arr[0]})
                .getOne()
                if(crawlerHisDetail) {
                  break;
                } else {
                  const crawlerHis = new CrawlerHis()
                  crawlerHis.code = data[innerIndex].SECUCODE
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
                  crawlerHis.transferValue = (100 / data[innerIndex].INITIAL_TRANSFER_PRICE) * arr1[2]
                  crawlerHis.premiumRate = (arr[2] - crawlerHis.transferValue) / crawlerHis.transferValue
                  crawlerHis.crawler = crawler
                  crawlerHiss.push(crawlerHis)
                }
              }
              crawler.crawlerHiss = crawlerHiss
              await this.crawlerHisRepository.save(crawlerHiss)
              await this.crawlerRepository.save(crawler)
              console.log(`${data[innerIndex].SECURITY_CODE}-${data[innerIndex].SECURITY_NAME_ABBR}完成-${crawlerHiss.length}条历史记录-用时${(Date.now() - crawlerHisTime) / 1000}s`)
              console.log(`当前一共${this.count}可转债，爬取成功${this.okNum}，没数据${this.noStartNum}，已经强制赎回${this.ceaseNum}`)
            } else {
              this.noStartNum = this.noStartNum + 1
              console.log(`${data[innerIndex].SECUCODE}-${data[innerIndex].SECURITY_NAME_ABBR}-没数据`)
            }
          } else {
            this.ceaseNum = this.ceaseNum + 1
            console.log(`${data[innerIndex].SECURITY_CODE}-${data[innerIndex].SECURITY_NAME_ABBR}于${data[innerIndex].CEASE_DATE}已强制赎回`)
            console.log(`当前一共${this.count}可转债，爬取成功${this.okNum}，没数据${this.noStartNum}，已经强制赎回${this.ceaseNum}`)
          }
          stockIndex+=1
        }
      }
      console.log(`爬取第${this.page}页完成, 用时${(Date.now() - pageTime) / 1000}s`)
    }
    console.log(`爬虫完毕，用时${Date.now() - startTime}`)
    return {
      okNum: this.okNum,
      endNum: this.ceaseNum
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

  async getOneHis(hisDto: HisDto) {
    const {code, time} = hisDto
    const his = await this.crawlerHisRepository
    .createQueryBuilder('crawlerHis')
    .where('crawlerHis.code = :code', {code})
    .andWhere('crawlerHis.time = :time', {time})
    .getOne()
    return his
  }
}
