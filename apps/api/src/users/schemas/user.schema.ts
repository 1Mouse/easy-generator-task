import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { HydratedDocument } from "mongoose"

export type UserDocument = HydratedDocument<User>

@Schema({ timestamps: true, collection: "users" })
export class User {
  @Prop({
    required: true,
    unique: true,
    index: true,
    lowercase: true,
    trim: true,
  })
  email!: string

  @Prop({ required: true, trim: true })
  name!: string

  @Prop({ required: true })
  passwordHash!: string

  // null = not verified; a Date = verified at that time.
  @Prop({ type: Date, default: null })
  emailVerifiedAt!: Date | null
}

export const UserSchema = SchemaFactory.createForClass(User)
