import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, Clock, Loader2, CreditCard, Wallet } from "lucide-react";
import { format } from "date-fns";

interface Mentor {
  id: string;
  name: string;
  hourlyRate: number;
  expertise: string[];
}

interface BookingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mentor: Mentor;
}

const timeSlots = [
  "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
  "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM", "06:00 PM"
];

const BookingDialog = ({ isOpen, onClose, mentor }: BookingDialogProps) => {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState("");
  const [duration, setDuration] = useState("60");
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("khalti");
  const [isProcessing, setIsProcessing] = useState(false);

  const totalAmount = mentor.hourlyRate * (parseInt(duration) / 60);

  const handleNext = () => {
    if (step === 1 && (!selectedDate || !selectedTime)) {
      toast({
        variant: "destructive",
        title: "Select date and time",
        description: "Please choose when you'd like to have the session.",
      });
      return;
    }
    if (step === 2 && !topic.trim()) {
      toast({
        variant: "destructive",
        title: "Topic required",
        description: "Please tell us what you'd like to discuss.",
      });
      return;
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handlePayment = async () => {
    setIsProcessing(true);
    
    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    toast({
      title: "Booking confirmed!",
      description: `Your session with ${mentor.name} is scheduled for ${format(selectedDate!, "PPP")} at ${selectedTime}.`,
    });
    
    setIsProcessing(false);
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setStep(1);
    setSelectedDate(undefined);
    setSelectedTime("");
    setDuration("60");
    setTopic("");
    setNotes("");
    setPaymentMethod("khalti");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Book Session with {mentor.name}</DialogTitle>
          <DialogDescription>
            {step === 1 && "Choose your preferred date and time"}
            {step === 2 && "Tell us about what you'd like to discuss"}
            {step === 3 && "Complete payment to confirm your booking"}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Date & Time Selection */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Date</Label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => date < new Date() || date.getDay() === 0}
                className="rounded-md border"
              />
            </div>

            <div className="space-y-2">
              <Label>Select Time</Label>
              <div className="grid grid-cols-3 gap-2">
                {timeSlots.map((time) => (
                  <Button
                    key={time}
                    variant={selectedTime === time ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedTime(time)}
                    className="text-xs"
                  >
                    {time}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Duration</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Step 2: Topic & Notes */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="topic">What would you like to discuss?</Label>
              <Input
                id="topic"
                placeholder="e.g., Career guidance, Portfolio review, Technical help"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any specific questions or topics you'd like to cover..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
              />
            </div>

            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Date</span>
                <span className="font-medium">{selectedDate ? format(selectedDate, "PPP") : "-"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Time</span>
                <span className="font-medium">{selectedTime}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Duration</span>
                <span className="font-medium">{duration} minutes</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Payment */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Session with</span>
                <span className="font-medium">{mentor.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Date & Time</span>
                <span className="font-medium">{selectedDate ? format(selectedDate, "PPP") : "-"} at {selectedTime}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Duration</span>
                <span className="font-medium">{duration} minutes</span>
              </div>
              <div className="flex justify-between text-sm border-t pt-2 mt-2">
                <span className="font-medium">Total</span>
                <span className="font-bold text-primary">NPR {totalAmount.toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Payment Method</Label>
              <div className="space-y-2">
                <div
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${
                    paymentMethod === "khalti" ? "border-primary bg-primary/5" : "border-border"
                  }`}
                  onClick={() => setPaymentMethod("khalti")}
                >
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Wallet className="w-4 h-4 text-purple-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Khalti</p>
                    <p className="text-xs text-muted-foreground">Pay with Khalti wallet</p>
                  </div>
                </div>
                <div
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${
                    paymentMethod === "esewa" ? "border-primary bg-primary/5" : "border-border"
                  }`}
                  onClick={() => setPaymentMethod("esewa")}
                >
                  <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <Wallet className="w-4 h-4 text-green-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">eSewa</p>
                    <p className="text-xs text-muted-foreground">Pay with eSewa wallet</p>
                  </div>
                </div>
                <div
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${
                    paymentMethod === "card" ? "border-primary bg-primary/5" : "border-border"
                  }`}
                  onClick={() => setPaymentMethod("card")}
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <CreditCard className="w-4 h-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Card Payment</p>
                    <p className="text-xs text-muted-foreground">Debit or Credit card</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex gap-2">
          {step > 1 && (
            <Button variant="outline" onClick={handleBack}>
              Back
            </Button>
          )}
          {step < 3 ? (
            <Button variant="hero" onClick={handleNext}>
              Continue
            </Button>
          ) : (
            <Button variant="hero" onClick={handlePayment} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                `Pay NPR ${totalAmount.toLocaleString()}`
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BookingDialog;