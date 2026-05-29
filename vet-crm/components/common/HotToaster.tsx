"use client";

import { Toaster } from "react-hot-toast";
import { useTheme } from "@/components/common/ThemeProvider";

export default function HotToaster() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const baseStyle: React.CSSProperties = {
    background: isDark ? "rgba(17, 24, 39, 0.92)" : "rgba(255, 255, 255, 0.95)",
    color: isDark ? "#F9FAFB" : "#111827",
    border: isDark ? "1px solid rgba(255, 255, 255, 0.10)" : "1px solid rgba(17, 24, 39, 0.10)",
    boxShadow: isDark
      ? "0 10px 35px rgba(0,0,0,0.45)"
      : "0 10px 35px rgba(17,24,39,0.12)",
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)"};

  return (
    <Toaster
      position="top-center"
      toastOptions={{
        duration: 4000,
        style: baseStyle,
        className: "rounded-2xl text-sm font-medium",
        success: {
          iconTheme: {
            primary: "#10B981",
            secondary: isDark ? "#0B1220" : "#FFFFFF"}},
        error: {
          iconTheme: {
            primary: "#EF4444",
            secondary: isDark ? "#0B1220" : "#FFFFFF"}}}}
    />
  );
}

