import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { CheckIcon, Copy, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TransactionSuccessModalProps {
  transactionData: any;
  onClose: () => void;
}

export function TransactionSuccessModal({ 
  transactionData,
  onClose
}: TransactionSuccessModalProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  
  const copyPaymentLink = () => {
    if (transactionData.paymentLink) {
      navigator.clipboard.writeText(transactionData.paymentLink);
      setCopied(true);
      toast({
        title: "Payment link copied",
        description: "Link has been copied to clipboard",
      });
      
      // Reset copy button after 2 seconds
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    }
  };
  
  const closeAndNavigate = () => {
    onClose();
    setLocation("/");
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl mx-4 w-full max-w-md overflow-hidden">
        <div className="bg-green-500 px-6 py-4 text-white flex justify-between items-center">
          <h2 className="text-xl font-semibold">Transaction Successful!</h2>
          <Button size="icon" variant="ghost" className="text-white" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="p-6">
          <div className="flex flex-col items-center justify-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckIcon className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-medium text-neutral-800">Your product listing has been created</h3>
          </div>
          
          <div className="bg-neutral-50 rounded-lg p-4 mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-neutral-500">Transaction ID:</span>
              <span className="text-sm font-medium text-neutral-800">
                {transactionData.transactionId}
              </span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-sm text-neutral-500">Product:</span>
              <span className="text-sm text-neutral-800">
                {transactionData.productName || "Your Product"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-neutral-500">Price:</span>
              <span className="text-sm text-neutral-800">
                {transactionData.price ? `Rp ${transactionData.price.toLocaleString('id-ID')}` : "Price not available"}
              </span>
            </div>
          </div>
          
          <p className="text-sm text-neutral-600 mb-6">
            A payment link has been sent to the buyer. Once payment is confirmed, a driver will be assigned for pickup.
          </p>
          
          <div className="flex flex-col space-y-3">
            <Button 
              onClick={copyPaymentLink}
              className="inline-flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-800 hover:bg-primary-700"
              disabled={!transactionData.paymentLink}
            >
              {copied ? (
                <>
                  <CheckIcon className="h-4 w-4 mr-2" />
                  Link Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Payment Link
                </>
              )}
            </Button>
            
            <Button 
              onClick={closeAndNavigate}
              variant="outline"
              className="inline-flex justify-center py-2 px-4 border border-neutral-300 rounded-md shadow-sm text-sm font-medium text-neutral-700"
            >
              Return to Dashboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
