import express from "express";
import morgan from "morgan";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRouter from "./routes/auth.route.js";
import authenticate from "./middlewares/authenticate.js";
import errorHandler from "./middlewares/errorHandler.js";

const app = express();

app.use(
    cors({
        origin: "http://localhost:3000",
        credentials: true,
    }),
);
app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));

app.use("/api/auth", authRouter);

app.get("/", authenticate, (req, res) => {
    res.status(200).json({
        message: "Authenticated",
    });
});

app.use(errorHandler);

export { app };
