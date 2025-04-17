import { useState } from "react";
import AdminLayout from "@/components/layout/admin-layout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useParams, useLocation } from "wouter";
import { Loader2, ArrowLeft, Truck, Package, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatToIDR } from "@/lib/midtrans";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function AdminTransactionDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState("details");
  const [pickupDriverId, setPickupDriverId] = useState<string>("");
  const [deliveryDriverId, setDeliveryDriverId] = useState<string>("");
  const [warehouseId, setWarehouseId] = useState<string>("");
  
  // Fetch data transaksi
  const { data: transaction, isLoading, isError } = useQuery({
    queryKey: [`/api/orders/${id}`],
    enabled: !!id,
  });
  
  // Fetch data product
  const { data: product } = useQuery({
    queryKey: [`/api/products/${transaction?.productId}`],
    enabled: !!transaction?.productId,
  });
  
  // Fetch data semua driver
  const { data: drivers } = useQuery({
    queryKey: ["/api/drivers"],
  });

  // Fetch data semua warehouse
  const { data: warehouses } = useQuery({
    queryKey: ["/api/warehouses"],
  });

  // Fetch data tracking events
  const { data: trackingEvents } = useQuery({
    queryKey: [`/api/tracking/${id}`],
    enabled: !!id,
  });

  // Mutasi untuk update order
  const updateOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", `/api/orders/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Transaksi berhasil diperbarui",
        description: "Data transaksi telah berhasil diperbarui",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/orders/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Gagal memperbarui transaksi",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutasi untuk menambahkan tracking event
  const addTrackingEventMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/tracking", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Status berhasil diperbarui",
        description: "Tracking event telah berhasil ditambahkan",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/tracking/${id}`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Gagal menambahkan tracking event",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handler untuk kembali ke halaman transaksi
  const handleBackToTransactions = () => {
    setLocation("/admin/transactions");
  };

  // Handler untuk penugasan driver pengambilan
  const assignPickupDriver = () => {
    if (!pickupDriverId) {
      toast({
        title: "Error",
        description: "Silahkan pilih driver terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    updateOrderMutation.mutate({
      pickupDriverId: parseInt(pickupDriverId),
      orderStatus: "in_transit",
    });

    // Tambahkan tracking event
    addTrackingEventMutation.mutate({
      orderId: parseInt(id),
      eventType: "pickup_assigned",
      location: "Admin Office",
      description: `Driver pengambilan telah ditugaskan`,
      additionalData: { driverId: parseInt(pickupDriverId) },
    });
  };

  // Handler untuk penugasan driver pengiriman
  const assignDeliveryDriver = () => {
    if (!deliveryDriverId) {
      toast({
        title: "Error",
        description: "Silahkan pilih driver terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    updateOrderMutation.mutate({
      deliveryDriverId: parseInt(deliveryDriverId),
      orderStatus: "in_transit",
    });

    // Tambahkan tracking event
    addTrackingEventMutation.mutate({
      orderId: parseInt(id),
      eventType: "delivery_assigned",
      location: "Warehouse",
      description: `Driver pengiriman telah ditugaskan`,
      additionalData: { driverId: parseInt(deliveryDriverId) },
    });
  };

  // Handler untuk penugasan warehouse
  const assignWarehouse = () => {
    if (!warehouseId) {
      toast({
        title: "Error",
        description: "Silahkan pilih warehouse terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    updateOrderMutation.mutate({
      warehouseId: parseInt(warehouseId),
    });

    // Tambahkan tracking event
    addTrackingEventMutation.mutate({
      orderId: parseInt(id),
      eventType: "warehouse_assigned",
      location: "Admin Office",
      description: `Produk telah ditugaskan ke warehouse`,
      additionalData: { warehouseId: parseInt(warehouseId) },
    });
  };

  // Handler untuk menyelesaikan transaksi
  const completeTransaction = () => {
    updateOrderMutation.mutate({
      orderStatus: "delivered",
    });

    // Tambahkan tracking event
    addTrackingEventMutation.mutate({
      orderId: parseInt(id),
      eventType: "delivered",
      location: "Delivery Address",
      description: `Pesanan telah diterima oleh penerima`,
    });
  };

  // Render loading state
  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  // Render error state
  if (isError || !transaction) {
    return (
      <AdminLayout>
        <div className="text-center p-8">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Transaksi Tidak Ditemukan</h2>
          <p className="text-gray-600 mb-4">
            Maaf, transaksi yang Anda cari tidak dapat ditemukan.
          </p>
          <Button onClick={handleBackToTransactions}>
            Kembali ke Daftar Transaksi
          </Button>
        </div>
      </AdminLayout>
    );
  }

  // Status color mapper
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "paid":
        return "bg-blue-100 text-blue-800";
      case "in_transit":
        return "bg-indigo-100 text-indigo-800";
      case "delivered":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Sortir events berdasarkan timestamp, terbaru di atas
  const sortedEvents = Array.isArray(trackingEvents)
    ? [...trackingEvents].sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    : [];

  // Filter driver berdasarkan kecamatan dari alamat pengiriman
  const areaDrivers = Array.isArray(drivers)
    ? drivers.filter(driver => 
        !transaction.deliveryCity || 
        driver.serviceArea?.includes(transaction.deliveryCity) || 
        driver.serviceArea?.includes("All"))
    : [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handleBackToTransactions}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-2xl font-bold tracking-tight">
              Detail Transaksi
            </h2>
          </div>
          
          <Badge className={getStatusColor(transaction.orderStatus)}>
            {transaction.orderStatus.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
          </Badge>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Detail Transaksi</TabsTrigger>
            <TabsTrigger value="assignment">Penugasan</TabsTrigger>
            <TabsTrigger value="tracking">Tracking</TabsTrigger>
          </TabsList>
          
          {/* Tab Detail */}
          <TabsContent value="details" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Informasi Transaksi</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-neutral-500">ID Transaksi</p>
                    <p className="font-semibold">{transaction.transactionId}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500">Tanggal</p>
                    <p>{new Date(transaction.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500">Seller ID</p>
                    <p>{transaction.sellerId}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500">Buyer ID</p>
                    <p>{transaction.buyerId || "Belum ada pembeli"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500">Status Pembayaran</p>
                    <Badge variant={transaction.paymentStatus === "paid" ? "default" : "outline"}>
                      {transaction.paymentStatus}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500">Status Order</p>
                    <Badge className={getStatusColor(transaction.orderStatus)}>
                      {transaction.orderStatus}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Informasi Produk</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {product ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-neutral-500">Nama Produk</p>
                      <p className="font-semibold">{product.name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-500">Kategori</p>
                      <p>{product.category || "Tidak dikategorikan"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-500">Harga</p>
                      <p>{formatToIDR(product.price)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-500">Biaya Pengiriman</p>
                      <p>{formatToIDR(product.shippingPrice)}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm font-medium text-neutral-500">Deskripsi</p>
                      <p>{product.description}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Informasi produk tidak tersedia</p>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Informasi Pengiriman</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-neutral-500">Alamat Pengiriman</p>
                    <p>{transaction.deliveryAddress || "Belum diisi"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500">Kota/Kecamatan</p>
                    <p>{transaction.deliveryCity || "Belum diisi"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500">Kode Pos</p>
                    <p>{transaction.deliveryPostalCode || "Belum diisi"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500">Warehouse</p>
                    <p>{transaction.warehouseId || "Belum ditugaskan"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Informasi Driver</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-neutral-500">Driver Pengambilan</p>
                    <p>{transaction.pickupDriverId || "Belum ditugaskan"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500">Driver Pengiriman</p>
                    <p>{transaction.deliveryDriverId || "Belum ditugaskan"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Tab Penugasan */}
          <TabsContent value="assignment" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Penugasan Driver Pengambilan</CardTitle>
              </CardHeader>
              <CardContent>
                {transaction.pickupDriverId ? (
                  <div className="bg-green-50 text-green-700 p-4 rounded-md flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5" />
                    <span>Driver pengambilan telah ditugaskan</span>
                  </div>
                ) : transaction.paymentStatus === "paid" ? (
                  <div className="space-y-4">
                    <p>
                      Pilih driver untuk ditugaskan mengambil produk dari penjual. 
                      Driver akan menerima notifikasi dan detail tugas.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Driver</label>
                        <Select
                          value={pickupDriverId}
                          onValueChange={setPickupDriverId}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih driver" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.isArray(drivers) && drivers.map((driver) => (
                              <SelectItem key={driver.id} value={driver.id.toString()}>
                                {driver.fullName} - {driver.serviceArea || "Semua area"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex items-end">
                        <Button 
                          onClick={assignPickupDriver}
                          disabled={updateOrderMutation.isPending || !pickupDriverId}
                          className="flex items-center"
                        >
                          {updateOrderMutation.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Tugaskan Driver Pengambilan
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-yellow-50 text-yellow-700 p-4 rounded-md flex items-center space-x-2">
                    <AlertCircle className="h-5 w-5" />
                    <span>Transaksi belum dibayar. Driver pengambilan hanya dapat ditugaskan setelah pembayaran.</span>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Penugasan Warehouse</CardTitle>
              </CardHeader>
              <CardContent>
                {transaction.warehouseId ? (
                  <div className="bg-green-50 text-green-700 p-4 rounded-md flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5" />
                    <span>Warehouse telah ditugaskan</span>
                  </div>
                ) : transaction.pickupDriverId ? (
                  <div className="space-y-4">
                    <p>
                      Pilih warehouse untuk penyimpanan dan pengelompokan produk berdasarkan area pengiriman.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Warehouse</label>
                        <Select
                          value={warehouseId}
                          onValueChange={setWarehouseId}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih warehouse" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.isArray(warehouses) && warehouses.map((warehouse) => (
                              <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                                {warehouse.name} - {warehouse.location}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex items-end">
                        <Button 
                          onClick={assignWarehouse}
                          disabled={updateOrderMutation.isPending || !warehouseId}
                          className="flex items-center"
                        >
                          {updateOrderMutation.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Tugaskan Warehouse
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-yellow-50 text-yellow-700 p-4 rounded-md flex items-center space-x-2">
                    <AlertCircle className="h-5 w-5" />
                    <span>Driver pengambilan harus ditugaskan terlebih dahulu sebelum memilih warehouse.</span>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Penugasan Driver Pengiriman</CardTitle>
              </CardHeader>
              <CardContent>
                {transaction.deliveryDriverId ? (
                  <div className="bg-green-50 text-green-700 p-4 rounded-md flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5" />
                    <span>Driver pengiriman telah ditugaskan</span>
                  </div>
                ) : transaction.warehouseId ? (
                  <div className="space-y-4">
                    <p>
                      Pilih driver untuk mengirimkan produk ke alamat tujuan.
                      Sebaiknya pilih driver yang bertugas di area tujuan pengiriman.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Driver (Area: {transaction.deliveryCity || "Tidak diketahui"})</label>
                        <Select
                          value={deliveryDriverId}
                          onValueChange={setDeliveryDriverId}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih driver" />
                          </SelectTrigger>
                          <SelectContent>
                            {areaDrivers.length > 0 ? areaDrivers.map((driver) => (
                              <SelectItem key={driver.id} value={driver.id.toString()}>
                                {driver.fullName} - {driver.serviceArea || "Semua area"}
                              </SelectItem>
                            )) : (
                              <SelectItem value="no-driver-available" disabled>
                                Tidak ada driver yang tersedia untuk area ini
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex items-end">
                        <Button 
                          onClick={assignDeliveryDriver}
                          disabled={updateOrderMutation.isPending || !deliveryDriverId}
                          className="flex items-center"
                        >
                          {updateOrderMutation.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Tugaskan Driver Pengiriman
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-yellow-50 text-yellow-700 p-4 rounded-md flex items-center space-x-2">
                    <AlertCircle className="h-5 w-5" />
                    <span>Produk harus diterima di warehouse terlebih dahulu sebelum dapat ditugaskan ke driver pengiriman.</span>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Selesaikan Transaksi</CardTitle>
              </CardHeader>
              <CardContent>
                {transaction.orderStatus === "delivered" ? (
                  <div className="bg-green-50 text-green-700 p-4 rounded-md flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5" />
                    <span>Transaksi telah selesai</span>
                  </div>
                ) : transaction.deliveryDriverId ? (
                  <div className="space-y-4">
                    <p>
                      Tandai transaksi ini sebagai selesai setelah driver pengiriman mengkonfirmasi
                      bahwa produk telah diterima oleh pembeli.
                    </p>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button className="flex items-center">
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Selesaikan Transaksi
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Konfirmasi Penyelesaian Transaksi</AlertDialogTitle>
                          <AlertDialogDescription>
                            Apakah Anda yakin ingin menandai transaksi ini sebagai selesai?
                            Tindakan ini tidak dapat dibatalkan.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={completeTransaction}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Ya, Selesaikan
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ) : (
                  <div className="bg-yellow-50 text-yellow-700 p-4 rounded-md flex items-center space-x-2">
                    <AlertCircle className="h-5 w-5" />
                    <span>Driver pengiriman harus ditugaskan terlebih dahulu sebelum transaksi dapat diselesaikan.</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Tab Tracking */}
          <TabsContent value="tracking" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Riwayat Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                {sortedEvents.length > 0 ? (
                  <div className="relative">
                    <div className="absolute h-full w-px bg-border left-6 top-8 bottom-0" />
                    
                    <div className="space-y-8">
                      {sortedEvents.map((event, index) => (
                        <div key={event.id} className="relative grid gap-2 grid-cols-[16px_1fr] items-start">
                          <div className="flex h-5 w-5 rounded-full bg-primary mt-1 ring-8 ring-white" />
                          <div className="space-y-1">
                            <div className="font-semibold">{event.status && event.status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}</div>
                            <div className="text-sm text-muted-foreground">{new Date(event.timestamp).toLocaleString()}</div>
                            <div className="text-sm">{event.description}</div>
                            <div className="text-sm text-muted-foreground">{event.location}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    Belum ada riwayat tracking untuk transaksi ini
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}