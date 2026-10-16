import { createContext } from "react"
import type { AccountDto, RegisterDto } from "../interfaces/generated.ts"

export interface AuthContextValue {
    // null = not logged in
    account: AccountDto | null
    // true until the initial "who am I?" check finishes
    isLoading: boolean
    login: (email: string, password: string) => Promise<void>
    register: (dto: RegisterDto) => Promise<void>
    logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
