import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { z } from "zod";
import UserLayout from "@/components/layout/user-layout";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
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
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Upload, Loader2 } from "lucide-react";

// Schema untuk validasi profil
const profileSchema = z.object({
  fullName: z.string().min(3, { message: "Nama minimal 3 karakter" }),
  email: z.string().email({ message: "Email tidak valid" }),
  phoneNumber: z.string().min(8, { message: "Nomor telepon tidak valid" }).optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
});

export default function UserProfile() {
  const { user, isLoading: userLoading } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

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
        `/api/users/${user?.id}`,
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

  // Submit handler untuk form profil
  const onSubmitProfile = (data: z.infer<typeof profileSchema>) => {
    updateProfileMutation.mutate(data);
  };

  // Jika belum login atau bukan user, redirect ke login
  if (!userLoading && (!user || user.userType !== "user")) {
    setLocation("/auth");
    return null;
  }

  if (userLoading) {
    return (
      <div className="container mx-auto p-4 flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <UserLayout>
      <div className="container mx-auto p-4 max-w-5xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Profil Pengguna</h1>
          <p className="text-gray-500">Kelola informasi profil Anda</p>
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
                        <AvatarImage src={profilePhotoUrl} alt={user?.fullName || "User"} />
                      ) : (
                        <AvatarFallback className="bg-primary-100 text-primary-600 text-2xl">
                          {user?.fullName?.charAt(0) || "U"}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <label htmlFor="profile-photo" className="absolute -bottom-2 -right-2 bg-primary-600 hover:bg-primary-700 text-white rounded-full p-2 cursor-pointer">
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
                  <div className="mt-4 w-full">
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      onClick={() => setLocation("/")}
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
                      className="w-full"
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
          </div>
        </div>
      </div>
    </UserLayout>
  );
}