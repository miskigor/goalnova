"use client";

import { Component, type ReactNode } from "react";

type Props = { children: ReactNode };

type State = { crashed: boolean };

/** Keeps DM toast logic from taking down the whole authenticated app shell. */
export class IncomingMessageAlertBoundary extends Component<Props, State> {
  state: State = { crashed: false };

  static getDerivedStateFromError(): State {
    return { crashed: true };
  }

  componentDidCatch(error: Error) {
    console.error("[IncomingMessageAlert] disabled after runtime error", error);
  }

  render() {
    if (this.state.crashed) return null;
    return this.props.children;
  }
}
