"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useToast } from "@workspace/ui/components/toast"

import { errorMessage } from "@/lib/api-error"

import * as authApi from "../client/auth-api"
import { AFTER_LOGIN_ROUTE, AUTH_ROUTES } from "../constants"
import { sessionQueryKey } from "./use-session"

/**
 * Server-side failures that aren't tied to a single field (bad credentials,
 * unverified account, API down) surface as a toast. Field-level problems are
 * caught by the zod schema before the request is ever made.
 */
function useErrorToast() {
  const toast = useToast()

  return (error: unknown) =>
    toast.add({
      type: "error",
      title: "Something went wrong",
      description: errorMessage(error),
    })
}

export function useLogin(redirectTo: string = AFTER_LOGIN_ROUTE) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const onError = useErrorToast()

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: sessionQueryKey })
      router.replace(redirectTo)
      // The destination is a server component reading the fresh cookie, so the
      // cached RSC payload has to go too.
      router.refresh()
    },
    onError,
  })
}

export function useSignup() {
  const onError = useErrorToast()
  const toast = useToast()

  return useMutation({
    mutationFn: authApi.signup,
    onSuccess: (data) => {
      toast.add({
        type: "success",
        title: "Check your inbox",
        description: data.message,
      })
    },
    onError,
  })
}

export function useLogout() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const onError = useErrorToast()

  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: async () => {
      queryClient.setQueryData(sessionQueryKey, null)
      await queryClient.invalidateQueries({ queryKey: sessionQueryKey })
      router.replace(AUTH_ROUTES.login)
      router.refresh()
    },
    onError,
  })
}

export function useResendVerification() {
  const toast = useToast()
  const onError = useErrorToast()

  return useMutation({
    mutationFn: authApi.resendVerification,
    onSuccess: (data) => {
      toast.add({
        type: "success",
        title: "Verification email sent",
        description: data.message,
      })
    },
    onError,
  })
}
