import { Body, HttpException, HttpStatus, Query } from '@nestjs/common'
import { PipeTransform } from '@nestjs/common/interfaces/features/pipe-transform.interface'
import { ZodError, ZodType } from 'zod'

export function createZodTransformer<ZT extends ZodType>(schema: ZT): PipeTransform<any, ZT['_output']> {
  return {
    transform: value => {
      try {
        return schema.parse(value) as ZT['_output']
      } catch (e) {
        if (e instanceof ZodError) {
          throw new HttpException(e.errors, HttpStatus.UNPROCESSABLE_ENTITY)
        }
        throw e
      }
    },
  }
}

export function ZodBody<ZT extends ZodType>(schema: ZT) {
  return Body(createZodTransformer(schema))
}

export function ZodQuery<ZT extends ZodType>(schema: ZT) {
  return Query(createZodTransformer(schema))
}
