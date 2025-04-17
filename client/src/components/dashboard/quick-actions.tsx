import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Package,
  Search,
  Settings,
  ShoppingBag,
  Truck,
  MapPin,
  Headset
} from "lucide-react";

interface QuickActionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
}

interface QuickActionsProps {
  userType: 'user' | 'driver';
}

function QuickAction({ icon, title, description, href }: QuickActionProps) {
  return (
    <Link href={href}>
      <div className="group block rounded-lg p-4 border border-neutral-200 hover:border-primary-400 hover:bg-primary-50 cursor-pointer">
        <div className="flex items-center">
          <div className="flex-shrink-0 bg-primary-100 rounded-md p-3 group-hover:bg-primary-200">
            {icon}
          </div>
          <div className="ml-4">
            <h3 className="text-base font-medium text-neutral-900 group-hover:text-primary-700">
              {title}
            </h3>
            <p className="mt-1 text-sm text-neutral-500">{description}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function QuickActions({ userType }: QuickActionsProps) {
  return (
    <Card className="shadow rounded-lg">
      <CardHeader className="px-4 py-5 sm:px-6">
        <CardTitle className="text-lg font-medium text-neutral-900">
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="border-t border-neutral-200 px-4 py-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {userType === 'user' ? (
            <>
              <QuickAction
                icon={<ShoppingBag className="text-xl text-primary-600" />}
                title="Create New Order"
                description="Sell your products to customers"
                href="/create-order"
              />
              <QuickAction
                icon={<Search className="text-xl text-primary-600" />}
                title="Track Order"
                description="Check the status of your orders"
                href="/"
              />
              <QuickAction
                icon={<Settings className="text-xl text-primary-600" />}
                title="Account Settings"
                description="Manage your profile and preferences"
                href="/account"
              />
            </>
          ) : (
            <>
              <QuickAction
                icon={<Truck className="text-xl text-primary-600" />}
                title="Available Orders"
                description="Browse orders available for pickup"
                href="/driver"
              />
              <QuickAction
                icon={<MapPin className="text-xl text-primary-600" />}
                title="Navigation"
                description="Get directions to your destinations"
                href="/driver/navigation"
              />
              <QuickAction
                icon={<Headset className="text-xl text-primary-600" />}
                title="Support"
                description="Contact support for assistance"
                href="/driver/support"
              />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
