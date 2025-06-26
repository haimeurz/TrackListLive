/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config, { isServer }) => {
        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                net: false,
                dns: false,
                tls: false,
                fs: false,
                'supports-color': false
            }
        }
        return config
    },
    experimental: {
        proxyTimeout: 120000,
        serverComponentsExternalPackages: ['socket.io', 'socket.io-client'],
    },
    async rewrites() {
        return [
            {
                source: '/socket.io',
                destination: 'http://127.0.0.1:3002/socket.io/',
                basePath: false
            }
        ]
    },
    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff',
                    },
                    {
                        key: 'X-Frame-Options',
                        value: 'SAMEORIGIN',
                    },
                    {
                        key: 'X-XSS-Protection',
                        value: '1; mode=block',
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin',
                    },
                ],
            },
        ]
    }
}

module.exports = nextConfig
