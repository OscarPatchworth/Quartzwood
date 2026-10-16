import { useCallback, useEffect, useState, type ReactNode } from "react"
import {
    getApiAccountMe,
    postApiAccountLogout,
    postApiAccountRegister,
    postApiAuthLogin,
    type AccountDto,
    type RegisterDto,
} from "../interfaces/generated.ts"
import { AuthContext } from "./authContext"

export function AuthProvider({ children }: { children: ReactNode }) {
    const [account, setAccount] = useState<AccountDto | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    // Asks the server who the auth cookie belongs to. 401 = not logged in
    const loadAccount = useCallback(async () => {
        try {
            const res = await getApiAccountMe()
            setAccount(res.data)
        } catch {
            setAccount(null)
        }
    }, [])

    // On app start: restore the session if the browser still has a valid cookie
    useEffect(() => {
        loadAccount().finally(() => setIsLoading(false))
    }, [loadAccount])

    async function login(email: string, password: string) {
        // useCookies: the server sets an HttpOnly cookie that the browser sends on every request
        await postApiAuthLogin({ body: { email, password }, query: { useCookies: true } })
        await loadAccount()
    }

    async function register(dto: RegisterDto) {
        await postApiAccountRegister({ body: dto })
        // Registering doesn't sign in, so log in straight away with the same details
        await login(dto.email, dto.password)
    }

    async function logout() {
        await postApiAccountLogout()
        setAccount(null)
    }

    return (
        <AuthContext.Provider value={{ account, isLoading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    )
}
