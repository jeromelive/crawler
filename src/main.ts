import { NestFactory, APP_FILTER } from '@nestjs/core';
import { AppModule } from './app.module';
import {TransformInterceptor} from './interceptor/transform.interceptor'
import { HttpExceptionFilter } from './filters/http-execption.filters';
import {ValidationPipe} from '@nestjs/common'
import {SwaggerModule, DocumentBuilder} from '@nestjs/swagger'

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe())
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter())

  const options = new DocumentBuilder().setTitle('blog-server').setDescription('接口文档').setVersion('1.0').build()
  const document = SwaggerModule.createDocument(app, options)
  SwaggerModule.setup('swagger-doc', app, document)

  await app.listen(3000);
}
bootstrap();
