import { beforeAll, afterAll, beforeEach } from "vitest";
import { prisma } from "../src/config/db.js";

beforeAll(async () => {
    await prisma.$connect();
});

beforeEach(async () => {
    await prisma.user.deleteMany();
    await prisma.profile.deleteMany();
    await prisma.session.deleteMany();
});

afterAll(async () => {
    await prisma.user.deleteMany();
    await prisma.profile.deleteMany();
    await prisma.session.deleteMany();
    await prisma.$disconnect();
});
