/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      'pdf-parse',
      '@prisma/client',
      '@prisma/adapter-libsql',
      '@libsql/client',
      'bcryptjs',
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
        '@libsql/client',
        '@prisma/adapter-libsql',
        '@prisma/client',
        'bcryptjs',
      ]
    }
    return config
  },
};

export default nextConfig;
