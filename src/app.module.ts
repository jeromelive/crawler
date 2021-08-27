import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ArticleModule } from './modules/article/article.module';
import { TypeOrmModule } from '@nestjs/typeorm'
import { CrawlerModule } from './modules/crawler/crawler.module';
import { StrategyModule } from './modules/strategy/strategy.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: '123456',
      database: 'test1',
      entities: ["dist/modules/**/*.entity{.ts,.js}"],
      synchronize: true,
    }),
    ArticleModule,
    CrawlerModule,
    StrategyModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
