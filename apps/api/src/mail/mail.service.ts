import { Injectable } from "@nestjs/common"
import nodemailer from "nodemailer"

import { env } from "../config/env.validation.js"

export interface SendMailInput {
  to: string
  subject: string
  text: string
  html?: string
}

@Injectable()
export class MailService {
  private readonly transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: false,
  })

  async sendMail(input: SendMailInput): Promise<void> {
    await this.transporter.sendMail({ from: env.SMTP_FROM, ...input })
  }
}
