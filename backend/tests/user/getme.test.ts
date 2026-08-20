import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

describe("GET ME", () => {
    it("should get the profile of the user", async () => {
        const registerResponse = await request(app)
            .post("/api/auth/register")
            .send({
                email: "test@test.com",
                username: "testuser",
                password: "test123456",
            });

        expect(registerResponse.status).toBe(201);

        const accessToken = registerResponse.body.accessToken;

        const response = await request(app)
            .get("/api/users/me")
            .set("Authorization", `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body.user).toBeDefined();

        expect(response.body.user.username).toBe("testuser");
        expect(response.body.user.email).toBe("test@test.com");

        expect(response.body.user.profile).toBeDefined();

        expect(response.body.user.profile).toEqual({
            displayName: "testuser",
            bio: null,
            avatarUrl: null,
            course: null,
            department: null,
            year: null,
            graduationYear: null,
        });

        expect(response.body.user.passwordHash).toBeUndefined();
    });
});
