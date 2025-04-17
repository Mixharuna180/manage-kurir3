import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">404 Halaman Tidak Ditemukan</h1>
          </div>

          <p className="mt-4 text-sm text-gray-600">
            Maaf, halaman yang Anda cari tidak tersedia.
          </p>
          
          <div className="mt-6 space-y-3">
            <Button 
              className="w-full flex items-center justify-center" 
              onClick={() => setLocation("/")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Halaman Utama
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => setLocation("/auth")}
            >
              Login / Register
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
