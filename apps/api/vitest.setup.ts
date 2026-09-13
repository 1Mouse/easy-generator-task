// Unit tests may transitively import modules that read `env.validation.ts`
// (e.g. MailService reads SMTP_HOST at import time) even when the class
// under test is mocked via DI — give the two required-with-no-default vars a
// safe placeholder so unit tests stay hermetic. Integration/e2e tests set
// their own real values before dynamically importing AppModule, so this
// never overrides anything meaningful there.
process.env.MONGODB_URI ??= "mongodb://localhost:27017/test"
process.env.JWT_ACCESS_SECRET ??= "test-access-secret"
process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret"

import "reflect-metadata"
