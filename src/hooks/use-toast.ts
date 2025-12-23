// useToast Hook
import { useState } from "react";

interface Toast {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = (toast: Toast) => {
    // TODO: Implement toast
    setToasts((prev) => [...prev, toast]);
  };

  return { toast, toasts };
}
