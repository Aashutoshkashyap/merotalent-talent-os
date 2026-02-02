import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
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
import { Calendar as CalendarIcon, Clock, Loader2, CreditCard, Wallet, Gift, Sparkles } from "lucide-react";
import { format } from "date-fns";

interface Mentor {
  id: string;
  name: string;
  hourlyRate: number;
  expertise: string[];
}

interface TrialSettings {
  free_trial_enabled: boolean;
  free_trial_type: string;
  free_trial_duration_minutes: number;
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
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState("");
  const [duration, setDuration] = useState("60");
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("khalti");
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Free trial states
  const [trialSettings, setTrialSettings] = useState<TrialSettings | null>(null);
  const [hasUsedTrial, setHasUsedTrial] = useState(false);
  const [useFreeTrial, setUseFreeTrial] = useState(false);

  useEffect(() => {
    if (isOpen && mentor.id && user) {
      checkTrialAvailability();
    }
  }, [isOpen, mentor.id, user]);

  const checkTrialAvailability = async () => {
    // Check trial settings for this mentor
    const { data: settings } = await supabase
      .from("mentor_trial_settings")
      .select("*")
      .eq("mentor_id", mentor.id)
      .eq("free_trial_enabled", true)
      .maybeSingle();

    if (settings) {
      setTrialSettings(settings);
      
      // Check if user has already used trial with this mentor
      if (user) {
        const { data: usage } = await supabase
          .from("mentor_trial_usage")
          .select("*")
          .eq("user_id", user.id)
          .eq("mentor_id", mentor.id)
          .maybeSingle();
        
        setHasUsedTrial(!!usage?.trial_used);
      }
    }
  };

  const trialAvailable = trialSettings && !hasUsedTrial;
  const effectiveDuration = useFreeTrial && trialSettings 
    ? trialSettings.free_trial_duration_minutes 
    : parseInt(duration);
  const totalAmount = useFreeTrial ? 0 : mentor.hourlyRate * (parseInt(duration) / 60);

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
        description: "Please tell us about what you'd like to discuss.",
      });
      return;
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handlePayment = async () => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Login required",
        description: "Please login to book a session.",
      });
      return;
    }

    setIsProcessing(true);
    
    // Create appointment
    const { data: appointment, error } = await supabase
      .from('appointments')
      .insert({
        student_id: user.id,
        mentor_id: mentor.id,
        scheduled_date: format(selectedDate!, "yyyy-MM-dd"),
        scheduled_time: selectedTime,
        duration_minutes: effectiveDuration,
        notes: `Topic: ${topic}\n${notes}`,
        amount: totalAmount,
        status: 'confirmed',
        payment_status: useFreeTrial ? 'trial' : 'pending',
      })
      .select()
      .single();

    if (error) {
      toast({
        variant: "destructive",
        title: "Booking failed",
        description: error.message,
      });
      setIsProcessing(false);
      return;
    }

    // If using free trial, record the usage
    if (useFreeTrial && trialSettings) {
      await supabase.from('mentor_trial_usage').upsert({
        user_id: user.id,
        mentor_id: mentor.id,
        trial_used: true,
        trial_started_at: new Date().toISOString(),
      });
    }

    // Create conversation for messaging (unlocked after payment/trial)
    await supabase.from('conversations').insert({
      mentor_id: mentor.id,
      mentee_id: user.id,
      appointment_id: appointment.id,
      is_active: true,
    });
    
    toast({
      title: useFreeTrial ? "Free trial booked!" : "Booking confirmed!",
      description: `Your ${useFreeTrial ? "free trial " : ""}session with ${mentor.name} is scheduled for ${format(selectedDate!, "PPP")} at ${selectedTime}.`,
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
    setUseFreeTrial(false);
  };

  const getTrialTypeLabel = (type: string) => {
    switch (type) {
      case "one_session": return "One Free Session";
      case "time_limited": return "Time-Limited Trial";
      case "intro_call": return "Free Intro Call";
      default: return "Free Trial";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Book Session with {mentor.name}</DialogTitle>
          <DialogDescription>
            {step === 1 && "Choose your preferred date and time"}
            {step === 2 && "Tell us about what you'd like to discuss"}
            {step === 3 && (useFreeTrial ? "Confirm your free trial session" : "Complete payment to confirm your booking")}
          </DialogDescription>
        </DialogHeader>

        {/* Free Trial Banner */}
        {trialAvailable && step === 1 && (
          <div 
            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
              useFreeTrial 
                ? "border-success bg-success/10" 
                : "border-dashed border-success/50 hover:border-success"
            }`}
            onClick={() => setUseFreeTrial(!useFreeTrial)}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                <Gift className="w-5 h-5 text-success" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-success">
                    {getTrialTypeLabel(trialSettings!.free_trial_type)}
                  </p>
                  <Badge variant="secondary" className="bg-success/20 text-success">
                    <Sparkles className="w-3 h-3 mr-1" />
                    FREE
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {trialSettings!.free_trial_duration_minutes} minute session • No payment required
                </p>
              </div>
              <input 
                type="checkbox" 
                checked={useFreeTrial} 
                onChange={(e) => setUseFreeTrial(e.target.checked)}
                className="w-5 h-5 rounded"
              />
            </div>
          </div>
        )}

        {hasUsedTrial && step === 1 && (
          <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
            You've already used your free trial with this mentor.
          </div>
        )}

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

            {!useFreeTrial && (
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
            )}

            {useFreeTrial && (
              <div className="p-3 rounded-lg bg-success/10 border border-success/20">
                <p className="text-sm font-medium text-success">
                  Free trial: {trialSettings?.free_trial_duration_minutes} minutes
                </p>
              </div>
            )}
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
                <span className="font-medium">{effectiveDuration} minutes</span>
              </div>
              {useFreeTrial && (
                <div className="flex justify-between text-sm pt-2 border-t">
                  <span className="text-success font-medium">Free Trial</span>
                  <Badge className="bg-success text-success-foreground">
                    <Gift className="w-3 h-3 mr-1" />
                    FREE
                  </Badge>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Payment (or Confirmation for free trial) */}
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
                <span className="font-medium">{effectiveDuration} minutes</span>
              </div>
              <div className="flex justify-between text-sm border-t pt-2 mt-2">
                <span className="font-medium">Total</span>
                {useFreeTrial ? (
                  <span className="font-bold text-success">FREE TRIAL</span>
                ) : (
                  <span className="font-bold text-primary">NPR {totalAmount.toLocaleString()}</span>
                )}
              </div>
            </div>

            {!useFreeTrial && (
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
            )}

            {useFreeTrial && (
              <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                <div className="flex items-center gap-3">
                  <Gift className="w-6 h-6 text-success" />
                  <div>
                    <p className="font-medium text-success">Free Trial Session</p>
                    <p className="text-sm text-muted-foreground">
                      No payment required. Messaging will be enabled after this session.
                    </p>
                  </div>
                </div>
              </div>
            )}
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
              ) : useFreeTrial ? (
                "Confirm Free Trial"
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
