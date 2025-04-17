import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Package, ShoppingCart } from "lucide-react";

interface PostLoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PostLoginModal({ open, onOpenChange }: PostLoginModalProps) {
  const [location, setLocation] = useLocation();

  const handleSell = () => {
    onOpenChange(false);
    setTimeout(() => {
      setLocation("/create-order");
    }, 100);
  };

  const handleBuy = () => {
    onOpenChange(false);
    setTimeout(() => {
      setLocation("/search-product");
    }, 100);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold text-primary-600">
            Welcome to LogiTech!
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col space-y-4 p-4">
          <p className="text-center text-muted-foreground mb-4">
            What would you like to do today?
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={handleSell}
              size="lg"
              className="flex flex-col items-center justify-center h-32 space-y-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
            >
              <Package className="h-8 w-8" />
              <span className="text-lg font-medium">Sell Product</span>
            </Button>
            <Button
              onClick={handleBuy}
              size="lg"
              className="flex flex-col items-center justify-center h-32 space-y-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
            >
              <ShoppingCart className="h-8 w-8" />
              <span className="text-lg font-medium">Buy Product</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}