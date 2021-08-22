import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Jisilu } from "./jisilu.entity";

@Entity()
export class JisiluHis {
  @PrimaryGeneratedColumn()
  id: number

  // 代码
  @Index()
  @Column()
  bond_id: string

  // 转债名称
  @Column()
  bond_nm: string

  // 日期
  @Index()
  @Column()
  last_chg_dt: string

  // 收盘价
  @Index()
  @Column()
  price: string

  // 成交额（万元）
  @Column()
  volume: string

  // 转股价值
  @Column()
  convert_value: string

  // 到期税前收益率
  @Index()
  @Column()
  ytm_rt: string

  // 转股溢价率
  @Index()
  @Column()
  premium_rt: string

  // 剩余规模（亿元）
  @Column()
  curr_iss_amt: string

  // 换手率
  @Column()
  turnover_rt: string

  // 基金持仓
  @Column()
  fund_rt: string

  // 基金持仓百分比
  @Column()
  fund_rt_per: string

  // 当前双底
  @Index()
  @Column()
  dblow: string

  @ManyToOne(() => Jisilu, jisilu => jisilu.jisilu_hiss)
  jisilu: Jisilu
}