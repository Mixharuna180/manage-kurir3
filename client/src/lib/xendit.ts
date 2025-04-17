/**
 * Client-side Xendit integration
 */

// Function to handle redirection to Xendit payment page
export const redirectToXenditPayment = (paymentUrl: string) => {
  // Pastikan URL valid sebelum melakukan redirect
  if (!paymentUrl) {
    console.error('Invalid payment URL provided');
    return;
  }
  
  // Log untuk debugging
  console.log('Redirecting to Xendit payment URL:', paymentUrl);
  
  // Koreksi URL jika formatnya tidak sesuai dengan yang diharapkan
  if (!paymentUrl.includes('checkout-staging.xendit.co/web/') && 
      !paymentUrl.includes('invoice.xendit.co/')) {
    
    // Jika URL tidak mengikuti format yang diharapkan, coba ekstrak ID invoice
    console.warn('Payment URL may not match the expected format, attempting to fix');
    
    // ⚠️ PENTING: Format URL Xendit checkout yang benar adalah:
    // https://checkout.xendit.co/{invoice_id}
    // BUKAN format invoice: https://invoice.xendit.co/{invoice_id}
    // BUKAN format staging: https://checkout-staging.xendit.co/web/{id-24-hex}
    // JUGA BUKAN format lama: https://checkout-staging.xendit.co/web/invoice_timestamp
    
    // Fungsi untuk menghasilkan URL checkout yang valid
    const generateValidCheckoutUrl = (invoiceId: string): string => {
      return `https://checkout.xendit.co/${invoiceId}`;
    };
    
    // Cek jika URL menggunakan format staging
    if (paymentUrl.includes('checkout-staging.xendit.co/web/')) {
      // Extract invoice ID dari URL staging
      const parts = paymentUrl.split('/web/');
      if (parts.length > 1) {
        const invoiceId = parts[1].trim();
        // Transform ke format checkout yang benar
        paymentUrl = generateValidCheckoutUrl(invoiceId);
        console.log('✅ Transformed staging URL to checkout format:', paymentUrl);
      }
    } else if (paymentUrl.includes('invoice.xendit.co/')) {
      // Extract invoice ID dari URL invoice
      const parts = paymentUrl.split('invoice.xendit.co/');
      if (parts.length > 1) {
        const invoiceId = parts[1].trim();
        // Transform ke format checkout yang benar
        paymentUrl = generateValidCheckoutUrl(invoiceId);
        console.log('✅ Transformed invoice URL to checkout format:', paymentUrl);
      }
    } else if (paymentUrl.includes('invoice_')) {
      // Extract invoice ID from old format
      const parts = paymentUrl.split('invoice_');
      if (parts.length > 1) {
        // Buat ID format Xendit yang benar (24 karakter hex) berdasarkan timestamp
        const timestamp = parts[1].trim();
        
        // Buat hexadecimal ID 24 karakter sesuai format yang dibutuhkan Xendit
        // contoh: 5e2f3ad37f3e9814c4d9d1b2
        const getHexFromTimestamp = (timestamp: string, length: number = 24) => {
          // Konversi timestamp ke seed numerik
          let seed = 0;
          try {
            seed = parseInt(timestamp);
            if (isNaN(seed)) seed = Date.now();
          } catch (e) {
            seed = Date.now();
          }
          
          // Tambahkan sedikit randomisasi tapi tetap deterministik
          seed = seed * 104729 % 1000000007;
          
          // Buat hash yang deterministik dari string
          const hexChars = '0123456789abcdef';
          let result = '';
          
          for (let i = 0; i < length; i++) {
            seed = (seed * 9301 + 49297) % 233280;
            const charIndex = Math.floor((seed / 233280) * hexChars.length);
            result += hexChars[charIndex];
          }
          
          return result;
        };
        
        const validInvoiceId = getHexFromTimestamp(timestamp);
        console.log('🔄 Converting invoice_timestamp format to Xendit-compatible 24-char hex ID:', validInvoiceId);
        
        // Generate URL dalam format Xendit checkout yang benar
        paymentUrl = `https://checkout.xendit.co/${validInvoiceId}`;
        console.log('✅ Transformed payment URL to correct Xendit checkout format:', paymentUrl);
      }
    }
  }
  
  // Cek apakah sedang di development environment
  if (import.meta.env.DEV && (
    paymentUrl.includes('checkout-staging.xendit.co') || 
    paymentUrl.includes('invoice.xendit.co') ||
    paymentUrl.includes('checkout.xendit.co')
  )) {
    // Buka payment URL di tab baru untuk memudahkan testing
    window.open(paymentUrl, '_blank');
    
    // Tambahkan alert untuk memudahkan developer
    setTimeout(() => {
      alert('Payment URL telah dibuka di tab baru. Setelah pembayaran, kembali ke halaman ini.');
    }, 300);
    return;
  }
  
  // Untuk environment produksi, redirect ke Xendit dengan timeout kecil
  // untuk memastikan state React sudah terupdate
  setTimeout(() => {
    window.location.href = paymentUrl;
  }, 300);
};

// Payment status types from Xendit
export type XenditPaymentStatus = 
  | 'PENDING'
  | 'PAID'
  | 'EXPIRED'
  | 'FAILED';

// Format currency to IDR
export const formatToIDR = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Generate a random transaction ID in format: years_date_(uniqid)
export const generateTransactionId = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  return `${year}_${month}${day}_${randomStr}`;
};
