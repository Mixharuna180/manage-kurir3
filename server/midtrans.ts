/**
 * Midtrans Integration for Payment Processing
 */
// @ts-ignore - Mengabaikan warning tentang midtrans-client yang tidak memiliki file deklarasi tipe
import midtransClient from "midtrans-client";
import crypto from "crypto";
import { createHash } from "crypto";

// Mendapatkan konfigurasi API Midtrans
const MIDTRANS_SERVER_KEY =
  process.env.MIDTRANS_SERVER_KEY || "Mid-server-EOC-6ehtF8gBTux1n6SaVp3H";
const MIDTRANS_CLIENT_KEY =
  process.env.MIDTRANS_CLIENT_KEY || "Mid-client-ajysHU-3bFyOUAc7";

// Cek apakah key tersedia
if (!MIDTRANS_SERVER_KEY || !MIDTRANS_CLIENT_KEY) {
  console.error(
    "MIDTRANS_SERVER_KEY or MIDTRANS_CLIENT_KEY environment variables are missing",
  );
}

// Pengaturan mode produksi atau sandbox (selalu gunakan mode produksi sesuai permintaan)
const IS_PRODUCTION = true; // Force production mode

// Inisialisasi Midtrans Core API (untuk pengecekan status, dll)
const coreApi = new midtransClient.CoreApi({
  isProduction: IS_PRODUCTION,
  serverKey: MIDTRANS_SERVER_KEY,
  clientKey: MIDTRANS_CLIENT_KEY,
});

// Inisialisasi Midtrans Snap API (untuk pembayaran dengan UI dari Midtrans)
export const snap = new midtransClient.Snap({
  isProduction: IS_PRODUCTION,
  serverKey: MIDTRANS_SERVER_KEY,
  clientKey: MIDTRANS_CLIENT_KEY,
});

// Fungsi untuk memvalidasi signature dari webhook Midtrans
function isValidSignature(reqBody: any, signatureKey: string): boolean {
  const { order_id, status_code, gross_amount } = reqBody;
  const serverKey = MIDTRANS_SERVER_KEY;
  
  // Jika ada field yang hilang, gagalkan validasi
  if (!order_id || !status_code || !gross_amount) {
    return false;
  }
  
  // Buat raw signature dari kombinasi data transaksi dan server key
  const rawSignature = order_id + status_code + gross_amount + serverKey;
  // Buat hash SHA-512 untuk membandingkan dengan signature yang dikirim Midtrans
  const expectedSignature = createHash("sha512")
    .update(rawSignature)
    .digest("hex");
    
  // Bandingkan dengan signature dari request
  return expectedSignature === signatureKey;
}

// Tipe untuk pembayaran Midtrans
interface CreatePaymentParams {
  externalID: string;
  payerEmail: string;
  description: string;
  amount: number;
  successRedirectURL?: string;
  failureRedirectURL?: string;
  itemDetails?: {
    id: string;
    price: number;
    quantity: number;
    name: string;
  }[];
  customerDetails?: {
    firstName: string;
    lastName?: string;
    email: string;
    phone?: string;
  };
}

interface MidtransPayment {
  token: string;
  redirect_url: string;
  transaction_id: string;
  order_id: string;
  merchant_id: string;
  gross_amount: string;
  currency: string;
  payment_type: string;
  transaction_time: string;
  transaction_status: string;
  status_code: string;
  status_message: string;
  // Tambahan untuk bank transfer
  va_number?: string;
  bank?: string;
}

/**
 * Generate a unique transaction ID for orders
 */
