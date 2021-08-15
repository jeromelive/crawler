import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { CrawlerHis } from "./crawler-his.entity";

@Entity()
export class Crawler {
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

  // 债券名称
  @Column('text')
  name: string

  // 正股代码
  @Column('text')
  stockCode: string

  // 利息
  @Column('text')
  interestRate: string
  
  // 转股价
  @Column('text')
  transferPrice: number

  // 发行规模（亿元）
  @Column('text')
  issueScale: number
  
  // 当前价格
  @Column('text')
  price: number

  // 到期收益率
  @Column('text')
  yieldToMaturyty: number

  // 上市时间
  @Column('text')
  listingDte: Date

  @OneToMany(() => CrawlerHis, crawlerHis => crawlerHis.crawler)
  crawlerHiss: CrawlerHis[]
}