import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import UserDashboard from "@/pages/user-dashboard";
import UserProfile from "@/pages/user-profile";
import DriverDashboard from "@/pages/driver-dashboard";
import CreateOrder from "@/pages/create-order";
import OrderTracking from "@/pages/order-tracking";
import DriverTask from "@/pages/driver-task";
import DriverProfile from "@/pages/driver-profile";
import DriverNavigation from "@/pages/driver-navigation";
import SearchProduct from "@/pages/search-product";
import PurchasePage from "@/pages/purchase-page";
import OrderSuccess from "@/pages/order-success";
import OrderFailed from "@/pages/order-failed";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminTransactions from "@/pages/admin-transactions";
import AdminTransactionDetail from "@/pages/admin-transaction-detail";
import AdminWarehouse from "@/pages/admin-warehouse";
import AdminDrivers from "@/pages/admin-drivers";
import AdminUsers from "@/pages/admin-users";
import { ProtectedRoute } from "./lib/protected-route";
import { AuthProvider } from "./hooks/use-auth";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      
      {/* User Routes */}
      <ProtectedRoute path="/" component={UserDashboard} allowedRoles={["user"]} />
      <ProtectedRoute path="/profile" component={UserProfile} allowedRoles={["user"]} />
      <ProtectedRoute path="/create-order" component={CreateOrder} allowedRoles={["user"]} />
      <ProtectedRoute path="/search-product" component={SearchProduct} allowedRoles={["user"]} />
      <ProtectedRoute path="/purchase/:id" component={PurchasePage} allowedRoles={["user"]} />
      <ProtectedRoute path="/track/:id" component={OrderTracking} allowedRoles={["user"]} />
      
      {/* Driver Routes */}
      <ProtectedRoute path="/driver" component={DriverDashboard} allowedRoles={["driver"]} />
      <ProtectedRoute path="/driver/task/:id" component={DriverTask} allowedRoles={["driver"]} />
      <ProtectedRoute path="/driver/profile" component={DriverProfile} allowedRoles={["driver"]} />
      <ProtectedRoute path="/driver/navigation" component={DriverNavigation} allowedRoles={["driver"]} />
      
      {/* Admin Routes */}
      <ProtectedRoute path="/admin" component={AdminDashboard} allowedRoles={["admin"]} />
      <ProtectedRoute path="/admin/transactions" component={AdminTransactions} allowedRoles={["admin"]} />
      <ProtectedRoute path="/admin/transactions/:id" component={AdminTransactionDetail} allowedRoles={["admin"]} />
      <ProtectedRoute path="/admin/warehouse" component={AdminWarehouse} allowedRoles={["admin"]} />
      <ProtectedRoute path="/admin/drivers" component={AdminDrivers} allowedRoles={["admin"]} />
      <ProtectedRoute path="/admin/users" component={AdminUsers} allowedRoles={["admin"]} />
      
      {/* Public Routes */}
      <Route path="/order-success" component={OrderSuccess} />
      <Route path="/order-failed" component={OrderFailed} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router />
      <Toaster />
    </AuthProvider>
  );
}

export default App;