export function generateTransactionId(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  // Format: YEAR_MMDD_RANDOM
  const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${year}_${month}${day}_${randomStr}`;
}

/**
 * Create a payment transaction on Midtrans
 */
export async function createPayment(
  params: CreatePaymentParams,
): Promise<MidtransPayment> {
  try {
    // Validasi tambahan
    if (params.amount <= 0) {
      throw new Error("Invalid payment amount");
    }
    
    if (!params.payerEmail || !params.payerEmail.includes("@")) {
      throw new Error("Invalid email address");
    }
    
    console.log(
      `Creating Midtrans payment for transaction ${params.externalID}`,
    );

    // Pastikan ID transaksi unik dengan menambahkan timestamp jika diperlukan
    const orderId = `${params.externalID}`;

    // Hitung total harga dari item details jika ada
    let totalAmount = params.amount;
    const itemDetails = params.itemDetails || [
      {
        id: "ITEM1",
        price: Math.floor(params.amount),
        quantity: 1,
        name: params.description,
      },
    ];
    
    // Jika item details diberikan, hitung ulang total amount dari item
    if (params.itemDetails) {
      totalAmount = params.itemDetails.reduce((total, item) => {
        return total + (item.price * item.quantity);
      }, 0);
    }
    
    // Buat parameter untuk Midtrans Snap API (dengan berbagai metode pembayaran)
    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: Math.floor(totalAmount),
      },
      customer_details: params.customerDetails ? {
        first_name: params.customerDetails.firstName.split(' ')[0],
        last_name: params.customerDetails.firstName.split(' ').slice(1).join(' ') || '',
        email: params.customerDetails.email,
        phone: params.customerDetails.phone || '',
      } : {
        first_name: "Pembeli",
        email: params.payerEmail,
      },
      item_details: itemDetails,
      callbacks: {
        finish:
          params.successRedirectURL || "https://localhost:5000/order-success",
        error:
          params.failureRedirectURL || "https://localhost:5000/order-failed",
        pending: "",
      },
      credit_card: {
        secure: true,
      },
      enabled_payments: [
        "credit_card",
        "mandiri_clickpay",
        "bca_clickpay",
        "bca_klikbca",
        "bri_epay",
        "cimb_clicks",
        "danamon_online",
        "bni_va",
        "bca_va",
        "bri_va",
        "other_va",
        "gopay",
        "indomaret",
        "alfamart",
        "akulaku",
        "shopeepay",
        "permata_va",
        "mandiri_va",
        "ovo",
        "dana",
      ],
    };

    // Gunakan Snap API untuk transaksi dengan berbagai metode pembayaran
    // Hanya log detail dalam mode development
    if (!IS_PRODUCTION) {
      console.log(
        "Creating Midtrans Snap transaction with params:",
        JSON.stringify(parameter, null, 2),
      );
    }

    // Buat transaksi menggunakan Snap API
    const transaction = await snap.createTransaction(parameter);
    
    // Hanya log detail dalam mode development
    if (!IS_PRODUCTION) {
      console.log("Midtrans Core transaction created:", transaction);
    }

    // Format respons untuk konsistensi dengan interface yang ada
    // Ubah semua versi URL ke v3 untuk menghindari masalah redirect 404
    let redirectUrl = transaction.redirect_url;
    if (redirectUrl) {
      // Cek apakah URL menggunakan format v2 atau v4
      if (redirectUrl.includes("/v2/") || redirectUrl.includes("/v4/")) {
        // Ganti semua v2 atau v4 dengan v3 menggunakan regex
        redirectUrl = redirectUrl.replace(/\/v[24]\//g, "/v3/");
        console.log(
          "URL changed to v3 format to avoid 404 issues:",
          redirectUrl,
        );
      }
    }

    // Gunakan data transaksi dari Snap API
    const payment: MidtransPayment = {
      token: transaction.token || "",
      redirect_url: transaction.redirect_url || "",
      transaction_id: orderId,
      order_id: orderId,
      merchant_id: "LogiTech",
      gross_amount: totalAmount.toString(), // Gunakan totalAmount yang sudah dihitung ulang
      currency: "IDR",
      payment_type: "snap", // Snap mendukung berbagai metode pembayaran
      transaction_time: new Date().toISOString(),
      transaction_status: "pending",
      status_code: "201",
      status_message: "Snap payment page created",
      // Bank transfer info akan diperoleh setelah pelanggan memilih metode pembayaran
      va_number: "",
      bank: "",
    };

    return payment;
  } catch (error) {
    console.error("Error creating Midtrans payment:", error);

    // Jika error, buat fallback untuk development
    if (!IS_PRODUCTION) {
      console.log("Creating mock payment as fallback");

      // Hitung total harga untuk mock payment
      let mockTotalAmount = params.amount;
      if (params.itemDetails) {
        mockTotalAmount = params.itemDetails.reduce((total, item) => {
          return total + (item.price * item.quantity);
        }, 0);
      }
      
      // Fallback dengan membuat transaksi dinamis
      const mockPayment: MidtransPayment = {
        token: crypto.randomBytes(12).toString("hex"),
        redirect_url: `https://app.midtrans.com/snap/v3/placeholder/${params.externalID}`,
        transaction_id: params.externalID,
        order_id: params.externalID,
        merchant_id: "LogiTech",
        gross_amount: mockTotalAmount.toString(),
        currency: "IDR",
        payment_type: "bank_transfer",
        transaction_time: new Date().toISOString(),
        transaction_status: "pending",
        status_code: "201",
        status_message: "Success, test transaction is created",
        va_number: "80777123456",
        bank: "bca", // Hasil API biasanya menggunakan BCA
      };

      console.log("Mock Midtrans payment created:", mockPayment);
      return mockPayment;
    }

    throw error;
  }
}

