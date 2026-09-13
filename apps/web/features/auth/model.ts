export interface SessionUser {
  id: string
  email: string
  name: string
}

/** Shape returned by the API's signin / verify-email / refresh endpoints. */
export interface AuthSession {
  user: SessionUser
  accessToken: string
  refreshToken: string
}

export interface SignUpResult {
  user: SessionUser
  message: string
}
