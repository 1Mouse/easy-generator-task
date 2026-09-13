import { Injectable } from "@nestjs/common"
import { InjectModel } from "@nestjs/mongoose"
import { Model } from "mongoose"

import { User, UserDocument } from "./schemas/user.schema.js"

export interface CreateUserInput {
  email: string
  name: string
  passwordHash: string
}

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>
  ) {}

  findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase().trim() }).exec()
  }

  findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec()
  }

  create(input: CreateUserInput): Promise<UserDocument> {
    return this.userModel.create(input)
  }
}
