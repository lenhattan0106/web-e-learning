import type { NextConfig } from "next";

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
  }
};

export default nextConfig;
