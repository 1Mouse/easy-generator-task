import { Injectable, UnauthorizedException } from "@nestjs/common"
import { InjectModel } from "@nestjs/mongoose"
import { Model } from "mongoose"

import { env } from "../config/env.validation.js"
import { MailService } from "../mail/mail.service.js"
import {
  EmailVerificationToken,
  EmailVerificationTokenDocument,
} from "./schemas/email-verification-token.schema.js"
import { generateOpaqueToken, hashToken } from "./token.util.js"

export interface VerifiableUser {
  id: string
  email: string
}

@Injectable()
export class EmailVerificationService {
  constructor(
    @InjectModel(EmailVerificationToken.name)
    private readonly tokenModel: Model<EmailVerificationTokenDocument>,
    private readonly mailService: MailService
  ) {}

  async createAndSendToken(user: VerifiableUser): Promise<void> {
    const rawToken = generateOpaqueToken()
    const tokenHash = hashToken(rawToken)

    await this.tokenModel.create({
      userId: user.id,
      tokenHash,
      expiresAt: new Date(
        Date.now() + env.EMAIL_VERIFICATION_EXPIRES_IN_SECONDS * 1000
      ),
    })

    const verificationUrl = new URL(env.EMAIL_VERIFICATION_URL)
    verificationUrl.searchParams.set("token", rawToken)

    await this.mailService.sendMail({
      to: user.email,
      subject: "Verify your email",
      text: `Verify your email by opening this link: ${verificationUrl.toString()}`,
      html: `<p>Verify your email by opening this link:</p><p><a href="${verificationUrl.toString()}">${verificationUrl.toString()}</a></p>`,
    })
  }

  async consumeToken(rawToken: string): Promise<{ userId: string }> {
    const tokenHash = hashToken(rawToken)
    const doc = await this.tokenModel
      .findOne({ tokenHash, usedAt: null, expiresAt: { $gt: new Date() } })
      .exec()

    if (!doc) {
      throw new UnauthorizedException({
        message: "Invalid or expired verification token",
        code: "INVALID_EMAIL_VERIFICATION_TOKEN",
      })
    }

    doc.usedAt = new Date()
    await doc.save()

    return { userId: doc.userId.toString() }
  }
}
