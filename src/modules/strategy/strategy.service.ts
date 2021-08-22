import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrawlerHis } from '../crawler/entity/crawler-his.entity';
import { Crawler } from '../crawler/entity/crawler.entity';
import { StrategyDto } from './dto/strategy.dto';
import * as moment from 'moment';
import { JisiluHis } from '../crawler/entity/jisilu-his.entity';
import { Jisilu } from '../crawler/entity/jisilu.entity';

@Injectable()
export class StrategyService {

  constructor(
    @InjectRepository(Crawler) private readonly crawlerRepository: Repository<Crawler>,
    @InjectRepository(CrawlerHis) private readonly cralerHisRepository: Repository<CrawlerHis>,
    @InjectRepository(Jisilu) private readonly jisiluRepository: Repository<Jisilu>,
    @InjectRepository(JisiluHis) private readonly jisiluHisRepository: Repository<JisiluHis>
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
      
      const hiss = await this.cralerHisRepository
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

  // 双底策略
  // 策略1：当天收盘价格+100*溢价率
  // 排行前20的留下，超过的轮出
  // 价格超过130的轮出
  async runShuangDi(strategyDto: StrategyDto) {
    const {time, count} = strategyDto
    let timestamp = new Date(time).getTime()
    // 当前持仓
    let jisiluHisList: JisiluHis[] = []
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
    // 手续费
    let charge = 0 // 0.002
    while(timestamp <= nowstamp) {
      const foramtDate = moment(timestamp).format('YYYY-MM-DD')
      console.log(`${foramtDate}>>>盈利${profit}`)

      // 查询双底倒数前N的
      const hiss = await this.jisiluHisRepository
      .createQueryBuilder('jisiluHis')
      .where('jisiluHis.last_chg_dt = :last_chg_dt', {last_chg_dt: foramtDate})
      .orderBy('jisiluHis.dblow')
      .limit(count)
      .getMany()

      // 保存查询结果的代码，避免需要重复查询
      let tempBondIdList = hiss.map((item) => {
        return item.bond_id
      })

      if(hiss.length !== 0) {
        let index = 0
        const tempList = [...jisiluHisList]
        let length = tempList.length
        jisiluHisList = []

        while(index < length) {
          const item = tempList[index]

          // 查询可转债当前时间的交易记录
          const his = await this.jisiluHisRepository
          .createQueryBuilder('jisiluHis')
          .where('jisiluHis.bond_id = :bond_id', {bond_id: tempList[index].bond_id})
          .andWhere('jisiluHis.last_chg_dt = :last_chg_dt', {last_chg_dt: foramtDate})
          .getOne()

          // 查询可转债的详情，获取最后交易日时间，如果
          const jisilu = await this.jisiluRepository
          .createQueryBuilder('jisilu')
          .where('jisilu.bond_id = :bond_id', {bond_id: tempList[index].bond_id})
          .getOne()

          let delistFlag = false

          if(jisilu.delist_dt) {
            delistFlag = new Date(jisilu.delist_dt).getTime() <= new Date(foramtDate).getTime()
          }

          // console.log(foramtDate, item, his, jisilu)
          
          if(tempBondIdList.indexOf(item.bond_id) === -1 || parseFloat(his.price) >= 130 || delistFlag) { // 不在双底倒是前 N 卖出，超过130卖出，最后交易日少于或等于当前时间卖出
            const price = parseFloat(his.price)
            const tempPrice = parseFloat(tempList[index].price)
            profit = profit + (price - tempPrice) * 10
            funds = funds - (tempPrice * 10)
            charge = charge + price * 10 * 0.002
            console.log(`${foramtDate}>>>卖出：${tempList[index].bond_id} 买入价:${tempPrice} 价格：${price} 盈利：${price - tempPrice}`)
          } else {
            jisiluHisList.push(tempList[index])
          }

          index += 1
        }

        index = 0
        length = hiss.length
        tempBondIdList = tempList.map((item) => {
          return item.bond_id
        })

        while(index < length) {
          const item = hiss[index]
          const jisilu = await this.jisiluRepository
          .createQueryBuilder('jisilu')
          .where('jisilu.bond_id = :bond_id', {bond_id: item.bond_id})
          .getOne()

          let delistFlag = false

          if(jisilu.delist_dt) {
            delistFlag = new Date(jisilu.delist_dt).getTime() <= new Date(foramtDate).getTime()
          }

          if(tempBondIdList.indexOf(item.bond_id) === -1 && parseFloat(item.price) < 130 && !delistFlag) { // 当前双底不在持仓中、价格不高于130、最后交易日必须大于当前时间 买入
            console.log(`${foramtDate}>>>买入：${item.bond_id} 买入价：${item.price} 双底：${item.dblow}`)
            funds = funds + parseFloat(item.price) * 10
            charge = charge + parseFloat(item.price) * 10 * 0.002
            jisiluHisList.push(hiss[index])
          }
          index += 1
        }
      } else {
        console.log(`${foramtDate} 非交易日`)
      }

      // 时间戳加一天
      timestamp = timestamp + 86400000
      maxFunds = Math.max(maxFunds, funds)
      console.log(`${foramtDate}>>>所需资金：${funds}`)
    }

    let haveIndex = 0
    while(haveIndex < jisiluHisList.length) {
      const his: JisiluHis = await this.jisiluHisRepository
      .createQueryBuilder('jisiluHis')
      .where('jisiluHis.bond_id = :bond_id', {bond_id: jisiluHisList[haveIndex].bond_id})
      .orderBy('jisiluHis.last_chg_dt', 'DESC')
      .getOne()

      haveProfit = haveProfit + (parseFloat(his.price) - parseFloat(jisiluHisList[haveIndex].price))
      haveIndex++
    }

    console.log(`所需资金峰值：${maxFunds}，持仓金额：${funds}，持仓收益：${haveProfit}，已盈利：${profit}，手续费：${charge}`)

    return {
      profit,
      hiss: jisiluHisList
    }
  }

  // 策略2：溢价率做排行，溢价率是负数的，最低的10只选中，每日轮换，排行低于前十的轮出，新的轮入，如果溢价是负的少于10只，则选择数低于10
  async runPremium(strategyDto: StrategyDto) {
    const {time, count} = strategyDto
    let timestamp = new Date(time).getTime()
    // 当前持仓
    let jisiluHisList: JisiluHis[] = []
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
    // 手续费
    let charge = 0 // 0.002
    while(timestamp <= nowstamp) {
      const foramtDate = moment(timestamp).format('YYYY-MM-DD')
      console.log(`${foramtDate}>>>盈利${profit}`)

      // 查询溢价率倒数前N的
      const hiss = await this.jisiluHisRepository
      .createQueryBuilder('jisiluHis')
      .where('jisiluHis.last_chg_dt = :last_chg_dt', {last_chg_dt: foramtDate})
      .orderBy('jisiluHis.premium_rt')
      .limit(count)
      .getMany()

      // 保存查询结果的代码，避免需要重复查询
      let tempBondIdList = hiss.map((item) => {
        return item.bond_id
      })

      if(hiss.length !== 0) {
        let index = 0
        const tempList = [...jisiluHisList]
        let length = tempList.length
        jisiluHisList = []
        
        while(index < length) {
          const item = tempList[index]

          // 查询可转债当前时间的交易记录
          const his = await this.jisiluHisRepository
          .createQueryBuilder('jisiluHis')
          .where('jisiluHis.bond_id = :bond_id', {bond_id: tempList[index].bond_id})
          .andWhere('jisiluHis.last_chg_dt = :last_chg_dt', {last_chg_dt: foramtDate})
          .getOne()

          // 查询可转债的详情，获取最后交易日时间，如果
          const jisilu = await this.jisiluRepository
          .createQueryBuilder('jisilu')
          .where('jisilu.bond_id = :bond_id', {bond_id: tempList[index].bond_id})
          .getOne()

          let delistFlag = false

          if(jisilu.delist_dt) {
            delistFlag = new Date(jisilu.delist_dt).getTime() <= new Date(foramtDate).getTime()
          }

          // console.log(foramtDate, item, his, jisilu)
          
          if((tempBondIdList.indexOf(item.bond_id) === -1 || delistFlag)) { // 不在溢价率倒是前 N 卖出，超过130卖出，最后交易日少于或等于当前时间卖出
            const price = parseFloat(his.price)
            const tempPrice = parseFloat(tempList[index].price)
            profit = profit + (price - tempPrice) * 10
            funds = funds - (tempPrice * 10)
            charge = charge + price * 10 * 0.002
            console.log(`${foramtDate}>>>卖出：${tempList[index].bond_id} 买入价:${tempPrice} 价格：${price} 盈利：${price - tempPrice}`)
          } else {
            jisiluHisList.push(tempList[index])
          }

          index += 1
        }

        index = 0
        length = hiss.length
        tempBondIdList = tempList.map((item) => {
          return item.bond_id
        })

        
        while(index < length) {
          const item = hiss[index]
          const jisilu = await this.jisiluRepository
          .createQueryBuilder('jisilu')
          .where('jisilu.bond_id = :bond_id', {bond_id: item.bond_id})
          .getOne()

          let delistFlag = false

          if(jisilu.delist_dt) {
            delistFlag = new Date(jisilu.delist_dt).getTime() <= new Date(foramtDate).getTime()
          }

          if(tempBondIdList.indexOf(item.bond_id) === -1 && !delistFlag && parseFloat(item.premium_rt) < 0) { // 当前溢价率不在持仓中、价格不高于130、最后交易日必须大于当前时间 买入
            console.log(`${foramtDate}>>>买入：${item.bond_id} 买入价：${item.price} 溢价率：${item.premium_rt}`)
            funds = funds + parseFloat(item.price) * 10
            charge = charge + parseFloat(item.price) * 10 * 0.002
            jisiluHisList.push(hiss[index])
          }
          index += 1
        }

      } else {
        console.log(`${foramtDate} 非交易日`)
      }


      // 时间戳加一天
      timestamp = timestamp + 86400000
      maxFunds = Math.max(maxFunds, funds)
      console.log(`${foramtDate}>>>所需资金：${funds}`)
    }

    let haveIndex = 0
    while(haveIndex < jisiluHisList.length) {
      const his: JisiluHis = await this.jisiluHisRepository
      .createQueryBuilder('jisiluHis')
      .where('jisiluHis.bond_id = :bond_id', {bond_id: jisiluHisList[haveIndex].bond_id})
      .orderBy('jisiluHis.last_chg_dt', 'DESC')
      .getOne()

      haveProfit = haveProfit + (parseFloat(his.price) - parseFloat(jisiluHisList[haveIndex].price))
      haveIndex++
    }

    console.log(`所需资金峰值：${maxFunds}，持仓金额：${funds}，持仓收益：${haveProfit}，已盈利：${profit}，手续费：${charge}`)

    return {
      profit,
      hiss: jisiluHisList
    }
  }

  // 策略3：买入溢价率倒数前 10 为，收盘价大于 130 元卖出
  async runPremium130(strategyDto: StrategyDto) {
    const {time, count, purchase_price, sold_price} = strategyDto
    let timestamp = new Date(time).getTime()
    // 当前持仓
    let jisiluHisList: JisiluHis[] = []
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
    // 手续费
    let charge = 0 // 0.002
    //
    const soldMap = {}

    while(timestamp <= nowstamp) {
      const foramtDate = moment(timestamp).format('YYYY-MM-DD')
      console.log(`${foramtDate}>>>盈利${profit}`)

      // 查询双底倒数前N的
      const hiss = await this.jisiluHisRepository
      .createQueryBuilder('jisiluHis')
      .where('jisiluHis.last_chg_dt = :last_chg_dt', {last_chg_dt: foramtDate})
      .orderBy('jisiluHis.premium_rt')
      .limit(count)
      .getMany()

      if(hiss.length !== 0) {
        let index = 0
        const tempList = [...jisiluHisList]
        let length = tempList.length
        jisiluHisList = []

        while(index < length) {
          const item = tempList[index]

          // 查询可转债当前时间的交易记录
          const his = await this.jisiluHisRepository
          .createQueryBuilder('jisiluHis')
          .where('jisiluHis.bond_id = :bond_id', {bond_id: item.bond_id})
          .andWhere('jisiluHis.last_chg_dt = :last_chg_dt', {last_chg_dt: foramtDate})
          .getOne()

          // 查询可转债的详情，获取最后交易日时间，如果
          const jisilu = await this.jisiluRepository
          .createQueryBuilder('jisilu')
          .where('jisilu.bond_id = :bond_id', {bond_id: item.bond_id})
          .getOne()

          let delistFlag = false

          if(jisilu.delist_dt) {
            delistFlag = new Date(jisilu.delist_dt).getTime() <= new Date(foramtDate).getTime()
          }

          if((delistFlag || parseFloat(his.price) >= (sold_price || 130))) {
            const price = parseFloat(his.price)
            const tempPrice = parseFloat(item.price)
            profit = profit + (price - tempPrice) * 10
            funds = funds - (tempPrice * 10)
            charge = charge + price * 10 * 0.002
            soldMap[item.bond_id] = (soldMap[item.bond_id] || 0) + (price - tempPrice) * 10
            console.log(
              delistFlag 
              ? `${foramtDate}>>>最后交易日卖出：${item.bond_id} 买入价:${tempPrice} 价格：${price} 盈利：${price - tempPrice}` 
              : `${foramtDate}>>>卖出：${item.bond_id} 买入价:${tempPrice} 价格：${price} 盈利：${price - tempPrice}`)
          } else {
            jisiluHisList.push(item)
          }

          index += 1
        }

        index = 0
        length = hiss.length

        while(index < length) {
          const item = hiss[index]
          const jisilu = await this.jisiluRepository
          .createQueryBuilder('jisilu')
          .where('jisilu.bond_id = :bond_id', {bond_id: item.bond_id})
          .getOne()

          let delistFlag = false

          if(jisilu.delist_dt) {
            delistFlag = new Date(jisilu.delist_dt).getTime() <= new Date(foramtDate).getTime()
          }

          if(!delistFlag && parseFloat(item.price) < (purchase_price || 110) && parseFloat(item.premium_rt) < 0) { // 当前溢价率不在持仓中、价格不高于130、最后交易日必须大于当前时间 买入
            console.log(`${foramtDate}>>>买入：${item.bond_id} 买入价：${item.price} 溢价率：${item.premium_rt}`)
            funds = funds + parseFloat(item.price) * 10
            charge = charge + parseFloat(item.price) * 10 * 0.002
            jisiluHisList.push(item)
          }
          index += 1
        }
      } else {
        console.log(`${foramtDate} 非交易日`)
      }

      // 时间戳加一天
      timestamp = timestamp + 86400000
      maxFunds = Math.max(maxFunds, funds)
      console.log(`${foramtDate}>>>持仓资金：${funds}`)
    }
    
    let haveIndex = 0
    while(haveIndex < jisiluHisList.length) {
      const his: JisiluHis = await this.jisiluHisRepository
      .createQueryBuilder('jisiluHis')
      .where('jisiluHis.bond_id = :bond_id', {bond_id: jisiluHisList[haveIndex].bond_id})
      .orderBy('jisiluHis.last_chg_dt', 'DESC')
      .getOne()

      haveProfit = haveProfit + (parseFloat(his.price) - parseFloat(jisiluHisList[haveIndex].price))
      haveIndex++
    }

    console.log(`所需资金峰值：${maxFunds}，持仓金额：${funds}，持仓收益：${haveProfit}，已盈利：${profit}，手续费：${charge}`)

    return {
      profit,
      hiss: jisiluHisList,
      soldMap
    }
  }

  // 策略4：选择到期收益率最高的10只，每日轮动
  async runPremiumTop(strategyDto: StrategyDto) {
    const {time, count} = strategyDto
    let timestamp = new Date(time).getTime()
    // 当前持仓
    let jisiluHisList: JisiluHis[] = []
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
    // 手续费
    let charge = 0 // 0.002
    while(timestamp <= nowstamp) {
      const foramtDate = moment(timestamp).format('YYYY-MM-DD')
      console.log(`${foramtDate}>>>盈利${profit}`)

      // 查询溢价率倒数前N的
      const hiss = await this.jisiluHisRepository
      .createQueryBuilder('jisiluHis')
      .where('jisiluHis.last_chg_dt = :last_chg_dt', {last_chg_dt: foramtDate})
      .orderBy('jisiluHis.premium_rt', 'DESC')
      .limit(count)
      .getMany()

      // 保存查询结果的代码，避免需要重复查询
      let tempBondIdList = hiss.map((item) => {
        return item.bond_id
      })

      if(hiss.length !== 0) {
        let index = 0
        const tempList = [...jisiluHisList]
        let length = tempList.length
        jisiluHisList = []
        
        while(index < length) {
          const item = tempList[index]

          // 查询可转债当前时间的交易记录
          const his = await this.jisiluHisRepository
          .createQueryBuilder('jisiluHis')
          .where('jisiluHis.bond_id = :bond_id', {bond_id: tempList[index].bond_id})
          .andWhere('jisiluHis.last_chg_dt = :last_chg_dt', {last_chg_dt: foramtDate})
          .getOne()

          // 查询可转债的详情，获取最后交易日时间，如果
          const jisilu = await this.jisiluRepository
          .createQueryBuilder('jisilu')
          .where('jisilu.bond_id = :bond_id', {bond_id: tempList[index].bond_id})
          .getOne()

          let delistFlag = false

          if(jisilu.delist_dt) {
            delistFlag = new Date(jisilu.delist_dt).getTime() <= new Date(foramtDate).getTime()
          }

          // console.log(foramtDate, item, his, jisilu)
          
          if((tempBondIdList.indexOf(item.bond_id) === -1 || delistFlag)) { // 不在溢价率倒是前 N 卖出，超过130卖出，最后交易日少于或等于当前时间卖出
            const price = parseFloat(his.price)
            const tempPrice = parseFloat(tempList[index].price)
            profit = profit + (price - tempPrice) * 10
            funds = funds - (tempPrice * 10)
            charge = charge + price * 10 * 0.002
            console.log(`${foramtDate}>>>卖出：${tempList[index].bond_id} 买入价:${tempPrice} 价格：${price} 盈利：${price - tempPrice}`)
          } else {
            jisiluHisList.push(tempList[index])
          }

          index += 1
        }

        index = 0
        length = hiss.length
        tempBondIdList = tempList.map((item) => {
          return item.bond_id
        })

        
        while(index < length) {
          const item = hiss[index]
          const jisilu = await this.jisiluRepository
          .createQueryBuilder('jisilu')
          .where('jisilu.bond_id = :bond_id', {bond_id: item.bond_id})
          .getOne()

          let delistFlag = false

          if(jisilu.delist_dt) {
            delistFlag = new Date(jisilu.delist_dt).getTime() <= new Date(foramtDate).getTime()
          }

          if(tempBondIdList.indexOf(item.bond_id) === -1 && !delistFlag) { // 当前溢价率不在持仓中、最后交易日必须大于当前时间 买入
            console.log(`${foramtDate}>>>买入：${item.bond_id} 买入价：${item.price} 溢价率：${item.premium_rt}`)
            funds = funds + parseFloat(item.price) * 10
            charge = charge + parseFloat(item.price) * 10 * 0.002
            jisiluHisList.push(hiss[index])
          }
          index += 1
        }

      } else {
        console.log(`${foramtDate} 非交易日`)
      }


      // 时间戳加一天
      timestamp = timestamp + 86400000
      maxFunds = Math.max(maxFunds, funds)
      console.log(`${foramtDate}>>>所需资金：${funds}`)
    }

    let haveIndex = 0
    while(haveIndex < jisiluHisList.length) {
      const his: JisiluHis = await this.jisiluHisRepository
      .createQueryBuilder('jisiluHis')
      .where('jisiluHis.bond_id = :bond_id', {bond_id: jisiluHisList[haveIndex].bond_id})
      .orderBy('jisiluHis.last_chg_dt', 'DESC')
      .getOne()

      haveProfit = haveProfit + (parseFloat(his.price) - parseFloat(jisiluHisList[haveIndex].price))
      haveIndex++
    }

    console.log(`所需资金峰值：${maxFunds}，持仓金额：${funds}，持仓收益：${haveProfit}，已盈利：${profit}，手续费：${charge}`)

    return {
      profit,
      hiss: jisiluHisList
    }
  }
}
