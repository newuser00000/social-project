import { Router } from "express";
import * as userController from "../controllers/user.controller.js";
import { validate } from "../middlewares/validate.js";
import { patchMeSchema } from "../schemas/user.schema.js";

const userRouter = Router();

userRouter.get("/me", userController.getMe);

userRouter.patch("/me", validate(patchMeSchema), userController.patchMe);

export default userRouter;
