import { NestFactory } from '@nestjs/core'
import { SwaggerModule } from '@nestjs/swagger'
import { Context } from 'aws-lambda'
import * as serverlessExpress from 'aws-serverless-express'
import { Server } from 'http'
import { AppModule } from './app.module'
import { GLOBAL_PREFIX } from './global/constants'
import { createOpenAPI } from './nest/openapi'

let lambdaProxyServer: Server

export async function handler(event: any, context: Context) {
  if (!lambdaProxyServer) {
    const app = await NestFactory.create(AppModule)
    app.setGlobalPrefix(GLOBAL_PREFIX)
    SwaggerModule.setup('docs', app, createOpenAPI(app), {
      useGlobalPrefix: true,
    })
    await app.init()
    lambdaProxyServer = serverlessExpress.createServer(
      app.getHttpServer().getInstance(),
    )
  }
  console.log({ event, context })
  serverlessExpress.proxy(lambdaProxyServer, event, context)
}
