import { useEffect, useState } from "react";
import UserLayout from "@/components/layout/user-layout";
import { SellProductForm } from "@/components/orders/sell-product-form";
import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { PurchaseForm } from "@/components/orders/purchase-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatToIDR } from "@/lib/xendit";
import { Link, useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search } from "lucide-react";

export default function CreateOrder() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [selectedTab, setSelectedTab] = useState("sell");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  
  // Fetch available products to buy
  const { data: availableProducts = [] } = useQuery<any[]>({
    queryKey: ["/api/products/available"],
    enabled: selectedTab === "buy",
  });
  
  // Handle transaction ID search
  const handleSearch = async () => {
    if (!transactionId.trim()) {
      toast({
        title: "Transaction ID Required",
        description: "Please enter a transaction ID to search",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsSearching(true);
      
      // Redirect to the search product page with the transaction ID
      setLocation(`/search-product?transactionId=${transactionId}`);
    } catch (error) {
      toast({
        title: "Search Failed",
        description: error instanceof Error ? error.message : "Failed to search for order",
        variant: "destructive"
      });
      setIsSearching(false);
    }
  };

  return (
    <UserLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-800">Create Order</h1>
      </div>

      <Tabs defaultValue="sell" value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="sell">Sell Product</TabsTrigger>
          <TabsTrigger value="buy">Buy Product</TabsTrigger>
        </TabsList>
        
        <TabsContent value="sell">
          <SellProductForm />
        </TabsContent>
        
        <TabsContent value="buy">
          {selectedOrderId ? (
            <PurchaseForm orderId={selectedOrderId} />
          ) : (
            <div className="space-y-6">
              {/* Search Transaction ID Card */}
              <Card className="shadow rounded-lg mb-8">
                <CardHeader className="px-4 py-5 sm:px-6 bg-primary-500 text-white">
                  <CardTitle className="text-xl font-bold">Search by Transaction ID</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <p className="text-neutral-600">
                      Have a transaction ID from a seller? Enter it below to find and purchase their product.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1">
                        <input 
                          type="text" 
                          className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                          placeholder="Enter transaction ID..."
                          value={transactionId}
                          onChange={(e) => setTransactionId(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        />
                      </div>
                      <Button 
                        className="bg-primary-600 hover:bg-primary-700"
                        onClick={handleSearch}
                        disabled={isSearching}
                      >
                        {isSearching ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Searching...
                          </>
                        ) : (
                          <>
                            <Search className="mr-2 h-4 w-4" />
                            Search
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="flex justify-center mt-2">
                      <Link href="/search-product" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                        Go to advanced search page
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Available Products Card */}
              <Card className="shadow rounded-lg">
                <CardHeader className="px-4 py-5 sm:px-6 bg-secondary-500 text-white">
                  <CardTitle className="text-xl font-bold">Available Products</CardTitle>
                </CardHeader>
                <CardContent className="px-0 pt-0">
                  {availableProducts && availableProducts.length > 0 ? (
                    <div className="divide-y divide-neutral-200">
                      {availableProducts.map((product: any) => (
                        <div key={product.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between">
                          <div className="mb-4 sm:mb-0">
                            <h3 className="text-lg font-medium text-neutral-900">{product.name}</h3>
                            <p className="text-sm text-neutral-500 mt-1">{product.description}</p>
                            <div className="flex items-center mt-2">
                              <Badge className="mr-2 bg-blue-100 text-blue-800">
                                {product.category}
                              </Badge>
                              <span className="text-sm text-neutral-500">
                                {product.weight} kg • {product.quantity} available
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-lg font-semibold text-neutral-900 mb-2">
                              {formatToIDR(product.price)}
                            </span>
                            <Button 
                              onClick={() => setSelectedOrderId(product.orderId)}
                              className="bg-secondary-600 hover:bg-secondary-700"
                            >
                              Buy Now
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center">
                      <h3 className="text-lg font-medium text-neutral-700 mb-2">No Products Available</h3>
                      <p className="text-neutral-500 mb-6">There are no products available for purchase at this time.</p>
                      <Button onClick={() => setSelectedTab("sell")}>
                        Sell Your Product Instead
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </UserLayout>
  );
}
