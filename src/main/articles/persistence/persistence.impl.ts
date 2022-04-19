import { CMSPersistence } from '../cms/cms.persistence'
import { Author } from '../views/views.models'
import { ViewsPersistence } from '../views/views.persistence'
import { ArticleEntity } from './article.entity'
import { EditorTypeORM } from './editor.impl'

export class ArticlesTypeORMPersistence
  implements CMSPersistence, ViewsPersistence
{
  createNewEditor(author: Author): EditorTypeORM {
    return new EditorTypeORM()
  }

  async getArticle(slug: string): Promise<ArticleEntity> {
    return await ArticleEntity.findOneBy({ slug: slug })
  }
}
