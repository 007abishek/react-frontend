import { createContext } from "react";

export type ToastVariant = "success" | "error" | "info" | "warning";

export type ToastItem = {
  id: string;
  title?: string;
  message: string;
  variant: ToastVariant;
  createdAt: number;
  durationMs: number;
};



export type ShowToastInput = {
  title?: string;
  message: string;
  variant?: ToastVariant;
  durationMs?: number;
};

export type ToastApi = {
  show: (toast: ShowToastInput) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
};

export const ToastContext = createContext<ToastApi | null>(null);

