import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CreditCard, Wallet, CheckCircle, Loader2, Shield } from "lucide-react";

const CourseCheckoutPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [paymentMethod, setPaymentMethod] = useState("khalti");
  const [isProcessing, setIsProcessing] = useState(false);
  const [couponCode, setCouponCode] = useState("");

  // Mock course data
  const course = {
    id: "2",
    title: "UI/UX Design Masterclass",
    thumbnail: "https://images.unsplash.com/photo-1541462608143-67571c6738dd?w=200",
    price: 2999,
    originalPrice: 4999,
  };

  const handlePayment = async () => {
    setIsProcessing(true);
    
    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    toast({
      title: "Payment successful!",
      description: "You now have access to the course.",
    });
    
    navigate("/dashboard/learning");
  };

  const discount = course.originalPrice - course.price;
  const discountPercent = Math.round((discount / course.originalPrice) * 100);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <h1 className="text-2xl font-display font-bold mb-8">Complete Your Purchase</h1>

          <div className="grid md:grid-cols-5 gap-8">
            {/* Payment Form */}
            <div className="md:col-span-3 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Payment Method</CardTitle>
                </CardHeader>
                <CardContent>
                  <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-3">
                    <div className={`flex items-center space-x-3 p-4 rounded-lg border cursor-pointer ${
                      paymentMethod === "khalti" ? "border-primary bg-primary/5" : "border-border"
                    }`}>
                      <RadioGroupItem value="khalti" id="khalti" />
                      <Label htmlFor="khalti" className="flex items-center gap-3 cursor-pointer flex-1">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                          <Wallet className="w-5 h-5 text-purple-500" />
                        </div>
                        <div>
                          <p className="font-medium">Khalti</p>
                          <p className="text-xs text-muted-foreground">Pay with Khalti wallet</p>
                        </div>
                      </Label>
                    </div>

                    <div className={`flex items-center space-x-3 p-4 rounded-lg border cursor-pointer ${
                      paymentMethod === "esewa" ? "border-primary bg-primary/5" : "border-border"
                    }`}>
                      <RadioGroupItem value="esewa" id="esewa" />
                      <Label htmlFor="esewa" className="flex items-center gap-3 cursor-pointer flex-1">
                        <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                          <Wallet className="w-5 h-5 text-green-500" />
                        </div>
                        <div>
                          <p className="font-medium">eSewa</p>
                          <p className="text-xs text-muted-foreground">Pay with eSewa wallet</p>
                        </div>
                      </Label>
                    </div>

                    <div className={`flex items-center space-x-3 p-4 rounded-lg border cursor-pointer ${
                      paymentMethod === "card" ? "border-primary bg-primary/5" : "border-border"
                    }`}>
                      <RadioGroupItem value="card" id="card" />
                      <Label htmlFor="card" className="flex items-center gap-3 cursor-pointer flex-1">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                          <CreditCard className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                          <p className="font-medium">Card Payment</p>
                          <p className="text-xs text-muted-foreground">Debit or Credit card</p>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Coupon Code</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter coupon code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    />
                    <Button variant="outline">Apply</Button>
                  </div>
                </CardContent>
              </Card>

              <div className="p-4 rounded-lg bg-muted/50 flex items-center gap-3">
                <Shield className="w-5 h-5 text-green-500" />
                <p className="text-sm text-muted-foreground">
                  Your payment is secured with 256-bit SSL encryption
                </p>
              </div>
            </div>

            {/* Order Summary */}
            <div className="md:col-span-2">
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle className="text-lg">Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Course */}
                  <div className="flex gap-4">
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="w-20 h-14 object-cover rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm line-clamp-2">{course.title}</p>
                    </div>
                  </div>

                  <Separator />

                  {/* Pricing */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Original Price</span>
                      <span className="line-through text-muted-foreground">
                        NPR {course.originalPrice.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-green-500">
                      <span>Discount ({discountPercent}% off)</span>
                      <span>- NPR {discount.toLocaleString()}</span>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span>NPR {course.price.toLocaleString()}</span>
                  </div>

                  <Button
                    variant="hero"
                    size="lg"
                    className="w-full"
                    onClick={handlePayment}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Complete Payment
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    By completing your purchase, you agree to our Terms of Service
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CourseCheckoutPage;
