import { jest } from "@jest/globals";

const onAuthStateChanged = jest.fn();
const signOut = jest.fn();

const clearHasuraToken = jest.fn();
const setHasuraToken = jest.fn();

const clearPaymentStatusCache = jest.fn();
const fetchCart = jest.fn();
const syncCart = jest.fn();

const loadCartForUser = jest.fn();

const loginSuccess = jest.fn((payload: unknown) => ({ type: "auth/loginSuccess", payload }));
const logout = jest.fn(() => ({ type: "auth/logout" }));
const authResolved = jest.fn(() => ({ type: "auth/authResolved" }));

const setCart = jest.fn((payload: unknown) => ({ type: "cart/setCart", payload }));
const clearCart = jest.fn(() => ({ type: "cart/clearCart" }));

const resolveHasuraUrl = jest.fn(() => "http://example.test/v1/graphql");

jest.unstable_mockModule("firebase/auth", () => ({
  onAuthStateChanged,
  signOut,
}));

jest.unstable_mockModule("../../firebase/config", () => ({
  auth: { __tag: "mock-auth" },
}));

jest.unstable_mockModule("../../utils/hasuraClient", () => ({
  clearHasuraToken,
  setHasuraToken,
}));

jest.unstable_mockModule("../../utils/hasuraUrl", () => ({
  resolveHasuraUrl,
}));

jest.unstable_mockModule("../products/hasuraCommerce", () => ({
  clearPaymentStatusCache,
  fetchCart,
  syncCart,
}));

jest.unstable_mockModule("../products/cartSlice", () => ({
  setCart,
  clearCart,
}));

jest.unstable_mockModule("../../utils/indexedDb", () => ({
  loadCartForUser,
}));

jest.unstable_mockModule("./authSlice", () => ({
  loginSuccess,
  logout,
  authResolved,
}));

describe("startAuthListener", () => {
  let startAuthListener: typeof import("./authListener").startAuthListener;
  let authCallback: ((user: unknown) => Promise<void>) | null = null;

  beforeAll(async () => {
    ({ startAuthListener } = await import("./authListener"));
  });

  beforeEach(() => {
    authCallback = null;
    localStorage.clear();
    jest.clearAllMocks();

    onAuthStateChanged.mockImplementation((_auth: unknown, callback: (user: unknown) => void) => {
      authCallback = callback as (user: unknown) => Promise<void>;
      return () => undefined;
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).fetch = jest.fn();
  });

  test("clears state on logout", async () => {
    const dispatch = jest.fn();
    startAuthListener(dispatch);

    localStorage.setItem("jwt", "existing");
    expect(authCallback).not.toBeNull();

    await authCallback!(null);

    expect(localStorage.getItem("jwt")).toBeNull();
    expect(clearHasuraToken).toHaveBeenCalledTimes(1);
    expect(clearPaymentStatusCache).toHaveBeenCalledTimes(1);

    const dispatchedTypes = dispatch.mock.calls.map((call) => (call[0] as { type: string }).type);
    expect(dispatchedTypes).toEqual(["auth/logout", "cart/clearCart", "auth/authResolved"]);
  });

  test("exchanges token and hydrates cart on successful login", async () => {
    const dispatch = jest.fn();
    startAuthListener(dispatch);

    const firebaseUser = {
      uid: "uid_123",
      email: "user@example.com",
      isAnonymous: false,
      providerData: [{ providerId: "password" }],
      reload: jest.fn(async () => undefined),
      getIdToken: jest.fn(async () => "firebase-id-token"),
    };

    const mockResponse = {
      ok: true,
      json: async () => ({
        data: {
          authLogin: {
            token: "backend-jwt",
            hasuraToken: "hasura-jwt",
            user: { emailVerified: true },
          },
        },
      }),
    };

    (globalThis.fetch as jest.Mock).mockResolvedValue(mockResponse);
    fetchCart.mockResolvedValue([{ sku: "sku_1", quantity: 2 }]);

    expect(authCallback).not.toBeNull();
    await authCallback!(firebaseUser);

    expect(resolveHasuraUrl).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://example.test/v1/graphql",
      expect.objectContaining({ method: "POST" })
    );

    expect(setHasuraToken).toHaveBeenCalledWith("hasura-jwt");
    expect(signOut).not.toHaveBeenCalled();

    const dispatchedTypes = dispatch.mock.calls.map((call) => (call[0] as { type: string }).type);
    expect(dispatchedTypes).toEqual(["auth/loginSuccess", "cart/setCart", "auth/authResolved"]);
  });

  test("signs out and stores error when exchange fails due to network", async () => {
    const dispatch = jest.fn();
    startAuthListener(dispatch);

    const firebaseUser = {
      uid: "uid_123",
      email: "user@example.com",
      isAnonymous: false,
      providerData: [{ providerId: "password" }],
      reload: jest.fn(async () => undefined),
      getIdToken: jest.fn(async () => "firebase-id-token"),
    };

    signOut.mockResolvedValue(undefined);
    (globalThis.fetch as jest.Mock).mockRejectedValue(new TypeError("Failed to fetch"));

    expect(authCallback).not.toBeNull();
    await authCallback!(firebaseUser);

    expect(signOut).toHaveBeenCalledTimes(1);
    const message = localStorage.getItem("auth_exchange_error") ?? "";
    expect(message).toContain("unable to reach http://example.test/v1/graphql");

    const dispatchedTypes = dispatch.mock.calls.map((call) => (call[0] as { type: string }).type);
    expect(dispatchedTypes).toEqual(["auth/logout", "cart/clearCart", "auth/authResolved"]);
  });
});

