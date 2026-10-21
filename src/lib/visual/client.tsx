"use client";
import { createContext, useContext, type ReactNode } from "react";
import type { VisualMode } from "./mode-types";

const Ctx = createContext<VisualMode>("illustrations");

export function VisualModeProvider({ mode, children }: { mode: VisualMode; children: ReactNode }) {
  return <Ctx.Provider value={mode}>{children}</Ctx.Provider>;
}

export function useVisualMode(): VisualMode {
  return useContext(Ctx);
}
