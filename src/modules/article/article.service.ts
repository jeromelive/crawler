import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ArticleCreateDTO } from './dto/article-create.dto';
import { ArticleEditDTO } from './dto/article-edit.dto';
import { IdDTO } from './dto/id.dto';
import { ListDTO } from './dto/list.dto';
import { Article } from './entity/article.entity';
import {getPagination} from '../../utils'
import { ArticleListVO } from './vo/article-list.vo';

@Injectable()
export class ArticleService {
  list: any[];
  
  constructor(@InjectRepository(Article) private readonly articleRepository: Repository<Article>) {
    this.list = []
  }

  async getMore(listDTO: ListDTO): Promise<ArticleListVO> {
    const { page = 1, pageSize = 10 } = listDTO
    const getList = this.articleRepository
      .createQueryBuilder('article')
      .where({ isDelete: false })
      .select([
        'article.id',
        'article.title', 
        'article.description',
        'article.createTime',
        'article.updateTime',
      ])
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount()

    const [list, total] = await getList
    const pagination = getPagination(total, pageSize, page)

    return {
      list,
      pagination
    }
  }

  async getOne(
    idDto: IdDTO  
  ): Promise<Article> {
    const { id } = idDto
    const articleDetial = await this.articleRepository
      .createQueryBuilder('article')
      .where('article.id = :id', { id })
      .getOne()

    if(!articleDetial) {
      throw new NotFoundException('找不到文章')
    }

    return articleDetial;
  }
  
  async create(
    articleCreateDTO: ArticleCreateDTO
  ):Promise<Article>{
    const article = new Article();
    article.title = articleCreateDTO.title
    article.description = articleCreateDTO.description
    article.content = articleCreateDTO.content
    const result = await this.articleRepository.save(article);
    return result
  }

  async update(
    articleEditDTO: ArticleEditDTO
  ): Promise<Article>{
    const { id } = articleEditDTO
    const articleToUpdate = await this.articleRepository.findOne({ id })
    articleToUpdate.title = articleEditDTO.title
    articleToUpdate.description = articleEditDTO.description
    articleToUpdate.content = articleEditDTO.content
    const result = await this.articleRepository.save(articleToUpdate)
    return result
  }
  
  async delete (
    idDTO: IdDTO,
  ): Promise<Article> {
    const { id } = idDTO
    const articleToUpdate = await this.articleRepository.findOne({ id })
    articleToUpdate.isDelete = true
    const result = await this.articleRepository.save(articleToUpdate)
    return result
  }
}
