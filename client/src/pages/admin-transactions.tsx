import { useState } from "react";
import AdminLayout from "@/components/layout/admin-layout";
import { useQuery } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Search, Filter } from "lucide-react";

export default function AdminTransactions() {
  // State untuk filter
  const [filters, setFilters] = useState({
    status: "all",
    area: "",
    search: "",
  });

  // Ambil data transaksi dari API
  const { data: transactions, isLoading } = useQuery({
    queryKey: ["/api/orders"],
  });

  // Ambil data driver
  const { data: drivers } = useQuery({
    queryKey: ["/api/drivers"],
  });

  // Filter transaksi berdasarkan kriteria
  const filteredTransactions = Array.isArray(transactions)
    ? transactions.filter((transaction: any) => {
        // Filter berdasarkan status
        if (filters.status !== "all" && transaction.orderStatus !== filters.status) {
          return false;
        }

        // Filter berdasarkan area/kecamatan
        if (filters.area && (!transaction.deliveryCity || 
            !transaction.deliveryCity.toLowerCase().includes(filters.area.toLowerCase()))) {
          return false;
        }

        // Filter berdasarkan search (ID transaksi)
        if (filters.search && 
            !transaction.transactionId.toLowerCase().includes(filters.search.toLowerCase())) {
          return false;
        }

        return true;
      })
    : [];

  // Kolom untuk tabel transaksi
  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "transactionId",
      header: "ID Transaksi",
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("transactionId")}</div>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Tanggal",
      cell: ({ row }) => {
        const date = new Date(row.getValue("createdAt"));
        return <div>{date.toLocaleDateString()}</div>;
      },
    },
    {
      accessorKey: "productId",
      header: "Produk",
      cell: ({ row }) => {
        const product = row.original.product;
        return <div>{product?.name || `Product #${row.getValue("productId")}`}</div>;
      },
    },
    {
      accessorKey: "deliveryCity",
      header: "Area",
      cell: ({ row }) => {
        return <div>{row.getValue("deliveryCity") || "Belum diisi"}</div>;
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
      accessorKey: "pickupDriverId",
      header: "Driver Pengambilan",
      cell: ({ row }) => {
        const driverId = row.getValue("pickupDriverId");
        if (!driverId) return <div className="text-muted-foreground">Belum ditugaskan</div>;
        
        const driver = Array.isArray(drivers) 
          ? drivers.find((d: any) => d.id === driverId)
          : null;
          
        return <div>{driver?.fullName || `Driver #${driverId}`}</div>;
      },
    },
    {
      accessorKey: "deliveryDriverId",
      header: "Driver Pengiriman",
      cell: ({ row }) => {
        const driverId = row.getValue("deliveryDriverId");
        if (!driverId) return <div className="text-muted-foreground">Belum ditugaskan</div>;
        
        const driver = Array.isArray(drivers) 
          ? drivers.find((d: any) => d.id === driverId)
          : null;
          
        return <div>{driver?.fullName || `Driver #${driverId}`}</div>;
      },
    },
    {
      id: "actions",
      header: "Tindakan",
      cell: ({ row }) => {
        const order = row.original;
        return (
          <Link href={`/admin/transactions/${order.id}`}>
            <Button variant="default" size="sm">
              Kelola
            </Button>
          </Link>
        );
      },
    },
  ];

  const statusOptions = [
    { label: "Semua Status", value: "all" },
    { label: "Menunggu Pembayaran", value: "pending" },
    { label: "Sudah Dibayar", value: "paid" },
    { label: "Dalam Pengiriman", value: "in_transit" },
    { label: "Selesai", value: "delivered" },
    { label: "Dibatalkan", value: "cancelled" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Manajemen Transaksi</h2>
          <p className="text-muted-foreground">
            Kelola semua transaksi dan tugaskan driver untuk pengambilan dan pengiriman.
          </p>
        </div>

        {/* Filter Section */}
        <Card>
          <CardHeader>
            <CardTitle>Filter Transaksi</CardTitle>
            <CardDescription>Gunakan filter untuk menemukan transaksi yang Anda cari</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Status Transaksi</label>
                <Select
                  value={filters.status}
                  onValueChange={(value) => setFilters({ ...filters, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Area/Kecamatan</label>
                <Input
                  placeholder="Filter berdasarkan kecamatan"
                  value={filters.area}
                  onChange={(e) => setFilters({ ...filters, area: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Cari ID Transaksi</label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Masukkan ID transaksi"
                    className="pl-8"
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">Daftar Transaksi</h3>
            <div className="text-sm text-muted-foreground">
              {filteredTransactions.length} transaksi ditemukan
            </div>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <DataTable 
              columns={columns}
              data={filteredTransactions} 
              isLoading={isLoading}
            />
          )}
        </div>

        <div className="text-sm text-muted-foreground">
          <p>
            Catatan: Transaksi yang sudah dibayar (status "Paid") dapat ditugaskan ke driver pengambilan.
            Setelah sampai di warehouse, admin dapat menugaskan driver pengiriman.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}