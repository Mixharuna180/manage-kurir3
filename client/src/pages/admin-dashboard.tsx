import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Truck, BarChart, Warehouse } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { formatToIDR } from "@/lib/midtrans";

export default function AdminDashboard() {
  // Fetch semua transaksi
  const { data: transactions, isLoading: isLoadingTransactions } = useQuery({
    queryKey: ["/api/orders"],
  });

  // Kolom untuk tabel transaksi
  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "transactionId",
      header: "Transaction ID",
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("transactionId")}</div>
      ),
    },
    {
      accessorKey: "productId",
      header: "Product",
      cell: ({ row }) => {
        const product = row.original.product;
        return <div>{product?.name || `Product #${row.getValue("productId")}`}</div>;
      },
    },
    {
      accessorKey: "deliveryCity",
      header: "Area",
      cell: ({ row }) => {
        return <div>{row.getValue("deliveryCity") || "Unassigned"}</div>;
      }
    },
    {
      accessorKey: "orderStatus",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("orderStatus") as string;
        let color = "bg-gray-100 text-gray-800";
        
        switch(status) {
          case "pending":
            color = "bg-yellow-100 text-yellow-800";
            break;
          case "paid":
            color = "bg-blue-100 text-blue-800";
            break;
          case "in_transit":
            color = "bg-indigo-100 text-indigo-800";
            break;
          case "delivered":
            color = "bg-green-100 text-green-800";
            break;
          case "cancelled":
            color = "bg-red-100 text-red-800";
            break;
        }
        
        return (
          <Badge className={color}>
            {status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const order = row.original;
        return (
          <Link href={`/admin/transactions/${order.id}`}>
            <Button variant="link" className="p-0">
              Manage
            </Button>
          </Link>
        );
      },
    },
  ];

  // Data untuk statistik dashboard
  const pendingOrders = Array.isArray(transactions) 
    ? transactions.filter((t: any) => t.orderStatus === "pending" || t.orderStatus === "paid").length
    : 0;
    
  const inTransitOrders = Array.isArray(transactions)
    ? transactions.filter((t: any) => t.orderStatus === "in_transit").length
    : 0;
    
  const completedOrders = Array.isArray(transactions)
    ? transactions.filter((t: any) => t.orderStatus === "delivered").length
    : 0;
    
  const totalOrders = Array.isArray(transactions) ? transactions.length : 0;

  // Render dashboard
  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-blue-800">Dashboard Admin</h2>
          <p className="text-muted-foreground text-gray-600 mt-2">
            Overview operasional LogiTech dan tugas yang perlu diselesaikan.
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-blue-500 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Transaksi
              </CardTitle>
              <Package className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-700">{totalOrders}</div>
              <p className="text-xs text-muted-foreground">
                Total transaksi dalam sistem
              </p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Perlu Diproses</CardTitle>
              <BarChart className="h-5 w-5 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-600">{pendingOrders}</div>
              <p className="text-xs text-muted-foreground">
                Menunggu penugasan driver
              </p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-indigo-500 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Dalam Pengiriman</CardTitle>
              <Truck className="h-5 w-5 text-indigo-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-indigo-600">{inTransitOrders}</div>
              <p className="text-xs text-muted-foreground">
                Transaksi sedang diantar
              </p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Selesai</CardTitle>
              <Warehouse className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{completedOrders}</div>
              <p className="text-xs text-muted-foreground">
                Transaksi telah selesai
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions Table */}
        <div className="mt-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold">Transaksi Terbaru</h3>
            <Link href="/admin/transactions">
              <Button variant="outline" className="text-blue-600 border-blue-600 hover:bg-blue-50">
                Lihat Semua Transaksi
              </Button>
            </Link>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <DataTable 
              columns={columns}
              data={Array.isArray(transactions) ? transactions.slice(0, 5) : []} 
              isLoading={isLoadingTransactions}
            />
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}