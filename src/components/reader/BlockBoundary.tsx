"use client";

import { Component, type ReactNode } from "react";

/** Keeps one misbehaving block (usually an AI-written widget) from taking the whole lesson down. */
export class BlockBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("[reader] block failed to render", error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <p className="my-8 rounded-[var(--radius)] border border-dashed border-border px-4 py-3 text-center font-ui text-[13px] text-muted">
        This part of the lesson could not be shown.
      </p>
    );
  }
}
