# Full Stack Test Task — Summary

## Goal

Build a production-ready sign-up / sign-in auth module: React or Vue (TypeScript) front end + NestJS/MongoDB back end.

## Front End

- **Stack:** React or Vue, TypeScript required. Any UI/design libs allowed.
- **Sign Up page:**
  - Email (valid format)
  - Name (min 3 chars)
  - Password (min 8 chars, ≥1 letter, ≥1 number, ≥1 special char)
- **Sign In page:** Email + Password
- **App page:** "Welcome to the application." message; optional logout button

## Back End

- **Stack:** NestJS + MongoDB (any ORM/ODM allowed, e.g. Mongoose)
- Endpoints for sign up and sign in, enforcing the same field validation as the front end
- At least **one protected endpoint** (auth-guarded, e.g. via JWT)
- **README.md** with setup/run instructions

## Deliverables

1. Public GitHub repo with full code
2. `README.md` — how to run the project
3. `AI.md` — **required**, must cover:
   - Which parts were AI-assisted
   - Effective prompts/approaches used
   - What had to be corrected or reworked
4. Repo link sent to recruiter

## Scoring Criteria

1. Functionality — meets stated requirements
2. Production-readiness — secure, maintainable
3. Code quality — clean, modular, readable
4. Delivery speed — expected to take a few hours, not days
5. Bonus points — logging, error handling, tests, CI/CD, API docs (e.g. Swagger)

## AI Usage Policy

- AI assistance is expected, not just allowed.
- Evaluated on judgment: what you generate vs. adapt vs. do manually.
- `AI.md` should be a real reflection — good prompts, what broke, what you changed from AI's suggestion — not just a disclosure checkbox.
