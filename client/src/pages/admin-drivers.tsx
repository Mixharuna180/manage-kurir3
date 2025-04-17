import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { User } from "@shared/schema";
import AdminLayout from "@/components/layout/admin-layout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, PlusCircle, Search, UserRound, MapPin, Phone, Mail, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Form schema untuk edit driver
const editDriverSchema = z.object({
  fullName: z.string().min(2, { message: "Nama harus diisi" }),
  email: z.string().email({ message: "Email tidak valid" }),
  phoneNumber: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  postalCode: z.string().nullable().optional(),
  serviceArea: z.string().nullable().optional(),
});

type EditDriverFormValues = z.infer<typeof editDriverSchema>;

export default function AdminDrivers() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [selectedDriver, setSelectedDriver] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // Form setup untuk edit driver
  const form = useForm<EditDriverFormValues>({
    resolver: zodResolver(editDriverSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phoneNumber: "",
      address: "",
      city: "",
      postalCode: "",
      serviceArea: "",
    },
  });
  
  // Update form values when selected driver changes
  React.useEffect(() => {
    if (selectedDriver) {
      form.reset({
        fullName: selectedDriver.fullName,
        email: selectedDriver.email,
        phoneNumber: selectedDriver.phoneNumber || "",
        address: selectedDriver.address || "",
        city: selectedDriver.city || "",
        postalCode: selectedDriver.postalCode || "",
        serviceArea: selectedDriver.serviceArea || "",
      });
    }
  }, [selectedDriver, form]);
  
  // Mutation untuk update driver
  const updateDriverMutation = useMutation({
    mutationFn: async (data: EditDriverFormValues) => {
      if (!selectedDriver) return null;
      const response = await apiRequest("PATCH", `/api/drivers/${selectedDriver.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Berhasil",
        description: "Data driver berhasil diperbarui",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/drivers"] });
      setIsEditDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Gagal",
        description: `Gagal memperbarui data driver: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Handle form submission
  const onSubmit = (data: EditDriverFormValues) => {
    updateDriverMutation.mutate(data);
  };

  // Fetch drivers
  const {
    data: drivers,
    isLoading,
    error,
  } = useQuery<User[]>({
    queryKey: ["/api/drivers"],
    staleTime: 5000,
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    toast({
      title: "Error",
      description: "Gagal memuat data driver: " + error.message,
      variant: "destructive",
    });
  }

  // Get unique service areas from drivers
  const serviceAreas = drivers
    ? Array.from(
        new Set(
          drivers
            .filter((driver) => driver.serviceArea)
            .map((driver) => driver.serviceArea)
        )
      )
    : [];

  // Filter drivers based on search term and area
  const filteredDrivers = drivers
    ? drivers.filter((driver) => {
        const matchesSearch =
          driver.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          driver.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (driver.serviceArea &&
            driver.serviceArea.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesArea =
          areaFilter === "all" ||
          (driver.serviceArea &&
            driver.serviceArea.includes(areaFilter));

        return matchesSearch && matchesArea;
      })
    : [];

  return (
    <AdminLayout>
      {/* Dialog Edit Driver */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Driver</DialogTitle>
            <DialogDescription>
              Edit informasi driver dan area pelayanan
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Lengkap</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Nama lengkap driver" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="Email driver" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nomor Telepon</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          value={field.value || ""} 
                          placeholder="Nomor telepon" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="serviceArea"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Area Pelayanan</FormLabel>
                      <Select
                        value={field.value || ""}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih area pelayanan" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {serviceAreas.map((area) => (
                            <SelectItem key={area} value={area || ""}>
                              {area}
                            </SelectItem>
                          ))}
                          <SelectItem value="Ilir Barat">Ilir Barat</SelectItem>
                          <SelectItem value="Ilir Timur">Ilir Timur</SelectItem>
                          <SelectItem value="Seberang Ulu">Seberang Ulu</SelectItem>
                          <SelectItem value="Bukit Kecil">Bukit Kecil</SelectItem>
                          <SelectItem value="Kemuning">Kemuning</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alamat</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        value={field.value || ""} 
                        placeholder="Alamat lengkap" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kota</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          value={field.value || ""} 
                          placeholder="Kota" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kode Pos</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          value={field.value || ""} 
                          placeholder="Kode pos" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Batal
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateDriverMutation.isPending}
                >
                  {updateDriverMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    "Simpan Perubahan"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <div className="container py-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Manajemen Driver</h1>
          <p className="text-muted-foreground">
            Kelola driver dan area pelayanan pengiriman
          </p>
        </div>

        {/* Filter and Search */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari berdasarkan nama, username, atau area..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full md:w-64">
            <Select value={areaFilter} onValueChange={setAreaFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter berdasarkan area" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Area</SelectItem>
                {serviceAreas.map((area) => (
                  <SelectItem key={area} value={area}>
                    {area}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4" />
            <span>Tambah Driver</span>
          </Button>
        </div>

        {/* Drivers list */}
        <Card>
          <CardHeader>
            <CardTitle>Daftar Driver</CardTitle>
            <CardDescription>
              {filteredDrivers.length} driver tersedia
            </CardDescription>
          </CardHeader>
          <CardContent>
            {drivers && drivers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Area Pelayanan</TableHead>
                    <TableHead>Kontak</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDrivers.map((driver) => (
                    <TableRow key={driver.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <UserRound className="h-6 w-6 text-muted-foreground" />
                          <span>{driver.fullName}</span>
                        </div>
                      </TableCell>
                      <TableCell>{driver.username}</TableCell>
                      <TableCell>
                        {driver.serviceArea || "Semua Area"}
                      </TableCell>
                      <TableCell>
                        {driver.phoneNumber || "Tidak tersedia"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">
                          Aktif
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setSelectedDriver(driver)}
                            >
                              Detail
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                <UserRound className="h-5 w-5" />
                                <span>{driver.fullName}</span>
                              </DialogTitle>
                              <DialogDescription>
                                Detail informasi driver dan area pelayanan
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Username</h4>
                                  <p className="text-sm">{driver.username}</p>
                                </div>
                                <div>
                                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Tipe Pengguna</h4>
                                  <Badge>{driver.userType}</Badge>
                                </div>
                              </div>
                              
                              <div>
                                <h4 className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                  <MapPin className="h-3.5 w-3.5" /> Area Pelayanan
                                </h4>
                                <p className="text-sm">{driver.serviceArea || "Semua Area"}</p>
                              </div>
                              
                              <div>
                                <h4 className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                  <MapPin className="h-3.5 w-3.5" /> Alamat
                                </h4>
                                <p className="text-sm">{driver.address || "Tidak tersedia"}</p>
                                {driver.city && <p className="text-sm">{driver.city}, {driver.postalCode}</p>}
                              </div>
                              
                              <div>
                                <h4 className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                  <Phone className="h-3.5 w-3.5" /> Kontak
                                </h4>
                                <p className="text-sm">{driver.phoneNumber || "Tidak tersedia"}</p>
                              </div>
                              
                              <div>
                                <h4 className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                  <Mail className="h-3.5 w-3.5" /> Email
                                </h4>
                                <p className="text-sm">{driver.email}</p>
                              </div>
                              
                              <div>
                                <h4 className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                  <Calendar className="h-3.5 w-3.5" /> Tanggal Registrasi
                                </h4>
                                <p className="text-sm">
                                  {driver.createdAt ? format(new Date(driver.createdAt), 'dd MMMM yyyy') : "Tidak tersedia"}
                                </p>
                              </div>
                            </div>
                            <DialogFooter>
                              <DialogClose asChild>
                                <Button type="button" variant="secondary">
                                  Tutup
                                </Button>
                              </DialogClose>
                              <Button 
                                type="button"
                                onClick={() => setIsEditDialogOpen(true)}
                              >
                                Edit Driver
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <UserRound className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium text-lg mb-2">Belum Ada Driver</h3>
                <p className="text-muted-foreground mb-4">
                  Belum ada driver terdaftar dalam sistem. Tambahkan driver untuk
                  memulai.
                </p>
                <Button>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Tambah Driver
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}