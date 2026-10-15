import { defineConfig } from '@hey-api/openapi-ts'

export default defineConfig({
    input: 'http://localhost:5163/openapi/v1.json',
    output: 'src/interfaces/generated.ts',
    plugins: [
        '@hey-api/typescript',
        '@hey-api/sdk',
        {
            name: '@hey-api/client-fetch',
            // Relative URLs so requests go through the Vite '/api' proxy
            baseUrl: false,
            // SDK calls throw on non-2xx and resolve with non-optional `data`
            throwOnError: true,
        },
    ],
})
