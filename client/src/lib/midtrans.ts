/**
 * Midtrans client integration functions
 */

// Konstanta URL Midtrans untuk produksi (sesuai permintaan)
const MIDTRANS_BASE_URL = "https://app.midtrans.com/snap";
// const MIDTRANS_BASE_URL = "https://app.sandbox.midtrans.com/snap"; // Sandbox URL (dinonaktifkan)

const MIDTRANS_SCRIPT_URL = `${MIDTRANS_BASE_URL}/snap.js`;
const MIDTRANS_WEB_URL = `${MIDTRANS_BASE_URL}/v3/vtweb`;

// Midtrans payment status types
export type MidtransPaymentStatus =
  | "PENDING"
  | "PAID"
  | "EXPIRED"
  | "FAILED"
  | "REFUNDED";

/**
 * Muat Midtrans Snap script secara dinamis
 * @param clientKey Client key Midtrans Snap (opsional, defaultnya adalah sandbox client key)
 * @returns Promise yang resolve ketika script sudah dimuat
 */
export const loadMidtransScript = (
  clientKey: string = import.meta.env.MIDTRANS_CLIENT_KEY || "Mid-client-ajysHU-3bFyOUAc7"  // Mode produksi sesuai permintaan
): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window.snap !== "undefined") {
      console.log("Midtrans Snap already loaded");
      resolve();
      return;
    }

    console.log("Loading Midtrans Snap script...");

    // Remove existing script if any (to prevent duplicates)
    const existingScript = document.getElementById("midtrans-snap-script");
    if (existingScript) {
      existingScript.remove();
    }

    // Create Midtrans Snap script element
    const script = document.createElement("script");
    script.id = "midtrans-snap-script";
    script.src = MIDTRANS_SCRIPT_URL; // Use constant for better maintainability
    script.setAttribute("data-client-key", clientKey);
    script.async = true;

    // Set up event handlers
    script.onload = () => {
      console.log("Midtrans Snap script loaded successfully");
      resolve();
    };

    script.onerror = (error) => {
      console.error("Error loading Midtrans Snap script:", error);
      reject(new Error("Failed to load Midtrans Snap script"));
    };

    // Add script to the document
    document.head.appendChild(script);
  });
};

/**
 * Handles redirection to Midtrans payment page
 * @param redirectUrl URL dari Midtrans untuk pembayaran
 * @param token Token Snap dari Midtrans (opsional, jika ingin menggunakan PopUp)
 * @param orderId ID pesanan (opsional, untuk digunakan dalam callback URLs)
 */
/**
 * Buka Midtrans Snap Payment dengan token
 * @param token Token Snap dari Midtrans
 * @param orderId (opsional) ID pesanan untuk redirect setelah pembayaran
 * @param onSuccess (opsional) Callback saat pembayaran berhasil
 * @param onPending (opsional) Callback saat pembayaran pending
 * @param onError (opsional) Callback saat pembayaran gagal
 * @param onClose (opsional) Callback saat popup ditutup tanpa pembayaran
 * @returns Promise yang resolve true jika popup berhasil dibuka, false jika gagal
 */
export async function openMidtransSnap(
  token: string, 
  orderId?: string | number,
  onSuccess?: (result: MidtransResult) => void,
  onPending?: (result: MidtransResult) => void,
  onError?: (result: MidtransResult) => void,
  onClose?: () => void
): Promise<boolean> {
  if (!token) {
    console.error("No Midtrans token provided");
    return false;
  }
  
  try {
    // Jika window.snap belum dimuat, muat scriptnya terlebih dahulu
    if (typeof window.snap === "undefined") {
      console.log("Midtrans Snap not loaded, loading script...");
      await loadMidtransScript();
      
      if (typeof window.snap === "undefined") {
        throw new Error("Failed to load Snap object even after script load");
      }
    }

    console.log("Opening Midtrans Snap with token:", token);
    
    // Buka Snap popup dengan custom callbacks jika disediakan
    openSnapPayment(
      window.snap, 
      token, 
      orderId,
      onSuccess,
      onPending,
      onError,
      onClose
    );
    return true;
  } catch (error) {
    console.error("Error in openMidtransSnap:", error);
    
    // Fallback ke redirect URL jika popup gagal
    try {
      const redirectUrl = `${MIDTRANS_WEB_URL}/${token}`;
      console.log("Fallback to redirect URL:", redirectUrl);
      window.location.href = redirectUrl;
      return true;
    } catch (redirectError) {
      console.error("Redirect fallback also failed:", redirectError);
      alert("Terjadi kesalahan saat memproses pembayaran. Silakan coba lagi nanti.");
      return false;
    }
  }
}

