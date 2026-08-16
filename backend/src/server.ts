import express from "express";
import { createServer } from "node:http";
import morgan from "morgan";

import config from "./config/config.js";
import authRouter from "./routes/auth.route.js";

const app = express();
const server = createServer(app);

const PORT = config.PORT;

app.use(express.json());
app.use(morgan("dev"));

app.use("/api/auth", authRouter);

app.get("/", (req, res) => {
    res.send("Server Running");
});

server.listen(PORT, () => {
    console.log(`Backend server listening on port: ${PORT}`);
});
