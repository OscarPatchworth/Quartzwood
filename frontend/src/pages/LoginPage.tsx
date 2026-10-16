import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { getErrorMessage } from '../api/getErrorMessage'

const inputClass = "w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-700/20"
const labelClass = "mb-1 block text-sm font-medium text-slate-700"

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
            <form onSubmit={submit} className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <h1 className="mb-6 text-2xl font-bold text-slate-900">Log in</h1>

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

                {errorMessage && <p role="alert" className="mt-4 text-sm text-rose-700">{errorMessage}</p>}

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="mt-6 w-full rounded-md bg-sky-800 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {isSubmitting ? "Logging in..." : "Log in"}
                </button>

                <p className="mt-4 text-center text-sm text-slate-600">
                    No account yet? <Link to="/register" className="text-sky-800 hover:underline">Register</Link>
                </p>
            </form>
        </div>
    )
}
