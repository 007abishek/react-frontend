import { useContext } from "react";
import { ToastContext } from "./ToastContext";

export function useToast() {
  const api = useContext(ToastContext);
  if (!api) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return api;
}

