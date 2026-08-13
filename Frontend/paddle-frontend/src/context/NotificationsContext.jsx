import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getUnreadNotificationCount } from "../api/notifications";

const NOTIF_EVENT = "paddle-notifications-changed";
const AUTH_EVENT = "paddle-auth-changed";

const NotificationsContext = createContext(null);

export function notifyNotificationsChanged() {
  window.dispatchEvent(new Event(NOTIF_EVENT));
}

export function NotificationsProvider({ children }) {
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setUnreadCount(0);
      return;
    }
    try {
      const { data } = await getUnreadNotificationCount();
      setUnreadCount(Number(data?.count) || 0);
    } catch {
      setUnreadCount(0);
    }
  }, []);

  useEffect(() => {
    refreshUnreadCount();
    const onChange = () => refreshUnreadCount();
    window.addEventListener(NOTIF_EVENT, onChange);
    window.addEventListener(AUTH_EVENT, onChange);
    window.addEventListener("focus", onChange);
    return () => {
      window.removeEventListener(NOTIF_EVENT, onChange);
      window.removeEventListener(AUTH_EVENT, onChange);
      window.removeEventListener("focus", onChange);
    };
  }, [refreshUnreadCount]);

  const value = useMemo(
    () => ({
      unreadCount,
      refreshUnreadCount,
    }),
    [unreadCount, refreshUnreadCount]
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within NotificationsProvider");
  }
  return ctx;
}
