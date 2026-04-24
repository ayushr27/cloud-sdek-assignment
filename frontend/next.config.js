/** @type {import('next').NextConfig} */
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env');
const envConfig = fs.existsSync(envPath) ? dotenv.parse(fs.readFileSync(envPath)) : {};

// Only expose NEXT_PUBLIC_ variables to the browser
const nextPublicEnv = Object.keys(envConfig)
  .filter((key) => key.startsWith('NEXT_PUBLIC_'))
  .reduce((acc, key) => {
    acc[key] = envConfig[key];
    return acc;
  }, {});

const nextConfig = {
  env: nextPublicEnv,
  reactStrictMode: true,
};

module.exports = nextConfig;
