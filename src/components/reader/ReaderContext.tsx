"use client";

import { createContext } from "react";

/** What reader-aware widgets may need from the page around them (absent outside the reader). */
export const ReaderContext = createContext<{ lessonId: string; openBite?: (nodeId: string) => Promise<void> } | null>(null);
