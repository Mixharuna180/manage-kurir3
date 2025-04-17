import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, ArrowRight, FileText, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function OrderSuccess() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paymentData, setPaymentData] = useState<any>(null);

  // Get order ID from URL query param
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get("id");

  useEffect(() => {
    const getOrderDetails = async () => {
      try {
        if (!orderId) {
          toast({
            title: "Error",
            description: "Order ID tidak ditemukan",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        const response = await apiRequest("GET", `/api/orders/${orderId}`);
        const data = await response.json();
        
        // Get product details
        const productResponse = await apiRequest("GET", `/api/products/${data.productId}`);
        const productData = await productResponse.json();
        
        // Retrieve payment data from sessionStorage (temporary solution)
        const savedPaymentData = sessionStorage.getItem(`payment_${orderId}`);
        if (savedPaymentData) {
          try {
            const paymentInfo = JSON.parse(savedPaymentData);
            console.log("Retrieved payment data from session storage:", paymentInfo);
            setPaymentData(paymentInfo);
          } catch (err) {
            console.error("Error parsing payment data from session storage:", err);
          }
        }
        
        setOrderDetails({
          ...data,
          product: productData
        });
        
        // Verifikasi status pembayaran Xendit
        try {
          // Jika ada payment ID, periksa status pembayaran di Xendit
          if (data.paymentId) {
            console.log(`Verifying payment status with Xendit for payment ID: ${data.paymentId}`);
            
            // Gunakan endpoint verifikasi status pembayaran
            const statusResponse = await apiRequest("GET", `/api/payments/${data.paymentId}/status`);
            const statusData = await statusResponse.json();
            
            console.log("Payment status verification result:", statusData);
            
            // Jika pembayaran berhasil tapi status belum diperbarui di sistem
            if ((statusData.status === "PAID" || statusData.status === "SETTLED") && 
                data.paymentStatus !== "paid") {
              
              console.log("Payment confirmed by Xendit but not yet updated in system, updating now");
              
              // Perbarui status pesanan
              await apiRequest("PATCH", `/api/orders/${orderId}`, {
                paymentStatus: "paid",
                orderStatus: "paid"
              });
              
              // Buat event tracking
              await apiRequest("POST", `/api/tracking`, {
                orderId: parseInt(orderId),
                status: "paid",
                description: "Payment confirmed via Xendit verification",
                location: null
              });
              
              // Refresh data pesanan
              const updatedResponse = await apiRequest("GET", `/api/orders/${orderId}`);
              const updatedData = await updatedResponse.json();
              
              setOrderDetails({
                ...updatedData,
                product: productData,
                paymentVerified: true
              });
            } else {
              // Tambahkan status verifikasi ke data pesanan
              setOrderDetails({
                ...data,
                product: productData,
                paymentVerified: statusData.status === "PAID" || statusData.status === "SETTLED"
              });
            }
          } else {
            console.log("No payment ID found, skipping payment verification");
          }
        } catch (verificationError) {
          console.error("Error verifying payment status:", verificationError);
          // Masih tampilkan data pesanan meskipun verifikasi gagal
          setOrderDetails({
            ...data,
            product: productData,
            paymentVerified: false
          });
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching order details:", error);
        toast({
          title: "Error",
          description: "Gagal memuat detail pesanan",
          variant: "destructive",
        });
        setLoading(false);
      }
    };

    getOrderDetails();
  }, [orderId, toast]);

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Memuat detail transaksi...</p>
        </div>
      </div>
    );
  }

  if (!orderDetails) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="flex mb-4 gap-2">
              <CheckCircle className="h-8 w-8 text-red-500" />
              <h1 className="text-2xl font-bold text-gray-900">Transaksi Tidak Ditemukan</h1>
            </div>
            <p className="mt-4 text-sm text-gray-600">
              Tidak dapat menemukan detail transaksi. Silakan cek halaman riwayat pesanan Anda.
            </p>
            <div className="mt-6 flex justify-center">
              <Button onClick={() => setLocation("/")}>Kembali ke Dashboard</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500 mb-2" />
            <h1 className="text-2xl font-bold text-gray-900 text-center">
              {orderDetails.paymentStatus === "paid" 
                ? "Pembayaran Berhasil!" 
                : "Instruksi Pembayaran"}
            </h1>
            {orderDetails.paymentVerified !== undefined && (
              <div className={`mt-2 text-sm ${orderDetails.paymentVerified ? 'text-green-600' : 'text-amber-600'}`}>
                {orderDetails.paymentVerified 
                  ? "✓ Terverifikasi oleh Payment Gateway" 
                  : "⚠ Menunggu pembayaran"}
              </div>
            )}
          </div>

          <div className="mt-6 border-t border-gray-200 pt-4">
            <p className="text-sm text-gray-500">Detail Transaksi:</p>
            <div className="mt-2 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">ID Transaksi:</span>
                <span className="text-sm">{orderDetails.transactionId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Produk:</span>
                <span className="text-sm">{orderDetails.product?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Harga:</span>
                <span className="text-sm">Rp {orderDetails.product?.price.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Biaya Pengiriman:</span>
                <span className="text-sm">Rp {orderDetails.product?.shippingPrice.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="text-sm">Total:</span>
                <span className="text-sm">Rp {(orderDetails.product?.price + orderDetails.product?.shippingPrice).toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>
          
          {/* Informasi pembayaran bank transfer */}
          {orderDetails.paymentStatus !== "paid" && orderDetails.paymentLink && (
            <div className="mt-4 border border-amber-200 bg-amber-50 rounded-md p-4">
              <h3 className="font-medium text-amber-800 mb-2">Instruksi Pembayaran:</h3>
              
              {/* Cek data dari session storage sebelum menggunakan order details */}
              {paymentData?.va_number ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Bank:</span>
                    <span className="text-sm font-medium text-gray-900 uppercase">{paymentData.bank || "Permata"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Nomor VA:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{paymentData.va_number}</span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6"
                        onClick={() => {
                          navigator.clipboard.writeText(paymentData.va_number);
                          toast({
                            title: "Disalin!",
                            description: "Nomor VA telah disalin ke clipboard",
                            variant: "default",
                          });
                        }}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="mt-3 text-xs text-gray-600">
                    <p>1. Lakukan transfer ke nomor Virtual Account di atas</p>
                    <p>2. Pastikan jumlah transfer sesuai dengan total pembayaran</p>
                    <p>3. Pembayaran akan diverifikasi secara otomatis</p>
                  </div>
                  
                  <div className="mt-3">
                    <Button
                      className="w-full text-xs"
                      variant="outline"
                      onClick={() => {
                        // Pastikan URL menggunakan format produksi, bukan sandbox
                        let paymentLink = orderDetails.paymentLink || paymentData.paymentLink;
                        if (paymentLink && paymentLink.includes('sandbox')) {
                          paymentLink = paymentLink.replace('app.sandbox.midtrans.com', 'app.midtrans.com');
                        }
                        window.open(paymentLink, '_blank');
                      }}
                    >
                      Lihat Detail Pembayaran
                    </Button>
                  </div>
                </div>
              ) : orderDetails.va_number ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Bank:</span>
                    <span className="text-sm font-medium text-gray-900 uppercase">{orderDetails.bank || "Permata"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Nomor VA:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{orderDetails.va_number}</span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6"
                        onClick={() => {
                          navigator.clipboard.writeText(orderDetails.va_number);
                          toast({
                            title: "Disalin!",
                            description: "Nomor VA telah disalin ke clipboard",
                            variant: "default",
                          });
                        }}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="mt-3 text-xs text-gray-600">
                    <p>1. Lakukan transfer ke nomor Virtual Account di atas</p>
                    <p>2. Pastikan jumlah transfer sesuai dengan total pembayaran</p>
                    <p>3. Pembayaran akan diverifikasi secara otomatis</p>
                  </div>
                  
                  <div className="mt-3">
                    <Button
                      className="w-full text-xs"
                      variant="outline"
                      onClick={() => {
                        // Pastikan URL menggunakan format produksi, bukan sandbox
                        let paymentLink = orderDetails.paymentLink;
                        if (paymentLink && paymentLink.includes('sandbox')) {
                          paymentLink = paymentLink.replace('app.sandbox.midtrans.com', 'app.midtrans.com');
                        }
                        window.open(paymentLink, '_blank');
                      }}
                    >
                      Lihat Detail Pembayaran
                    </Button>
                  </div>
                </div>
              ) : (
                // Fallback jika tidak ada detail VA
                <div className="space-y-2 text-sm">
                  <p>Silakan kunjungi halaman pembayaran untuk menyelesaikan transaksi:</p>
                  <Button
                    className="w-full"
                    onClick={() => {
                      // Pastikan URL menggunakan format produksi, bukan sandbox
                      let paymentLink = orderDetails.paymentLink;
                      if (paymentLink && paymentLink.includes('sandbox')) {
                        paymentLink = paymentLink.replace('app.sandbox.midtrans.com', 'app.midtrans.com');
                      }
                      window.open(paymentLink, '_blank');
                    }}
                  >
                    Lanjutkan ke Halaman Pembayaran
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="mt-6 space-y-3">
            {orderDetails.paymentId && !orderDetails.paymentVerified && (
              <Button 
                className="w-full bg-amber-500 hover:bg-amber-600" 
                onClick={async () => {
                  try {
                    const statusResponse = await apiRequest("GET", `/api/payments/${orderDetails.paymentId}/status`);
                    const statusData = await statusResponse.json();
                    
                    if (statusData.status === "PAID" || statusData.status === "SETTLED") {
                      setOrderDetails({
                        ...orderDetails,
                        paymentVerified: true,
                        paymentStatus: "paid"
                      });
                      
                      // Update order status
                      await apiRequest("PATCH", `/api/orders/${orderId}`, {
                        paymentStatus: "paid",
                        orderStatus: "paid"
                      });
                      
                      toast({
                        title: "Berhasil",
                        description: "Status pembayaran telah diverifikasi",
                        variant: "default",
                      });
                    } else {
                      toast({
                        title: "Belum Terverifikasi",
                        description: `Status pembayaran: ${statusData.status}`,
                        variant: "default",
                      });
                    }
                  } catch (error) {
                    console.error("Error verifying payment:", error);
                    toast({
                      title: "Gagal",
                      description: "Gagal memverifikasi status pembayaran",
                      variant: "destructive",
                    });
                  }
                }}
              >
                Verifikasi Pembayaran
              </Button>
            )}
            
            <Button 
              className="w-full" 
              onClick={() => setLocation(`/track/${orderId}`)}
            >
              Lacak Pesanan <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => setLocation("/")}
            >
              Kembali ke Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}