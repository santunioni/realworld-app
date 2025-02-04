import { LoremIpsum } from 'lorem-ipsum'
import { ArticleSearchFields, PartialArticle, UserDriver } from './UserDriver'
const lorem = new LoremIpsum()

export class UserDSL {
  constructor(
    private driver: UserDriver,
    private context: {
      slug?: string
    } = {},
    public readonly _username?: string,
  ) {}

  get username() {
    if (!this._username) {
      throw new Error('No username provided')
    }
    return this._username
  }

  private get slug() {
    if (!this.context.slug) {
      throw new Error('No article slug in context')
    }
    return this.context.slug
  }

  async login() {
    await this.driver.login(this.username)
  }

  async follow(user: UserDSL) {
    await this.driver.follow(user.username)
  }

  async unfollow(user: UserDSL) {
    await this.driver.unfollow(user.username)
  }

  async writeArticle(article: PartialArticle = {}) {
    this.context.slug = await this.driver.writeArticle({
      ...{
        title: lorem.generateSentences(1),
        description: lorem.generateSentences(2),
        body: lorem.generateParagraphs(1),
        tags: lorem.generateWords(4).toLowerCase().split(' '),
      },
      ...article,
    })
  }

  async publishTheArticle(slug?: string) {
    await this.driver.publishArticle(slug || this.slug)
  }

  async unpublishTheArticle(slug?: string) {
    await this.driver.unpublishArticle(slug || this.slug)
  }

  async deleteTheArticle(slug?: string) {
    await this.driver.deleteArticle(slug || this.slug)
  }

  async commentOnArticle(slug?: string, comment?: string) {
    console.log('Commenting on', slug || this.slug)
    await this.driver.commentOnArticle(slug || this.slug, comment || 'I liked that article!')
  }

  async publishAnArticle(article: PartialArticle = {}) {
    await this.writeArticle(article)
    await this.publishTheArticle()
  }

  async shouldFindArticleBy(filters: ArticleSearchFields) {
    await this.driver.shouldFindArticleBy(filters, this.slug)
  }

  async shouldNotFindArticleBy(filters: ArticleSearchFields) {
    await this.driver.shouldNotFindArticleBy(filters, this.slug)
  }

  async shouldFindTheArticle(slug?: string) {
    await this.driver.shouldFindTheArticle(slug || this.slug)
  }

  async shouldNotFindTheArticle(slug?: string) {
    await this.driver.shouldNotFindTheArticle(slug || this.slug)
  }

  async shouldSeeCommentFrom(author: UserDSL, slug?: string) {
    await this.driver.shouldSeeCommentFrom(slug || this.slug, author.username)
  }

  async shouldSeeTheArticleInTheFeed(slug?: string) {
    await this.driver.shouldSeeTheArticleInTheFeed(slug || this.slug)
  }

  async shouldNotSeeTheArticleInTheFeed(slug?: string) {
    await this.driver.shouldNotSeeTheArticleInTheFeed(slug || this.slug)
  }
}
