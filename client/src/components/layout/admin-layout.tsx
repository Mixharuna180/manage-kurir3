import { ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { Loader2, LayoutDashboard, Package, Warehouse, Truck, Users, Settings, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();

  // Jika belum login, alihkan ke halaman login
  if (!user) {
    setLocation("/auth");
    return null;
  }

  // Jika user type bukan admin, arahkan ke dashboard yang sesuai
  if (user.userType !== "admin") {
    if (user.userType === "driver") {
      setLocation("/driver");
      return null;
    } else {
      setLocation("/");
      return null;
    }
  }

  // Handle logout
  const handleLogout = () => {
    logoutMutation.mutate();
    
    // Implementasi event handler secara terpisah dari mutasi
    if (logoutMutation.isSuccess) {
      toast({
        title: "Logout berhasil",
        description: "Anda telah berhasil keluar dari akun.",
      });
      setLocation("/auth");
    }
    if (logoutMutation.isError) {
      toast({
        title: "Logout gagal",
        description: "Terjadi kesalahan saat logout",
        variant: "destructive",
      });
    }
  };

  // Menu navigasi admin
  const navItems = [
    { name: "Dashboard", href: "/admin", icon: <LayoutDashboard size={18} /> },
    { name: "Transaksi", href: "/admin/transactions", icon: <Package size={18} /> },
    { name: "Warehouse", href: "/admin/warehouse", icon: <Warehouse size={18} /> },
    { name: "Driver", href: "/admin/drivers", icon: <Truck size={18} /> },
    { name: "Users", href: "/admin/users", icon: <Users size={18} /> },
    { name: "Settings", href: "/admin/settings", icon: <Settings size={18} /> },
  ];

  return (
    <div className="flex min-h-screen bg-neutral-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 overflow-y-auto bg-blue-800 shadow-lg">
        <div className="flex h-16 items-center justify-between px-6 text-white">
          <div className="text-xl font-bold">LogiTech Admin</div>
        </div>
        <nav className="mt-5 px-4">
          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center rounded-md px-4 py-2 text-sm font-medium ${
                    isActive
                      ? "bg-blue-700 text-white"
                      : "text-blue-100 hover:bg-blue-600"
                  }`}
                >
                  <span className="mr-3">{item.icon}</span>
                  {item.name}
                </Link>
              );
            })}
            <button
              onClick={handleLogout}
              className="group flex w-full items-center rounded-md px-4 py-2 text-sm font-medium text-blue-100 hover:bg-blue-600"
            >
              <span className="mr-3">
                <LogOut size={18} />
              </span>
              Logout
            </button>
          </div>
        </nav>
      </div>

      {/* Main content */}
      <main className="flex-1 ml-64">
        <div className="px-6 py-8">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Admin Panel
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                {user?.fullName || user?.username}
              </p>
            </div>
            <div>
              {logoutMutation.isPending ? (
                <Button variant="outline" disabled>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging out...
                </Button>
              ) : (
                <Button variant="outline" onClick={handleLogout}>
                  Logout
                </Button>
              )}
            </div>
          </div>

          {/* Page content */}
          <div className="bg-white rounded-lg shadow p-6">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}