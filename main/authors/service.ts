import { Injectable } from '@nestjs/common'
import { AuthorAlreadyExists, AuthorNotFound } from './exceptions'
import { Profile, ProfileFields } from './models'
import { AuthorEntity } from '../articles/author.entity'
import { User } from '../accounts/accounts.controller'

@Injectable()
export class AuthorsService {
  async createForAccount(
    account: User,
    fields: ProfileFields,
  ): Promise<Profile> {
    return await AuthorEntity.create({
      ...fields,
      accountId: account.id,
    })
      .save()
      .catch((err) => {
        throw new AuthorAlreadyExists(fields.username)
      })
  }

  async getByUsername(username: string): Promise<AuthorEntity> {
    const profile = await AuthorEntity.findOne({
      where: { username: username },
    })
    if (!profile) {
      throw new AuthorNotFound(
        `I can't find a profile with username ${username}`,
      )
    }
    return profile
  }

  async getByAccount(account: User): Promise<AuthorEntity> {
    const profile = await AuthorEntity.createQueryBuilder('profile')
      .select()
      .where({ accountId: account.id })
      .getOne()
    if (!profile) {
      throw new AuthorNotFound(
        `I can't find a profile with accountId ${account.id}`,
      )
    }
    return profile
  }

  async updateByAccount(
    account: User,
    fields: ProfileFields,
  ): Promise<AuthorEntity> {
    const profile = await this.getByAccount(account)
    return await profile.loadData(fields).save()
  }
}
