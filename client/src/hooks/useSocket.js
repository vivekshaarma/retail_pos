// ─────────────────────────────────────────────
//  hooks/useSocket.js
//  Custom hook that connects to Socket.IO
//  and lets components listen to real-time events.
//
//  Custom hooks let you extract stateful logic into
//  a reusable function. Any function starting with
//  "use" is a React hook.
// ─────────────────────────────────────────────

import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

// We store the socket at module level so one connection
// is shared across the entire app (singleton pattern).
let socketInstance = null;

export function useSocket(eventHandlers = {}) {
  // useRef holds a value that persists across renders without causing re-renders
  const handlersRef = useRef(eventHandlers);

  // Keep handlers ref up to date with the latest functions
  useEffect(() => {
    handlersRef.current = eventHandlers;
  });

  useEffect(() => {
    // Create socket connection once
    if (!socketInstance) {
      socketInstance = io(window.location.origin, {
        transports: ["websocket", "polling"],
      });

      socketInstance.on("connect", () =>
        console.log("🔌 Socket.IO connected:", socketInstance.id)
      );

      socketInstance.on("disconnect", () =>
        console.log("❌ Socket.IO disconnected")
      );
    }

    // Register event listeners from the component
    // handlersRef.current is used so we always call the latest version
    const eventNames = Object.keys(eventHandlers);

    eventNames.forEach((event) => {
      socketInstance.on(event, (...args) => {
        handlersRef.current[event]?.(...args);
      });
    });

    // ── Cleanup function ─────────────────────────
    // React calls this when the component unmounts OR before the effect re-runs.
    // We remove listeners to avoid memory leaks and duplicate callbacks.
    return () => {
      eventNames.forEach((event) => socketInstance.off(event));
    };
  }, []); // Empty deps = run once on mount

  return socketInstance;
}
