import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { HydratedDocument, Schema as MongooseSchema, Types } from "mongoose"

import { User } from "../../users/schemas/user.schema.js"

export type EmailVerificationTokenDocument =
  HydratedDocument<EmailVerificationToken>

@Schema({ timestamps: true, collection: "emailVerificationTokens" })
export class EmailVerificationToken {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: User.name,
    required: true,
    index: true,
  })
  userId!: Types.ObjectId

  @Prop({ required: true, unique: true })
  tokenHash!: string

  // `expires: 0` on an absolute timestamp creates a Mongo TTL index that
  // expires the document exactly at `expiresAt` (not `expiresAt + N seconds`).
  @Prop({ type: Date, required: true, expires: 0 })
  expiresAt!: Date

  @Prop({ type: Date, default: null })
  usedAt!: Date | null
}

export const EmailVerificationTokenSchema = SchemaFactory.createForClass(
  EmailVerificationToken
)
