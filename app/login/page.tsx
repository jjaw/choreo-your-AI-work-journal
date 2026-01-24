"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleAuth = async (mode: "signin" | "signup") => {
    setIsLoading(true)
    setError(null)
    setMessage(null)
    try {
      if (!email || !password) {
        throw new Error("Please enter an email and password.")
      }

      if (mode === "signin") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (signInError) throw signInError
        router.push("/")
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        })
        if (signUpError) throw signUpError
        setMessage("Account created. Check your email to confirm, then sign in.")
      }
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Authentication failed.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    setError(null)
    setMessage(null)
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      })
      if (oauthError) throw oauthError
    } catch (oauthError) {
      setError(oauthError instanceof Error ? oauthError.message : "Google sign-in failed.")
      setIsLoading(false)
    }
  }

  return (
    <main className="page-layout">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-slate-900">Welcome back</h1>
          <p className="text-sm text-slate-600">Sign in to unlock daily reflections and insights.</p>
        </div>

        <Card className="card-base">
          <CardHeader>
            <CardTitle className="text-lg text-slate-900">Sign in or create an account</CardTitle>
            <CardDescription className="text-slate-600">
              Guest mode is limited to one 45-second recording.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {message && <p className="text-sm text-green-600">{message}</p>}

            <div className="flex flex-col gap-3">
              <Button
                className="bg-brand-600 hover:bg-brand-700 text-white"
                disabled={isLoading}
                onClick={() => handleAuth("signin")}
              >
                {isLoading ? "Signing in..." : "Sign in"}
              </Button>
              <button
                className="gsi-material-button"
                disabled={isLoading}
                onClick={handleGoogleSignIn}
                type="button"
              >
                <div className="gsi-material-button-state" />
                <div className="gsi-material-button-content-wrapper">
                  <div className="gsi-material-button-icon">
                    <svg
                      version="1.1"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 48 48"
                      xmlnsXlink="http://www.w3.org/1999/xlink"
                      style={{ display: "block" }}
                    >
                      <path
                        fill="#EA4335"
                        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                      />
                      <path
                        fill="#4285F4"
                        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                      />
                      <path
                        fill="#34A853"
                        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                      />
                      <path fill="none" d="M0 0h48v48H0z" />
                    </svg>
                  </div>
                  <span className="gsi-material-button-contents">Continue with Google</span>
                  <span style={{ display: "none" }}>Continue with Google</span>
                </div>
              </button>
              <Button
                variant="outline"
                disabled={isLoading}
                className="border-slate-300 text-slate-700 hover:bg-slate-50"
                onClick={() => handleAuth("signup")}
              >
                Create account
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-xs text-slate-500">
          <Link href="/" className="hover:text-slate-700">
            Back to guest mode
          </Link>
        </div>
      </div>
    </main>
  )
}
