import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Search, ShoppingBasket } from "lucide-react";
import UserLayout from "@/components/layout/user-layout";
import { formatToIDR, redirectToXenditPayment } from "@/lib/xendit";
import { useLocation } from "wouter";

// Schema for transaction search form
const searchSchema = z.object({
  transactionId: z.string().min(1, "Transaction ID is required")
});

export default function SearchProduct() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [location, params] = useLocation();
  const [searchResult, setSearchResult] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  
  // Parse the query parameter
  const searchParams = typeof params === 'string' ? params : window.location.search;
  const queryParams = new URLSearchParams(searchParams);
  const queryTransactionId = queryParams.get('transactionId');

  // Form for searching by transaction ID
  const form = useForm<z.infer<typeof searchSchema>>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      transactionId: queryTransactionId || ""
    }
  });
  
  // Auto-search if transactionId is provided in the URL
  useEffect(() => {
    if (queryTransactionId) {
      form.setValue('transactionId', queryTransactionId);
      onSubmit({ transactionId: queryTransactionId });
    }
  }, [queryTransactionId]);

  // Handle form submission
  const onSubmit = async (data: z.infer<typeof searchSchema>) => {
    try {
      setIsSearching(true);
      setSearchResult(null);
      
      // Call API to search for order by transaction ID
      const res = await apiRequest("GET", `/api/orders/transaction/${data.transactionId}`);
      
      if (res.status === 404) {
        toast({
          title: "Order Not Found",
          description: "No order found with that transaction ID.",
          variant: "destructive"
        });
        setIsSearching(false);
        return;
      }
      
      const order = await res.json();
      
      // Get product details
      const productRes = await apiRequest("GET", `/api/products/${order.productId}`);
      const product = await productRes.json();
      
      setSearchResult({ ...order, product });
      setIsSearching(false);
      
    } catch (error) {
      toast({
        title: "Search Failed",
        description: error instanceof Error ? error.message : "Failed to search for order",
        variant: "destructive"
      });
      setIsSearching(false);
    }
  };

  // Mutation for purchasing a product
  const purchaseMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const res = await apiRequest("POST", `/api/orders/${orderId}/purchase`, {
        buyerId: user?.id
      });
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Product Purchase Initiated",
        description: "You will be redirected to the payment page."
      });
      
      // Jika ada payment link, arahkan langsung ke Xendit
      if (data.paymentLink) {
        redirectToXenditPayment(data.paymentLink);
      } else {
        // Jika tidak ada payment link, arahkan ke halaman purchase form
        window.location.href = `/purchase/${data.id}`;
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Purchase Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Handle purchase button click
  const handlePurchase = () => {
    if (searchResult && searchResult.id) {
      if (searchResult.paymentLink) {
        // Jika sudah ada payment link, langsung arahkan ke Xendit
        redirectToXenditPayment(searchResult.paymentLink);
      } else {
        // Jika belum ada payment link, buat payment baru
        purchaseMutation.mutate(searchResult.id);
      }
    }
  };

  return (
    <UserLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6 text-primary-600">Find Product by Transaction ID</h1>
        
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Search Product</CardTitle>
            <CardDescription>
              Enter the transaction ID provided by the seller to find and purchase a product
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="flex-1">
                  <Input
                    {...form.register("transactionId")}
                    placeholder="Enter transaction ID..."
                    className="w-full"
                  />
                  {form.formState.errors.transactionId && (
                    <p className="text-sm text-red-500 mt-1">
                      {form.formState.errors.transactionId.message}
                    </p>
                  )}
                </div>
                <Button type="submit" disabled={isSearching}>
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Search className="h-4 w-4 mr-2" />
                  )}
                  Search
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {searchResult && (
          <Card>
            <CardHeader>
              <CardTitle>Product Found</CardTitle>
              <CardDescription>
                Transaction ID: {searchResult.transactionId}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-lg font-medium">Product Details</h3>
                    <div className="mt-2 space-y-2">
                      <p><span className="font-medium">Name:</span> {searchResult.product.name}</p>
                      <p><span className="font-medium">Category:</span> {searchResult.product.category}</p>
                      <p><span className="font-medium">Price:</span> {formatToIDR(searchResult.product.price)}</p>
                      <p><span className="font-medium">Weight:</span> {searchResult.product.weight} kg</p>
                      <p><span className="font-medium">Description:</span> {searchResult.product.description || "No description provided"}</p>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium">Shipping Details</h3>
                    <div className="mt-2 space-y-2">
                      <p><span className="font-medium">Pickup Address:</span> {searchResult.product.pickupAddress}</p>
                      <p><span className="font-medium">City:</span> {searchResult.product.city}</p>
                      <p><span className="font-medium">Postal Code:</span> {searchResult.product.postalCode}</p>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="flex justify-end">
                  <Button
                    onClick={handlePurchase}
                    disabled={purchaseMutation.isPending}
                    className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                  >
                    {purchaseMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <ShoppingBasket className="h-4 w-4 mr-2" />
                    )}
                    Purchase this product
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </UserLayout>
  );
}