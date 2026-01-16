import type { NextConfig } from "next";
//@ts-ignore
import { PrismaPlugin } from '@prisma/nextjs-monorepo-workaround-plugin';
const nextConfig: NextConfig = {
  images:{
    remotePatterns: [
      {
        hostname:'nt-e-learning.t3.storage.dev',
        port:"",
        protocol:'https'  
      },
      {
        hostname:'avatars.githubusercontent.com',
        port:"",
        protocol:'https'  
      },
      {
        hostname:'avatar.vercel.sh',
        port:"",
        protocol:'https'  
      },
      {
        hostname:'lh3.googleusercontent.com',
        port:"",
        protocol:'https'
      }
    ]
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.plugins = [...config.plugins, new PrismaPlugin()]
    }

    return config
  },
  turbopack: {},
};

export default nextConfig;
