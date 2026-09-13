import { Test } from "@nestjs/testing"
import { MongooseModule } from "@nestjs/mongoose"
import { MongoMemoryServer } from "mongodb-memory-server"
import mongoose from "mongoose"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { UsersModule } from "./users.module.js"
import { UsersService } from "./users.service.js"

describe("UsersService (integration)", () => {
  let mongod: MongoMemoryServer
  let usersService: UsersService

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create()

    const module = await Test.createTestingModule({
      imports: [MongooseModule.forRoot(mongod.getUri()), UsersModule],
    }).compile()

    usersService = module.get(UsersService)
  })

  afterAll(async () => {
    await mongoose.disconnect()
    await mongod.stop()
  })

  it("creates a user and finds it by email", async () => {
    const created = await usersService.create({
      email: "Jane@Example.com",
      name: "Jane Doe",
      passwordHash: "hashed",
    })
    expect(created.email).toBe("jane@example.com") // lowercased by the schema
    expect(created.emailVerifiedAt).toBeNull()

    const found = await usersService.findByEmail("jane@example.com")
    expect(found?.name).toBe("Jane Doe")
  })

  it("returns null for an email that does not exist", async () => {
    const found = await usersService.findByEmail("nobody@example.com")
    expect(found).toBeNull()
  })

  it("finds a user by id", async () => {
    const created = await usersService.create({
      email: "bob@example.com",
      name: "Bob",
      passwordHash: "hashed",
    })

    const found = await usersService.findById(created.id as string)
    expect(found?.email).toBe("bob@example.com")
  })

  it("marks a user's email as verified", async () => {
    const created = await usersService.create({
      email: "carol@example.com",
      name: "Carol",
      passwordHash: "hashed",
    })
    expect(created.emailVerifiedAt).toBeNull()

    const verified = await usersService.markEmailVerified(created.id as string)

    expect(verified?.emailVerifiedAt).toBeInstanceOf(Date)
  })
})
