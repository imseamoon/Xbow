"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { io, Socket } from "socket.io-client";
import type { ProgressEvent, FindingEvent, CompleteEvent, ErrorEvent } from "@/lib/types";

interface UseScanSocketOptions {
  scanId?: string;
  onProgress?: (e: ProgressEvent) => void;
  onFinding?: (e: FindingEvent) => void;
  onComplete?: (e: CompleteEvent) => void;
  onError?: (e: ErrorEvent) => void;
}

function getAuthToken(): string | undefined {
  if (typeof window === "undefined") return undefined;

  // Try JWT from httpOnly cookie via Socket.IO handshake.
  // WsAuthMiddleware extracts the JWT from the Cookie header as a fallback,
  // so we can just return undefined and let the middleware handle it.
  // For programmatic clients, tokens can be passed via auth or query params.
  return undefined;
}

export function useScanSocket(opts: UseScanSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return socketRef.current;
    const wsUrl =
      process.env.NEXT_PUBLIC_WS_URL ??
      (typeof window !== "undefined"
        ? `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.hostname}:3000`
        : "ws://localhost:3000");

    const token = getAuthToken();
    const opts: Record<string, unknown> = {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    };
    if (token) {
      opts.auth = { token };
    }
    const socket = io(wsUrl, opts as any);
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", (err) => {
      console.warn("WebSocket connection error:", err.message);
    });
    socketRef.current = socket;
    return socket;
  }, []);

  useEffect(() => {
    const socket = connect();
    if (!socket) return;

    const handleProgress = (e: ProgressEvent) => {
      if (opts.scanId && e.scanId !== opts.scanId) return;
      opts.onProgress?.(e);
    };
    const handleFinding = (e: FindingEvent) => {
      if (opts.scanId && e.scanId !== opts.scanId) return;
      opts.onFinding?.(e);
    };
    const handleComplete = (e: CompleteEvent) => {
      if (opts.scanId && e.scanId !== opts.scanId) return;
      opts.onComplete?.(e);
    };
    const handleError = (e: ErrorEvent) => {
      if (opts.scanId && e.scanId !== opts.scanId) return;
      opts.onError?.(e);
    };

    socket.on("scan:progress", handleProgress);
    socket.on("scan:finding", handleFinding);
    socket.on("scan:complete", handleComplete);
    socket.on("scan:error", handleError);

    return () => {
      socket.off("scan:progress", handleProgress);
      socket.off("scan:finding", handleFinding);
      socket.off("scan:complete", handleComplete);
      socket.off("scan:error", handleError);
      socket.disconnect();
      setConnected(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.scanId]);

  return { connected };
}