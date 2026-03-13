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
};

export default nextConfig;
