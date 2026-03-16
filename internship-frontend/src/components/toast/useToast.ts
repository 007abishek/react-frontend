import { useContext } from "react";
import { ToastContext } from "./ToastContext";
//use context
export function useToast() {
  const api = useContext(ToastContext);
  if (!api) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return api;
}

