import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ArticleService } from './article.service';
import { ArticleCreateDTO } from './dto/article-create.dto';
import { ArticleEditDTO } from './dto/article-edit.dto';
import { IdDTO } from './dto/id.dto';
import { ListDTO } from './dto/list.dto';
import { ApiOkResponse } from '@nestjs/swagger';
import { ArticleListResponse, ArticleListVO } from './vo/article-list.vo';
import { ArticleInfoResponse } from './vo/article-info.vo';

@Controller('article')
export class ArticleController {
  constructor(private articleService: ArticleService) {}

  @Get('list')
  @ApiOkResponse({description: '文章列表', type: ArticleListResponse})
  getMore(@Query() listDTO: ListDTO): Promise<ArticleListVO> {
    return this.articleService.getMore(listDTO)
  }

  @Get('info')
  @ApiOkResponse({description: '文章详情', type: ArticleInfoResponse})
  getOne(@Query() idDto: IdDTO): Promise<ArticleEditDTO> {
    console.log(idDto)
    return this.articleService.getOne(idDto)
  }

  @Post('create')
  @ApiOkResponse({description: '创建文章', type: ArticleInfoResponse})
  create(@Body() articleCreateDTO: ArticleCreateDTO): Promise<ArticleEditDTO> {
    return this.articleService.create(articleCreateDTO)
  }

  @Post('edit')
  @ApiOkResponse({description: '编辑文章', type: ArticleInfoResponse})
  update(@Body() articleEditDTO: ArticleEditDTO): Promise<ArticleEditDTO> {
    return this.articleService.update(articleEditDTO)
  }

  @Post('remove')
  @ApiOkResponse({description: '删除文章', type: ArticleInfoResponse})
  delete(@Body() idDTO: IdDTO): Promise<ArticleEditDTO> {
    return this.articleService.delete(idDTO)
  }
}