/**
 * Get payment status from Midtrans
 */
export async function getPaymentStatus(orderId: string): Promise<string> {
  try {
    console.log(`Checking payment status for Midtrans order ID: ${orderId}`);

    // Gunakan Core API untuk mendapatkan status
    const response = await coreApi.transaction.status(orderId);

    // Hanya log detail dalam mode development
    if (!IS_PRODUCTION) {
      console.log(`Midtrans payment status response:`, response);
    }

    // Konversi status Midtrans ke format yang konsisten dengan aplikasi
    // Midtrans memiliki beberapa status: https://api-docs.midtrans.com/#transaction-status
    let status: string;

    switch (response.transaction_status) {
      case "capture":
      case "settlement":
        status = "PAID";
        break;
      case "pending":
        status = "PENDING";
        break;
      case "deny":
      case "cancel":
      case "expire":
        status = "EXPIRED";
        break;
      case "refund":
      case "partial_refund":
        status = "REFUNDED";
        break;
      case "failure":
      default:
        status = "FAILED";
        break;
    }

    // Hanya log detail dalam mode development
    if (!IS_PRODUCTION) {
      console.log(
        `Converted Midtrans status ${response.transaction_status} to app status: ${status}`,
      );
    }
    return status;
  } catch (error) {
    console.error(`Error getting payment status from Midtrans:`, error);

    // Fallback untuk testing di development mode
    if (!IS_PRODUCTION) {
      console.log(`Using mock payment status for order ${orderId}`);
      const statuses = ["PENDING", "PAID", "PAID", "PAID", "EXPIRED"];
      const randomStatus =
        statuses[Math.floor(Math.random() * statuses.length)];
      console.log(`Mock payment status: ${randomStatus}`);
      return randomStatus;
    }

    throw error;
  }
}

/**
 * Parse and validate Midtrans webhook
 */
export function parseWebhook(requestBody: any, signatureKey?: string): {
  order_id: string;
  status: string;
  transaction_id: string;
} | null {
  try {
    // Hanya log detail lengkap dalam mode development
    if (!IS_PRODUCTION) {
      console.log("Received Midtrans webhook:", {
        order_id: requestBody.order_id,
        transaction_status: requestBody.transaction_status,
        transaction_id: requestBody.transaction_id,
      });
    } else {
      // Dalam mode produksi, hanya log info penting
      console.log(`Received Midtrans webhook for order: ${requestBody.order_id}`);
    }

    // Validasi webhook
    if (!requestBody.order_id || !requestBody.transaction_status) {
      console.error("Webhook missing required fields");
      return null;
    }
    
    // Validasi signature jika provided
    if (signatureKey && !isValidSignature(requestBody, signatureKey)) {
      console.error("Invalid webhook signature");
      return null;
    }

    // Konversi status Midtrans ke format aplikasi
    let status: string;
    switch (requestBody.transaction_status) {
      case "capture":
      case "settlement":
        status = "PAID";
        break;
      case "pending":
        status = "PENDING";
        break;
      case "deny":
      case "cancel":
      case "expire":
        status = "EXPIRED";
        break;
      case "refund":
      case "partial_refund":
        status = "REFUNDED";
        break;
      default:
        status = "FAILED";
        break;
    }

    return {
      order_id: requestBody.order_id,
      status: status,
      transaction_id: requestBody.transaction_id || requestBody.order_id,
    };
  } catch (error) {
    console.error("Error parsing Midtrans webhook:", error);
    return null;
  }
}

/**
 * Format currency to IDR
 */
export function formatToIDR(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
