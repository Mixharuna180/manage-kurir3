import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function OrderFailed() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
        
        setOrderDetails({
          ...data,
          product: productData
        });
        
        // Update order tracking if needed
        try {
          // Only update if not already failed or expired
          if (data.paymentStatus !== "failed" && data.paymentStatus !== "expired") {
            await apiRequest("PATCH", `/api/orders/${orderId}`, {
              paymentStatus: "failed",
            });
            
            // Create tracking event
            await apiRequest("POST", `/api/tracking`, {
              orderId: parseInt(orderId),
              status: "payment_failed",
              description: "Payment failed (via redirect)",
              location: null
            });
          }
        } catch (trackingError) {
          console.error("Error updating tracking:", trackingError);
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
              <AlertCircle className="h-8 w-8 text-red-500" />
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
            <AlertCircle className="h-16 w-16 text-red-500 mb-2" />
            <h1 className="text-2xl font-bold text-gray-900 text-center">Pembayaran Gagal</h1>
            <p className="mt-2 text-center text-gray-600">
              Pembayaran Anda tidak berhasil diproses. Silakan coba lagi.
            </p>
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

          <div className="mt-6 space-y-3">
            <Button 
              className="w-full" 
              onClick={() => window.location.href = orderDetails.paymentLink}
            >
              Coba Bayar Lagi <ArrowRight className="ml-1 h-4 w-4" />
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