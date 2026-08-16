import dotenv from "dotenv";

dotenv.config();

if (!process.env.PORT) {
    throw new Error("PORT is not initialized in environment variables");
}

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not initialized in environment variables");
}

if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not initialized in environment variables");
}

const config = {
    PORT: process.env.PORT,
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET,
};

export default config;
