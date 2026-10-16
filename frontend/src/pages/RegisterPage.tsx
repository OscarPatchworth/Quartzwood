import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { getErrorMessage } from '../api/getErrorMessage'

const inputClass = "w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-700/20"
const labelClass = "mb-1 block text-sm font-medium text-slate-700"

export default function RegisterPage() {
    const { account, register } = useAuth()
    const navigate = useNavigate()
    const [displayName, setDisplayName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string>()

    if (account) return <Navigate to="/" replace />

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        // Only checked here: the server never sees the confirmation field
        if (password !== confirmPassword) {
            setErrorMessage("Passwords don't match.")
            return
        }

        setIsSubmitting(true)
        setErrorMessage(undefined)
        try {
            await register({ displayName: displayName.trim(), email: email.trim(), password })
            navigate("/")
        } catch (error) {
            setErrorMessage(getErrorMessage(error, "Unable to create your account."))
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="flex justify-center p-8">
            <form onSubmit={submit} className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <h1 className="mb-6 text-2xl font-bold text-slate-900">Create an account</h1>

                <label htmlFor="register-name" className={labelClass}>Display name</label>
                <input
                    id="register-name"
                    autoComplete="nickname"
                    autoFocus
                    required
                    value={displayName}
                    onChange={event => setDisplayName(event.target.value)}
                    className={inputClass}
                />

                <label htmlFor="register-email" className={`${labelClass} mt-4`}>Email</label>
                <input
                    id="register-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={event => setEmail(event.target.value)}
                    className={inputClass}
                />

                <label htmlFor="register-password" className={`${labelClass} mt-4`}>Password</label>
                <input
                    id="register-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={event => setPassword(event.target.value)}
                    className={inputClass}
                />
                <p className="mt-1 text-xs text-slate-500">
                    At least 6 characters, with an uppercase letter, a lowercase letter, a digit and a symbol.
                </p>

                <label htmlFor="register-confirm" className={`${labelClass} mt-4`}>Confirm password</label>
                <input
                    id="register-confirm"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={event => setConfirmPassword(event.target.value)}
                    className={inputClass}
                />

                {errorMessage && <p role="alert" className="mt-4 text-sm text-rose-700">{errorMessage}</p>}

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="mt-6 w-full rounded-md bg-sky-800 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {isSubmitting ? "Creating account..." : "Create account"}
                </button>

                <p className="mt-4 text-center text-sm text-slate-600">
                    Already have an account? <Link to="/login" className="text-sky-800 hover:underline">Log in</Link>
                </p>
            </form>
        </div>
    )
}
