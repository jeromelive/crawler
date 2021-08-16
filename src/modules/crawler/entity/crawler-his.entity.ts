import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import {Crawler} from './crawler.entity'

@Entity()
export class CrawlerHis {
  // 主见id
  @PrimaryGeneratedColumn()
  id: number;

  // 债券代码
  @Column('text')
  code: string

  // 交易时间
  @Column('text')
  time: Date

  // 开盘价
  @Column('float')
  openPrice: number

  // 收盘价
  @Column('float')
  closePrice: number

  // 正股开盘价
  @Column('float')
  stockOpenPrice: number

  // 正股收盘价
  @Column('float')
  stockClosePrice: number

  // 转股溢价率
  @Column('float')
  premiumRate: number

  @ManyToOne(() => Crawler, crawler => crawler.crawlerHiss)
  crawler: Crawler

  // // 最高价
  // @Column('float')
  // highPrice: number

  // // 最低价
  // @Column('float')
  // lowPrice: number

  // // 成交量
  // @Column('float')
  // volume: number

  // // 成交额
  // @Column('bigint')
  // tradingVolume: number

  // // 振幅
  // @Column('text')
  // amplitude: string

  // // 换手率
  // @Column('text')
  // turnoverRate: string

  // 创建时间
  @CreateDateColumn()
  createTime: Date

  // 更新时间
  @UpdateDateColumn()
  updateTime: Date

  // 软删除
  @Column({
    default: false
  })
  isDelete: boolean
}