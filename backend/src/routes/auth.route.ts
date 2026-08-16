import { Router } from "express";

const authRouter = Router();

authRouter.get("/register", (req, res) => {
    res.send("Register page");
});

export default authRouter;
