import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { getErrorMessage } from '../api/getErrorMessage'

const inputClass = "w-full rounded-md border border-input-line bg-input px-3 py-2 text-sm outline-none focus:border-accent-line focus:ring-2 focus:ring-accent-line/20"
const labelClass = "mb-1 block text-sm font-medium text-fg-muted"

export default function LoginPage() {
    const { account, login } = useAuth()
    const navigate = useNavigate()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string>()

    // Already logged in: nothing to do here
    if (account) return <Navigate to="/" replace />

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setIsSubmitting(true)
        setErrorMessage(undefined)
        try {
            await login(email.trim(), password)
            navigate("/")
        } catch (error) {
            // A failed login is a 401 with detail "Failed", so give a clearer message
            const status = (error as { status?: number } | null)?.status
            setErrorMessage(status === 401
                ? "Incorrect email or password."
                : getErrorMessage(error, "Unable to log in."))
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="flex justify-center p-8">
            <form onSubmit={submit} className="w-full max-w-sm rounded-lg border border-line bg-panel p-6 shadow-sm">
                <h1 className="mb-6 text-title text-fg-heading">Log in</h1>

                <label htmlFor="login-email" className={labelClass}>Email</label>
                <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    required
                    value={email}
                    onChange={event => setEmail(event.target.value)}
                    className={inputClass}
                />

                <label htmlFor="login-password" className={`${labelClass} mt-4`}>Password</label>
                <input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={event => setPassword(event.target.value)}
                    className={inputClass}
                />

                {errorMessage && <p role="alert" className="mt-4 text-sm text-danger">{errorMessage}</p>}

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="mt-6 w-full rounded-md bg-accent px-3 py-2 text-sm font-semibold text-on-accent hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {isSubmitting ? "Logging in..." : "Log in"}
                </button>

                <p className="mt-4 text-center text-sm text-fg-muted">
                    No account yet? <Link to="/register" className="text-link hover:underline">Register</Link>
                </p>
            </form>
        </div>
    )
}
