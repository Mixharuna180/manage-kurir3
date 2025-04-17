import { PurchaseForm } from "@/components/orders/purchase-form";
import UserLayout from "@/components/layout/user-layout";
import { useParams } from "wouter";

export default function PurchasePage() {
  const params = useParams();
  const orderId = params?.id;

  return (
    <UserLayout>
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6 text-primary-600">Complete Your Purchase</h1>
        {orderId ? (
          <PurchaseForm orderId={orderId} />
        ) : (
          <div className="bg-red-50 p-4 rounded-md">
            <p className="text-red-600">Order ID is missing. Please try again.</p>
          </div>
        )}
      </div>
    </UserLayout>
  );
}