/**
 * Handles redirection to Midtrans payment page
 * @param redirectUrl URL dari Midtrans untuk pembayaran
 * @param token Token Snap dari Midtrans (opsional, jika ingin menggunakan PopUp)
 * @param orderId ID pesanan (opsional, untuk digunakan dalam callback URLs)
 * @param onSuccess (opsional) Callback saat pembayaran berhasil
 * @param onPending (opsional) Callback saat pembayaran pending
 * @param onError (opsional) Callback saat pembayaran gagal
 * @param onClose (opsional) Callback saat popup ditutup tanpa pembayaran
 * @returns Promise yang resolve true jika popup berhasil dibuka, false jika gagal
 */
export const redirectToMidtransPayment = async (
  redirectUrl: string,
  token?: string,
  orderId?: string | number,
  onSuccess?: (result: MidtransResult) => void,
  onPending?: (result: MidtransResult) => void,
  onError?: (result: MidtransResult) => void,
  onClose?: () => void
): Promise<boolean> => {
  // Jika tidak ada redirectUrl, gagalkan pemrosesan
  if (!redirectUrl && !token) {
    console.error("No Midtrans redirect URL or token provided");
    return false;
  }

  // Pastikan URL menggunakan format yang benar (v3)
  if (redirectUrl) {
    redirectUrl = ensureMidtransV3Url(redirectUrl);
  }

  // Jika token Snap tersedia, coba buka Snap Popup terlebih dahulu
  if (token) {
    try {
      // Gunakan fungsi baru yang mengelola async dengan benar
      return await openMidtransSnap(
        token, 
        orderId,
        onSuccess,
        onPending,
        onError,
        onClose
      );
    } catch (error) {
      console.error("Error opening Midtrans Snap:", error);
      
      // Fallback ke redirect URL jika popup gagal
      if (redirectUrl) {
        console.log("Fallback to redirect URL:", redirectUrl);
        fallbackToRedirect(redirectUrl, orderId);
        return true;
      }
      
      return false;
    }
  }

  // Jika tidak ada token Snap atau terjadi kesalahan, gunakan metode redirect biasa
  if (redirectUrl) {
    console.log("Redirecting to Midtrans payment page:", redirectUrl);
    try {
      fallbackToRedirect(redirectUrl, orderId);
      return true;
    } catch (e) {
      console.error("Error in redirect:", e);
      return false;
    }
  }

  console.error("No valid payment method available");
  return false;
};

/**
 * Ensure Midtrans URL is using the correct v3 format to avoid 404 errors
 * Fungsi ini memastikan semua URL Midtrans menggunakan format API v3, karena:
 * - URL v2 sering menyebabkan error 404 pada beberapa jenis pembayaran
 * - v4 belum stabil dan sering mengarahkan ke halaman error
 * - Bank transfer & Virtual Account memerlukan endpoint v3 untuk berfungsi dengan baik
 * 
 * @param url URL Midtrans yang akan diverifikasi
 * @returns URL yang sudah dikonversi ke format v3 jika diperlukan
 */
function ensureMidtransV3Url(url: string): string {
  // Check if it's a Midtrans URL
  if (!url.includes("midtrans.com")) {
    return url;
  }

  // Extract domain and path
  let newUrl = url;

  // Replace snap/v1, snap/v2, or snap/v4 with snap/v3
  newUrl = newUrl.replace(/snap\/v[124]/i, "snap/v3");

  // If no version in URL, insert v3
  if (!newUrl.includes("snap/v")) {
    newUrl = newUrl.replace("midtrans.com/snap/", "midtrans.com/snap/v3/");
  }

  // If we made any changes
  if (newUrl !== url) {
    console.log(`Converted Midtrans URL for compatibility: ${url} -> ${newUrl}`);
  }

  return newUrl;
}

function fallbackToRedirect(redirectUrl: string, orderId?: string | number) {
  // Implementasikan tindakan redirect fallback di sini jika diperlukan
  try {
    setTimeout(() => {
      redirectUrl = new URL(redirectUrl).toString();
      
      // Tambahkan parameter orderId jika perlu
      if (orderId && !redirectUrl.includes("id=")) {
        const separator = redirectUrl.includes("?") ? "&" : "?";
        redirectUrl += `${separator}id=${orderId}`;
      }
      
      window.location.href = redirectUrl;
    }, 100);
  } catch (e) {
    console.error("Error redirecting to fallback URL:", e);
    window.location.href = redirectUrl;
  }
}

