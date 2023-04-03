import { Global, Module } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { AccountEntity } from '../accounts/accounts.entity'
import {
  ArticleEntity,
  ArticlesHaveTagsEntity,
  TagEntity,
} from '../articles/articles.repository.typeorm'
import { SnakeNamingStrategy } from 'typeorm-naming-strategies'
import { Provider } from '@nestjs/common/interfaces/modules/provider.interface'
import { AuthorEntity, UserFollows } from '../authors/authors.entity'
import { CommentEntity } from '../comments/comments.entity'
import { JWTAuthPassport } from '../nest/jwt.guard'

let dataSource: DataSource
export function getPostgresDataSource() {
  if (!dataSource) {
    dataSource = new DataSource({
      type: 'postgres',
      url:
        process.env.DATABASE_URL ||
        'postgres://realworld:realworld@localhost:5432/realworld',
      entities: [
        AccountEntity,
        ArticleEntity,
        AuthorEntity,
        UserFollows,
        CommentEntity,
        TagEntity,
        ArticlesHaveTagsEntity,
      ],
      namingStrategy: new SnakeNamingStrategy(),
      synchronize: true,
    })
  }
  return dataSource
}

export const DATASOURCE_PROVIDER = 'DATASOURCE_PROVIDER'
export const databaseProviders: Provider[] = [
  {
    provide: DATASOURCE_PROVIDER,
    useFactory: () => getPostgresDataSource().initialize(),
  },
]

@Global()
@Module({
  providers: [...databaseProviders, JWTAuthPassport],
  exports: [JWTAuthPassport],
})
export class GlobalModule {}
