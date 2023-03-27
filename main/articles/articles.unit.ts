import { Article, Author, Sluged } from './models'
import { AuthorsService } from '../authors/service'
import { ArticleNotFound } from './exceptions'
import { ArticlesService } from './articles.service'
import { DataSource } from 'typeorm'
import { initializePostgresDataSource } from '../global/global.module'

let dataSource: DataSource
beforeAll(async () => {
  dataSource = await initializePostgresDataSource()
})

afterAll(async () => {
  await dataSource.destroy()
})

let author: Author
let service: ArticlesService
let exampleArticle: Sluged<Article>
let testRandomNumber: number

beforeEach(async () => {
  testRandomNumber = Date.now() % 10 ** 9
  exampleArticle = {
    title: `How to train your dragon? ${testRandomNumber}`,
    description: "You should train your dragon before it's too late",
    body: 'Feed it with fish',
    tags: ['dragons', 'friendship'],
    slug: `how-to-train-your-dragon-${testRandomNumber}`,
  }
  author = await new AuthorsService().createForAccount(
    { id: testRandomNumber },
    { username: `john-doe-${testRandomNumber}` },
  )
  service = new ArticlesService()
})

describe('Article', () => {
  it('should be accessible to other users after published', async () => {
    // Arrange
    const cms = service.getCMS(author)
    await cms.createArticle(exampleArticle)
    await cms.publishArticle(exampleArticle.slug)

    // Act
    const article = await service.getView(null).getArticle(exampleArticle.slug)

    // Assert
    expect(article).toMatchObject(exampleArticle)
  })

  it('should always be accessible to the author', async () => {
    // Arrange
    const cms = service.getCMS(author)
    await cms.createArticle(exampleArticle)

    // Act
    const article = await service
      .getView(author)
      .getArticle(exampleArticle.slug)

    // Assert
    expect(article).toMatchObject({
      title: exampleArticle.title,
      body: exampleArticle.body,
    })
  })

  it('should not be accessible to other users if not published', async () => {
    // Arrange
    const cms = service.getCMS(author)
    await cms.createArticle(exampleArticle)

    // Act - Assert
    await expect(
      service.getView().getArticle(exampleArticle.slug),
    ).rejects.toThrow(ArticleNotFound)

    await expect(
      service.getView({ id: 10 }).getArticle(exampleArticle.slug),
    ).rejects.toThrow(ArticleNotFound)
  })

  it('should ignore duplicated tags', async () => {
    // Arrange
    const cms = service.getCMS(author)
    await cms.createArticle({
      title: exampleArticle.title,
      description: exampleArticle.description,
      body: exampleArticle.body,
      tags: ['programming', 'physics', 'programming'],
    })

    // Act
    const article: Article = await service
      .getView(author)
      .getArticle(exampleArticle.slug)

    // Assert
    expect(article.tags).toEqual(['physics', 'programming'])
  })

  it('should be able to reuse tags from other domain', async () => {
    // Arrange
    const cms = service.getCMS(author)
    await cms.createArticle({
      title: `One article ${testRandomNumber}`,
      description: 'One article',
      body: 'One article',
      tags: ['programming', 'physics'],
    })
    await cms.createArticle({
      title: `Other article ${testRandomNumber}`,
      description: 'Other article',
      body: 'Other article',
      tags: ['physics', 'food'],
    })

    // Act
    const article: Article = await service
      .getView(author)
      .getArticle(`other-article-${testRandomNumber}`)

    // Assert
    expect(article.tags).toEqual(['food', 'physics'])
  })

  it.skip('should return article by tag', async () => {
    // Arrange
    const example = { ...exampleArticle, tags: ['programming', 'physics'] }
    const cms = service.getCMS(author)
    await cms.createArticle(example)

    // Act
    const articles = await service
      .getView(author)
      .getArticlesByFilters({ tags: ['programming'] })

    // Assert
    expect(articles[0].tags.sort()).toEqual(['programming', 'physics'].sort())
  })
})
