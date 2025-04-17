import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import UserLayout from "@/components/layout/user-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Timeline,
  TimelineItem,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineHeader,
  TimelineSeparator,
  TimelineTitle
} from "@/components/ui/timeline";
import { Loader2, Package, Truck, CheckCircle, MapPin, Warehouse } from "lucide-react";

export default function OrderTracking() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  
  // Fetch order details
  const { data: order, isLoading: isLoadingOrder } = useQuery({
    queryKey: [`/api/orders/${id}`],
    enabled: !!id,
  });

  // Fetch tracking events
  const { data: trackingEvents, isLoading: isLoadingEvents } = useQuery({
    queryKey: [`/api/tracking/${id}`],
    enabled: !!id,
  });

  // Fetch product details
  const { data: product } = useQuery({
    queryKey: [`/api/products/${order?.productId}`],
    enabled: !!order?.productId,
  });

  const isLoading = isLoadingOrder || isLoadingEvents;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
        return "text-green-600";
      case "in_transit":
      case "delivery_assigned":
        return "text-yellow-600";
      case "in_warehouse":
      case "picked_up":
      case "pickup_assigned":
        return "text-blue-600";
      default:
        return "text-gray-600";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
      case "paid":
        return <Package className="h-5 w-5" />;
      case "pickup_assigned":
      case "picked_up":
        return <Truck className="h-5 w-5" />;
      case "in_warehouse":
        return <Warehouse className="h-5 w-5" />;
      case "delivery_assigned":
      case "in_transit":
        return <Truck className="h-5 w-5" />;
      case "delivered":
        return <CheckCircle className="h-5 w-5" />;
      default:
        return <MapPin className="h-5 w-5" />;
    }
  };

  if (isLoading) {
    return (
      <UserLayout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </UserLayout>
    );
  }

  if (!order || !product) {
    return (
      <UserLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Order Not Found</h2>
          <p className="text-gray-600 mb-8">The order you're looking for doesn't exist or you don't have permission to view it.</p>
          <Button onClick={() => setLocation("/")}>
            Return to Dashboard
          </Button>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-neutral-800">Order Tracking</h1>
        <Button variant="outline" onClick={() => setLocation("/")}>
          Back to Dashboard
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="shadow rounded-lg mb-6">
            <CardHeader className="flex flex-row items-center justify-between border-b border-neutral-200">
              <CardTitle className="text-lg font-medium">Tracking Information</CardTitle>
              <Badge className={`status-${order.orderStatus.toLowerCase()}`}>
                {order.orderStatus.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Badge>
            </CardHeader>
            <CardContent className="pt-6">
              <Timeline>
                {trackingEvents && trackingEvents.length > 0 ? (
                  trackingEvents.map((event: any, index: number) => (
                    <TimelineItem key={event.id}>
                      <TimelineSeparator>
                        <TimelineDot className={getStatusColor(event.status)}>
                          {getStatusIcon(event.status)}
                        </TimelineDot>
                        {index < trackingEvents.length - 1 && <TimelineConnector />}
                      </TimelineSeparator>
                      <TimelineContent>
                        <TimelineHeader>
                          <TimelineTitle>{event.description}</TimelineTitle>
                        </TimelineHeader>
                        <div className="text-sm text-neutral-500 mt-1">
                          {new Date(event.timestamp).toLocaleString()} 
                          {event.location && ` - ${event.location}`}
                        </div>
                      </TimelineContent>
                    </TimelineItem>
                  ))
                ) : (
                  <div className="py-4 text-center text-neutral-500">
                    No tracking information available yet.
                  </div>
                )}
              </Timeline>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="shadow rounded-lg mb-6">
            <CardHeader className="border-b border-neutral-200">
              <CardTitle className="text-lg font-medium">Order Details</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <dl className="divide-y divide-neutral-200">
                <div className="py-3 flex justify-between">
                  <dt className="text-sm font-medium text-neutral-500">Order ID</dt>
                  <dd className="text-sm text-neutral-900">{order.transactionId}</dd>
                </div>
                <div className="py-3 flex justify-between">
                  <dt className="text-sm font-medium text-neutral-500">Product</dt>
                  <dd className="text-sm text-neutral-900">{product.name}</dd>
                </div>
                <div className="py-3 flex justify-between">
                  <dt className="text-sm font-medium text-neutral-500">Quantity</dt>
                  <dd className="text-sm text-neutral-900">{product.quantity}</dd>
                </div>
                <div className="py-3 flex justify-between">
                  <dt className="text-sm font-medium text-neutral-500">Weight</dt>
                  <dd className="text-sm text-neutral-900">{product.weight} kg</dd>
                </div>
                <div className="py-3 flex justify-between">
                  <dt className="text-sm font-medium text-neutral-500">Order Date</dt>
                  <dd className="text-sm text-neutral-900">{new Date(order.createdAt).toLocaleDateString()}</dd>
                </div>
                <div className="py-3 flex justify-between">
                  <dt className="text-sm font-medium text-neutral-500">Payment Status</dt>
                  <dd className="text-sm text-neutral-900">
                    <Badge className={order.paymentStatus === "paid" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                      {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
                    </Badge>
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card className="shadow rounded-lg">
            <CardHeader className="border-b border-neutral-200">
              <CardTitle className="text-lg font-medium">Delivery Information</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {order.deliveryAddress ? (
                <dl className="divide-y divide-neutral-200">
                  <div className="py-3 flex flex-col">
                    <dt className="text-sm font-medium text-neutral-500">Delivery Address</dt>
                    <dd className="text-sm text-neutral-900 mt-1">{order.deliveryAddress}</dd>
                  </div>
                  <div className="py-3 flex flex-col">
                    <dt className="text-sm font-medium text-neutral-500">City</dt>
                    <dd className="text-sm text-neutral-900 mt-1">{order.deliveryCity}</dd>
                  </div>
                  <div className="py-3 flex flex-col">
                    <dt className="text-sm font-medium text-neutral-500">Postal Code</dt>
                    <dd className="text-sm text-neutral-900 mt-1">{order.deliveryPostalCode}</dd>
                  </div>
                  {order.estimatedDelivery && (
                    <div className="py-3 flex flex-col">
                      <dt className="text-sm font-medium text-neutral-500">Estimated Delivery</dt>
                      <dd className="text-sm text-neutral-900 mt-1">{order.estimatedDelivery}</dd>
                    </div>
                  )}
                </dl>
              ) : (
                <div className="py-4 text-center text-neutral-500">
                  Delivery information will be available after payment.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </UserLayout>
  );
}
