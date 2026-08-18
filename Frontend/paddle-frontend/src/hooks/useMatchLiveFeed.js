import { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";

function socketOrigin() {
  const apiBase = import.meta.env.VITE_API_URL || "";
  return String(apiBase).replace(/\/api\/?$/, "") || window.location.origin;
}

export function useMatchLiveFeed({ matchIds, token, enabled = true, onScore }) {
  const onScoreRef = useRef(onScore);
  onScoreRef.current = onScore;
  const key = useMemo(() => (matchIds || []).filter(Boolean).join(","), [matchIds]);

  useEffect(() => {
    if (!enabled || !token || !key) return undefined;
    const ids = key.split(",");
    const socket = io(`${socketOrigin()}/match-live`, {
      auth: { token },
      transports: ["websocket", "polling"],
    });
    socket.on("connect", () => {
      ids.forEach((matchId) => socket.emit("join", { matchId }));
    });
    socket.on("score", (payload) => onScoreRef.current?.(payload));
    socket.on("finished", (payload) => onScoreRef.current?.(payload));
    return () => socket.disconnect();
  }, [key, token, enabled]);
}

export function useAuthToken(storageKey = "accessToken") {
  const [token, setToken] = useState(() => localStorage.getItem(storageKey));
  useEffect(() => {
    setToken(localStorage.getItem(storageKey));
  }, [storageKey]);
  return token;
}
