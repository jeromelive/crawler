import { NestFactory, APP_FILTER } from '@nestjs/core';
import { AppModule } from './app.module';
import {TransformInterceptor} from './interceptor/transform.interceptor'
import { HttpExceptionFilter } from './filters/http-execption.filters';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter())

  await app.listen(3000);
}
bootstrap();
