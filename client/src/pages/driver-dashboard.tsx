import { useQuery } from "@tanstack/react-query";
import DriverLayout from "@/components/layout/driver-layout";
import { StatsCard } from "@/components/dashboard/stats-card";
import { RecentOrders } from "@/components/dashboard/recent-orders";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { useAuth } from "@/hooks/use-auth";
import { Inbox, Clock, Truck, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function DriverDashboard() {
  const { user } = useAuth();
  
  // Fetch orders assigned to the driver
  const { data: availableOrders, isLoading: isLoadingAvailable } = useQuery({
    queryKey: ["/api/orders/available"],
    enabled: !!user,
  });

  // Fetch assigned orders for the driver
  const { data: assignedOrders, isLoading: isLoadingAssigned } = useQuery({
    queryKey: ["/api/orders/driver"],
    enabled: !!user,
  });

  // Calculate order stats
  const orderStats = {
    available: availableOrders?.length || 0,
    assignedPickups: assignedOrders?.filter(o => o.orderStatus === "pickup_assigned").length || 0,
    deliveries: assignedOrders?.filter(o => o.orderStatus === "in_transit" || o.orderStatus === "delivery_assigned").length || 0,
    completedToday: assignedOrders?.filter(o => {
      const today = new Date().toISOString().split('T')[0];
      const orderDate = new Date(o.updatedAt).toISOString().split('T')[0];
      return o.orderStatus === "delivered" && orderDate === today;
    }).length || 0,
  };

  // Get current active task if any
  const currentTask = assignedOrders?.find(o => 
    o.orderStatus === "pickup_assigned" || 
    o.orderStatus === "in_transit" || 
    o.orderStatus === "delivery_assigned"
  );

  return (
    <DriverLayout>
      {/* Dashboard Overview */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-800 mb-4">Driver Dashboard</h1>
        
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Available Orders"
            value={orderStats.available}
            icon={<Inbox className="text-xl text-green-600" />}
            iconBgColor="bg-green-100"
            textColor="text-primary-600"
            linkText="View all"
            linkHref="#available-orders"
          />
          
          <StatsCard
            title="Assigned Pickups"
            value={orderStats.assignedPickups}
            icon={<Clock className="text-xl text-blue-600" />}
            iconBgColor="bg-blue-100"
            textColor="text-primary-600"
            linkText="View assignments"
            linkHref="#"
          />
          
          <StatsCard
            title="Ongoing Deliveries"
            value={orderStats.deliveries}
            icon={<Truck className="text-xl text-yellow-600" />}
            iconBgColor="bg-yellow-100"
            textColor="text-primary-600"
            linkText="View deliveries"
            linkHref="#"
          />
          
          <StatsCard
            title="Completed Today"
            value={orderStats.completedToday}
            icon={<CheckCircle className="text-xl text-green-600" />}
            iconBgColor="bg-green-100"
            textColor="text-primary-600"
            linkText="View history"
            linkHref="#"
          />
        </div>
      </div>

      {/* Current Task */}
      {currentTask && (
        <Card className="shadow rounded-lg mb-8">
          <CardHeader className="px-4 py-5 sm:px-6 bg-primary-800 text-white">
            <CardTitle className="text-lg font-medium">Current Task</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {currentTask.orderStatus === "pickup_assigned" && (
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <Clock className="text-blue-400 h-5 w-5" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-700">
                      You have an active pickup assignment. Please pick up the package as soon as possible.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {(currentTask.orderStatus === "in_transit" || currentTask.orderStatus === "delivery_assigned") && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <Truck className="text-yellow-400 h-5 w-5" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      You have an active delivery. Please complete it before accepting new tasks.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="sm:flex sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-medium text-neutral-900">Order #{currentTask.transactionId}</h3>
                <p className="mt-1 max-w-2xl text-sm text-neutral-500">
                  {currentTask.productName || "Package"} - 
                  <Badge className={`ml-2 status-${currentTask.orderStatus.toLowerCase()}`}>
                    {currentTask.orderStatus.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Badge>
                </p>
              </div>
              <div className="mt-5 sm:mt-0 sm:flex-shrink-0">
                <Badge className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  currentTask.orderStatus === "pickup_assigned" 
                    ? "bg-blue-100 text-blue-800" 
                    : "bg-yellow-100 text-yellow-800"
                }`}>
                  <Clock className="mr-1 h-4 w-4" />
                  {currentTask.orderStatus === "pickup_assigned" ? "Pickup" : "Delivery"}
                </Badge>
              </div>
            </div>
            
            <div className="mt-6 border-t border-neutral-200 pt-6">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-neutral-500">
                    {currentTask.orderStatus === "pickup_assigned" ? "Seller Name" : "Customer Name"}
                  </dt>
                  <dd className="mt-1 text-sm text-neutral-900">
                    {currentTask.customerName || "Customer Name"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-neutral-500">Contact Number</dt>
                  <dd className="mt-1 text-sm text-neutral-900">
                    {currentTask.customerPhone || "+62 811-234-5678"}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-neutral-500">
                    {currentTask.orderStatus === "pickup_assigned" ? "Pickup Address" : "Delivery Address"}
                  </dt>
                  <dd className="mt-1 text-sm text-neutral-900">
                    {currentTask.address || "Address not available"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-neutral-500">Scheduled Time</dt>
                  <dd className="mt-1 text-sm text-neutral-900">
                    Today, {new Date().getHours() < 12 ? "09:00 - 12:00" : "14:00 - 17:00"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-neutral-500">Package Details</dt>
                  <dd className="mt-1 text-sm text-neutral-900">
                    {currentTask.productName || "Package"} - {currentTask.weight || "Unknown"} kg
                  </dd>
                </div>
              </dl>
            </div>
            
            <div className="mt-6 border-t border-neutral-200 pt-6">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-neutral-900">
                  {currentTask.orderStatus === "pickup_assigned" ? "Pickup Progress" : "Delivery Progress"}
                </h4>
                <span className="text-sm text-neutral-500">
                  {currentTask.orderStatus === "pickup_assigned" ? "1 of 3" : "2 of 4"} completed
                </span>
              </div>
              <div className="mt-4">
                <div className="relative">
                  <div className="overflow-hidden h-2 text-xs flex rounded bg-neutral-200">
                    <div className={`bg-primary-600 h-full ${
                      currentTask.orderStatus === "pickup_assigned" ? "w-1/3" : "w-1/2"
                    }`}></div>
                  </div>
                  {currentTask.orderStatus === "pickup_assigned" && (
                    <div className="mt-2 grid grid-cols-3 text-xs text-neutral-500">
                      <div className="text-primary-600 font-medium">
                        <span className="flex items-center">
                          <CheckCircle className="mr-1 h-3 w-3" /> Assigned
                        </span>
                      </div>
                      <div className="text-neutral-500">
                        <span className="flex items-center">
                          <Clock className="mr-1 h-3 w-3" /> Picked up
                        </span>
                      </div>
                      <div className="text-neutral-500">
                        <span className="flex items-center">
                          <Truck className="mr-1 h-3 w-3" /> Delivered to warehouse
                        </span>
                      </div>
                    </div>
                  )}
                  {currentTask.orderStatus !== "pickup_assigned" && (
                    <div className="mt-2 grid grid-cols-4 text-xs text-neutral-500">
                      <div className="text-primary-600 font-medium">
                        <span className="flex items-center">
                          <CheckCircle className="mr-1 h-3 w-3" /> Picked up
                        </span>
                      </div>
                      <div className="text-primary-600 font-medium">
                        <span className="flex items-center">
                          <CheckCircle className="mr-1 h-3 w-3" /> In transit
                        </span>
                      </div>
                      <div className="text-neutral-500">
                        <span className="flex items-center">
                          <Clock className="mr-1 h-3 w-3" /> Arrived
                        </span>
                      </div>
                      <div className="text-neutral-500">
                        <span className="flex items-center">
                          <Truck className="mr-1 h-3 w-3" /> Delivered
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="mt-8 flex justify-end space-x-3">
              <Button variant="outline">
                <Clock className="mr-2 h-4 w-4" />
                Contact Support
              </Button>
              <Link href={`/driver/task/${currentTask.id}`}>
                <Button className="bg-primary-800 hover:bg-primary-700">
                  <Truck className="mr-2 h-4 w-4" />
                  Update Status
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Orders */}
      <Card className="shadow rounded-lg mb-8" id="available-orders">
        <CardHeader className="px-4 py-5 sm:px-6 flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-medium text-neutral-900">Available Orders</CardTitle>
          <Button variant="outline" size="sm">Refresh</Button>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <RecentOrders 
            orders={availableOrders || []} 
            isLoading={isLoadingAvailable}
            userType="driver"
          />
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <QuickActions userType="driver" />
    </DriverLayout>
  );
}
