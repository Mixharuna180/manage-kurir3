import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { purchaseFormSchema, Order, Product } from "@shared/schema";
import { useLocation } from "wouter";
import { formatToIDR, getSnapToken, loadMidtransScript, processSnapPayment } from "@/lib/midtrans";
import { Loader2 } from "lucide-react";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface PurchaseFormProps {
  orderId: string;
}

export function PurchaseForm({ orderId }: PurchaseFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // Fetch the order details
  const { data: order, isLoading } = useQuery<Order>({
    queryKey: [`/api/orders/${orderId}`],
    enabled: !!orderId,
  });

  // Fetch the product details
  const { data: product } = useQuery<Product>({
    queryKey: [`/api/products/${order?.productId}`],
    enabled: !!order?.productId,
  });
  
  const form = useForm({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: user?.email || "",
      phone: user?.phoneNumber || "",
      deliveryAddress: user?.address || "",
      city: user?.city || "",
      state: "",
      postalCode: user?.postalCode || "",
    },
  });

  const updateOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", `/api/orders/${orderId}`, {
        buyerId: user?.id,
        deliveryAddress: data.deliveryAddress,
        deliveryCity: data.city,
        deliveryPostalCode: data.postalCode,
      });
      return res.json();
    },
    onSuccess: (data) => {
      createPaymentMutation.mutate({
        orderId: data.id,
        amount: product?.price,
        customerName: `${form.getValues("firstName")} ${form.getValues("lastName")}`,
        customerEmail: form.getValues("email"),
        deliveryAddress: form.getValues("deliveryAddress"),
        deliveryCity: form.getValues("city"),
        deliveryState: form.getValues("state"),
        deliveryPostalCode: form.getValues("postalCode"),
        phoneNumber: form.getValues("phone"),
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating order",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Muat Midtrans Snap script ketika component dimount
  useEffect(() => {
    loadMidtransScript().catch(error => {
      console.error('Failed to load Midtrans script:', error);
    });
  }, []);
  
  const createPaymentMutation = useMutation({
    mutationFn: async (data: any) => {
      // Dapatkan Snap token dari server
      try {
        console.log("Getting Snap token for payment");
        const snapResponse = await getSnapToken(
          data.orderId,
          data.amount || 0,
          data.customerName,
          data.customerEmail
        );
        
        console.log("Snap token response:", snapResponse);
        return {
          ...data,
          token: snapResponse.token,
          redirectUrl: snapResponse.redirectUrl,
          va_number: snapResponse.va_number,
          bank: snapResponse.bank
        };
      } catch (error) {
        console.error("Error getting Snap token:", error);
        
        // Fallback ke API payments biasa jika gagal mendapatkan token
        console.log("Falling back to regular payment API");
        const res = await apiRequest("POST", "/api/payments", data);
        return res.json();
      }
    },
    onSuccess: (data) => {
      console.log("Payment data received:", data);
      
      // Simpan data pembayaran ke sessionStorage untuk digunakan di halaman konfirmasi
      try {
        // Pastikan paymentLink menggunakan URL produksi, bukan sandbox
        let paymentLink = data.redirectUrl || data.paymentLink;
        if (paymentLink && paymentLink.includes('sandbox')) {
          paymentLink = paymentLink.replace('app.sandbox.midtrans.com', 'app.midtrans.com');
        }
        
        sessionStorage.setItem(`payment_${data.orderId}`, JSON.stringify({
          va_number: data.va_number,
          bank: data.bank,
          paymentLink: paymentLink,
          amount: data.amount,
          paymentId: data.paymentId,
          token: data.token
        }));
      } catch (err) {
        console.error("Error storing payment data in session storage:", err);
      }
      
      // Jika mendapatkan token Snap, gunakan popup Midtrans
      if (data.token) {
        console.log("Opening Midtrans Snap with token:", data.token);
        
        // Pastikan script Midtrans sudah dimuat
        if (typeof window.snap !== "undefined") {
          window.snap.pay(data.token, {
            onSuccess: function(result) {
              console.log('Payment success:', result);
              setLocation(`/order-success?id=${data.orderId}`);
            },
            onPending: function(result) {
              console.log('Payment pending:', result);
              setLocation(`/order-success?id=${data.orderId}`);
            },
            onError: function(result) {
              console.log('Payment error:', result);
              setLocation(`/order-failed?id=${data.orderId}`);
            },
            onClose: function() {
              console.log('Customer closed the popup without finishing payment');
              // Redirect ke halaman sukses tetap untuk menampilkan info pembayaran
              setLocation(`/order-success?id=${data.orderId}`);
            }
          });
        } else {
          // Jika Snap belum dimuat, redirect ke URL
          // Pastikan URL menggunakan format produksi, bukan sandbox
          let redirectUrl = data.redirectUrl;
          if (redirectUrl && redirectUrl.includes('sandbox')) {
            redirectUrl = redirectUrl.replace('app.sandbox.midtrans.com', 'app.midtrans.com');
          }
          
          window.location.href = redirectUrl || 
            `https://app.midtrans.com/snap/v3/vtweb/${data.token}`;
        }
      } else {
        // Jika tidak ada token, langsung arahkan ke halaman sukses dengan info pembayaran
        setLocation(`/order-success?id=${data.orderId}`);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating payment",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Fungsi untuk memproses pembayaran menggunakan Midtrans
  const handlePaymentProcess = async (updatedOrder: any, customerInfo: any) => {
    try {
      console.log("Attempting to get Snap token for payment");
      
      // Get Snap token
      const snapResponse = await getSnapToken(
        updatedOrder.id,
        product?.price || 0,
        customerInfo.customerName,
        customerInfo.customerEmail
      );
      
      console.log("Snap token response:", snapResponse);
      
      // Simpan info pembayaran untuk halaman sukses
      try {
        sessionStorage.setItem(`payment_${updatedOrder.id}`, JSON.stringify({
          token: snapResponse.token,
          va_number: snapResponse.va_number,
          bank: snapResponse.bank,
          amount: product?.price || 0,
          paymentLink: snapResponse.redirectUrl
        }));
      } catch (err) {
        console.error("Error storing payment data in session storage:", err);
      }
      
      try {
        // Muat Midtrans script terlebih dahulu untuk menghindari error "snap cannot called"
        await loadMidtransScript();
        
        // Gunakan fungsi processSnapPayment dari @/lib/midtrans dengan metode yang lebih andal
        const success = await processSnapPayment(
          snapResponse.token, 
          updatedOrder.id,
          snapResponse.redirectUrl,
          // Tambahkan callback functions untuk menangani berbagai skenario
          (result) => {
            console.log("Payment success:", result);
            window.location.href = `/order-success?id=${updatedOrder.id}`;
          },
          (result) => {
            console.log("Payment pending:", result);
            window.location.href = `/order-success?id=${updatedOrder.id}`;
          },
          (result) => {
            console.log("Payment error:", result);
            window.location.href = `/order-failed?id=${updatedOrder.id}`;
          },
          () => {
            console.log("Payment window closed");
            // Pengguna menutup jendela pembayaran
            window.location.href = `/order-success?id=${updatedOrder.id}`;
          }
        );
        
        if (!success) {
          console.log("Snap payment failed, trying fallback");
          // Fallback ke pembayaran biasa jika Snap gagal
          createPaymentMutation.mutate(customerInfo);
        }
      } catch (snapError) {
        console.error("Error opening Snap payment:", snapError);
        // Fallback ke pembayaran biasa jika Snap error
        createPaymentMutation.mutate(customerInfo);
      }
    } catch (error) {
      console.error("Error with payment process:", error);
      // Fallback ke pembayaran biasa jika Snap gagal
      createPaymentMutation.mutate(customerInfo);
    }
  };

  const onSubmit = (data: any) => {
    updateOrderMutation.mutate(data, {
      onSuccess: (updatedOrder) => {
        console.log("Order updated successfully:", updatedOrder);
        
        // Setelah berhasil mengupdate order, arahkan ke halaman pembayaran jika ada payment link
        if (updatedOrder.paymentLink) {
          console.log("Using existing payment link:", updatedOrder.paymentLink);
          
          // Simpan info pembayaran dari order jika tersedia
          if (updatedOrder.va_number || updatedOrder.bank) {
            try {
              // Pastikan paymentLink menggunakan URL produksi, bukan sandbox
              let paymentLink = updatedOrder.paymentLink;
              if (paymentLink && paymentLink.includes('sandbox')) {
                paymentLink = paymentLink.replace('app.sandbox.midtrans.com', 'app.midtrans.com');
              }
              
              sessionStorage.setItem(`payment_${updatedOrder.id}`, JSON.stringify({
                va_number: updatedOrder.va_number,
                bank: updatedOrder.bank,
                paymentLink: paymentLink,
                amount: product?.price || 0
              }));
            } catch (err) {
              console.error("Error storing payment data in session storage:", err);
            }
          }
          
          // Langsung arahkan ke halaman order-success untuk menampilkan tagihan
          setLocation(`/order-success?id=${updatedOrder.id}`);
        } else {
          console.log("Creating new payment for order:", updatedOrder.id);
          
          // Data pembayaran
          const customerInfo = {
            orderId: updatedOrder.id,
            amount: product?.price || 0,
            customerName: `${data.firstName} ${data.lastName}`,
            customerEmail: data.email || user?.email,
            deliveryAddress: data.deliveryAddress,
            deliveryCity: data.city,
            deliveryState: data.state,
            deliveryPostalCode: data.postalCode,
            phoneNumber: data.phone
          };
          
          // Gunakan fungsi async terpisah untuk proses Snap payment
          handlePaymentProcess(updatedOrder, customerInfo);
        }
      }
    });
  };

  const isPending = updateOrderMutation.isPending || createPaymentMutation.isPending;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!order || !product) {
    return (
      <div className="text-center p-8">
        <p>Order not found</p>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={() => setLocation("/")}
        >
          Return to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-4 py-5 sm:px-6 bg-secondary-500 text-white">
        <h2 className="text-xl font-bold">Complete Your Purchase</h2>
        <p className="mt-1 text-sm text-white">Enter your shipping information to complete the order</p>
      </div>
      
      <div className="px-4 py-5 sm:p-6">
        <div className="mb-8 p-4 bg-neutral-50 rounded-lg">
          <h3 className="text-lg font-medium text-neutral-800 mb-4">Order Summary</h3>
          <div className="flex justify-between mb-2">
            <span className="text-neutral-600">Transaction ID:</span>
            <span className="font-medium">{order.transactionId}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-neutral-600">Product:</span>
            <span>{product.name}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-neutral-600">Product Price:</span>
            <span>{formatToIDR(product.price)}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-neutral-600">Shipping Cost:</span>
            <span>{formatToIDR(product.shippingPrice)}</span>
          </div>
          <div className="flex justify-between border-t pt-2 mt-2">
            <span className="text-neutral-600">Total:</span>
            <span className="text-lg font-semibold text-neutral-900">
              {formatToIDR(product.price + product.shippingPrice)}
            </span>
          </div>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-neutral-800 mb-4">Shipping Information</h3>
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-3">
                      <FormLabel>First name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-3">
                      <FormLabel>Last name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-6">
                      <FormLabel>Email address</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-6">
                      <FormLabel>Phone number</FormLabel>
                      <FormControl>
                        <Input {...field} type="tel" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="deliveryAddress"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-6">
                      <FormLabel>Delivery Address</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>State / Province</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="postalCode"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Postal code</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-neutral-800 mb-4">Payment Method</h3>
              <div className="mt-1 bg-neutral-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <img 
                    src="https://midtrans.com/assets/images/logo-midtrans-color.png" 
                    alt="Midtrans" 
                    className="h-8" 
                  />
                  <span className="ml-2 text-sm text-neutral-600">
                    You'll be redirected to Midtrans to complete payment
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-5">
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="mr-3"
                  onClick={() => setLocation("/")}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={isPending}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Proceed to Payment"
                  )}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
