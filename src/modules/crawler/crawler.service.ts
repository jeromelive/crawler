import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios'
import { Repository } from 'typeorm';
import { CrawlerHis } from './entity/crawler-his.entity';
import { Crawler } from './entity/crawler.entity';
import { Result } from './interface/result';
import { CodeDto } from './dto/code.dto';
import { HisDto } from './dto/his.dto';
import { Jisilu } from './entity/jisilu.entity';
import { JisiluHis } from './entity/jisilu-his.entity';

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
    @InjectRepository(CrawlerHis) private readonly crawlerHisRepository: Repository<CrawlerHis>,
    @InjectRepository(Jisilu) private readonly jisiluRepository: Repository<Jisilu>,
    @InjectRepository(JisiluHis) private readonly jisiluHisRepository: Repository<JisiluHis>
  ) {
    this.page = 0
    this.pages = 1
    this.noStartNum = 0
    this.okNum = 0
    this.ceaseNum = 0
    this.count = 0
  }

  // 爬取东方财富数据
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


  // 爬取集思录数据
  async crawlerJisilu(): Promise<Record<string, number>> {
    const n1 = await this.handleList()
    const n2 = await this.handleDeslist()
    return {
      total: n1 + n2
    }
  }

  // 处理未退市
  async handleList(): Promise<number> {
    console.log('爬取集思录')
    const res = await axios.get('https://www.jisilu.cn/data/cbnew/cb_list/?___jsl=LST___t=1629534651997', {
      headers: {
        'Cookie': 'kbz_newcookie=1; kbzw_r_uname=jeromelive; kbzw__user_login=7Obd08_P1ebax9aX4cfo0OTc3-HX1YKvpuXK7N_u0ejF1dSe25agx6mrq5vapa2WpsPZrNaqk9SY2t2uzd_RqZvck92YrqXW2cXS1qCarKGql6-XmLKgzaLOvp_G5OPi2OPDpZalp5OguNnP2Ojs3Jm6y4KnkaWnrpi42c-qrbCJ8aKri5ai5-ff3bjVw7_i6Ziun66QqZeXn77Atb2toJnh0uTRl6nbxOLmnJik2NPj5tqYsp6lkqSVrKioppKlmpTM1s_a3uCRq5Supaau; kbzw__Session=58bn4r98bgh136v31i02omsa53; Hm_lvt_164fe01b1433a19b507595a43bf58262=1629468897,1629526515,1629527167; Hm_lpvt_164fe01b1433a19b507595a43bf58262=1629534818'
      }
    })
    const rows = res.data.rows || []
    if(rows) {
      await this.saveJisilu(rows)
    }
    return rows.length
  }

  // 处理已退市
  async handleDeslist(): Promise<number>  {
    console.log('爬取已退市')
    const res = await axios.get('https://www.jisilu.cn/data/cbnew/delisted/?___jsl=LST___t=1629529616517', {
      headers: {
        'Cookie': 'kbz_newcookie=1; kbzw_r_uname=jeromelive; kbzw__user_login=7Obd08_P1ebax9aX4cfo0OTc3-HX1YKvpuXK7N_u0ejF1dSe25agx6mrq5vapa2WpsPZrNaqk9SY2t2uzd_RqZvck92YrqXW2cXS1qCarKGql6-XmLKgzaLOvp_G5OPi2OPDpZalp5OguNnP2Ojs3Jm6y4KnkaWnrpi42c-qrbCJ8aKri5ai5-ff3bjVw7_i6Ziun66QqZeXn77Atb2toJnh0uTRl6nbxOLmnJik2NPj5tqYsp6lkqSVrKioppKlmpTM1s_a3uCRq5Supaau; kbzw__Session=58bn4r98bgh136v31i02omsa53; Hm_lvt_164fe01b1433a19b507595a43bf58262=1629468897,1629526515,1629527167; Hm_lpvt_164fe01b1433a19b507595a43bf58262=1629534818'
      }
    })
    const rows = res.data.rows || []
    if(rows) {
      await this.saveJisilu(rows)
    }
    return rows.length
  }

  async saveJisilu(rows) {
    let stockIndex = 0
    while(stockIndex < rows.length) {
      const data: Jisilu = rows[stockIndex].cell
      let jisilu = await this.jisiluRepository
      .createQueryBuilder('jisilu')
      .where('jisilu.bond_id = :bond_id', {bond_id: data.bond_id})
      .getOne()
      if(!jisilu) {
        console.log(`新增-${data.bond_id}-${data.bond_nm}`)
        jisilu = new Jisilu()
      }
      // bond_id: "113509"
      // bond_nm: "新泉转债"
      // curr_iss_amt: "0.020"
      // delist_dt: "2021-08-17"
      // delist_notes: "强赎"
      // issue_dt: "2018-06-04"
      // listed_years: "3.2"
      // maturity_dt: "2024-06-03"
      // orig_iss_amt: "4.500"
      // price: "213.700"
      // put_iss_amt: "0.000"
      // redeem_dt: "2021-08-17"
      // stock_id: "603179"
      // stock_nm: "新泉股份"

      jisilu.bond_id = data.bond_id
      jisilu.bond_nm = data.bond_nm
      jisilu.bond_value = data.bond_value || ''
      jisilu.convert_dt = data.convert_dt || ''
      jisilu.convert_price = data.convert_price || ''
      jisilu.convert_value = data.convert_value || ''
      jisilu.premium_rt = data.premium_rt || ''
      jisilu.stock_id = data.stock_id
      jisilu.stock_nm = data.stock_nm
      jisilu.sprice = data.sprice || ''
      jisilu.sincrease_rt = data.sincrease_rt || ''
      jisilu.pb = data.pb || ''
      jisilu.rating_cd = data.rating_cd || ''
      jisilu.volatility_rate = data.volatility_rate || ''
      jisilu.put_convert_price = data.put_convert_price || ''
      jisilu.force_redeem_price = data.force_redeem_price || ''
      jisilu.convert_amt_ratio = data.convert_amt_ratio || ''
      jisilu.fund_rt = data.fund_rt || ''
      jisilu.delist_dt = data.delist_dt || ''
      jisilu.short_maturity_dt = data.short_maturity_dt || ''
      jisilu.year_left = data.year_left || ''
      jisilu.curr_iss_amt = data.curr_iss_amt || ''
      jisilu.volume = data.volume || ''
      jisilu.turnover_rt = data.turnover_rt || ''
      jisilu.ytm_rt = data.ytm_rt || ''
      jisilu.dblow = data.dblow || ''
      jisilu.orig_iss_amt = data.orig_iss_amt || ''
      jisilu.delist_notes = data.delist_notes || ''
      jisilu.jisilu_hiss = jisilu.jisilu_hiss || []

      const stockTime = Date.now()
      const jisiluHisRes = await axios.get(`https://www.jisilu.cn/data/cbnew/detail_hist/${data.bond_id}?___jsl=LST___t=1629473907872`, {
        headers: {
          'Cookie': 'kbz_newcookie=1; kbzw_r_uname=jeromelive; kbzw__user_login=7Obd08_P1ebax9aX4cfo0OTc3-HX1YKvpuXK7N_u0ejF1dSe25agx6mrq5vapa2WpsPZrNaqk9SY2t2uzd_RqZvck92YrqXW2cXS1qCarKGql6-XmLKgzaLOvp_G5OPi2OPDpZalp5OguNnP2Ojs3Jm6y4KnkaWnrpi42c-qrbCJ8aKri5ai5-ff3bjVw7_i6Ziun66QqZeXn77Atb2toJnh0uTRl6nbxOLmnJik2NPj5tqYsp6lkqSVrKioppKlmpTM1s_a3uCRq5Supaau; kbzw__Session=58bn4r98bgh136v31i02omsa53; Hm_lvt_164fe01b1433a19b507595a43bf58262=1629468897,1629526515,1629527167; Hm_lpvt_164fe01b1433a19b507595a43bf58262=1629534818'
        }
      })
      console.log(`集思录可转债-${data.bond_id}-${data.bond_nm}-请求时间${(Date.now() - stockTime) / 1000}s`)
      const hisRows = jisiluHisRes.data.rows || []
      const jisiluHiss: JisiluHis[] = []
      if(hisRows) {
        const jisiluHisEnd: JisiluHis = await this.jisiluHisRepository
        .createQueryBuilder('jisiluHis')
        .where('jisiluHis.bond_id = :bond_id', {bond_id: data.bond_id})
        .orderBy('last_chg_dt', 'DESC')
        .getOne()
        for(let index = 0; index < hisRows.length; index++) {
          const jisiluHistData = hisRows[index].cell
          if(new Date(jisiluHistData.last_chg_dt).getTime() < new Date(jisiluHisEnd ? jisiluHisEnd.last_chg_dt : Date.now()).getTime()) {
            const jisiluHis: JisiluHis = new JisiluHis()
            jisiluHis.bond_id = data.bond_id
            jisiluHis.bond_nm = data.bond_nm
            jisiluHis.price = jisiluHistData.price
            jisiluHis.volume = jisiluHistData.volume
            jisiluHis.convert_value = jisiluHistData.convert_value
            jisiluHis.last_chg_dt = jisiluHistData.last_chg_dt
            jisiluHis.ytm_rt = jisiluHistData.ytm_rt
            jisiluHis.premium_rt = jisiluHistData.premium_rt
            jisiluHis.curr_iss_amt = jisiluHistData.curr_iss_amt
            jisiluHis.turnover_rt = jisiluHistData.turnover_rt
            jisiluHis.fund_rt = jisiluHistData.fund_rt || '2'
            jisiluHis.fund_rt_per = '1'
            jisiluHis.dblow = (parseFloat(jisiluHistData.price) + parseFloat(jisiluHistData.premium_rt) * 100) + ''
            jisiluHis.jisilu = jisilu
            jisiluHiss.push(jisiluHis)
            jisilu.jisilu_hiss.push(jisiluHis)
          } else {
            break
          }
        }
      }
      await this.jisiluRepository.save(jisilu)
      await this.jisiluHisRepository.save(jisiluHiss)
      stockIndex += 1
    }
  }
  
  // 纠正数据
  async hanlerError(): Promise<string> {
    let page = 1;
    const pageSize = 2000;
    let pages = 2
    while(page <= pages) {
      const [list, total]= await this.jisiluHisRepository
      .createQueryBuilder('jisiluHis')
      .skip((page - 1)*pageSize)
      .take(pageSize)
      .getManyAndCount()
      console.log(page, pages, total)
      list.forEach((item: JisiluHis) => {
        item.dblow = (parseFloat(item.price) + parseFloat(item.premium_rt)) + ''
      })
      pages = Math.ceil(total / pageSize)
      page += 1
      await this.jisiluHisRepository.save(list)
    }
    return 'ok'
  }

  // 获取双底为NAN的列表，2017-05-22 往后不存在NAN
  async searchDblowNaN(): Promise<{total: number, list: JisiluHis[]}> {
    const [list, total] = await this.jisiluHisRepository
    .createQueryBuilder('jisiluHis')
    .where('jisiluHis.dblow = :dblow', {dblow: 'NaN'})
    .orderBy('last_chg_dt', 'DESC')
    .getManyAndCount()
    
    return {
      total,
      list
    }
  }

  async getJisiluHis ({bond_id, last_chg_dt}): Promise<JisiluHis>{

    const his = await this.jisiluHisRepository
    .createQueryBuilder('jisiluHis')
    .where('jisiluHis.bond_id = :bond_id', {bond_id})
    .andWhere('jisiluHis.last_chg_dt = :last_chg_dt', {last_chg_dt})
    .getOne()

    return his
  }

  
  async test() {
    const res = await axios.get('https://www.jisilu.cn/data/cbnew/detail_hist/127020?___jsl=LST___t=1629473907872', {
      headers: {
        'Cookie': 'kbz_newcookie=1; kbzw_r_uname=jeromelive; kbzw__user_login=7Obd08_P1ebax9aX4cfo0OTc3-HX1YKvpuXK7N_u0ejF1dSe25agx6mrq5vapa2WpsPZrNaqk9SY2t2uzd_RqZvck92YrqXW2cXS1qCarKGql6-XmLKgzaLOvp_G5OPi2OPDpZalp5OguNnP2Ojs3Jm6y4KnkaWnrpi42c-qrbCJ8aKri5ai5-ff3bjVw7_i6Ziun66QqZeXn77Atb2toJnh0uTRl6nbxOLmnJik2NPj5tqYsp6lkqSVrKioppKlmpTM1s_a3uCRq5Supaau; kbzw__Session=58bn4r98bgh136v31i02omsa53; Hm_lvt_164fe01b1433a19b507595a43bf58262=1629468897,1629526515,1629527167; Hm_lpvt_164fe01b1433a19b507595a43bf58262=1629534818'
      }
    })
    console.log(res)
    return res.data
  }

  async test1() {
    const res = await axios.get('https://www.jisilu.cn/data/cbnew/cb_list/?___jsl=LST___t=1629534651997', {
      headers: {
        'Cookie': 'kbz_newcookie=1; kbzw_r_uname=jeromelive; kbzw__user_login=7Obd08_P1ebax9aX4cfo0OTc3-HX1YKvpuXK7N_u0ejF1dSe25agx6mrq5vapa2WpsPZrNaqk9SY2t2uzd_RqZvck92YrqXW2cXS1qCarKGql6-XmLKgzaLOvp_G5OPi2OPDpZalp5OguNnP2Ojs3Jm6y4KnkaWnrpi42c-qrbCJ8aKri5ai5-ff3bjVw7_i6Ziun66QqZeXn77Atb2toJnh0uTRl6nbxOLmnJik2NPj5tqYsp6lkqSVrKioppKlmpTM1s_a3uCRq5Supaau; kbzw__Session=58bn4r98bgh136v31i02omsa53; Hm_lvt_164fe01b1433a19b507595a43bf58262=1629468897,1629526515,1629527167; Hm_lpvt_164fe01b1433a19b507595a43bf58262=1629534818'
      }
    })
    console.log(res)
    return res.data
  }
}
