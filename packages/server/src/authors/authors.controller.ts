import { Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger'
import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import type { User } from '../nest/jwt.guard'
import { AuthIsOptional, GetUser, JWTAuthGuard, RequireUser } from '../nest/jwt.guard'
import { buildUrlToPath } from '../nest/url'
import { ZodBody } from '../nest/validation.utils'
import { TRPC } from '../trpc/app'

import { AuthorsService, Profile } from './authors.service'

const username = z
  .string()
  .regex(/^[A-Za-z0-9\-_]*$/)
  .describe('The author username')
const bio = z.string().describe('The author bio')
const image = z.string().url().describe('The author image url')

const CreateProfileDTO = z.object({
  username,
  bio,
  image,
})

const CreateProfileBody = z.object({
  profile: CreateProfileDTO,
})

type CreateProfileBody = z.infer<typeof CreateProfileBody>

const UpdateProfileDTO = CreateProfileDTO.partial()

const UpdateProfileBody = z.object({
  profile: UpdateProfileDTO,
})

type UpdateProfileBody = z.infer<typeof UpdateProfileBody>

@ApiTags('profiles')
@UseGuards(JWTAuthGuard)
@ApiBearerAuth()
@Controller('profiles')
export class AuthorsController {
  constructor(private authorsService: AuthorsService) {}

  @HttpCode(HttpStatus.OK)
  @Get('me')
  async getCurrent(@RequireUser() user: User) {
    const me = await this.authorsService.getUserAuthorProfile(user)
    return createAuthorProfileBody(me)
  }

  @ApiBody({
    schema: zodToJsonSchema(CreateProfileBody) as any,
  })
  @HttpCode(HttpStatus.CREATED)
  @Post()
  async create(@RequireUser() user: User, @ZodBody(CreateProfileBody) body: CreateProfileBody) {
    const me = await this.authorsService.createUserAuthorProfile(user, body.profile)
    return createAuthorProfileBody(me)
  }

  @ApiBody({
    schema: zodToJsonSchema(UpdateProfileBody) as any,
  })
  @HttpCode(HttpStatus.OK)
  @Patch()
  async update(@RequireUser() user: User, @ZodBody(UpdateProfileBody) body: UpdateProfileBody) {
    const me = await this.authorsService.updateUserAuthorProfile(user, body.profile)
    return createAuthorProfileBody(me)
  }

  @HttpCode(HttpStatus.CREATED)
  @Post(':username/follow')
  async followProfile(@RequireUser() user: User, @Param('username') username: string) {
    const me = await this.authorsService.getUserAuthorProfile(user)
    const profile = await this.authorsService.getAuthorByUsername(username)
    await me.follow(profile)
    return createAuthorProfileBody(profile, true)
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':username/follow')
  async unfollowProfile(@RequireUser() user: User, @Param('username') username: string) {
    const me = await this.authorsService.getUserAuthorProfile(user)
    const profile = await this.authorsService.getAuthorByUsername(username)
    await me.unfollow(profile)
    return createAuthorProfileBody(profile, false)
  }

  @HttpCode(HttpStatus.OK)
  @AuthIsOptional()
  @Get(':username')
  async getProfile(@GetUser() user: User | null, @Param('username') username: string) {
    const author = await this.authorsService.getAuthorByUsername(username)
    let following: boolean | undefined = undefined
    if (user) {
      const me = await this.authorsService.getUserAuthorProfile(user)
      following = await me.isFollowing(author)
    }
    return createAuthorProfileBody(author, following)
  }
}

function createAuthorProfileBody(author: Profile, following?: boolean) {
  return {
    profile: {
      ...createAuthorDTO(author, following),
      links: {
        articles: buildUrlToPath('articles', {
          author: author.username,
        }),
      },
    },
  } as const
}

export function createAuthorDTO(author: Profile, following?: boolean) {
  return {
    username: author.username,
    bio: author.bio,
    image: author.image,
    ...(following !== undefined ? { following } : {}),
  } as const
}

export function createAuthorsTrpcRouter(controller: AuthorsController, trpc: TRPC) {
  return trpc.router({
    profiles: trpc.router({
      getCurrent: trpc.protectedProcedure.query(({ ctx }) => controller.getCurrent(ctx.user)),
      create: trpc.protectedProcedure
        .input(CreateProfileBody)
        .mutation(({ ctx, input }) => controller.create(ctx.user, input)),
      get: trpc.publicProcedure
        .input(z.object({ username }))
        .query(({ ctx, input }) => controller.getProfile(ctx.user, input.username)),
      update: trpc.protectedProcedure
        .input(UpdateProfileBody)
        .mutation(({ ctx, input }) => controller.update(ctx.user, input)),
      follow: trpc.protectedProcedure
        .input(z.object({ username }))
        .mutation(({ ctx, input }) => controller.followProfile(ctx.user, input.username)),
      unfollow: trpc.protectedProcedure
        .input(z.object({ username }))
        .mutation(({ ctx, input }) => controller.unfollowProfile(ctx.user, input.username)),
    }),
  })
}
