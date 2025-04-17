import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ColumnDef } from "@tanstack/react-table";
import { Order } from "@shared/schema";
import { formatToIDR } from "@/lib/xendit";

interface RecentOrdersProps {
  orders: any[];
  isLoading: boolean;
  userType: 'user' | 'driver';
}

export function RecentOrders({ orders, isLoading, userType }: RecentOrdersProps) {
  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "transactionId",
      header: "Order ID",
      cell: ({ row }) => <div className="font-medium">{row.getValue("transactionId")}</div>,
    },
    {
      accessorKey: "productName",
      header: "Product",
    },
    {
      accessorKey: "createdAt",
      header: "Date",
      cell: ({ row }) => {
        const date = new Date(row.getValue("createdAt"));
        return <div>{date.toLocaleDateString()}</div>;
      },
    },
    {
      accessorKey: "orderStatus",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("orderStatus") as string;
        return (
          <Badge className={`status-${status.toLowerCase()}`}>
            {status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const order = row.original;
        return userType === 'user' ? (
          <Link href={`/track/${order.id}`}>
            <Button variant="link" className="text-primary-600 hover:text-primary-900 p-0">
              {order.orderStatus === 'in_transit' ? 'Track' : 'Details'}
            </Button>
          </Link>
        ) : (
          <Link href={`/driver/task/${order.id}`}>
            <Button variant="link" className="text-primary-600 hover:text-primary-900 p-0">
              View Details
            </Button>
          </Link>
        );
      },
    },
  ];

  return (
    <Card className="shadow rounded-lg mb-8">
      <CardHeader className="px-4 py-5 sm:px-6 flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-medium text-neutral-900">Recent Orders</CardTitle>
        <Link href={userType === 'user' ? '/' : '/driver'}>
          <Button variant="link" className="text-sm font-medium text-primary-600 hover:text-primary-500 p-0">
            View all orders
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <DataTable columns={columns} data={orders} isLoading={isLoading} />
      </CardContent>
    </Card>
  );
}
