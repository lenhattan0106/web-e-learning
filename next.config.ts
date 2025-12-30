import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
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
      }
    ]
  }
};

export default nextConfig;