/**
 * Format currency to IDR
 */
export const formatToIDR = (amount: number): string => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Generate a transaction ID in format: years_date_(uniqid)
 */
export const generateTransactionId = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  return `${year}_${month}${day}_${random}`;
};

/**
 * Check status pembayaran dari API server
 * @param paymentId ID pembayaran dari Midtrans
 * @returns Promise dengan status pembayaran
 */
export const checkPaymentStatus = async (
  paymentId: string
): Promise<MidtransPaymentStatus> => {
  try {
    const response = await fetch(`/api/payments/${paymentId}`);
    if (!response.ok) {
      throw new Error("Payment check failed");
    }
    const data = await response.json();
    return data.status.toUpperCase() as MidtransPaymentStatus;
  } catch (error) {
    console.error("Error checking payment status:", error);
    return "FAILED";
  }
};

// MidtransResult interface for Snap callback responses
export interface MidtransResult {
  transaction_status: string;
  status_code: string;
  order_id: string;
  transaction_id: string;
  gross_amount: string;
  payment_type: string;
  transaction_time: string;
  status_message: string;
  va_numbers?: Array<{
    bank: string;
    va_number: string;
  }>;
  bank?: string;
  va_number?: string;
  permata_va_number?: string;
  biller_code?: string;
  bill_key?: string;
  payment_code?: string;
  store?: string;
  fraud_status?: string;
  approval_code?: string;
  masked_card?: string;
  card_type?: string;
}

/**
 * Memastikan Snap sudah dimuat dan membuka popup payment
 * Fungsi ini menggabungkan proses loading script dan membuka popup
 */
export async function ensureSnapAndOpen(
  token: string, 
  orderId?: string | number,
  onSuccess?: (result: MidtransResult) => void,
  onPending?: (result: MidtransResult) => void,
  onError?: (result: MidtransResult) => void,
  onClose?: () => void
): Promise<boolean> {
  try {
    // Pastikan script Midtrans sudah dimuat
    await loadMidtransScript();
    
    // Buka Snap jika script berhasil dimuat
    if (typeof window.snap !== "undefined") {
      openSnapPayment(
        window.snap, 
        token, 
        orderId,
        onSuccess,
        onPending,
        onError,
        onClose
      );
      return true;
    } else {
      console.warn("Snap is not loaded yet despite successful script loading");
      return false;
    }
  } catch (err) {
    console.error("Failed to load Midtrans Snap:", err);
    return false;
  }
}

// Helper function to open Snap payment
function openSnapPayment(
  snap: any, 
  token: string, 
  orderId?: string | number,
  onSuccess?: (result: MidtransResult) => void,
  onPending?: (result: MidtransResult) => void,
  onError?: (result: MidtransResult) => void,
  onClose?: () => void
) {
  if (!token) {
    console.error("Empty token provided to openSnapPayment");
    return;
  }
  
  console.log("Opening Midtrans Snap popup with token:", token);
  
  try {
    snap.pay(token, {
      onSuccess: (result: MidtransResult) => {
        console.log("Payment success:", result);
        // Jika ada custom onSuccess callback, gunakan
        if (onSuccess) {
          onSuccess(result);
        } else {
          // Default behavior
          window.location.href = orderId
            ? `/order-success?id=${orderId}`
            : "/order-success";
        }
      },
      onPending: (result: MidtransResult) => {
        console.log("Payment pending:", result);
        // Jika ada custom onPending callback, gunakan
        if (onPending) {
          onPending(result);
        } else {
          // Default behavior
          window.location.href = orderId
            ? `/order-success?id=${orderId}`
            : "/order-success";
        }
      },
      onError: (result: MidtransResult) => {
        console.error("Payment error:", result);
        // Jika ada custom onError callback, gunakan
        if (onError) {
          onError(result);
        } else {
          // Default behavior
          window.location.href = orderId
            ? `/order-failed?id=${orderId}`
            : "/order-failed";
        }
      },
      onClose: () => {
        console.log("Customer closed the popup without finishing payment");
        // Jika ada custom onClose callback, gunakan
        if (onClose) {
          onClose();
        } else {
          // Default behavior - Arahkan ke halaman sukses karena biasanya customer akan melakukan
          // pembayaran melalui metode lain seperti transfer bank
          window.location.href = orderId
            ? `/order-success?id=${orderId}`
            : "/order-success";
        }
      },
    });
  } catch (error) {
    console.error("Error in openSnapPayment:", error);
    // Fallback to redirect
    try {
      const redirectUrl = `${MIDTRANS_WEB_URL}/${token}`;
      window.location.href = redirectUrl;
    } catch (e) {
      console.error("Redirect also failed:", e);
      alert("Terjadi kesalahan saat membuka halaman pembayaran. Silakan coba lagi.");
    }
  }
};

