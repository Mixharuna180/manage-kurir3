import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Upload, Check, AlertCircle } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useLocation } from "wouter";

// Schema untuk validasi form profil
const profileSchema = z.object({
  fullName: z.string().min(3, { message: "Nama lengkap minimal 3 karakter" }),
  email: z.string().email({ message: "Email tidak valid" }),
  phoneNumber: z.string().min(10, { message: "Nomor telepon tidak valid" }),
  address: z.string().min(5, { message: "Alamat minimal 5 karakter" }),
  city: z.string().min(3, { message: "Kota minimal 3 karakter" }),
  postalCode: z.string().min(5, { message: "Kode pos minimal 5 karakter" }),
});

// Schema untuk validasi form kendaraan
const vehicleSchema = z.object({
  vehicleType: z.enum(["Motor", "Mobil"], { message: "Pilih jenis kendaraan" }),
  vehicleBrand: z.string().min(2, { message: "Merek kendaraan harus diisi" }),
  vehicleModel: z.string().min(2, { message: "Model kendaraan harus diisi" }),
  vehiclePlate: z.string().min(4, { message: "Nomor plat harus diisi" }),
  vehicleYear: z.string().min(4, { message: "Tahun kendaraan harus diisi" }),
});

// Type untuk dokumen
interface Document {
  name: string;
  type: string; 
  status: "pending" | "verified" | "rejected" | "not_uploaded";
  description: string;
  iconName?: string;
}

