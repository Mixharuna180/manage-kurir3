import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import UserLayout from "@/components/layout/user-layout";
import { StatsCard } from "@/components/dashboard/stats-card";
import { RecentOrders } from "@/components/dashboard/recent-orders";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { PostLoginModal } from "@/components/auth/post-login-modal";
import { useAuth } from "@/hooks/use-auth";
import { Inbox, Clock, Truck, CheckCircle } from "lucide-react";

export default function UserDashboard() {
  const { user } = useAuth();
  const [showPostLoginModal, setShowPostLoginModal] = useState(false);
  
  // Show post-login modal setiap kali user login
  useEffect(() => {
    if (user) {
      setShowPostLoginModal(true);
    }
  }, [user]);

  // Fetch orders for the user
  const { data: orders, isLoading: isLoadingOrders } = useQuery({
    queryKey: ["/api/orders/user"],
    enabled: !!user,
  });

  // Calculate order stats
  const orderStats = {
    total: Array.isArray(orders) ? orders.length || 0 : 0,
    pending: Array.isArray(orders) ? orders.filter((o: any) => o.orderStatus === "pending" || o.orderStatus === "paid").length || 0 : 0,
    inTransit: Array.isArray(orders) ? orders.filter((o: any) => o.orderStatus === "in_transit").length || 0 : 0,
    completed: Array.isArray(orders) ? orders.filter((o: any) => o.orderStatus === "delivered").length || 0 : 0,
  };

  return (
    <UserLayout>
      {/* Dashboard Overview */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-800 mb-4">Dashboard</h1>
        
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Orders"
            value={orderStats.total}
            icon={<Inbox className="text-xl text-primary-600" />}
            iconBgColor="bg-primary-100"
            textColor="text-primary-600"
            linkText="View all"
            linkHref="/"
          />
          
          <StatsCard
            title="Pending Orders"
            value={orderStats.pending}
            icon={<Clock className="text-xl text-yellow-600" />}
            iconBgColor="bg-yellow-100"
            textColor="text-primary-600"
            linkText="View pending"
            linkHref="/"
          />
          
          <StatsCard
            title="In Transit"
            value={orderStats.inTransit}
            icon={<Truck className="text-xl text-blue-600" />}
            iconBgColor="bg-blue-100"
            textColor="text-primary-600"
            linkText="Track shipments"
            linkHref="/"
          />
          
          <StatsCard
            title="Completed"
            value={orderStats.completed}
            icon={<CheckCircle className="text-xl text-green-600" />}
            iconBgColor="bg-green-100"
            textColor="text-primary-600"
            linkText="View history"
            linkHref="/"
          />
        </div>
      </div>

      {/* Recent Orders */}
      <RecentOrders 
        orders={Array.isArray(orders) ? orders : []} 
        isLoading={isLoadingOrders}
        userType="user"
      />

      {/* Quick Actions */}
      <QuickActions userType="user" />

      {/* Post Login Modal */}
      <PostLoginModal 
        open={showPostLoginModal} 
        onOpenChange={setShowPostLoginModal}
      />
    </UserLayout>
  );
}
