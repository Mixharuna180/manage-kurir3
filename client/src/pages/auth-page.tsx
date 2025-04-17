import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/use-auth";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { userRegisterSchema, LoginData } from "@shared/schema";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";

const loginSchema = z.object({
  username: z.string().min(1, { message: "Username is required" }),
  password: z.string().min(1, { message: "Password is required" }),
  rememberMe: z.boolean().optional(),
});

// Custom input styles
const inputClassName = "focus-within:ring-2 focus-within:ring-primary-400 transition-all shadow-sm hover:border-primary-300";

export default function AuthPage() {
  const [authType, setAuthType] = useState<string>("user");
  const [activeTab, setActiveTab] = useState<string>("login");
  const { user, loginMutation, registerMutation } = useAuth();
  const [location, setLocation] = useLocation();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      if (user.userType === "driver") {
        setLocation("/driver");
      } else if (user.userType === "admin") {
        setLocation("/admin");
      } else {
        setLocation("/");
      }
    }
  }, [user, setLocation]);

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
      rememberMe: false,
    },
  });

  const registerForm = useForm<z.infer<typeof userRegisterSchema>>({
    resolver: zodResolver(userRegisterSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      email: "",
      fullName: "",
      phoneNumber: "",
      address: "",
      city: "",
      postalCode: "",
      userType: authType,
    },
  });

  useEffect(() => {
    registerForm.setValue("userType", authType);
  }, [authType, registerForm]);

  const onLoginSubmit = (data: z.infer<typeof loginSchema>) => {
    const loginData: LoginData = {
      username: data.username,
      password: data.password,
    };
    loginMutation.mutate(loginData);
  };

  const onRegisterSubmit = (data: z.infer<typeof userRegisterSchema>) => {
    registerMutation.mutate({
      username: data.username,
      password: data.password,
      email: data.email,
      fullName: data.fullName,
      phoneNumber: data.phoneNumber,
      address: data.address,
      city: data.city,
      postalCode: data.postalCode,
      userType: data.userType,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-sky-100 via-white to-blue-100">
      <div className="absolute inset-0 overflow-hidden z-0">
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-primary-300"
              style={{
                width: `${Math.random() * 300 + 50}px`,
                height: `${Math.random() * 300 + 50}px`,
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                opacity: Math.random() * 0.5 + 0.1,
                transform: `scale(${Math.random() * 0.8 + 0.2}) translate(-50%, -50%)`,
              }}
            />
          ))}
        </div>
      </div>
      
      <Card className="w-full max-w-md bg-white/90 backdrop-blur-sm rounded-lg shadow-xl overflow-hidden z-10 border border-white/50">
        <CardHeader className="bg-blue-600 px-6 py-8 text-white">
          <div className="flex justify-center mb-3">
            <div className="h-16 w-16 rounded-full bg-white flex items-center justify-center shadow-md">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-center">LogiTech</CardTitle>
          <CardDescription className="text-center mt-2 text-blue-100">
            Logistics Management System
          </CardDescription>
        </CardHeader>
        
        <CardContent className="px-6 py-8">
          <div className="flex justify-center mb-6">
            <div className="inline-flex rounded-full p-1 bg-blue-100 shadow-inner" role="group">
              <Button
                type="button"
                variant={authType === "user" ? "default" : "ghost"}
                className={`rounded-full px-6 ${
                  authType === "user"
                    ? "bg-white text-blue-700 hover:bg-white shadow-md"
                    : "text-blue-700 hover:bg-white/80 hover:text-blue-800"
                }`}
                onClick={() => setAuthType("user")}
              >
                User
              </Button>
              <Button
                type="button"
                variant={authType === "driver" ? "default" : "ghost"}
                className={`rounded-full px-6 ${
                  authType === "driver"
                    ? "bg-white text-blue-700 hover:bg-white shadow-md"
                    : "text-blue-700 hover:bg-white/80 hover:text-blue-800"
                }`}
                onClick={() => setAuthType("driver")}
              >
                Driver
              </Button>
            </div>
          </div>
          
          <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-blue-50 p-1 rounded-full shadow-inner">
              <TabsTrigger 
                value="login" 
                className="rounded-full transition-all data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-md"
              >
                Login
              </TabsTrigger>
              <TabsTrigger 
                value="register" 
                className="rounded-full transition-all data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-md"
              >
                Register
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-6">
                  <FormField
                    control={loginForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="your-username" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="•••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex items-center justify-between">
                    <FormField
                      control={loginForm.control}
                      name="rememberMe"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="text-sm cursor-pointer">Remember me</FormLabel>
                        </FormItem>
                      )}
                    />
                    
                    <Button variant="link" className="p-0 text-sm text-blue-600 hover:text-blue-500">
                      Forgot password?
                    </Button>
                  </div>
                  
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white shadow-lg transition-all duration-300 transform hover:scale-[1.02] font-semibold"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      "Sign in"
                    )}
                  </Button>
                </form>
              </Form>
              
              <div className="mt-6">
                <p className="text-center text-sm text-neutral-600">
                  Don't have an account?
                  <Button
                    variant="link"
                    className="font-medium text-blue-600 hover:text-blue-500"
                    onClick={() => setActiveTab("register")}
                  >
                    Register now
                  </Button>
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="register">
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-6">
                  <FormField
                    control={registerForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="your-username" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={registerForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="your@email.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={registerForm.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="•••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={registerForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="•••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={registerForm.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="+62 811-234-5678" 
                            value={field.value || ''}
                            onChange={field.onChange}
                            name={field.name}
                            onBlur={field.onBlur}
                            ref={field.ref}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white shadow-lg transition-all duration-300 transform hover:scale-[1.02] font-semibold"
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Registering...
                      </>
                    ) : (
                      "Register"
                    )}
                  </Button>
                </form>
              </Form>
              
              <div className="mt-6">
                <p className="text-center text-sm text-neutral-600">
                  Already have an account?
                  <Button
                    variant="link"
                    className="font-medium text-blue-600 hover:text-blue-500"
                    onClick={() => setActiveTab("login")}
                  >
                    Sign in
                  </Button>
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