export default function DriverProfile() {
  const { user, isLoading: userLoading } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  
  // Mendapatkan tab dari URL query parameter
  const getTabFromUrl = () => {
    if (typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href);
        const tab = url.searchParams.get("tab");
        
        if (tab === "vehicle") return "vehicle";
        if (tab === "documents") return "documents";
      } catch (e) {
        // Fallback jika ada error
      }
    }
    return "personal";
  };
  
  const [activeTab, setActiveTab] = useState(getTabFromUrl());
  
  // Update tab saat URL berubah
  useEffect(() => {
    const handleUrlChange = () => {
      const newTab = getTabFromUrl();
      setActiveTab(newTab);
    };
    
    // Pastikan URL tab sesuai dengan tab yang aktif
    const updateUrlWithTab = (tab: string) => {
      if (tab !== "personal") {
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set("tab", tab);
        window.history.replaceState({}, "", newUrl.toString());
      } else {
        // Jika tab personal, hapus parameter tab
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete("tab");
        window.history.replaceState({}, "", newUrl.toString());
      }
    };
    
    // Listen untuk perubahan URL
    window.addEventListener("popstate", handleUrlChange);
    
    // Update URL jika tab berubah
    updateUrlWithTab(activeTab);
    
    return () => {
      window.removeEventListener("popstate", handleUrlChange);
    };
  }, [activeTab]);
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([
    {
      name: "KTP",
      type: "identity_card",
      status: "not_uploaded",
      description: "Kartu identitas untuk verifikasi identitas",
    },
    {
      name: "STNK",
      type: "vehicle_registration",
      status: "not_uploaded",
      description: "Surat Tanda Nomor Kendaraan",
    },
    {
      name: "Foto Kendaraan",
      type: "vehicle_photo",
      status: "not_uploaded",
      description: "Foto kendaraan yang digunakan untuk pengiriman",
    },
    {
      name: "SIM",
      type: "driving_license",
      status: "not_uploaded",
      description: "Surat Izin Mengemudi",
    },
  ]);

  // Form untuk data pribadi
  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user?.fullName || "",
      email: user?.email || "",
      phoneNumber: user?.phoneNumber || "",
      address: user?.address || "",
      city: user?.city || "",
      postalCode: user?.postalCode || "",
    },
  });

  // Form untuk data kendaraan
  const vehicleForm = useForm<z.infer<typeof vehicleSchema>>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      vehicleType: "Motor",
      vehicleBrand: "",
      vehicleModel: "",
      vehiclePlate: "",
      vehicleYear: "",
    },
  });

  // Update form values when user data changes
  useEffect(() => {
    if (user) {
      profileForm.reset({
        fullName: user.fullName || "",
        email: user.email || "",
        phoneNumber: user.phoneNumber || "",
        address: user.address || "",
        city: user.city || "",
        postalCode: user.postalCode || "",
      });
    }
  }, [user, profileForm]);

  // Mutation untuk update profil
  const updateProfileMutation = useMutation({
    mutationFn: async (data: z.infer<typeof profileSchema>) => {
      const response = await apiRequest(
        "PATCH",
        `/api/drivers/${user?.id}`,
        data
      );
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Profil Diperbarui",
        description: "Data profil Anda berhasil diperbarui",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Gagal",
        description: `Gagal memperbarui profil: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Mutation untuk update data kendaraan
  const updateVehicleMutation = useMutation({
    mutationFn: async (data: z.infer<typeof vehicleSchema>) => {
      const response = await apiRequest(
        "PATCH",
        `/api/drivers/${user?.id}/vehicle`,
        data
      );
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Data Kendaraan Diperbarui",
        description: "Data kendaraan Anda berhasil diperbarui",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Gagal",
        description: `Gagal memperbarui data kendaraan: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Handle upload profile photo
  const handleProfilePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProfilePhoto(file);
      setProfilePhotoUrl(URL.createObjectURL(file));
      
      // Simulasi upload photo (karena tanpa cloud storage integration)
      setUploadingPhoto(true);
      setTimeout(() => {
        setUploadingPhoto(false);
        toast({
          title: "Foto Profil Diperbarui",
          description: "Foto profil Anda berhasil diunggah",
        });
      }, 1500);
    }
  };

  // Handle document upload
  const handleDocumentUpload = (docType: string, event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !event.target.files[0]) {
      return;
    }
    
    const file = event.target.files[0];
    
    // Validasi jenis file
    if (!file.type.includes('image/') && !file.type.includes('application/pdf')) {
      toast({
        title: "Format File Tidak Didukung",
        description: "Silakan unggah file dengan format gambar (JPG, PNG) atau PDF.",
        variant: "destructive",
      });
      return;
    }
    
    // Validasi ukuran file (maksimal 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Ukuran File Terlalu Besar",
        description: "Ukuran file maksimal adalah 5MB.",
        variant: "destructive",
      });
      return;
    }
    
    // Simulasi upload dokumen
    const updatedDocs = documents.map((doc) => {
      if (doc.type === docType) {
        return { ...doc, status: "pending" as "pending" };
      }
      return doc;
    });
    
    setDocuments(updatedDocs);
    toast({
      title: "Dokumen Diunggah",
      description: `${file.name} telah dikirim untuk verifikasi`,
    });
    
    // Simulasi proses verifikasi (dalam aplikasi nyata, ini akan ditangani admin)
    setTimeout(() => {
      const verifiedDocs = documents.map((doc) => {
        if (doc.type === docType) {
          return { ...doc, status: "verified" as "verified" };
        }
        return doc;
      });
      setDocuments(verifiedDocs);
    }, 3000);
  };

  // Submit handler untuk form profil
  const onSubmitProfile = (data: z.infer<typeof profileSchema>) => {
    updateProfileMutation.mutate(data);
  };

  // Submit handler untuk form kendaraan
  const onSubmitVehicle = (data: z.infer<typeof vehicleSchema>) => {
    updateVehicleMutation.mutate(data);
  };

  // Jika belum login atau bukan driver, redirect ke login
  if (!userLoading && (!user || user.userType !== "driver")) {
    setLocation("/auth");
    return null;
  }

  // Render status dokumen
  const renderDocumentStatus = (status: string) => {
    switch (status) {
      case "verified":
        return (
          <div className="flex items-center text-green-600">
            <Check size={16} className="mr-1" />
            <span>Terverifikasi</span>
          </div>
        );
      case "pending":
        return (
          <div className="flex items-center text-amber-600">
            <Loader2 size={16} className="mr-1 animate-spin" />
            <span>Sedang diverifikasi</span>
          </div>
        );
      case "rejected":
        return (
          <div className="flex items-center text-red-600">
            <AlertCircle size={16} className="mr-1" />
            <span>Ditolak</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center text-gray-600">
            <Upload size={16} className="mr-1" />
            <span>Belum diunggah</span>
          </div>
        );
    }
  };

  if (userLoading) {
    return (
      <div className="container mx-auto p-4 flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Profil Driver</h1>
        <p className="text-gray-500">Kelola profil dan dokumen Anda</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Sidebar Profil */}
        <div className="md:col-span-1">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col items-center">
                <div className="mb-4 relative">
                  <Avatar className="h-32 w-32">
                    {profilePhotoUrl ? (
                      <AvatarImage src={profilePhotoUrl} alt={user?.fullName || "Driver"} />
                    ) : (
                      <AvatarFallback className="bg-blue-100 text-blue-600 text-2xl">
                        {user?.fullName?.charAt(0) || "D"}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <label htmlFor="profile-photo" className="absolute -bottom-2 -right-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 cursor-pointer">
                    <Upload size={16} />
                    <input 
                      id="profile-photo" 
                      type="file" 
                      className="hidden" 
                      accept="image/*" 
                      onChange={handleProfilePhotoChange}
                      disabled={uploadingPhoto}
                    />
                  </label>
                </div>
                <h2 className="text-xl font-semibold">{user?.fullName}</h2>
                <p className="text-gray-500 text-sm">{user?.email}</p>
                <div className="mt-4 bg-blue-50 text-blue-700 px-4 py-2 rounded-md text-center w-full">
                  <p className="font-medium">Area Layanan</p>
                  <p className="text-sm">{user?.serviceArea || "-"}</p>
                </div>
                <div className="mt-4 w-full">
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={() => setLocation("/driver")}
                  >
                    Kembali ke Dashboard
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Konten Utama */}
        <div className="md:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full mb-6">
              <TabsTrigger value="personal" className="flex-1">Data Pribadi</TabsTrigger>
              <TabsTrigger value="vehicle" className="flex-1">Kendaraan</TabsTrigger>
              <TabsTrigger value="documents" className="flex-1">Dokumen</TabsTrigger>
            </TabsList>

            {/* Tab Data Pribadi */}
            <TabsContent value="personal">
              <Card>
                <CardHeader>
                  <CardTitle>Informasi Pribadi</CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...profileForm}>
                    <form onSubmit={profileForm.handleSubmit(onSubmitProfile)} className="space-y-4">
                      <FormField
                        control={profileForm.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nama Lengkap</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={profileForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input {...field} type="email" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={profileForm.control}
                        name="phoneNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nomor Telepon</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={profileForm.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Alamat</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={profileForm.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Kota</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={profileForm.control}
                          name="postalCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Kode Pos</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <Button 
                        type="submit" 
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        disabled={updateProfileMutation.isPending}
                      >
                        {updateProfileMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Simpan Perubahan
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab Kendaraan */}
            <TabsContent value="vehicle">
              <Card>
                <CardHeader>
                  <CardTitle>Data Kendaraan</CardTitle>
                </CardHeader>
                <CardContent>
                  <Alert className="mb-6 bg-blue-50 border-blue-200">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    <AlertTitle className="text-blue-800">Informasi</AlertTitle>
                    <AlertDescription className="text-blue-700">
                      Pastikan data kendaraan sesuai dengan STNK yang diunggah
                    </AlertDescription>
                  </Alert>
                  
                  <Form {...vehicleForm}>
                    <form onSubmit={vehicleForm.handleSubmit(onSubmitVehicle)} className="space-y-4">
                      <FormField
                        control={vehicleForm.control}
                        name="vehicleType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Jenis Kendaraan</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Pilih jenis kendaraan" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Motor">Motor</SelectItem>
                                <SelectItem value="Mobil">Mobil</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={vehicleForm.control}
                          name="vehicleBrand"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Merek Kendaraan</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Honda, Yamaha, dll" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={vehicleForm.control}
                          name="vehicleModel"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Model Kendaraan</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Vario, Beat, dll" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={vehicleForm.control}
                          name="vehiclePlate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nomor Plat</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="BG 1234 XX" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={vehicleForm.control}
                          name="vehicleYear"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tahun Kendaraan</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="2023" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <Button 
                        type="submit" 
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        disabled={updateVehicleMutation.isPending}
                      >
                        {updateVehicleMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Simpan Data Kendaraan
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab Dokumen */}
            <TabsContent value="documents">
              <Card>
                <CardHeader>
                  <CardTitle>Dokumen Persyaratan</CardTitle>
                </CardHeader>
                <CardContent>
                  <Alert className="mb-6 bg-blue-50 border-blue-200">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    <AlertTitle className="text-blue-800">Informasi</AlertTitle>
                    <AlertDescription className="text-blue-700">
                      Dokumen yang diunggah akan diverifikasi dalam waktu 1x24 jam
                    </AlertDescription>
                  </Alert>
                  
                  <div className="space-y-4">
                    {documents.map((doc) => (
                      <div key={doc.type} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="font-medium">{doc.name}</h3>
                            <p className="text-sm text-gray-500">{doc.description}</p>
                            <div className="mt-1">
                              {renderDocumentStatus(doc.status)}
                            </div>
                          </div>
                          <div>
                            <label htmlFor={`document-${doc.type}`} className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
                              doc.status === "verified" 
                                ? "border border-green-500 text-green-600 h-10 px-4 py-2" 
                                : "bg-blue-600 text-white h-10 px-4 py-2 hover:bg-blue-700"
                            } cursor-pointer`}>
                              {doc.status === "verified" ? "Terverifikasi" : "Unggah Dokumen"}
                              <input 
                                id={`document-${doc.type}`}
                                type="file"
                                className="hidden"
                                disabled={doc.status === "verified" || doc.status === "pending"}
                                accept=".jpg,.jpeg,.png,.pdf"
                                onChange={(e) => handleDocumentUpload(doc.type, e)}
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}