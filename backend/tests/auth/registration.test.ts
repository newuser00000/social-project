import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../../src/app.js";
import { prisma } from "../../src/config/db.js";

describe.skip("REGISTRATION - VALIDATION", () => {
    it("should not register user with missing required fields", async () => {
        const response = await request(app).post("/api/auth/register").send({});

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("Validation failed");

        expect(response.body.errors.email).toBe("Email is required");
        expect(response.body.errors.username).toBe("Username is required");
        expect(response.body.errors.password).toBe("Password is required");

        const users = await prisma.user.findMany();
        expect(users).toHaveLength(0);
    });

    it("should not register user with fields below minimum length", async () => {
        const response = await request(app).post("/api/auth/register").send({
            email: "testuser",
            username: "te",
            password: "test",
        });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("Validation failed");

        expect(response.body.errors.email).toBe("Invalid email address");
        expect(response.body.errors.username).toBe(
            "Username must be at least 3 characters",
        );
        expect(response.body.errors.password).toBe(
            "Password must be at least 8 characters",
        );

        const users = await prisma.user.findMany();
        expect(users).toHaveLength(0);
    });

    it("should not register user with fields above maximum length", async () => {
        const longUsername = "a".repeat(31);
        const longPassword = "a".repeat(129);

        const response = await request(app).post("/api/auth/register").send({
            email: "testuser",
            username: longUsername,
            password: longPassword,
        });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("Validation failed");

        expect(response.body.errors.email).toBe("Invalid email address");
        expect(response.body.errors.username).toBe(
            "Username must be at most 30 characters",
        );
        expect(response.body.errors.password).toBe(
            "Password must be at most 128 characters",
        );

        const users = await prisma.user.findMany();
        expect(users).toHaveLength(0);
    });

    it("should not register user with fields of invalid data types", async () => {
        const response = await request(app).post("/api/auth/register").send({
            email: 123,
            username: false,
            password: 1234567890,
        });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("Validation failed");

        expect(response.body.errors.email).toBe("Email must be a string");
        expect(response.body.errors.username).toBe("Username must be a string");
        expect(response.body.errors.password).toBe("Password must be a string");

        const users = await prisma.user.findMany();
        expect(users).toHaveLength(0);
    });
});

describe.skip("REGISTRATION - SUCCESS CASES", () => {
    it("should successfully registe a user", async () => {
        const response = await request(app).post("/api/auth/register").send({
            email: "test@test.com",
            username: "testuser",
            password: "test123456",
        });

        expect(response.status).toBe(201);

        expect(response.body.message).toBe("User registered successfully");
        expect(response.body.user).toEqual({
            username: "testuser",
            email: "test@test.com",
        });
        expect(response.body.accessToken).toBeDefined();

        // cookie test
        const cookies = response.headers["set-cookie"];

        expect(cookies).toBeDefined();

        if (!cookies) {
            throw new Error("Expected refreshToken cookie");
        }

        expect(cookies).toHaveLength(1);

        expect(cookies[0]).toContain("refreshToken=");
        expect(cookies[0]).toContain("HttpOnly");
        expect(cookies[0]).toContain("SameSite=Strict");

        // database test
        const user = await prisma.user.findUnique({
            where: {
                email: "test@test.com",
            },
            include: {
                profile: true,
                sessions: true,
            },
        });

        expect(user).not.toBeNull();
        expect(user?.username).toBe("testuser");

        //password
        expect(user?.passwordHash).not.toBe("test123456");
        expect(user?.passwordHash).toBeDefined();

        //profile was created
        expect(user?.profile).not.toBeNull();
        expect(user?.profile?.displayName).toBe("testuser");

        //session was created
        expect(user?.sessions).toHaveLength(1);
        expect(user?.sessions[0]?.revoked).toBe(false);
    });
});

describe.skip("REGISTRATION - FAILURE CASES", () => {
    it("should not register a user with already registered email", async () => {
        const responseOne = await request(app).post("/api/auth/register").send({
            email: "test@test.com",
            username: "testuser",
            password: "test123456",
        });

        expect(responseOne.status).toBe(201);

        const responseTwo = await request(app).post("/api/auth/register").send({
            email: "test@test.com",
            username: "testuser2",
            password: "test123456",
        });

        expect(responseTwo.status).toBe(409);
        expect(responseTwo.body).toEqual({
            message: "Email already exists",
        });

        const users = await prisma.user.findMany();
        expect(users).toHaveLength(1);
    });

    it("should not register a user with already registered username", async () => {
        const responseOne = await request(app).post("/api/auth/register").send({
            email: "test@test.com",
            username: "testuser",
            password: "test123456",
        });

        expect(responseOne.status).toBe(201);

        const responseTwo = await request(app).post("/api/auth/register").send({
            email: "test@test2.com",
            username: "testuser",
            password: "test123456",
        });

        expect(responseTwo.status).toBe(409);
        expect(responseTwo.body).toEqual({
            message: "Username already exists",
        });

        const users = await prisma.user.findMany();
        expect(users).toHaveLength(1);
    });
});
