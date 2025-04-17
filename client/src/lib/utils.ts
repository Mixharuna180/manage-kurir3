import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalize URL path to prevent duplicate slashes 
 * @param path Path to normalize
 * @returns Normalized path without duplicate slashes
 */
export function normalizePath(path: string): string {
  // Remove trailing slashes
  let normalized = path.replace(/\/+$/, '');
  
  // Ensure path starts with a single slash
  if (!normalized.startsWith('/')) {
    normalized = '/' + normalized;
  }
  
  // Replace multiple consecutive slashes with a single slash
  normalized = normalized.replace(/\/+/g, '/');
  
  return normalized;
}

/**
 * Format currency to IDR
 * @param amount Amount to format
 * @returns Formatted amount in IDR
 */
export function formatToIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
