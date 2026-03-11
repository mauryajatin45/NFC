import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { Order, OrderItem } from "@/services/api/types";

interface ManualItem {
  name: string;
  sku: string;
  quantity: string;
  price: string;
}

const EMPTY_ITEM: ManualItem = { name: "", sku: "", quantity: "1", price: "" };

export default function CreateOrder() {
  const navigate = useNavigate();

  const [orderId, setOrderId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [country, setCountry] = useState("");

  const [items, setItems] = useState<ManualItem[]>([{ ...EMPTY_ITEM }]);

  const addItem = () => setItems([...items, { ...EMPTY_ITEM }]);

  const removeItem = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof ManualItem, value: string) => {
    setItems(items.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const handleSubmit = () => {
    // Validation
    if (!orderId.trim()) {
      toast({ title: "Order ID is required", variant: "destructive" });
      return;
    }
    if (!customerName.trim()) {
      toast({ title: "Customer name is required", variant: "destructive" });
      return;
    }
    if (customerEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())) {
      toast({ title: "Invalid email address", variant: "destructive" });
      return;
    }
    if (items.some((item) => !item.name.trim())) {
      toast({ title: "All items must have a name", variant: "destructive" });
      return;
    }

    const now = new Date().toISOString();

    const orderItems: OrderItem[] = items.map((item, i) => ({
      id: `manual_item_${Date.now()}_${i}`,
      sku: item.sku.trim() || `MANUAL-${i + 1}`,
      name: item.name.trim(),
      value: parseFloat(item.price) || 0,
      currency: "USD",
    }));

    const order: Order = {
      id: orderId.trim(),
      status: "ready",
      customer: {
        name: customerName.trim(),
        email: customerEmail.trim() || undefined,
        phone: customerPhone.trim() || undefined,
      },
      shippingAddress:
        street.trim() || city.trim() || state.trim() || zip.trim() || country.trim()
          ? {
              street: street.trim(),
              city: city.trim(),
              state: state.trim(),
              zip: zip.trim(),
              country: country.trim(),
            }
          : undefined,
      items: orderItems,
      createdAt: now,
      updatedAt: now,
      source: "manual",
    };

    // Navigate to enrollment scan step with the full order
    navigate("/enroll-nfc", { state: { orderId: order.id, order } });
  };

  return (
    <AppLayout>
      <div className="px-4 py-6 max-w-2xl mx-auto">
        <PageHeader title="Create Order" />

        <div className="space-y-5">
          {/* Order ID */}
          <div className="space-y-1.5">
            <Label htmlFor="orderId" className="text-xs uppercase tracking-wider text-muted-foreground">
              Order ID
            </Label>
            <Input
              id="orderId"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder="e.g. ORD-00999"
              className="h-11 bg-card border-border"
            />
          </div>

          {/* Customer section */}
          <fieldset className="space-y-3">
            <legend className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Customer</legend>
            <Input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Full name *"
              className="h-11 bg-card border-border"
            />
            <Input
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="Email"
              type="email"
              className="h-11 bg-card border-border"
            />
            <Input
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="Phone (optional)"
              type="tel"
              className="h-11 bg-card border-border"
            />
          </fieldset>

          {/* Shipping Address */}
          <fieldset className="space-y-3">
            <legend className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
              Shipping Address
            </legend>
            <Input
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              placeholder="Street"
              className="h-11 bg-card border-border"
            />
            <div className="flex gap-2">
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                className="h-11 bg-card border-border flex-1"
              />
              <Input
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="State"
                className="h-11 bg-card border-border w-24"
              />
            </div>
            <div className="flex gap-2">
              <Input
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                placeholder="Zip"
                className="h-11 bg-card border-border w-28"
              />
              <Input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Country"
                className="h-11 bg-card border-border flex-1"
              />
            </div>
          </fieldset>

          {/* Items */}
          <div className="space-y-3">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Items</Label>
            {items.map((item, index) => (
              <div key={index} className="bg-card border border-border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Item {index + 1}</span>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <Input
                  value={item.name}
                  onChange={(e) => updateItem(index, "name", e.target.value)}
                  placeholder="Item name *"
                  className="h-10 bg-background border-border text-sm"
                />
                <div className="flex gap-2">
                  <Input
                    value={item.sku}
                    onChange={(e) => updateItem(index, "sku", e.target.value)}
                    placeholder="SKU"
                    className="h-10 bg-background border-border text-sm flex-1"
                  />
                  <Input
                    value={item.quantity}
                    onChange={(e) => updateItem(index, "quantity", e.target.value)}
                    placeholder="Qty"
                    type="number"
                    min="1"
                    className="h-10 bg-background border-border text-sm w-16"
                  />
                  <Input
                    value={item.price}
                    onChange={(e) => updateItem(index, "price", e.target.value)}
                    placeholder="Price"
                    type="number"
                    className="h-10 bg-background border-border text-sm w-24"
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addItem}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus size={14} />
              <span>Add another item</span>
            </button>
          </div>

          {/* Submit */}
          <Button variant="default" size="default" onClick={handleSubmit}>
            Create &amp; Start Enrollment
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}