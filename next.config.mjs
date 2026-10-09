/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  distDir: process.env.LABCONTROL_NEXT_DIST_DIR || '.next',
  allowedDevOrigins: [
    '192.168.40.75',
    '192.168.40.75:3000',
    'localhost',
    'localhost:3000',
    '127.0.0.1',
    '127.0.0.1:3000',
    'miyya.uz',
    'www.miyya.uz',
  ],
  // Avoid generating framework-owned assistant instruction files into the project root.
  agentRules: false,
  serverExternalPackages: ['pdf-parse', 'adm-zip', 'edge-tts-universal', 'ws'],
  // Local database, sessions and uploads are mutable private runtime data, never build artifacts.
  outputFileTracingExcludes: {
    '/*': ['./data/**/*'],
  },
};

export default nextConfig;
