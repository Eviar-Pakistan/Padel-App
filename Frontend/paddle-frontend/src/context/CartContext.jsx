import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const LEGACY_STORAGE_KEY = "paddle_cart";
const AUTH_EVENT = "paddle-auth-changed";

const CartContext = createContext(null);

function getUserIdFromToken() {
  const token = localStorage.getItem("accessToken");
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload?.sub != null ? String(payload.sub) : null;
  } catch {
    return null;
  }
}

function storageKeyForUser(userId) {
  return userId ? `paddle_cart_${userId}` : "paddle_cart_guest";
}

function readCart(userId) {
  try {
    const raw = localStorage.getItem(storageKeyForUser(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Call after login/register/logout so cart switches to the current user. */
export function notifyAuthChanged() {
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export function CartProvider({ children }) {
  const [userId, setUserId] = useState(() => getUserIdFromToken());
  const [items, setItems] = useState(() => readCart(getUserIdFromToken()));

  // Drop the old shared cart key so it can't leak across accounts.
  useEffect(() => {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  }, []);

  const syncToCurrentUser = useCallback(() => {
    const nextUserId = getUserIdFromToken();
    setUserId(nextUserId);
    setItems(readCart(nextUserId));
  }, []);

  useEffect(() => {
    const onAuth = () => syncToCurrentUser();
    window.addEventListener(AUTH_EVENT, onAuth);
    window.addEventListener("storage", onAuth);
    return () => {
      window.removeEventListener(AUTH_EVENT, onAuth);
      window.removeEventListener("storage", onAuth);
    };
  }, [syncToCurrentUser]);

  useEffect(() => {
    localStorage.setItem(storageKeyForUser(userId), JSON.stringify(items));
  }, [items, userId]);

  const addItem = useCallback((product, qty = 1) => {
    if (!product?.id) return;
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id
            ? { ...i, quantity: i.quantity + qty }
            : i
        );
      }
      const image = product.images?.[0]?.url || product.image || null;
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          price: Number(product.price),
          currency: product.currency || "PKR",
          image,
          quantity: qty,
          paddleOwnerId: product.paddleOwnerId,
          organizationName:
            product.paddleOwner?.organizationName ||
            product.organizationName ||
            "",
          stock: product.stock,
        },
      ];
    });
  }, []);

  const setQuantity = useCallback((productId, quantity) => {
    setItems((prev) => {
      if (quantity <= 0) return prev.filter((i) => i.productId !== productId);
      return prev.map((i) =>
        i.productId === productId ? { ...i, quantity } : i
      );
    });
  }, []);

  const removeItem = useCallback((productId) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    localStorage.setItem(storageKeyForUser(getUserIdFromToken()), "[]");
  }, []);

  const count = useMemo(
    () => items.reduce((sum, i) => sum + (i.quantity || 0), 0),
    [items]
  );

  const total = useMemo(
    () => items.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0),
    [items]
  );

  const value = useMemo(
    () => ({
      items,
      count,
      total,
      addItem,
      setQuantity,
      removeItem,
      clearCart,
      syncToCurrentUser,
    }),
    [
      items,
      count,
      total,
      addItem,
      setQuantity,
      removeItem,
      clearCart,
      syncToCurrentUser,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within CartProvider");
  }
  return ctx;
}
