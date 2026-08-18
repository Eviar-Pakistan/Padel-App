import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

function socketOrigin() {
  const apiBase = import.meta.env.VITE_API_URL || "";
  return String(apiBase).replace(/\/api\/?$/, "") || window.location.origin;
}

export function useMatchLiveSocket({
  matchId,
  token,
  enabled = true,
  onScore,
  onFinished,
}) {
  const onScoreRef = useRef(onScore);
  const onFinishedRef = useRef(onFinished);
  onScoreRef.current = onScore;
  onFinishedRef.current = onFinished;

  useEffect(() => {
    if (!enabled || !matchId || !token) return undefined;
    const socket = io(`${socketOrigin()}/match-live`, {
      auth: { token },
      transports: ["websocket", "polling"],
    });
    socket.on("connect", () => {
      socket.emit("join", { matchId });
    });
    socket.on("score", (payload) => onScoreRef.current?.(payload));
    socket.on("finished", (payload) => onFinishedRef.current?.(payload));
    return () => {
      socket.emit("leave", { matchId });
      socket.disconnect();
    };
  }, [matchId, token, enabled]);
}
