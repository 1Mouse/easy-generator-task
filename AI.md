# How I used AI on this

Hey there so this is the key prompts that I used

before anything I went and installed 5 critical skills from skills.sh in order to improve code quality. mostly are next, nestjs, mongo related.

## 1. Scaffolding the backend

First I used this to scafold the backend api in this monorepo. As I made use of an old design system that I already had built so I would easily adapt the frontend to the backend api. and the plan was diveded into phases

> in current directory I want to use the current web app and the ui lib but add a nestjs backend inside apps explore and figure out how to kick this off and how to test it and do the requirement in task.md I want the authntication, autherization and to serve data in the table from a protected mongodb backend and I want a non protected endpoint too . how to do this in turborepo and how to use nestcli

## 2. Correcting the auth implementation

then claude didn't do the auth with refresh token and email verification from the first try so I corrected him

> why does teh sign in and verify email only return accessToken where the fuck is refreshToken and the user object should be there too so that I save this name and show it in ui and also the verify email will be used to start session in the frontend by saving access and refresh. let's do this refresh token implementation and add an endpoint to refresh the token that also returns ne access and refresh also use nestjs modules for jwt ..etc https://docs.nestjs.com/security/authentication#jwt-token and the guide here https://njihiamark.medium.com/mastering-jwt-authentication-with-refresh-tokens-in-nestjs-react-google-email-auth-e4f1e8c8c21e

also I took control by outputing diagrams and descisions in the `./specs/auth` directory using `.puml`

## 3. Email verification + containerizing

I used podman to containerize the app by pointing claude to an old file that I have

> hey buddy let's add an email verification flow after the signup as the acount shouldn't be active directly after signup and dockerize the backend by using podman here is a sample containerfiles and I want to use mongo 8 and mailpit to send the email file:///home/mouse/projects/ecommerce/compose.yaml file:///home/mouse/projects/ecommerce/Containerfile

## 4. Manual testing docs

I generated docs for manual testing by using bruno

> adapt the bruno config and env to have base url and token as variables or in a collection var whatever works best

## 5. The frontend

I then build the frontend in one shot using this prompt

> hey buddy I want to do the frontend for the signup, log in, log out, and the token rotation for the refresh token using nextjs tanstack query and do the email verification n a server component and handle errors and 404 and 401 and 403 espicially at teh verify email page edge cases
>
> also I want the forms in login and sign up to use tanstack form in a nice composoble approach with a zod schema for validation and error msg appear under each field or in a toast in case it's a server error and not tied to a field
>
> keep it modular and follow an architecture and extract reusable compoents and build nice abstractions

## 6. Testing it in a real browser

last step I made claude actually test the whole thing in a browser instead of just trusting that it works

> use dev-browser skill instead of claude in chrome

so it walked the full flow itself: sign up, grab the link from mailpit, verify, land on the orders table, then the edge cases like a dead access cookie rotating silently, logging out, and the expired / already used / malformed verify-email links.
