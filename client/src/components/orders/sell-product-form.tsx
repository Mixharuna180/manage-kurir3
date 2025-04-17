import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import { productFormSchema, InsertProduct } from "@shared/schema";
import { generateTransactionId, formatToIDR } from "@/lib/xendit";
import { Loader2, Upload, MapPin, Navigation } from "lucide-react";
import { TransactionSuccessModal } from "./transaction-success-modal";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export function SellProductForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [transactionData, setTransactionData] = useState<any>(null);
  const [selectedShippingCategory, setSelectedShippingCategory] = useState<string>("");
  const [customShippingPrice, setCustomShippingPrice] = useState<number>(0);
  const [showCustomShippingPrice, setShowCustomShippingPrice] = useState<boolean>(false);
  const [userLocation, setUserLocation] = useState<{lat: string, lng: string} | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState<boolean>(false);
  
  // State untuk menyimpan file gambar
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // Create form
  const form = useForm<InsertProduct>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      userId: user?.id || 0,
      name: "",
      description: "",
      category: "Other",
      shippingCategory: "",
      shippingPrice: 0,
      productStatus: "unpaid",
      shippingPaidBy: "buyer",
      price: 0,
      weight: 0,
      quantity: 1,
      pickupAddress: user?.address || "",
      pickupLatitude: "",
      pickupLongitude: "",
      city: user?.city || "",
      postalCode: user?.postalCode || "",
    },
  });

  // Calculate shipping price based on category
  const getShippingPrice = (category: string): number => {
    switch(category) {
      case 'A': return 10000;
      case 'B': return 20000;
      case 'C': return 30000;
      case 'Custom': return customShippingPrice;
      default: return 0;
    }
  };

  // Get user's current location
  const getUserLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Geolocation not supported",
        description: "Your browser does not support geolocation",
        variant: "destructive"
      });
      return;
    }

    setIsLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude.toString(), lng: longitude.toString() });
        
        // Update form values with coordinates
        form.setValue('pickupLatitude', latitude.toString());
        form.setValue('pickupLongitude', longitude.toString());
        
        toast({
          title: "Location detected",
          description: "Your current location has been set as pickup location"
        });
        setIsLoadingLocation(false);
      },
      (error) => {
        console.error("Error getting location:", error);
        toast({
          title: "Location error",
          description: "Could not get your current location: " + error.message,
          variant: "destructive"
        });
        setIsLoadingLocation(false);
      }
    );
  };

  // Handle shipping category change
  useEffect(() => {
    if (selectedShippingCategory) {
      const price = getShippingPrice(selectedShippingCategory);
      form.setValue('shippingPrice', price);
      form.setValue('shippingCategory', selectedShippingCategory);
      setShowCustomShippingPrice(selectedShippingCategory === 'Custom');
    }
  }, [selectedShippingCategory, customShippingPrice, form]);

  const createProductMutation = useMutation({
    mutationFn: async (data: InsertProduct) => {
      const res = await apiRequest("POST", "/api/products", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      
      // Create an order for this product
      const transactionId = generateTransactionId();
      createOrderMutation.mutate({
        transactionId,
        productId: data.id,
        sellerId: user?.id || 0,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating product",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/orders", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      setTransactionData(data);
      setShowSuccessModal(true);
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating order",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertProduct) => {
    // Log informasi file gambar yang diupload (dalam produksi, kita akan mengirim file ke server)
    if (selectedFiles.length > 0) {
      console.log(`${selectedFiles.length} file gambar siap untuk diupload`);
      selectedFiles.forEach((file, index) => {
        console.log(`File ${index + 1}: ${file.name} (${Math.round(file.size / 1024)} KB)`);
      });
      
      // Dalam aplikasi yang sebenarnya, kita akan membuat FormData dan mengunggah file ke server
      // const formData = new FormData();
      // selectedFiles.forEach(file => formData.append('product_images', file));
      // formData.append('product_data', JSON.stringify(data));
      // await apiRequest("POST", "/api/products/with-images", formData);
    }
    
    // Tetap menggunakan endpoint produk yang ada untuk demo
    createProductMutation.mutate(data);
  };

  const isPending = createProductMutation.isPending || createOrderMutation.isPending;

  return (
    <>
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 bg-primary-800 text-white">
          <h2 className="text-xl font-bold">Sell Product</h2>
          <p className="mt-1 text-sm text-primary-100">Fill in the details to create a new product listing</p>
        </div>
        
        <div className="px-4 py-5 sm:p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-3">
                      <FormLabel>Product Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-3">
                      <FormLabel>Category</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select product category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Electronics">Electronics</SelectItem>
                          <SelectItem value="Clothing">Clothing</SelectItem>
                          <SelectItem value="Home">Home & Kitchen</SelectItem>
                          <SelectItem value="Books">Books</SelectItem>
                          <SelectItem value="Toys">Toys & Games</SelectItem>
                          <SelectItem value="Food">Food & Beverages</SelectItem>
                          <SelectItem value="Beauty">Beauty & Health</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Select the category that best fits your product
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="shippingCategory"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-3">
                      <FormLabel>Shipping Category</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          setSelectedShippingCategory(value);
                        }}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select shipping category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="A">A (30cm×30cm×30cm) - Rp. 10.000</SelectItem>
                          <SelectItem value="B">B (45cm×30cm×30cm) - Rp. 20.000</SelectItem>
                          <SelectItem value="C">C (60cm×30cm×30cm) - Rp. 30.000</SelectItem>
                          <SelectItem value="Custom">Custom Dimensions</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Select the size category of your product for shipping
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-6">
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          rows={3}
                          placeholder="Brief description of your product"
                          value={field.value || ''}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref} 
                        />
                      </FormControl>
                      <FormDescription>
                        Brief description of your product.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Price (IDR)</FormLabel>
                      <FormControl>
                        <div className="relative rounded-md shadow-sm">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-neutral-500 sm:text-sm">Rp</span>
                          </div>
                          <Input
                            {...field}
                            type="number"
                            className="pl-12"
                            placeholder="0.00"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="weight"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Weight (kg)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Quantity</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min="1"
                          placeholder="1"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Custom Shipping Price */}
                {showCustomShippingPrice && (
                  <FormField
                    control={form.control}
                    name="shippingPrice"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-3">
                        <FormLabel>Custom Shipping Price (IDR)</FormLabel>
                        <FormControl>
                          <div className="relative rounded-md shadow-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <span className="text-neutral-500 sm:text-sm">Rp</span>
                            </div>
                            <Input
                              type="number"
                              className="pl-12"
                              placeholder="0.00"
                              value={field.value}
                              onChange={(e) => {
                                const value = parseInt(e.target.value);
                                field.onChange(value);
                                setCustomShippingPrice(value);
                              }}
                            />
                          </div>
                        </FormControl>
                        <FormDescription>
                          Enter custom shipping price for non-standard dimensions
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Shipping Options */}
                <FormField
                  control={form.control}
                  name="shippingPaidBy"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-6">
                      <FormLabel>Shipping Payment</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="buyer" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Paid by buyer
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="seller" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Paid by seller (free shipping)
                            </FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pickupAddress"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-6">
                      <FormLabel>Pickup Address</FormLabel>
                      <div className="flex space-x-2">
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <Button 
                          type="button" 
                          variant="outline" 
                          className="flex items-center"
                          onClick={getUserLocation}
                          disabled={isLoadingLocation}
                        >
                          {isLoadingLocation ? 
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 
                            <MapPin className="mr-2 h-4 w-4" />
                          }
                          {isLoadingLocation ? "Getting Location..." : "Get Current Location"}
                        </Button>
                      </div>
                      <FormDescription>
                        {userLocation ? 
                          `Location detected at coordinates: ${userLocation.lat}, ${userLocation.lng}` : 
                          "Enter address manually or click to get your current location"
                        }
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-6">
                      <FormLabel>Location (Kecamatan/Kelurahan)</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select location" />
                          </SelectTrigger>
                          <SelectContent className="max-h-80 overflow-y-auto">
                            <div className="p-1 text-xs font-bold text-muted-foreground mb-1 border-b">Alang-Alang Lebar</div>
                            <SelectItem value="Alang-Alang Lebar/Talang Kelapa">Talang Kelapa</SelectItem>
                            <SelectItem value="Alang-Alang Lebar/Sukarami">Sukarami</SelectItem>
                            <SelectItem value="Alang-Alang Lebar/Kebun Bunga">Kebun Bunga</SelectItem>
                            <SelectItem value="Alang-Alang Lebar/Srijaya">Srijaya</SelectItem>
                            
                            <div className="p-1 text-xs font-bold text-muted-foreground mt-2 mb-1 border-b">Bukit Kecil</div>
                            <SelectItem value="Bukit Kecil/22 Ilir">22 Ilir</SelectItem>
                            <SelectItem value="Bukit Kecil/23 Ilir">23 Ilir</SelectItem>
                            <SelectItem value="Bukit Kecil/24 Ilir">24 Ilir</SelectItem>
                            <SelectItem value="Bukit Kecil/26 Ilir">26 Ilir</SelectItem>
                            <SelectItem value="Bukit Kecil/Talang Semut">Talang Semut</SelectItem>
                            <SelectItem value="Bukit Kecil/Lawang Kidul">Lawang Kidul</SelectItem>
                            
                            <div className="p-1 text-xs font-bold text-muted-foreground mt-2 mb-1 border-b">Gandus</div>
                            <SelectItem value="Gandus/Gandus">Gandus</SelectItem>
                            <SelectItem value="Gandus/Karang Jaya">Karang Jaya</SelectItem>
                            <SelectItem value="Gandus/Pulokerto">Pulokerto</SelectItem>
                            <SelectItem value="Gandus/Naga Swidak">Naga Swidak</SelectItem>
                            <SelectItem value="Gandus/Sungai Lais">Sungai Lais</SelectItem>
                            <SelectItem value="Gandus/Karang Anyar">Karang Anyar</SelectItem>
                            
                            <div className="p-1 text-xs font-bold text-muted-foreground mt-2 mb-1 border-b">Ilir Barat I</div>
                            <SelectItem value="Ilir Barat I/Bukit Lama">Bukit Lama</SelectItem>
                            <SelectItem value="Ilir Barat I/Bukit Baru">Bukit Baru</SelectItem>
                            <SelectItem value="Ilir Barat I/Demang Lebar Daun">Demang Lebar Daun</SelectItem>
                            <SelectItem value="Ilir Barat I/Lorok Pakjo">Lorok Pakjo</SelectItem>
                            <SelectItem value="Ilir Barat I/Siring Agung">Siring Agung</SelectItem>
                            <SelectItem value="Ilir Barat I/26 Ilir">26 Ilir</SelectItem>
                            
                            <div className="p-1 text-xs font-bold text-muted-foreground mt-2 mb-1 border-b">Ilir Barat II</div>
                            <SelectItem value="Ilir Barat II/Plaju Darat">Plaju Darat</SelectItem>
                            <SelectItem value="Ilir Barat II/Plaju Ilir">Plaju Ilir</SelectItem>
                            <SelectItem value="Ilir Barat II/Tangga Buntung">Tangga Buntung</SelectItem>
                            <SelectItem value="Ilir Barat II/Talang Bubuk">Talang Bubuk</SelectItem>
                            <SelectItem value="Ilir Barat II/Talang Putri">Talang Putri</SelectItem>
                            <SelectItem value="Ilir Barat II/Bagus Kuning">Bagus Kuning</SelectItem>
                            <SelectItem value="Ilir Barat II/Mariana">Mariana</SelectItem>
                            <SelectItem value="Ilir Barat II/Kemang Manis">Kemang Manis</SelectItem>
                            
                            <div className="p-1 text-xs font-bold text-muted-foreground mt-2 mb-1 border-b">Ilir Timur I</div>
                            <SelectItem value="Ilir Timur I/16 Ilir">16 Ilir</SelectItem>
                            <SelectItem value="Ilir Timur I/17 Ilir">17 Ilir</SelectItem>
                            <SelectItem value="Ilir Timur I/18 Ilir">18 Ilir</SelectItem>
                            <SelectItem value="Ilir Timur I/19 Ilir">19 Ilir</SelectItem>
                            <SelectItem value="Ilir Timur I/20 Ilir D I">20 Ilir D I</SelectItem>
                            <SelectItem value="Ilir Timur I/20 Ilir D II">20 Ilir D II</SelectItem>
                            <SelectItem value="Ilir Timur I/20 Ilir D III">20 Ilir D III</SelectItem>
                            <SelectItem value="Ilir Timur I/21 Ilir">21 Ilir</SelectItem>
                            <SelectItem value="Ilir Timur I/22 Ilir">22 Ilir</SelectItem>
                            <SelectItem value="Ilir Timur I/24 Ilir">24 Ilir</SelectItem>
                            <SelectItem value="Ilir Timur I/Kuto Batu">Kuto Batu</SelectItem>
                            
                            <div className="p-1 text-xs font-bold text-muted-foreground mt-2 mb-1 border-b">Ilir Timur II</div>
                            <SelectItem value="Ilir Timur II/1 Ilir">1 Ilir</SelectItem>
                            <SelectItem value="Ilir Timur II/2 Ilir">2 Ilir</SelectItem>
                            <SelectItem value="Ilir Timur II/3 Ilir">3 Ilir</SelectItem>
                            <SelectItem value="Ilir Timur II/4 Ilir">4 Ilir</SelectItem>
                            <SelectItem value="Ilir Timur II/5 Ilir">5 Ilir</SelectItem>
                            <SelectItem value="Ilir Timur II/6 Ilir">6 Ilir</SelectItem>
                            <SelectItem value="Ilir Timur II/Lawang Kidul">Lawang Kidul</SelectItem>
                            <SelectItem value="Ilir Timur II/Sungai Buah">Sungai Buah</SelectItem>
                            <SelectItem value="Ilir Timur II/Kuto Batu">Kuto Batu</SelectItem>
                            
                            <div className="p-1 text-xs font-bold text-muted-foreground mt-2 mb-1 border-b">Ilir Timur III</div>
                            <SelectItem value="Ilir Timur III/Kalidoni">Kalidoni</SelectItem>
                            <SelectItem value="Ilir Timur III/Sukamulya">Sukamulya</SelectItem>
                            <SelectItem value="Ilir Timur III/Kebun Bunga">Kebun Bunga</SelectItem>
                            <SelectItem value="Ilir Timur III/Talang Keramat">Talang Keramat</SelectItem>
                            <SelectItem value="Ilir Timur III/Silaberanti">Silaberanti</SelectItem>
                            <SelectItem value="Ilir Timur III/Karanganyar">Karanganyar</SelectItem>
                            
                            <div className="p-1 text-xs font-bold text-muted-foreground mt-2 mb-1 border-b">Jakabaring</div>
                            <SelectItem value="Jakabaring/15 Ulu">15 Ulu</SelectItem>
                            <SelectItem value="Jakabaring/14 Ulu">14 Ulu</SelectItem>
                            <SelectItem value="Jakabaring/13 Ulu">13 Ulu</SelectItem>
                            <SelectItem value="Jakabaring/Tuan Kentang">Tuan Kentang</SelectItem>
                            <SelectItem value="Jakabaring/Plaju Ulu">Plaju Ulu</SelectItem>
                            
                            <div className="p-1 text-xs font-bold text-muted-foreground mt-2 mb-1 border-b">Kalidoni</div>
                            <SelectItem value="Kalidoni/Kalidoni">Kalidoni</SelectItem>
                            <SelectItem value="Kalidoni/Duku">Duku</SelectItem>
                            <SelectItem value="Kalidoni/Sialang">Sialang</SelectItem>
                            <SelectItem value="Kalidoni/Karya Jaya">Karya Jaya</SelectItem>
                            <SelectItem value="Kalidoni/Talang Kelapa">Talang Kelapa</SelectItem>
                            
                            <div className="p-1 text-xs font-bold text-muted-foreground mt-2 mb-1 border-b">Plaju</div>
                            <SelectItem value="Plaju/Talang Putri">Talang Putri</SelectItem>
                            <SelectItem value="Plaju/Komperta">Komperta</SelectItem>
                            <SelectItem value="Plaju/Talang Bubuk">Talang Bubuk</SelectItem>
                            <SelectItem value="Plaju/Plaju Darat">Plaju Darat</SelectItem>
                            <SelectItem value="Plaju/Bagus Kuning">Bagus Kuning</SelectItem>
                            <SelectItem value="Plaju/Plaju Ulu">Plaju Ulu</SelectItem>
                            <SelectItem value="Plaju/Plaju Ilir">Plaju Ilir</SelectItem>
                            
                            <div className="p-1 text-xs font-bold text-muted-foreground mt-2 mb-1 border-b">Kertapati</div>
                            <SelectItem value="Kertapati/Karya Jaya">Karya Jaya</SelectItem>
                            <SelectItem value="Kertapati/Kemang Agung">Kemang Agung</SelectItem>
                            <SelectItem value="Kertapati/Kemas Rindo">Kemas Rindo</SelectItem>
                            <SelectItem value="Kertapati/Keramasan">Keramasan</SelectItem>
                            <SelectItem value="Kertapati/Kertapati">Kertapati</SelectItem>
                            
                            <div className="p-1 text-xs font-bold text-muted-foreground mt-2 mb-1 border-b">Sukarami</div>
                            <SelectItem value="Sukarami/Kebun Bunga">Kebun Bunga</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormDescription>
                        Pilih lokasi Kecamatan dan Kelurahan
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="productStatus"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-6">
                      <FormLabel>Product Payment Status</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="unpaid" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Unpaid (Payment after order)
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="paid" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Paid (Pre-paid product)
                            </FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="sm:col-span-6">
                  <FormLabel className="block text-sm font-medium">Product Images</FormLabel>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-neutral-300 border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                      <Upload className="mx-auto h-12 w-12 text-neutral-400" />
                      <div className="flex flex-col gap-2 items-center text-sm text-neutral-600">
                        <Button 
                          type="button"
                          variant="outline" 
                          onClick={() => document.getElementById('product-images')?.click()}
                          className="text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
                        >
                          Pilih Gambar
                        </Button>
                        
                        <input 
                          id="product-images" 
                          type="file" 
                          accept="image/*" 
                          multiple 
                          className="hidden"
                          onChange={(e) => {
                            const files = e.target.files;
                            if (files?.length) {
                              // Convert FileList to array and store in state
                              const fileArray = Array.from(files);
                              setSelectedFiles(fileArray);
                              
                              toast({
                                title: "Gambar dipilih",
                                description: `${files.length} gambar siap diunggah`,
                              });
                            }
                          }} 
                        />
                        
                        <p className="text-xs text-neutral-500">
                          Format: PNG, JPG, GIF (Maksimal 10MB)
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Preview selected files */}
                  {selectedFiles.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="relative group">
                          <div className="h-24 w-full rounded-md overflow-hidden border bg-neutral-50">
                            <img 
                              src={URL.createObjectURL(file)} 
                              alt={`Preview ${index}`}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute -top-2 -right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => {
                              // Remove file from array
                              setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
                            }}
                          >
                            &times;
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <p className="mt-2 text-sm text-neutral-500">
                    Unggah gambar produk (opsional, maksimal 5 gambar)
                  </p>
                </div>
              </div>

              <div className="pt-5">
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="mr-3"
                    onClick={() => form.reset()}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={isPending}
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Listing"
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </div>
      </div>

      {showSuccessModal && transactionData && (
        <TransactionSuccessModal
          transactionData={transactionData}
          onClose={() => setShowSuccessModal(false)}
        />
      )}
    </>
  );
}
