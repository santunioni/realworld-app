import { Inter } from 'next/font/google'
import Head from 'next/head'
import Image from 'next/image'
import { useRouter } from 'next/router'
import styles from '../styles/Home.module.css'
import { ZodPagination } from '../utils/pagination'
import { trpc } from '../utils/trpc'

const inter = Inter({ subsets: ['latin'] })

export default function Home() {
  const router = useRouter()

  const page = ZodPagination.parse(router.query)
  const previousPage = page.getPreviousPage()
  const nextPage = page.getNextPage()

  const articlesQuery = trpc.articles.getFeed.useQuery({ pagination: page.toParams() }).data
  if (!articlesQuery) {
    return <div>Loading...</div>
  }
  const articles = articlesQuery.articles

  const hasNextPage = articles.length === page.take

  return (
    <>
      <Head>
        <title>Main Page</title>
        <meta name="description" content="Generated by create next app" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className={`${styles.main} ${inter.className}`}>
        <h1>
          <a href={'/'}>Realworld App!</a>
        </h1>
        <h2>Feed</h2>
        <ul>
          {articles.map(article => (
            <li key={article.slug} className={styles.content}>
              <h2>
                <a href={`/articles/${article.slug}`}>{article.title}</a>
              </h2>
              <p>{article.description}</p>
              <a href={`profiles/${article.author.username}`} target="_blank">
                <Image
                  src={article.author.image}
                  alt={'Author Profile'}
                  className={styles.vercelLogo}
                  width={100}
                  height={24}
                />
              </a>
            </li>
          ))}
        </ul>
        <h2>Links</h2>
        {page.skip > 0 && <a href={'/'}>Início</a>}
        {previousPage.skip > 0 && (
          <a href={`?${previousPage.toQueryString()}`}>
            Previous ({previousPage.skip + 1}...{previousPage.skip + previousPage.take})
          </a>
        )}
        {hasNextPage && (
          <a href={`?${nextPage.toQueryString()}`}>
            Next ({nextPage.skip + 1}...{nextPage.skip + nextPage.take})
          </a>
        )}
      </main>
    </>
  )
}
