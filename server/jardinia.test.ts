import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

vi.mock("stripe", () => ({
  default: vi.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        retrieve: vi.fn().mockResolvedValue({
          payment_status: "paid",
          metadata: { credits: "1", pack: "single", userId: "1", amountEur: "6.99" },
        }),
      },
    },
  })),
}));

vi.mock("./generationQueue", () => ({
  enqueueGeneration: vi.fn(),
  prepareProjectForGeneration: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./storage", () => ({
  storagePresignPut: vi.fn().mockResolvedValue({
    key: "projects/1/photos/test.jpg",
    uploadUrl: "https://example.com/upload",
    url: "/manus-storage/projects/1/photos/test.jpg",
  }),
}));

vi.mock("./db", () => ({
  getUserCredits: vi.fn().mockResolvedValue({ balance: 5 }),
  getUserTransactions: vi.fn().mockResolvedValue([]),
  addCredits: vi.fn().mockResolvedValue({ alreadyProcessed: false }),
  deductCredit: vi.fn().mockResolvedValue(undefined),
  refundCredit: vi.fn().mockResolvedValue({ alreadyProcessed: false }),
  getTransactionByStripeSessionId: vi.fn().mockResolvedValue(undefined),
  createProject: vi.fn().mockResolvedValue({ id: 1 }),
  getProjectsByUser: vi.fn().mockResolvedValue([]),
  getProjectById: vi.fn().mockResolvedValue(null),
  updateProjectStatus: vi.fn().mockResolvedValue(undefined),
  addProjectPhoto: vi.fn().mockResolvedValue({ id: 1 }),
  getProjectPhotos: vi.fn().mockResolvedValue([]),
  getProjectRenderings: vi.fn().mockResolvedValue([]),
  getProjectReport: vi.fn().mockResolvedValue(null),
  getAllUsers: vi.fn().mockResolvedValue([]),
  getAllProjects: vi.fn().mockResolvedValue([]),
  getAdminStats: vi.fn().mockResolvedValue({
    totalUsers: 0,
    totalProjects: 0,
    completedProjects: 0,
    totalRevenue: 0,
    monthlyRevenue: [],
  }),
  clearProjectGenerationError: vi.fn().mockResolvedValue(undefined),
  recordProjectGenerationFailure: vi.fn().mockResolvedValue(undefined),
  clearProjectOutputs: vi.fn().mockResolvedValue(undefined),
  upsertUser: vi.fn().mockResolvedValue(undefined),
  getUserByOpenId: vi.fn().mockResolvedValue(undefined),
  getUserById: vi.fn().mockResolvedValue(undefined),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createUserContext(role: "user" | "admin" = "user"): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@jardinia.io",
    name: "Test User",
    passwordHash: null,
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.STRIPE_SECRET_KEY = "sk_test_mock";
  vi.mocked(db.getUserCredits).mockResolvedValue({ balance: 5 });
  vi.mocked(db.addCredits).mockResolvedValue({ alreadyProcessed: false });
});

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect((ctx.res.clearCookie as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(COOKIE_NAME);
  });
});

describe("projects.create", () => {
  it("creates a draft project without requiring credits upfront", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.projects.create({
      title: "Jardin test",
      spaceType: "exterior",
      style: "naturel",
    });
    expect(result.id).toBe(1);
  });
});

