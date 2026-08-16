import dotenv from "dotenv";

dotenv.config();

if (!process.env.PORT) {
    throw new Error("PORT is not initialized in environment variables");
}

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not initialized in environment variables");
}

const config = {
    PORT: process.env.PORT,
    DATABASE_URL: process.env.DATABASE_URL,
};

export default config;
