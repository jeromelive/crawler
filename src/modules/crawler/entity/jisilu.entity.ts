import { Column, Entity, Index, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { JisiluHis } from "./jisilu-his.entity";

@Entity()
export class Jisilu {
  @PrimaryGeneratedColumn()
  id: number

  // 代码
  @Index()
  @Column()
  bond_id: string

  // 转债名称
  @Column()
  bond_nm: string

  // 纯债价格
  @Column()
  bond_value: string

  // 开始转股时间
  @Column()
  convert_dt: string

  // 转股价
  @Column()
  convert_price: string
  
  // 转股价值
  @Index()
  @Column()
  convert_value: string

  // 溢价率
  @Column()
  premium_rt: string

  // 正股代码
  @Column()
  stock_id: string

  // 正股名称
  @Column()
  stock_nm: string

  // 正股价
  @Column()
  sprice: string

  // 正股涨跌
  @Column()
  sincrease_rt: string

  // 正股pd
  @Column()
  pb: string

  // 债券等级
  @Column()
  rating_cd:string

  // 正股波动率
  @Column()
  volatility_rate: string

  // 回售触发价
  @Column()
  put_convert_price: string

  // 强赎触发价
  @Column()
  force_redeem_price: string

  // 转债占比
  @Column()
  convert_amt_ratio: string

  // 基金持仓
  @Index()
  @Column()
  fund_rt: string

  // 最后交易日
  @Column()
  delist_dt: string

  // 到期时间
  @Column()
  short_maturity_dt: string
  
  // 剩余年限
  @Column()
  year_left: string

  // 剩余规模（亿元）
  @Column()
  curr_iss_amt: string

  // 成交额（万元）
  @Column()
  volume: string

  // 换手率
  @Column()
  turnover_rt: string

  // 到期税前收益
  @Index()
  @Column()
  ytm_rt: string

  // 双低
  @Index()
  @Column()
  dblow: string

  // 发行规模
  @Column()
  orig_iss_amt: string

  // 退市原因
  @Column()
  delist_notes: string

  @OneToMany(() => JisiluHis, jisilu_hiss => jisilu_hiss.jisilu)
  jisilu_hiss: JisiluHis[]
}