describe("projects.getUploadUrl", () => {
  it("returns a presigned upload URL for draft projects", async () => {
    vi.mocked(db.getProjectById).mockResolvedValueOnce({
      id: 1,
      userId: 1,
      title: "Test",
      spaceType: "exterior",
      style: "naturel",
      budget: null,
      constraints: null,
      additionalNotes: null,
      status: "draft",
      generationAttempts: 0,
      lastError: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.projects.getUploadUrl({
      projectId: 1,
      fileName: "photo.jpg",
      mimeType: "image/jpeg",
    });

    expect(result.uploadUrl).toContain("https://");
    expect(result.url).toContain("/manus-storage/");
  });
});

describe("projects.generate", () => {
  it("deducts credit and enqueues generation", async () => {
    vi.mocked(db.getUserCredits).mockResolvedValue({ balance: 5 });
    vi.mocked(db.getProjectById).mockResolvedValueOnce({
      id: 1,
      userId: 1,
      title: "Test",
      spaceType: "exterior",
      style: "naturel",
      budget: null,
      constraints: null,
      additionalNotes: null,
      status: "draft",
      generationAttempts: 0,
      lastError: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(db.getProjectPhotos).mockResolvedValueOnce([
      {
        id: 1,
        projectId: 1,
        storageKey: "k",
        url: "/photo.jpg",
        originalName: "photo.jpg",
        photoOrder: 0,
        createdAt: new Date(),
      },
    ]);

    const { enqueueGeneration } = await import("./generationQueue");
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.projects.generate({ projectId: 1 });

    expect(result.success).toBe(true);
    expect(db.deductCredit).toHaveBeenCalledWith(1);
    expect(enqueueGeneration).toHaveBeenCalledWith(1, 1);
  });

  it("skips credit deduction for admin users", async () => {
    vi.mocked(db.getProjectById).mockResolvedValueOnce({
      id: 1,
      userId: 1,
      title: "Test",
      spaceType: "exterior",
      style: "naturel",
      budget: null,
      constraints: null,
      additionalNotes: null,
      status: "draft",
      generationAttempts: 0,
      lastError: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(db.getProjectPhotos).mockResolvedValueOnce([
      {
        id: 1,
        projectId: 1,
        storageKey: "k",
        url: "/photo.jpg",
        originalName: "photo.jpg",
        photoOrder: 0,
        createdAt: new Date(),
      },
    ]);

    const { enqueueGeneration } = await import("./generationQueue");
    const ctx = createUserContext("admin");
    const caller = appRouter.createCaller(ctx);
    await caller.projects.generate({ projectId: 1 });

    expect(db.deductCredit).not.toHaveBeenCalled();
    expect(enqueueGeneration).toHaveBeenCalledWith(1, 1);
  });
});

describe("projects.retry", () => {
  it("allows retry for failed projects", async () => {
    vi.mocked(db.getProjectById).mockResolvedValueOnce({
      id: 1,
      userId: 1,
      title: "Test",
      spaceType: "exterior",
      style: "naturel",
      budget: null,
      constraints: null,
      additionalNotes: null,
      status: "failed",
      generationAttempts: 3,
      lastError: "Erreur LLM",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(db.getProjectPhotos).mockResolvedValueOnce([
      {
        id: 1,
        projectId: 1,
        storageKey: "k",
        url: "/photo.jpg",
        originalName: "photo.jpg",
        photoOrder: 0,
        createdAt: new Date(),
      },
    ]);

    const { enqueueGeneration } = await import("./generationQueue");
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    await caller.projects.retry({ projectId: 1 });

    expect(db.deductCredit).toHaveBeenCalledWith(1);
    expect(enqueueGeneration).toHaveBeenCalledWith(1, 1);
  });
});

describe("payments.confirmPayment", () => {
  it("credits user account with amountEur", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    await caller.payments.confirmPayment({ sessionId: "cs_test_new" });

    expect(db.addCredits).toHaveBeenCalledWith(
      1,
      1,
      "purchase",
      expect.stringContaining("Achat"),
      "cs_test_new",
      6.99
    );
  });
});

describe("admin.stats", () => {
  it("throws FORBIDDEN for non-admin user", async () => {
    const ctx = createUserContext("user");
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.stats()).rejects.toThrow("Accès administrateur requis");
  });
});

describe("admin.grantCredits", () => {
  it("adds credits to a target user", async () => {
    vi.mocked(db.getUserById).mockResolvedValueOnce({
      id: 2,
      openId: "email:user@test.com",
      email: "user@test.com",
      name: "User",
      passwordHash: "hash",
      loginMethod: "email",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    });
    vi.mocked(db.getUserCredits).mockResolvedValueOnce({ balance: 5 });

    const ctx = createUserContext("admin");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.admin.grantCredits({ userId: 2, amount: 3 });

    expect(result.success).toBe(true);
    expect(result.balance).toBe(5);
    expect(db.addCredits).toHaveBeenCalledWith(
      2,
      3,
      "purchase",
      expect.stringContaining("Crédit ajouté par"),
    );
  });
});
