import { Axios } from 'axios'
import {
  ArticleSnapshot,
  PartialArticleSnapshot,
} from '../../../main/articles/articles.models'
import {
  ArticleSearch,
  createCredentials,
  ProtocolDriver,
  User,
} from './protocol.driver'

export class RestDriver implements ProtocolDriver {
  private user: User
  private static userAuth: { [key: string]: string } = {}

  public static async createAccounts(axios: Axios, usernames: string[]) {
    await Promise.all(
      usernames.map(async (username) => {
        const signup = await axios.post('accounts/signup', {
          user: createCredentials(username),
        })
        if (signup.data.access_token) {
          RestDriver.userAuth[username] = `Bearer ${signup.data.access_token}`
        }
      }),
    )
  }
  public static async createProfiles(axios: Axios, usernames: string[]) {
    return await Promise.all(
      usernames.map(async (username) => {
        return await axios.post(
          'profiles',
          {
            profile: {
              username: username,
              bio: `Me chamo ${username}`,
              image: 'af2fasf',
            },
          },
          {
            headers: {
              Authorization: RestDriver.userAuth[username],
            },
          },
        )
      }),
    )
  }

  constructor(private axios: Axios) {}

  login(user: User) {
    this.user = user
  }

  private getAuth(): string {
    return RestDriver.userAuth[this.user.name]
  }

  async getCurrentUser(): Promise<User> {
    return this.user
  }

  async createArticle(article: ArticleSnapshot): Promise<string> {
    const headers = {
      Authorization: this.getAuth(),
    }
    const response = await this.axios.post(
      'articles',
      {
        article: article,
      },
      {
        headers: headers,
      },
    )
    expect(response.data).toMatchObject({
      article: { ...article, tags: article.tags.sort() },
    })

    return response.data.article.slug
  }

  async deleteArticle(slug: string) {
    const response = await this.axios.delete(`articles/${slug}`, {
      headers: {
        Authorization: this.getAuth(),
      },
    })
    expect(response.status).toBe(204)
  }

  async getArticle(slug: string): Promise<ArticleSnapshot | null> {
    const response = await this.axios.get(`articles/${slug}`, {
      headers: {
        Authorization: this.getAuth(),
      },
    })
    if (response.data?.article) {
      expect(response.status).toBe(200)
      const article = response.data.article
      return {
        title: article.title,
        description: article.description,
        body: article.body,
        tags: article.tags,
      }
    } else {
      expect(response.status).toBe(404)
      return null
    }
  }

  async findArticles(filters: ArticleSearch): Promise<ArticleSnapshot[]> {
    const response = await this.axios.get(`articles/`, {
      headers: {
        Authorization: this.getAuth(),
      },
      params: filters,
    })
    expect(response.status).toBe(200)
    return response.data.articles
  }

  async editArticle(
    slug: string,
    editions: PartialArticleSnapshot,
  ): Promise<string> {
    return undefined
  }

  async publishArticle(slug: string) {
    const response = await this.axios.post(
      `articles/${slug}/publication`,
      undefined,
      { headers: { Authorization: this.getAuth() } },
    )
  }

  async unpublishArticle(slug: string) {
    const response = await this.axios.delete(`articles/${slug}/publication`, {
      headers: { Authorization: this.getAuth() },
    })
  }

  async favoriteArticle(slug: string) {
    const response = await this.axios.post(`articles/${slug}/favorite`)
  }

  async unfavoriteArticle(slug: string) {
    const response = await this.axios.delete(`articles/${slug}/favorite`)
  }

  async follow(user: User) {}

  async unfollow(user: User) {}

  async commentOnArticle(slug: string, comment: string) {}
}
