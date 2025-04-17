import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import AdminLayout from "@/components/layout/admin-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Search, User as UserIcon } from "lucide-react";

export default function AdminUsers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [userType, setUserType] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  // Fetch users
  const {
    data: users,
    isLoading,
    error,
  } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Filter users based on search and user type
  const filteredUsers = users?.filter((user) => {
    const matchesSearch =
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.fullName && user.fullName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = userType === "all" || user.userType === userType;

    return matchesSearch && matchesType;
  });

  // Tampilkan detail user
  const handleShowDetail = (user: User) => {
    setSelectedUser(user);
    setIsDetailDialogOpen(true);
  };

  // Get count by user type
  const getCountByType = (type: string) => {
    return users?.filter((user) => user.userType === type).length || 0;
  };

  // Mendapatkan badge color berdasarkan user type
  const getUserTypeBadge = (type: string) => {
    switch (type) {
      case "admin":
        return <Badge className="bg-red-500">Admin</Badge>;
      case "user":
        return <Badge className="bg-blue-500">User</Badge>;
      case "driver":
        return <Badge className="bg-green-500">Driver</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="text-center text-red-500">
          Error loading users: {error.message}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Pengelolaan Pengguna</h1>
        <p className="text-gray-500">
          Kelola semua pengguna yang terdaftar di sistem
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Total Pengguna</CardTitle>
            <CardDescription>Jumlah seluruh pengguna</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Pelanggan</CardTitle>
            <CardDescription>Jumlah pelanggan terdaftar</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getCountByType("user")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Driver</CardTitle>
            <CardDescription>Jumlah driver terdaftar</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getCountByType("driver")}</div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 rounded-lg border bg-card p-4">
        <div className="mb-4 flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              type="search"
              placeholder="Cari pengguna..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Tabs
            defaultValue="all"
            value={userType}
            onValueChange={setUserType}
            className="w-full md:w-auto"
          >
            <TabsList>
              <TabsTrigger value="all">Semua</TabsTrigger>
              <TabsTrigger value="user">Pelanggan</TabsTrigger>
              <TabsTrigger value="driver">Driver</TabsTrigger>
              <TabsTrigger value="admin">Admin</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Nama Lengkap</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers && filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.id}</TableCell>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.fullName || "-"}</TableCell>
                    <TableCell>{user.email || "-"}</TableCell>
                    <TableCell>{getUserTypeBadge(user.userType)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleShowDetail(user)}
                        className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                      >
                        Detail
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    {searchTerm ? "Tidak ada pengguna yang sesuai dengan pencarian" : "Tidak ada pengguna"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Detail User Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Detail Pengguna</DialogTitle>
            <DialogDescription>
              Informasi lengkap mengenai pengguna
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4">
              <div className="flex flex-col items-center space-y-2 border-b pb-4">
                <div className="h-20 w-20 rounded-full bg-blue-100 p-4">
                  <UserIcon className="h-full w-full text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold">{selectedUser.fullName || selectedUser.username}</h3>
                <p className="text-sm text-gray-500">{selectedUser.email || "No email"}</p>
                {getUserTypeBadge(selectedUser.userType)}
              </div>

              <div className="grid gap-4 py-2">
                <div>
                  <Label htmlFor="id">ID</Label>
                  <div id="id" className="mt-1">{selectedUser.id}</div>
                </div>
                <div>
                  <Label htmlFor="username">Username</Label>
                  <div id="username" className="mt-1">{selectedUser.username}</div>
                </div>
                <div>
                  <Label htmlFor="fullName">Nama Lengkap</Label>
                  <div id="fullName" className="mt-1">{selectedUser.fullName || "-"}</div>
                </div>
                <div>
                  <Label htmlFor="phone">Nomor Telepon</Label>
                  <div id="phone" className="mt-1">{selectedUser.phoneNumber || "-"}</div>
                </div>
                <div>
                  <Label htmlFor="address">Alamat</Label>
                  <div id="address" className="mt-1">{selectedUser.address || "-"}</div>
                </div>
                {selectedUser.userType === "driver" && (
                  <div>
                    <Label htmlFor="serviceArea">Area Layanan</Label>
                    <div id="serviceArea" className="mt-1">{selectedUser.serviceArea || "-"}</div>
                  </div>
                )}
              </div>

              <div className="pt-4 flex justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => setIsDetailDialogOpen(false)}
                  className="border-blue-500 text-blue-600 hover:bg-blue-50"
                >
                  Tutup
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}