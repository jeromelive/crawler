import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import {Crawler} from './crawler.entity'

@Entity()
export class CrawlerHis {
  // 主见id
  @PrimaryGeneratedColumn()
  id: number;

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

  // 债券代码
  @Column('text')
  code: string

  // 交易时间
  @Column('text')
  time: Date

  // 开盘价
  @Column('text')
  openPrice: string

  // 收盘价
  @Column('text')
  closePrice: string

  // 正股开盘价
  @Column('text')
  stockOpenPrice: string

  // 正股收盘价
  @Column('text')
  stockClosePrice: string

  // 最高价
  @Column('text')
  highPrice: string

  // 最低价
  @Column('text')
  lowPrice: string

  // 成交量
  @Column('text')
  volume: string

  // 成交额
  @Column('text')
  tradingVolume: string

  // 振幅
  @Column('text')
  amplitude: string

  // 换手率
  @Column('text')
  turnoverRate: string

  // 转股溢价率
  @Column('text')
  premiumRate: string

  @ManyToOne(() => Crawler, crawler => crawler.crawlerHiss)
  crawler: Crawler
}