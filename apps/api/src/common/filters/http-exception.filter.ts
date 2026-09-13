import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common"
import type { Request, Response } from "express"

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    const isHttpException = exception instanceof HttpException
    const statusCode = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR

    const exceptionResponse = isHttpException ? exception.getResponse() : null
    const message =
      typeof exceptionResponse === "string"
        ? exceptionResponse
        : ((exceptionResponse as { message?: string | string[] } | null)
            ?.message ?? "Internal server error")

    if (!isHttpException) {
      this.logger.error(
        exception instanceof Error ? exception.stack : exception
      )
    }

    response.status(statusCode).json({
      statusCode,
      message,
      error: HttpStatus[statusCode] ?? "Error",
      path: request.url,
      timestamp: new Date().toISOString(),
    })
  }
}
