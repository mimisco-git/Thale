import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = "USDC") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD", // Intl doesn't know USDC, so we use USD and replace symbol if needed, or just append USDC
  }).format(amount).replace("$", "") + " " + currency;
}
