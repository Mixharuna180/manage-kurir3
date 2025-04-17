import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import DriverLayout from "@/components/layout/driver-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { MapPin, Navigation, LocateFixed, Truck, AlertCircle, Search } from "lucide-react";

export default function DriverNavigation() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("current");
  
  // Sample data untuk area layanan dan warehouse
  const serviceArea = user?.serviceArea || "Seberang Ulu I";
  const warehouses = [
    { 
      id: 1, 
      name: "Warehouse Palembang Utara", 
      address: "Jl. Mayor Zen No. 12, Palembang",
      region: "Ilir Timur II"
    },
    { 
      id: 2, 
      name: "Warehouse Palembang Selatan", 
      address: "Jl. Angkatan 45 No. 45, Palembang",
      region: "Seberang Ulu I"
    }
  ];
  
  // Warehouse yang relevan dengan driver berdasarkan area layanan
  const relevantWarehouse = warehouses.find(w => w.region === serviceArea) || warehouses[0];
  
  // Lokasi pickup/delivery untuk simulasi
  const pickupLocations = [
    {
      id: 1,
      address: "Jl. KH. Azhari No. 23, Palembang",
      customerName: "Budi Santoso",
      phone: "081234567890",
      status: "Pickup",
      orderId: "2025_0417_ORD001"
    }
  ];
  
  const deliveryLocations = [
    {
      id: 2,
      address: "Jl. Veteran No. 45, Palembang",
      customerName: "Siti Nurhayati",
      phone: "082345678901",
      status: "Delivery",
      orderId: "2025_0417_ORD002"
    }
  ];
  
  const handleStartNavigation = (address: string) => {
    toast({
      title: "Navigasi Dimulai",
      description: `Mengarahkan ke: ${address}`,
    });
    
    // Di aplikasi nyata, bisa membuka Google Maps atau layanan peta lainnya
    // Simulasi untuk demo
    setTimeout(() => {
      toast({
        title: "Peta Dibuka",
        description: "Navigasi sedang berjalan di aplikasi peta eksternal",
      });
    }, 1500);
  };
  
  const handleSearch = () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Perhatian",
        description: "Silakan masukkan alamat tujuan",
        variant: "destructive"
      });
      return;
    }
    
    toast({
      title: "Pencarian",
      description: `Mencari rute ke: ${searchQuery}`,
    });
    
    // Simulasi pencarian
    setTimeout(() => {
      setSearchQuery("");
      toast({
        title: "Rute Ditemukan",
        description: "Rute telah ditemukan dan siap untuk navigasi",
      });
    }, 1500);
  };
  
  return (
    <DriverLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-800">Navigasi Driver</h1>
        <p className="text-gray-500">Temukan rute ke tujuan pickup atau delivery Anda</p>
      </div>
      
      {/* Pencarian Alamat */}
      <Card className="mb-6">
        <CardHeader className="px-4 py-3 border-b">
          <CardTitle className="text-lg font-medium text-neutral-800 flex items-center">
            <Search className="mr-2 h-5 w-5 text-neutral-600" />
            Cari Alamat
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex flex-col space-y-4">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="address">Alamat Tujuan</Label>
              <div className="flex w-full items-center space-x-2">
                <Input 
                  type="text" 
                  id="address" 
                  placeholder="Masukkan alamat tujuan" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Button 
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={handleSearch}
                >
                  Cari
                </Button>
              </div>
              <p className="text-sm text-neutral-500">
                Contoh: Jl. Kapten A. Rivai No. 15, Palembang
              </p>
            </div>
            
            <Alert className="bg-blue-50 border-blue-100">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-700">Area Layanan</AlertTitle>
              <AlertDescription className="text-blue-600">
                Anda ditugaskan di area: <span className="font-semibold">{serviceArea}</span>
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
      
      {/* Navigasi */}
      <Card>
        <CardHeader className="px-4 py-3 border-b">
          <div className="w-full">
            <div className="grid w-full grid-cols-3 gap-2">
              <Button 
                variant={activeTab === "current" ? "default" : "outline"} 
                onClick={() => setActiveTab("current")}
                className="w-full"
              >
                Tugas Saat Ini
              </Button>
              <Button 
                variant={activeTab === "warehouse" ? "default" : "outline"} 
                onClick={() => setActiveTab("warehouse")}
                className="w-full"
              >
                Gudang (Warehouse)
              </Button>
              <Button 
                variant={activeTab === "history" ? "default" : "outline"} 
                onClick={() => setActiveTab("history")}
                className="w-full"
              >
                Riwayat
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {activeTab === "current" && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-neutral-800">Pengantaran & Penjemputan</h3>
              
              {pickupLocations.length === 0 && deliveryLocations.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 mb-4">
                    <Truck className="h-6 w-6 text-neutral-500" />
                  </div>
                  <h3 className="text-lg font-medium text-neutral-900">Tidak Ada Tugas Saat Ini</h3>
                  <p className="mt-1 text-neutral-500">Anda tidak memiliki tugas pengantaran atau penjemputan.</p>
                </div>
              ) : (
                <>
                  {/* Pickup Locations */}
                  {pickupLocations.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="text-md font-medium text-neutral-700">Penjemputan</h4>
                      {pickupLocations.map((loc) => (
                        <div key={loc.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center">
                                <MapPin className="h-5 w-5 text-blue-600 mr-1" />
                                <span className="font-medium">{loc.address}</span>
                              </div>
                              <div className="mt-2 space-y-1 text-sm text-neutral-600">
                                <div>Pesanan: #{loc.orderId}</div>
                                <div>Pelanggan: {loc.customerName}</div>
                                <div>Telepon: {loc.phone}</div>
                              </div>
                            </div>
                            <Button
                              className="bg-blue-600 hover:bg-blue-700"
                              onClick={() => handleStartNavigation(loc.address)}
                            >
                              <Navigation className="h-4 w-4 mr-1" />
                              Navigasi
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Delivery Locations */}
                  {deliveryLocations.length > 0 && (
                    <div className="space-y-4 mt-6">
                      <h4 className="text-md font-medium text-neutral-700">Pengantaran</h4>
                      {deliveryLocations.map((loc) => (
                        <div key={loc.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center">
                                <MapPin className="h-5 w-5 text-green-600 mr-1" />
                                <span className="font-medium">{loc.address}</span>
                              </div>
                              <div className="mt-2 space-y-1 text-sm text-neutral-600">
                                <div>Pesanan: #{loc.orderId}</div>
                                <div>Pelanggan: {loc.customerName}</div>
                                <div>Telepon: {loc.phone}</div>
                              </div>
                            </div>
                            <Button
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleStartNavigation(loc.address)}
                            >
                              <Navigation className="h-4 w-4 mr-1" />
                              Navigasi
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          
          {activeTab === "warehouse" && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-neutral-800">Gudang dalam Area Anda</h3>
              
              <div className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center">
                      <LocateFixed className="h-5 w-5 text-amber-600 mr-1" />
                      <span className="font-medium">{relevantWarehouse.name}</span>
                    </div>
                    <div className="mt-2 space-y-1 text-sm text-neutral-600">
                      <div>Alamat: {relevantWarehouse.address}</div>
                      <div>Wilayah: {relevantWarehouse.region}</div>
                    </div>
                  </div>
                  <Button
                    className="bg-amber-600 hover:bg-amber-700"
                    onClick={() => handleStartNavigation(relevantWarehouse.address)}
                  >
                    <Navigation className="h-4 w-4 mr-1" />
                    Navigasi
                  </Button>
                </div>
              </div>
              
              <Alert className="bg-amber-50 border-amber-100">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-700">Informasi Gudang</AlertTitle>
                <AlertDescription className="text-amber-600">
                  Gudang beroperasi setiap hari dari jam 08.00 - 20.00 WIB.
                </AlertDescription>
              </Alert>
            </div>
          )}
          
          {activeTab === "history" && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-neutral-800">Riwayat Navigasi</h3>
              
              <div className="py-8 text-center">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 mb-4">
                  <MapPin className="h-6 w-6 text-neutral-500" />
                </div>
                <h3 className="text-lg font-medium text-neutral-900">Belum Ada Riwayat</h3>
                <p className="mt-1 text-neutral-500">Riwayat navigasi Anda akan muncul di sini.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </DriverLayout>
  );
}