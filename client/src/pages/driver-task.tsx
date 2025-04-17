import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import DriverLayout from "@/components/layout/driver-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MapPin, Package, Truck, ArrowRight, Home, AlertCircle, PhoneCall, Clock, CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function DriverTask() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [updating, setUpdating] = useState(false);
  
  // Fetch task details
  const { data: order, isLoading } = useQuery({
    queryKey: [`/api/orders/${id}`],
    enabled: !!id,
  });

  // Fetch product details
  const { data: product } = useQuery({
    queryKey: [`/api/products/${order?.productId}`],
    enabled: !!order?.productId,
  });

  // Update order status mutation
  const updateOrderMutation = useMutation({
    mutationFn: async ({ status, description, location }: { status: string, description: string, location?: string }) => {
      setUpdating(true);
      const res = await apiRequest("PATCH", `/api/orders/${id}/status`, {
        status,
        description,
        location: location || "",
        driverId: user?.id
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/orders/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders/driver"] });
      toast({
        title: "Status updated",
        description: "Order status has been successfully updated",
      });
      setUpdating(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
      setUpdating(false);
    },
  });

  const handleStatusUpdate = (newStatus: string) => {
    let description = "";
    
    switch(newStatus) {
      case "picked_up":
        description = "Package has been picked up from seller";
        break;
      case "in_warehouse":
        description = "Package has been delivered to warehouse";
        break;
      case "in_transit":
        description = "Package is out for delivery";
        break;
      case "delivered":
        description = "Package has been delivered to customer";
        break;
      default:
        description = "Status updated";
    }
    
    updateOrderMutation.mutate({ 
      status: newStatus, 
      description,
      location: order?.deliveryCity || order?.city
    });
  };

  const handleAcceptTask = () => {
    if (!user?.id) return;
    
    let assignmentType = "";
    let newStatus = "";
    let description = "";
    
    if (order?.orderStatus === "paid" || order?.orderStatus === "pending") {
      assignmentType = "pickupDriverId";
      newStatus = "pickup_assigned";
      description = "Driver assigned for pickup";
    } else if (order?.orderStatus === "in_warehouse") {
      assignmentType = "deliveryDriverId";
      newStatus = "delivery_assigned";
      description = "Driver assigned for delivery";
    }
    
    if (assignmentType && newStatus) {
      updateOrderMutation.mutate({
        status: newStatus,
        description,
        location: order?.city
      });
    }
  };

  if (isLoading) {
    return (
      <DriverLayout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </DriverLayout>
    );
  }

  if (!order || !product) {
    return (
      <DriverLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Task Not Found</h2>
          <p className="text-gray-600 mb-8">The task you're looking for doesn't exist or you don't have permission to view it.</p>
          <Button onClick={() => setLocation("/driver")}>
            Return to Dashboard
          </Button>
        </div>
      </DriverLayout>
    );
  }

  // Define the next status based on current status
  const getNextStatus = () => {
    switch(order.orderStatus) {
      case "pickup_assigned":
        return "picked_up";
      case "picked_up":
        return "in_warehouse";
      case "delivery_assigned":
        return "in_transit";
      case "in_transit":
        return "delivered";
      default:
        return null;
    }
  };

  const nextStatus = getNextStatus();
  
  // Get readable status text
  const getStatusText = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Get action text based on status
  const getActionText = () => {
    switch(nextStatus) {
      case "picked_up":
        return "Confirm Pickup";
      case "in_warehouse":
        return "Deliver to Warehouse";
      case "in_transit":
        return "Start Delivery";
      case "delivered":
        return "Confirm Delivery";
      default:
        return "Accept Task";
    }
  };

  // Is this a delivery or pickup task?
  const isDeliveryTask = order.orderStatus === "delivery_assigned" || order.orderStatus === "in_transit";
  
  // Is this an available task that can be accepted?
  const isAvailableTask = (order.orderStatus === "paid" || order.orderStatus === "in_warehouse") && 
                          !order.pickupDriverId && !order.deliveryDriverId;

  // Is this task completed?
  const isCompleted = order.orderStatus === "delivered";

  return (
    <DriverLayout>
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-neutral-800">Task Details</h1>
        <Button variant="outline" onClick={() => setLocation("/driver")}>
          Back to Dashboard
        </Button>
      </div>

      <div className="mb-6">
        <Card className="shadow rounded-lg overflow-hidden">
          <CardHeader className={`px-6 py-4 ${isDeliveryTask ? 'bg-yellow-500' : 'bg-blue-600'} text-white`}>
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl font-semibold">
                {isDeliveryTask ? 'Delivery Task' : 'Pickup Task'}
              </CardTitle>
              <Badge className="bg-white text-neutral-800">
                {getStatusText(order.orderStatus)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {isCompleted && (
              <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <CheckCircle className="text-green-400 h-5 w-5" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-green-700">
                      This task has been completed successfully. Great job!
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {!isCompleted && (
              <div className={`bg-${isDeliveryTask ? 'yellow' : 'blue'}-50 border-l-4 border-${isDeliveryTask ? 'yellow' : 'blue'}-400 p-4 mb-6`}>
                <div className="flex">
                  <div className="flex-shrink-0">
                    {isDeliveryTask ? (
                      <Truck className="text-yellow-600 h-5 w-5" />
                    ) : (
                      <Package className="text-blue-600 h-5 w-5" />
                    )}
                  </div>
                  <div className="ml-3">
                    <p className={`text-sm text-${isDeliveryTask ? 'yellow' : 'blue'}-700`}>
                      {isDeliveryTask 
                        ? "Please deliver this package to the customer's address." 
                        : "Please pick up the package from the seller's address and deliver it to the warehouse."}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mb-6">
              <h3 className="text-lg font-medium text-neutral-900 mb-4">Order Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-neutral-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-neutral-500">Transaction ID</p>
                  <p className="text-neutral-900 font-medium">{order.transactionId}</p>
                </div>
                
                <div className="bg-neutral-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-neutral-500">Product</p>
                  <p className="text-neutral-900">{product.name}</p>
                </div>
                
                <div className="bg-neutral-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-neutral-500">Weight</p>
                  <p className="text-neutral-900">{product.weight} kg</p>
                </div>
                
                <div className="bg-neutral-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-neutral-500">Quantity</p>
                  <p className="text-neutral-900">{product.quantity}</p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-medium text-neutral-900 mb-4">
                {isDeliveryTask ? "Delivery Information" : "Pickup Information"}
              </h3>
              
              <div className="bg-white border border-neutral-200 rounded-lg divide-y divide-neutral-200">
                <div className="p-4 flex items-start">
                  <MapPin className="flex-shrink-0 h-5 w-5 text-neutral-500 mt-0.5 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-neutral-500 mb-1">
                      {isDeliveryTask ? "Delivery Address" : "Pickup Address"}
                    </p>
                    <p className="text-neutral-900">
                      {isDeliveryTask 
                        ? order.deliveryAddress 
                        : product.pickupAddress}
                    </p>
                    <p className="text-neutral-700 text-sm">
                      {isDeliveryTask 
                        ? `${order.deliveryCity}, ${order.deliveryPostalCode}` 
                        : `${product.city}, ${product.postalCode}`}
                    </p>
                  </div>
                </div>
                
                {isDeliveryTask && (
                  <div className="p-4 flex items-start">
                    <Home className="flex-shrink-0 h-5 w-5 text-neutral-500 mt-0.5 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-neutral-500 mb-1">Recipient</p>
                      <p className="text-neutral-900">Customer Name</p>
                      <p className="text-neutral-700 text-sm">+62 811-234-5678</p>
                    </div>
                  </div>
                )}
                
                {!isDeliveryTask && (
                  <div className="p-4 flex items-start">
                    <Home className="flex-shrink-0 h-5 w-5 text-neutral-500 mt-0.5 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-neutral-500 mb-1">Seller</p>
                      <p className="text-neutral-900">Seller Name</p>
                      <p className="text-neutral-700 text-sm">+62 811-234-5678</p>
                    </div>
                  </div>
                )}
                
                <div className="p-4 flex items-start">
                  <Clock className="flex-shrink-0 h-5 w-5 text-neutral-500 mt-0.5 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-neutral-500 mb-1">Time Window</p>
                    <p className="text-neutral-900">
                      {new Date().toLocaleDateString()} | {new Date().getHours() < 12 ? "09:00 - 12:00" : "14:00 - 17:00"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {!isDeliveryTask && (
              <div className="mb-6">
                <h3 className="text-lg font-medium text-neutral-900 mb-4">Warehouse Information</h3>
                <div className="bg-white border border-neutral-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <MapPin className="flex-shrink-0 h-5 w-5 text-neutral-500 mt-0.5 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-neutral-500 mb-1">Destination Warehouse</p>
                      <p className="text-neutral-900">LogiTech Warehouse {product.city}</p>
                      <p className="text-neutral-700 text-sm">
                        Jl. Warehouse No. 123, {product.city}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0 sm:space-x-4">
              <Button
                variant="outline"
                onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(isDeliveryTask ? order.deliveryAddress : product.pickupAddress)}`, '_blank')}
                className="w-full sm:w-auto"
              >
                <MapPin className="mr-2 h-4 w-4" />
                Open in Maps
              </Button>
              
              <Button
                variant="outline"
                className="w-full sm:w-auto"
              >
                <PhoneCall className="mr-2 h-4 w-4" />
                Contact {isDeliveryTask ? "Customer" : "Seller"}
              </Button>

              {isAvailableTask ? (
                <Button
                  className="w-full sm:w-auto bg-primary-800 hover:bg-primary-700"
                  onClick={handleAcceptTask}
                  disabled={updating}
                >
                  {updating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Truck className="mr-2 h-4 w-4" />
                      Accept Task
                    </>
                  )}
                </Button>
              ) : nextStatus && !isCompleted ? (
                <Button
                  className={`w-full sm:w-auto ${
                    isDeliveryTask 
                      ? "bg-yellow-600 hover:bg-yellow-700" 
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                  onClick={() => handleStatusUpdate(nextStatus)}
                  disabled={updating}
                >
                  {updating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      {nextStatus === "delivered" ? (
                        <CheckCircle className="mr-2 h-4 w-4" />
                      ) : (
                        <ArrowRight className="mr-2 h-4 w-4" />
                      )}
                      {getActionText()}
                    </>
                  )}
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Task History */}
      <Card className="shadow rounded-lg overflow-hidden">
        <CardHeader className="px-6 py-4 border-b border-neutral-200">
          <CardTitle className="text-lg font-medium">Task History</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            {order.orderStatus === "pending" && (
              <div className="flex items-start">
                <div className="flex-shrink-0 bg-neutral-100 rounded-full p-2 mr-4">
                  <Package className="h-5 w-5 text-neutral-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-900">Order Created</p>
                  <p className="text-xs text-neutral-500">{new Date(order.createdAt).toLocaleString()}</p>
                </div>
              </div>
            )}
            
            {order.orderStatus !== "pending" && (
              <>
                <div className="flex items-start">
                  <div className="flex-shrink-0 bg-green-100 rounded-full p-2 mr-4">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-900">Payment Confirmed</p>
                    <p className="text-xs text-neutral-500">{new Date(order.updatedAt).toLocaleString()}</p>
                  </div>
                </div>
                
                {(order.orderStatus === "pickup_assigned" || 
                  order.orderStatus === "picked_up" || 
                  order.orderStatus === "in_warehouse" ||
                  order.orderStatus === "delivery_assigned" ||
                  order.orderStatus === "in_transit" ||
                  order.orderStatus === "delivered") && (
                  <div className="flex items-start">
                    <div className="flex-shrink-0 bg-blue-100 rounded-full p-2 mr-4">
                      <Truck className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900">Driver Assigned for Pickup</p>
                      <p className="text-xs text-neutral-500">{new Date(order.updatedAt).toLocaleString()}</p>
                    </div>
                  </div>
                )}
                
                {(order.orderStatus === "picked_up" || 
                  order.orderStatus === "in_warehouse" ||
                  order.orderStatus === "delivery_assigned" ||
                  order.orderStatus === "in_transit" ||
                  order.orderStatus === "delivered") && (
                  <div className="flex items-start">
                    <div className="flex-shrink-0 bg-blue-100 rounded-full p-2 mr-4">
                      <Package className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900">Package Picked Up</p>
                      <p className="text-xs text-neutral-500">{new Date(order.updatedAt).toLocaleString()}</p>
                    </div>
                  </div>
                )}
                
                {(order.orderStatus === "in_warehouse" ||
                  order.orderStatus === "delivery_assigned" ||
                  order.orderStatus === "in_transit" ||
                  order.orderStatus === "delivered") && (
                  <div className="flex items-start">
                    <div className="flex-shrink-0 bg-blue-100 rounded-full p-2 mr-4">
                      <Home className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900">Arrived at Warehouse</p>
                      <p className="text-xs text-neutral-500">{new Date(order.updatedAt).toLocaleString()}</p>
                    </div>
                  </div>
                )}
                
                {(order.orderStatus === "delivery_assigned" ||
                  order.orderStatus === "in_transit" ||
                  order.orderStatus === "delivered") && (
                  <div className="flex items-start">
                    <div className="flex-shrink-0 bg-yellow-100 rounded-full p-2 mr-4">
                      <Truck className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900">Driver Assigned for Delivery</p>
                      <p className="text-xs text-neutral-500">{new Date(order.updatedAt).toLocaleString()}</p>
                    </div>
                  </div>
                )}
                
                {(order.orderStatus === "in_transit" ||
                  order.orderStatus === "delivered") && (
                  <div className="flex items-start">
                    <div className="flex-shrink-0 bg-yellow-100 rounded-full p-2 mr-4">
                      <Truck className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900">Out for Delivery</p>
                      <p className="text-xs text-neutral-500">{new Date(order.updatedAt).toLocaleString()}</p>
                    </div>
                  </div>
                )}
                
                {order.orderStatus === "delivered" && (
                  <div className="flex items-start">
                    <div className="flex-shrink-0 bg-green-100 rounded-full p-2 mr-4">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900">Package Delivered</p>
                      <p className="text-xs text-neutral-500">{new Date(order.updatedAt).toLocaleString()}</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </DriverLayout>
  );
}
