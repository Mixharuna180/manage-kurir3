import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AdminLayout from "@/components/layout/admin-layout";
import { Loader2, SearchIcon, Warehouse } from "lucide-react";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export default function AdminWarehousePage() {
  const { toast } = useToast();
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isEditWarehouseOpen, setIsEditWarehouseOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<any>(null);
  
  // Fetch all warehouses with order counts
  const { 
    data: warehouses = [], 
    isLoading: isLoadingWarehouses 
  } = useQuery({
    queryKey: ["/api/warehouses"],
    queryFn: getQueryFn<any[]>({ on401: "throw", urlParams: { include: "orders" } }),
  });
  
  // Fetch all orders
  const { 
    data: orders = [], 
    isLoading: isLoadingOrders 
  } = useQuery({
    queryKey: ["/api/orders"],
    queryFn: getQueryFn<any[]>({ on401: "throw" }),
  });
  
  // Get the list of districts from the warehouses
  const allDistricts = warehouses
    .flatMap(w => (w.areasServed || "").split(","))
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i); // Unique values

  // Filter orders based on warehouse and district
  const filteredOrders = orders.filter(order => {
    const matchesWarehouse = !selectedWarehouse || 
      order.warehouseId === parseInt(selectedWarehouse);
    
    const order_district = order.deliveryCity;
    const matchesDistrict = !selectedDistrict || 
      order_district?.toLowerCase().includes(selectedDistrict.toLowerCase());
    
    const matchesSearch = !searchQuery || 
      order.transactionId?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesWarehouse && matchesDistrict && matchesSearch;
  });
  
  // Status counts for dashboard
  const statusCounts = {
    pending: filteredOrders.filter(o => o.orderStatus === "pending").length,
    paid: filteredOrders.filter(o => o.orderStatus === "paid").length,
    pickup_assigned: filteredOrders.filter(o => o.orderStatus === "pickup_assigned").length,
    picked_up: filteredOrders.filter(o => o.orderStatus === "picked_up").length,
    in_warehouse: filteredOrders.filter(o => o.orderStatus === "in_warehouse").length,
    delivery_assigned: filteredOrders.filter(o => o.orderStatus === "delivery_assigned").length,
    in_transit: filteredOrders.filter(o => o.orderStatus === "in_transit").length,
    delivered: filteredOrders.filter(o => o.orderStatus === "delivered").length,
  };
  
  // Group orders by status for the tabs
  const incomingOrders = filteredOrders.filter(
    o => ["paid", "pickup_assigned", "picked_up"].includes(o.orderStatus)
  );
  
  const warehouseOrders = filteredOrders.filter(
    o => ["in_warehouse"].includes(o.orderStatus)
  );
  
  const outgoingOrders = filteredOrders.filter(
    o => ["delivery_assigned", "in_transit"].includes(o.orderStatus)
  );
  
  const completedOrders = filteredOrders.filter(
    o => ["delivered"].includes(o.orderStatus)
  );
  
  if (isLoadingWarehouses || isLoadingOrders) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="animate-spin h-8 w-8 text-primary" />
        </div>
      </AdminLayout>
    );
  }
  
  return (
    <AdminLayout>
      <div className="px-6 py-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Manajemen Warehouse</h1>
        </div>
        
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div>
            <Label htmlFor="warehouse">Warehouse</Label>
            <Select
              value={selectedWarehouse}
              onValueChange={setSelectedWarehouse}
            >
              <SelectTrigger>
                <SelectValue placeholder="Semua Warehouse" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Semua Warehouse</SelectItem>
                {warehouses.map((warehouse) => (
                  <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                    {warehouse.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="district">Kecamatan</Label>
            <Select
              value={selectedDistrict}
              onValueChange={setSelectedDistrict}
            >
              <SelectTrigger>
                <SelectValue placeholder="Semua Kecamatan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Semua Kecamatan</SelectItem>
                {allDistricts.map((district) => (
                  <SelectItem key={district} value={district}>
                    {district}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="search">Cari Transaksi</Label>
            <div className="relative">
              <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="ID transaksi"
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
        
        {/* Dashboard Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Menunggu Pickup
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statusCounts.paid}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Transaksi yang perlu dijemput
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Dalam Perjalanan ke Warehouse
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statusCounts.pickup_assigned + statusCounts.picked_up}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Sedang dalam perjalanan ke gudang
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Dalam Warehouse
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statusCounts.in_warehouse}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Menunggu penugasan driver
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Dalam Pengiriman
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statusCounts.delivery_assigned + statusCounts.in_transit}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Sedang dalam perjalanan ke penerima
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* Order Management Tabs */}
        <Tabs defaultValue="incoming" className="mt-6">
          <TabsList className="mb-4">
            <TabsTrigger value="incoming">
              Menuju Warehouse ({incomingOrders.length})
            </TabsTrigger>
            <TabsTrigger value="warehouse">
              Dalam Warehouse ({warehouseOrders.length})
            </TabsTrigger>
            <TabsTrigger value="outgoing">
              Keluar Warehouse ({outgoingOrders.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Selesai ({completedOrders.length})
            </TabsTrigger>
          </TabsList>
          
          {/* Incoming Orders */}
          <TabsContent value="incoming">
            <Card>
              <CardHeader>
                <CardTitle>Paket Menuju Warehouse</CardTitle>
                <CardDescription>
                  Paket yang sedang dalam perjalanan ke warehouse
                </CardDescription>
              </CardHeader>
              <CardContent>
                <OrderTable 
                  orders={incomingOrders} 
                  onRefresh={() => queryClient.invalidateQueries({queryKey: ["/api/orders"]})}
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Warehouse Orders */}
          <TabsContent value="warehouse">
            <Card>
              <CardHeader>
                <CardTitle>Paket dalam Warehouse</CardTitle>
                <CardDescription>
                  Paket yang sudah sampai di warehouse dan menunggu pengiriman
                </CardDescription>
              </CardHeader>
              <CardContent>
                <OrderTable 
                  orders={warehouseOrders} 
                  onRefresh={() => queryClient.invalidateQueries({queryKey: ["/api/orders"]})}
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Outgoing Orders */}
          <TabsContent value="outgoing">
            <Card>
              <CardHeader>
                <CardTitle>Paket dalam Pengiriman</CardTitle>
                <CardDescription>
                  Paket yang sudah dalam proses pengiriman ke penerima
                </CardDescription>
              </CardHeader>
              <CardContent>
                <OrderTable 
                  orders={outgoingOrders} 
                  onRefresh={() => queryClient.invalidateQueries({queryKey: ["/api/orders"]})}
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Completed Orders */}
          <TabsContent value="completed">
            <Card>
              <CardHeader>
                <CardTitle>Paket Selesai</CardTitle>
                <CardDescription>
                  Paket yang sudah sampai ke penerima
                </CardDescription>
              </CardHeader>
              <CardContent>
                <OrderTable 
                  orders={completedOrders} 
                  onRefresh={() => queryClient.invalidateQueries({queryKey: ["/api/orders"]})}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* Warehouse List */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Daftar Warehouse</CardTitle>
            <CardDescription>
              Informasi tentang semua warehouse yang tersedia
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Alamat</TableHead>
                  <TableHead>Kecamatan yang Dilayani</TableHead>
                  <TableHead>Kapasitas</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {warehouses.map((warehouse) => (
                  <TableRow key={warehouse.id}>
                    <TableCell className="font-medium">{warehouse.name}</TableCell>
                    <TableCell>
                      {warehouse.address}, {warehouse.city}, {warehouse.postalCode}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(warehouse.areasServed || "").split(",").map((area, i) => (
                          area && <Badge key={i} variant="outline">{area.trim()}</Badge>
                        ))}
                        {!warehouse.areasServed && <span className="text-muted-foreground">-</span>}
                      </div>
                    </TableCell>
                    <TableCell>{warehouse.capacity || "-"}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedWarehouse(warehouse.id.toString())}
                        >
                          Lihat Transaksi
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setEditingWarehouse(warehouse);
                            setIsEditWarehouseOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      
      {/* Edit Warehouse Dialog */}
      <Dialog open={isEditWarehouseOpen} onOpenChange={setIsEditWarehouseOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Warehouse</DialogTitle>
            <DialogDescription>
              Ubah informasi warehouse dan area yang dilayani.
            </DialogDescription>
          </DialogHeader>
          
          {editingWarehouse && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Nama
                </Label>
                <Input
                  id="name"
                  value={editingWarehouse.name}
                  onChange={(e) => setEditingWarehouse({
                    ...editingWarehouse,
                    name: e.target.value
                  })}
                  className="col-span-3"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="capacity" className="text-right">
                  Kapasitas
                </Label>
                <Input
                  id="capacity"
                  type="number"
                  value={editingWarehouse.capacity || ""}
                  onChange={(e) => setEditingWarehouse({
                    ...editingWarehouse,
                    capacity: parseInt(e.target.value) || null
                  })}
                  className="col-span-3"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="areasServed" className="text-right">
                  Kecamatan
                </Label>
                <Textarea
                  id="areasServed"
                  placeholder="Daftar kecamatan yang dilayani, pisahkan dengan koma. Contoh: Ilir Barat I, Ilir Barat II, Ilir Timur I"
                  value={editingWarehouse.areasServed || ""}
                  onChange={(e) => setEditingWarehouse({
                    ...editingWarehouse,
                    areasServed: e.target.value
                  })}
                  className="col-span-3"
                  rows={4}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditWarehouseOpen(false)}>
              Batal
            </Button>
            <Button 
              onClick={async () => {
                try {
                  await apiRequest("PATCH", `/api/warehouses/${editingWarehouse.id}`, {
                    name: editingWarehouse.name,
                    capacity: editingWarehouse.capacity,
                    areasServed: editingWarehouse.areasServed
                  });
                  
                  queryClient.invalidateQueries({ queryKey: ["/api/warehouses"] });
                  setIsEditWarehouseOpen(false);
                  
                  toast({
                    title: "Berhasil",
                    description: "Data warehouse berhasil diperbarui",
                  });
                } catch (error) {
                  toast({
                    title: "Gagal",
                    description: "Terjadi kesalahan saat memperbarui data warehouse",
                    variant: "destructive",
                  });
                }
              }}
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function OrderTable({ orders, onRefresh }: { orders: any[], onRefresh: () => void }) {
  const { toast } = useToast();
  
  // Fetching warehouses data here to use within this component
  const { data: warehouses = [] } = useQuery({
    queryKey: ["/api/warehouses"],
    queryFn: getQueryFn<any[]>({ on401: "throw" }),
  });
  
  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Warehouse className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">Tidak ada transaksi</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-md">
          Tidak ada transaksi yang memenuhi kriteria ini saat ini
        </p>
      </div>
    );
  }
  
  function getStatusBadge(status: string) {
    const statusMap: Record<string, { label: string, variant: "default" | "secondary" | "destructive" | "outline" }> = {
      "pending": { label: "Menunggu Pembayaran", variant: "outline" },
      "paid": { label: "Telah Dibayar", variant: "default" },
      "pickup_assigned": { label: "Driver Pickup Ditugaskan", variant: "secondary" },
      "picked_up": { label: "Sedang Dijemput", variant: "secondary" },
      "in_warehouse": { label: "Di Warehouse", variant: "default" },
      "delivery_assigned": { label: "Driver Pengiriman Ditugaskan", variant: "secondary" },
      "in_transit": { label: "Dalam Pengiriman", variant: "secondary" },
      "delivered": { label: "Terkirim", variant: "default" },
    };
    
    const config = statusMap[status] || { label: status, variant: "outline" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  }
  
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID Transaksi</TableHead>
          <TableHead>Tujuan</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Warehouse</TableHead>
          <TableHead>Aksi</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => (
          <TableRow key={order.id}>
            <TableCell className="font-medium">{order.transactionId}</TableCell>
            <TableCell>{order.deliveryCity || "-"}</TableCell>
            <TableCell>{getStatusBadge(order.orderStatus)}</TableCell>
            <TableCell>
              {order.warehouseId 
                ? warehouses.find(w => w.id === order.warehouseId)?.name || `WH #${order.warehouseId}`
                : "-"
              }
            </TableCell>
            <TableCell>
              <Link href={`/admin/transactions/${order.id}`}>
                <Button size="sm">Detail</Button>
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}