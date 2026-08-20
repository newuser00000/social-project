import request from "supertest";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import config from "../../src/config/config.js";
import { describe, expect, it } from "vitest";
import { app } from "../../src/app.js";
import { prisma } from "../../src/config/db.js";

describe.skip("LOGIN - VALIDATION", () => {
    it("should not login a user with missing credentials", async () => {
        const response = await request(app).post("/api/auth/login").send({});

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("Validation failed");

        expect(response.body.errors.email).toBe("Email is required");
        expect(response.body.errors.password).toBe("Password is required");

        expect(response.body.accessToken).toBeUndefined();

        const cookies = response.headers["set-cookie"];

        expect(cookies).toBeUndefined();

        const sessions = await prisma.session.findMany();

        expect(sessions).toHaveLength(0);
    });

    it("should not login user with fields below minimum length", async () => {
        const response = await request(app).post("/api/auth/login").send({
            email: "test",
            password: "test",
        });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("Validation failed");

        expect(response.body.errors.email).toBe("Invalid email address");
        expect(response.body.errors.password).toBe(
            "Password must be at least 8 characters",
        );

        expect(response.body.accessToken).toBeUndefined();

        const cookies = response.headers["set-cookie"];

        expect(cookies).toBeUndefined();

        const sessions = await prisma.session.findMany();

        expect(sessions).toHaveLength(0);
    });

    it("should not login user with fields above maximum length", async () => {
        const response = await request(app)
            .post("/api/auth/login")
            .send({
                email: "test",
                password: "a".repeat(129),
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("Validation failed");

        expect(response.body.errors.email).toBe("Invalid email address");
        expect(response.body.errors.password).toBe(
            "Password must be at most 128 characters",
        );

        expect(response.body.accessToken).toBeUndefined();

        const cookies = response.headers["set-cookie"];

        expect(cookies).toBeUndefined();

        const sessions = await prisma.session.findMany();

        expect(sessions).toHaveLength(0);
    });

    it("should not login user with fields of invalid data types", async () => {
        const response = await request(app).post("/api/auth/login").send({
            email: 123,
            password: true,
        });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("Validation failed");

        expect(response.body.errors.email).toBe("Email must be a string");
        expect(response.body.errors.password).toBe("Password must be a string");

        expect(response.body.accessToken).toBeUndefined();

        const cookies = response.headers["set-cookie"];

        expect(cookies).toBeUndefined();

        const sessions = await prisma.session.findMany();

        expect(sessions).toHaveLength(0);
    });
});

describe.skip("LOGIN - FAILURE CASES", () => {
    it("should not login a user with non-existent email", async () => {
        const response = await request(app).post("/api/auth/login").send({
            email: "test@test.com",
            password: "test123456",
        });

        expect(response.status).toBe(401);
        expect(response.body).toEqual({
            message: "Invalid email or password",
        });

        expect(response.body.accessToken).toBeUndefined();

        const cookies = response.headers["set-cookie"];

        expect(cookies).toBeUndefined();

        const sessions = await prisma.session.findMany();

        expect(sessions).toHaveLength(0);
    });

    it("should not login a user with wrong password", async () => {
        const registerResponse = await request(app)
            .post("/api/auth/register")
            .send({
                email: "test@test.com",
                username: "testuser",
                password: "test123456",
            });

        expect(registerResponse.status).toBe(201);

        const sessionsBeforeLogin = await prisma.session.count();

        const loginResponse = await request(app).post("/api/auth/login").send({
            email: "test@test.com",
            password: "wrongpassword",
        });

        const sessionsAfterLogin = await prisma.session.count();

        expect(loginResponse.status).toBe(401);
        expect(loginResponse.body).toEqual({
            message: "Invalid email or password",
        });

        expect(loginResponse.body.accessToken).toBeUndefined();

        const cookies = loginResponse.headers["set-cookie"];

        expect(cookies).toBeUndefined();

        const sessions = await prisma.session.findMany();

        expect(sessionsAfterLogin).toBe(sessionsBeforeLogin);
    });
});

describe.skip("LOGIN - SUCCESS CASES", () => {
    it("should successfully login a user", async () => {
        const registerResponse = await request(app)
            .post("/api/auth/register")
            .send({
                email: "test@test.com",
                username: "testuser",
                password: "test123456",
            });

        expect(registerResponse.status).toBe(201);

        const user = await prisma.user.findUnique({
            where: {
                email: "test@test.com",
            },
        });

        const sessionsBeforeLogin = await prisma.session.count();

        const loginResponse = await request(app).post("/api/auth/login").send({
            email: "test@test.com",
            password: "test123456",
        });

        const sessionsAfterLogin = await prisma.session.count();

        expect(loginResponse.status).toBe(200);
        expect(loginResponse.body.message).toBe("User Logged in successfully");
        expect(loginResponse.body.user).toEqual({
            username: "testuser",
            email: "test@test.com",
        });
        expect(loginResponse.body.accessToken).toBeDefined();

        const cookies = loginResponse.headers["set-cookie"];

        expect(cookies).toBeDefined();

        if (!cookies) {
            throw new Error("Expected refreshToken cookie");
        }

        expect(cookies).toHaveLength(1);

        expect(cookies[0]).toContain("refreshToken=");
        expect(cookies[0]).toContain("HttpOnly");
        expect(cookies[0]).toContain("SameSite=Strict");

        const refreshToken = cookies[0]?.split(";")[0]?.split("=")[1];

        if (!refreshToken) {
            throw new Error("Refresh token not found in cookie");
        }

        const refreshTokenHash = crypto
            .createHash("sha256")
            .update(refreshToken)
            .digest("hex");

        const sessions = await prisma.session.findMany();

        expect(sessionsAfterLogin).toBe(sessionsBeforeLogin + 1);

        const loginSession = sessions.find(
            (session) => session.tokenHash === refreshTokenHash,
        );

        expect(loginSession).toBeDefined();
        expect(loginSession?.userId).toBe(user?.id);
        expect(loginSession?.tokenHash).toBe(refreshTokenHash);
        expect(loginSession?.revoked).toBe(false);

        const accessTokenPayload = jwt.verify(
            loginResponse.body.accessToken,
            config.JWT_SECRET,
        );

        expect(accessTokenPayload).toMatchObject({
            userId: user?.id,
            sessionId: loginSession?.id,
        });
    });
});
