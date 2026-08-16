import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../../src/app.js";

describe("Authentication", () => {
    it("should reject an unauthenticated request", async () => {
        const response = await request(app).get("/");

        expect(response.status).toBe(401);
        expect(response.body).toEqual({
            message: "Unauthorized",
        });
    });
});
