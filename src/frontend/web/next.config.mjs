import dotenv from "dotenv";
dotenv.config({ path: "../../.env" });

const nextConfig = {
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.API_BASE_URL,
  },
};

export default nextConfig;
