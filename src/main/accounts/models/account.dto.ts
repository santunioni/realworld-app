import { PartialType } from '@nestjs/mapped-types'
import { ApiResponseProperty } from '@nestjs/swagger'
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator'

export class AccountDTO {
  @IsEmail()
  @IsNotEmpty()
  email: string

  @MinLength(8, { message: 'requires at least 8 characters' })
  @MaxLength(32, { message: 'requires at most 32 characters' })
  @Matches(String.raw`[A-Z]`, '', { message: 'requires upper-case characters' })
  @Matches(String.raw`[a-z]`, '', { message: 'requires lower-case characters' })
  @Matches(String.raw`\d`, '', { message: 'requires numbers' })
  @Matches(String.raw`\W`, '', {
    message: 'requires non alpha numeric characters',
  })
  @IsString()
  @IsNotEmpty()
  password: string
}

export class PartialAccountDTO extends PartialType<AccountDTO>(AccountDTO) {}

export class AccountResponsePayload {
  @ApiResponseProperty()
  access_token: string
}
