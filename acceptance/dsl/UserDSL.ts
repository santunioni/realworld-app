import {
  PartialArticle,
  ArticleSearchFields,
  makeRandomArticle,
  UserDriver,
} from './UserDriver'

export class UserDSL {
  constructor(
    public readonly username: string,
    private driver: UserDriver,
    private context: {
      slug?: string
    } = {},
  ) {}

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
      ...makeRandomArticle(),
      ...article,
    })
  }

  async publishTheArticle(slug?: string) {
    await this.driver.publishArticle(slug || this.context.slug)
  }

  async unpublishTheArticle(slug?: string) {
    await this.driver.unpublishArticle(slug || this.context.slug)
  }

  async deleteTheArticle(slug?: string) {
    await this.driver.deleteArticle(slug || this.context.slug)
  }

  async editTheArticle(slug?: string) {
    await this.driver.editArticle(slug || this.context.slug, {
      body: makeRandomArticle().body,
    })
  }

  async commentOnArticle(slug?: string, comment?: string) {
    await this.driver.commentOnArticle(
      slug || this.context.slug,
      comment || 'I liked that article!',
    )
  }

  async publishAnArticle(article: PartialArticle = {}) {
    await this.writeArticle(article)
    await this.publishTheArticle()
  }

  async shouldFindArticleBy(filters: ArticleSearchFields) {
    await this.driver.shouldFindArticleBy(filters, this.context.slug)
  }

  async shouldNotFindArticleBy(filters: ArticleSearchFields) {
    await this.driver.shouldNotFindArticleBy(filters, this.context.slug)
  }

  async shouldFindTheArticle(slug?: string) {
    await this.driver.shouldFindTheArticle(slug || this.context.slug)
  }

  async shouldNotFindTheArticle(slug?: string) {
    await this.driver.shouldNotFindTheArticle(slug || this.context.slug)
  }

  async shouldSeeCommentFrom(author: UserDSL, slug?: string) {
    await this.driver.shouldSeeCommentFrom(
      slug || this.context.slug,
      author.username,
    )
  }

  async shouldSeeTheArticleInTheFeed(slug?: string) {
    await this.driver.shouldSeeTheArticleInTheFeed(slug || this.context.slug)
  }

  async shouldNotSeeTheArticleInTheFeed(slug?: string) {
    await this.driver.shouldNotSeeTheArticleInTheFeed(slug || this.context.slug)
  }
}