// Definisi untuk TypeScript - untuk window.snap dari Midtrans
declare global {
  interface Window {
    snap?: {
      pay: (
        snapToken: string,
        options: {
          onSuccess: (result: MidtransResult) => void;
          onPending: (result: MidtransResult) => void;
          onError: (result: MidtransResult) => void;
          onClose: () => void;
        },
      ) => void;
    };
  }
}

/**
 * Fungsi untuk mendapatkan token Snap dari server
 * @param orderId ID pesanan
 * @param amount Jumlah pembayaran
 * @param customerName Nama pelanggan
 * @param customerEmail Email pelanggan
 * @returns Promise dengan token Snap dan URL redirect
 */
export const getSnapToken = async (
  orderId: number,
  amount: number,
  customerName?: string,
  customerEmail?: string
): Promise<{ token: string | null, redirectUrl: string, va_number?: string, bank?: string }> => {
  try {
    const response = await fetch('/api/payments/snap-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orderId,
        amount,
        customerName,
        customerEmail
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get Snap token: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting Snap token:', error);
    throw error;
  }
};


/**
 * Fungsi untuk memproses pembayaran dengan Midtrans Snap
 * @param snapToken Token dari Midtrans Snap API
 * @param orderId ID pesanan
 * @param fallbackUrl URL fallback jika token tidak tersedia atau proses gagal
 * @param onSuccess (opsional) Callback saat pembayaran berhasil
 * @param onPending (opsional) Callback saat pembayaran pending
 * @param onError (opsional) Callback saat pembayaran gagal
 * @param onClose (opsional) Callback saat popup ditutup tanpa pembayaran
 * @returns Promise yang resolve true jika popup berhasil dibuka, false jika gagal
 */
export const processSnapPayment = async (
  snapToken: string | null, 
  orderId: number | string,
  fallbackUrl?: string,
  onSuccess?: (result: MidtransResult) => void,
  onPending?: (result: MidtransResult) => void,
  onError?: (result: MidtransResult) => void,
  onClose?: () => void
): Promise<boolean> => {
  try {
    // Jika tidak ada token, gunakan fallback URL
    if (!snapToken) {
      console.warn("No Snap token available, using fallback URL");
      if (fallbackUrl) {
        window.location.href = fallbackUrl;
        return true;
      }
      return false;
    }
    
    // Gunakan fungsi ensureSnapAndOpen untuk memuat script dan membuka popup
    try {
      // Coba dengan metode ensureSnapAndOpen terlebih dahulu
      const result = await ensureSnapAndOpen(
        snapToken, 
        orderId,
        onSuccess,
        onPending,
        onError,
        onClose
      );
      
      // Jika berhasil, kembalikan true
      if (result) {
        return true;
      }
      
      // Jika gagal, coba dengan metode alternatif (openMidtransSnap)
      console.log("Trying alternative method to open Snap...");
      return await openMidtransSnap(
        snapToken,
        orderId,
        onSuccess,
        onPending,
        onError,
        onClose
      );
    } catch (snapError) {
      console.error("Error with Snap popup:", snapError);
      
      // Fallback ke redirect URL jika popup gagal
      if (fallbackUrl) {
        console.log("Fallback to redirect URL:", fallbackUrl);
        window.location.href = fallbackUrl;
        return true;
      }
      
      // Fallback menggunakan URL Midtrans generik jika tidak ada fallback URL
      try {
        const redirectUrl = `${MIDTRANS_WEB_URL}/${snapToken}`;
        console.log("Using generic Midtrans redirect:", redirectUrl);
        window.location.href = redirectUrl;
        return true;
      } catch (e) {
        console.error("All methods failed:", e);
        return false;
      }
    }
  } catch (error) {
    console.error("Error processing Snap payment:", error);
    
    // Fallback ke redirect URL
    if (fallbackUrl) {
      window.location.href = fallbackUrl;
      return true;
    }
    
    return false;
  }
};