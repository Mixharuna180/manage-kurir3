import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Bell, 
  ChevronDown, 
  LogOut, 
  Settings, 
  User as UserIcon 
} from "lucide-react";

interface UserLayoutProps {
  children: ReactNode;
}

export default function UserLayout({ children }: UserLayoutProps) {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/">
                  <span className="text-primary-800 text-xl font-bold cursor-pointer">LogiTech</span>
                </Link>
              </div>
              <div className="hidden md:ml-6 md:flex md:items-center md:space-x-4">
                <Link href="/">
                  <span className={`px-3 py-2 rounded-md text-sm font-medium ${
                    location === "/" 
                    ? "text-primary-800 bg-primary-50" 
                    : "text-gray-600 hover:text-primary-800 hover:bg-primary-50"
                  } cursor-pointer`}>
                    Dashboard
                  </span>
                </Link>
                <Link href="/create-order">
                  <span className={`px-3 py-2 rounded-md text-sm font-medium ${
                    location === "/create-order" 
                    ? "text-primary-800 bg-primary-50" 
                    : "text-gray-600 hover:text-primary-800 hover:bg-primary-50"
                  } cursor-pointer`}>
                    Create Order
                  </span>
                </Link>
              </div>
            </div>
            <div className="flex items-center">
              <Button variant="ghost" size="icon" className="mr-1 text-neutral-500 hover:text-neutral-600">
                <Bell className="h-5 w-5" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center text-white mr-2">
                      {user?.fullName?.charAt(0) || "U"}
                    </div>
                    <span className="text-neutral-700">{user?.fullName || "User"}</span>
                    <ChevronDown className="ml-1 h-4 w-4 text-neutral-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Link href="/profile">
                      <div className="flex items-center w-full">
                        <UserIcon className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link href="/profile">
                      <div className="flex items-center w-full">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow bg-neutral-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
