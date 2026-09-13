import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { HydratedDocument, Schema as MongooseSchema, Types } from "mongoose"

import { User } from "../../users/schemas/user.schema.js"

export type RefreshTokenDocument = HydratedDocument<RefreshToken>

@Schema({ timestamps: true, collection: "refreshTokens" })
export class RefreshToken {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: User.name,
    required: true,
    index: true,
  })
  userId!: Types.ObjectId

  // SHA-256 of the issued JWT — the raw token is only ever held by the client.
  @Prop({ required: true, unique: true })
  tokenHash!: string

  // Mirrors the JWT's own `exp`; `expires: 0` makes Mongo purge the row once
  // the token is dead anyway.
  @Prop({ type: Date, required: true, expires: 0 })
  expiresAt!: Date

  @Prop({ type: Date, default: null })
  revokedAt!: Date | null
}

export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken)
