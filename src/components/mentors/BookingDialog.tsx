"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { AlertCircle, Calendar as CalendarIcon, CreditCard, Loader2, Wallet } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import {
  ModuleFormClientError,
  submitAuthenticatedModuleForm,
} from "@/lib/forms/module-form-client";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Mentor {
  id: string;
  name: string;
  hourlyRate: number;
  expertise: string[];
}

interface BookingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitted?: (bookingId: string) => void;
  mentor: Mentor;
}

interface MentorService {
  id: string;
  title: string;
  description: string | null;
  session_type: "one_to_one" | "group";
  duration_minutes: number;
  capacity: number;
  price: number;
  currency: string;
}

const timeSlots = [
  "09:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "02:00 PM",
  "03:00 PM",
  "04:00 PM",
  "05:00 PM",
  "06:00 PM",
];

const BookingDialog = ({ isOpen, onClose, onSubmitted, mentor }: BookingDialogProps) => {
  const { toast } = useToast();
  const { profile, session, user } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState("");
  const [duration, setDuration] = useState("60");
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("khalti");
  const [services, setServices] = useState<MentorService[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setFullName((current) => current || profile?.full_name || "");
    setEmail((current) => current || profile?.email || user?.email || "");
    setPhone((current) => current || profile?.phone || "");
  }, [isOpen, profile?.email, profile?.full_name, profile?.phone, user?.email]);

  useEffect(() => {
    if (!isOpen) return;
    let current = true;
    setServicesLoading(true);
    setServicesError(null);
    setServices([]);
    setSelectedServiceId("");

    void (async () => {
      const { data, error } = await (supabase as any)
        .from("mentor_services")
        .select("id, title, description, session_type, duration_minutes, capacity, price, currency")
        .eq("mentor_id", mentor.id)
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });
      if (!current) return;
      if (error) {
        setServicesError(error.message);
        setServicesLoading(false);
        return;
      }
      const availableServices = (data ?? []) as MentorService[];
      setServices(availableServices);
      setSelectedServiceId(availableServices[0]?.id ?? "");
      setServicesLoading(false);
    })();

    return () => {
      current = false;
    };
  }, [isOpen, mentor.id]);

  const selectedService = services.find((service) => service.id === selectedServiceId) ?? null;
  const durationMinutes = selectedService?.duration_minutes ?? Number(duration);
  const estimatedAmount = selectedService?.price ?? mentor.hourlyRate * (durationMinutes / 60);

  const handleNext = () => {
    if (step === 1 && servicesError) {
      toast({
        variant: "destructive",
        title: "Services are unavailable",
        description: "The mentor's live services could not be verified. Please try again.",
      });
      return;
    }
    if (step === 1 && services.length > 0 && !selectedService) {
      toast({
        variant: "destructive",
        title: "Select a service",
        description: "Choose one of the mentor's active services before continuing.",
      });
      return;
    }
    if (step === 1 && (!selectedDate || !selectedTime)) {
      toast({
        variant: "destructive",
        title: "Select date and time",
        description: "Choose when you would like to have the session.",
      });
      return;
    }
    if (
      step === 2 &&
      (!topic.trim() || fullName.trim().length < 2 || !email.trim() || !phone.trim())
    ) {
      toast({
        variant: "destructive",
        title: "Complete your details",
        description: "A topic, full name, email, and phone number are required.",
      });
      return;
    }
    setStep((current) => Math.min(3, current + 1));
  };

  const resetForm = () => {
    setStep(1);
    setSelectedDate(undefined);
    setSelectedTime("");
    setDuration("60");
    setTopic("");
    setNotes("");
    setPaymentMethod("khalti");
    setSelectedServiceId("");
    setFieldErrors({});
  };

  const handleBooking = async () => {
    if (!session || !user || !selectedDate) {
      toast({
        variant: "destructive",
        title: "Login required",
        description: "Sign in again before booking a session.",
      });
      return;
    }

    setIsProcessing(true);
    setFieldErrors({});
    try {
      const result = await submitAuthenticatedModuleForm({
        accessToken: session.access_token,
        module: "mentor_booking",
        values: {
          mentorId: mentor.id,
          ...(selectedService ? { mentorServiceId: selectedService.id } : {}),
          fullName,
          email,
          phone,
          scheduledDate: format(selectedDate, "yyyy-MM-dd"),
          scheduledTime: selectedTime,
          durationMinutes: String(durationMinutes),
          topic,
          notes,
          paymentMethod,
        },
      });

      toast({
        title: "Booking request created",
        description: `Your session request with ${mentor.name} is stored. Complete payment when a configured gateway is available.`,
      });
      onSubmitted?.(result.id);
      resetForm();
      onClose();
    } catch (error) {
      if (error instanceof ModuleFormClientError) {
        setFieldErrors(error.fields);
        const keys = Object.keys(error.fields);
        if (keys.some((key) => ["scheduledDate", "scheduledTime", "durationMinutes"].includes(key))) {
          setStep(1);
        } else if (keys.some((key) => ["fullName", "email", "phone", "topic", "notes"].includes(key))) {
          setStep(2);
        }
      }
      toast({
        variant: "destructive",
        title: "Booking failed",
        description: error instanceof Error ? error.message : "The booking could not be created.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Book Session with {mentor.name}</DialogTitle>
          <DialogDescription>
            {step === 1 && "Choose your preferred date and time"}
            {step === 2 && "Tell the mentor what you would like to discuss"}
            {step === 3 && "Review the server-calculated booking request"}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Date</Label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0)) || date.getDay() === 0}
                className="rounded-md border"
              />
              {fieldErrors.scheduledDate?.[0] && <p className="text-xs font-semibold text-destructive">{fieldErrors.scheduledDate[0]}</p>}
            </div>

            <div className="space-y-2">
              <Label>Select Time</Label>
              <div className="grid grid-cols-3 gap-2">
                {timeSlots.map((time) => (
                  <Button
                    key={time}
                    type="button"
                    variant={selectedTime === time ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedTime(time)}
                    className="text-xs"
                  >
                    {time}
                  </Button>
                ))}
              </div>
              {fieldErrors.scheduledTime?.[0] && <p className="text-xs font-semibold text-destructive">{fieldErrors.scheduledTime[0]}</p>}
            </div>

            <div className="space-y-2">
              <Label>Mentor service</Label>
              {servicesLoading ? (
                <div className="flex items-center gap-2 rounded-xl border p-3 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading live services…</div>
              ) : servicesError ? (
                <div role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>Services could not be verified. {servicesError}</span></div>
              ) : services.length > 0 ? (
                <>
                  <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
                    <SelectTrigger><SelectValue placeholder="Choose a service" /></SelectTrigger>
                    <SelectContent>
                      {services.map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.title} · {service.duration_minutes} min · {service.currency} {Number(service.price).toLocaleString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedService && (
                    <div className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
                      <p className="font-semibold text-foreground">{selectedService.title}</p>
                      <p className="mt-1">{selectedService.duration_minutes} minutes · {selectedService.session_type === "group" ? `Group up to ${selectedService.capacity}` : "One-to-one"}</p>
                      {selectedService.description && <p className="mt-1">{selectedService.description}</p>}
                    </div>
                  )}
                  {fieldErrors.mentorServiceId?.[0] && <p className="text-xs font-semibold text-destructive">{fieldErrors.mentorServiceId[0]}</p>}
                </>
              ) : (
                <>
                  <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">This mentor has no active packaged service. You can request an hourly session at the mentor's published rate.</p>
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="90">1.5 hours</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </>
              )}
              {fieldErrors.durationMinutes?.[0] && <p className="text-xs font-semibold text-destructive">{fieldErrors.durationMinutes[0]}</p>}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="booking-full-name">Full name</Label>
                <Input id="booking-full-name" autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} />
                {fieldErrors.fullName?.[0] && <p className="text-xs font-semibold text-destructive">{fieldErrors.fullName[0]}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="booking-email">Email</Label>
                <Input id="booking-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
                {fieldErrors.email?.[0] && <p className="text-xs font-semibold text-destructive">{fieldErrors.email[0]}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="booking-phone">Phone *</Label>
                <Input id="booking-phone" type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="e.g. 9801010802" />
                {fieldErrors.phone?.[0] && <p className="text-xs font-semibold text-destructive">{fieldErrors.phone[0]}</p>}
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="booking-address">Address *</Label>
                <Input id="booking-address" placeholder="e.g. Kathmandu, Nepal" value={notes} onChange={(event) => setNotes(event.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="topic">What would you like to discuss?</Label>
              <Input
                id="topic"
                placeholder="e.g. Career guidance or portfolio review"
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                maxLength={180}
              />
              {fieldErrors.topic?.[0] && <p className="text-xs font-semibold text-destructive">{fieldErrors.topic[0]}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Additional notes (optional)</Label>
              <Textarea id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} maxLength={2000} />
              {fieldErrors.notes?.[0] && <p className="text-xs font-semibold text-destructive">{fieldErrors.notes[0]}</p>}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="space-y-2 rounded-lg bg-muted/50 p-4">
              <div className="flex justify-between gap-3 text-sm">
                <span className="text-muted-foreground">Session with</span>
                <span className="font-medium">{mentor.name}</span>
              </div>
              {selectedService && (
                <div className="flex justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">Service</span>
                  <span className="text-right font-medium">{selectedService.title}</span>
                </div>
              )}
              <div className="flex justify-between gap-3 text-sm">
                <span className="text-muted-foreground">Date & time</span>
                <span className="text-right font-medium">{selectedDate ? format(selectedDate, "PPP") : "-"} at {selectedTime}</span>
              </div>
              <div className="flex justify-between gap-3 text-sm">
                <span className="text-muted-foreground">Duration</span>
                <span className="font-medium">{durationMinutes} minutes</span>
              </div>
              <div className="mt-2 flex justify-between gap-3 border-t pt-2 text-sm">
                <span className="font-medium">Estimated amount</span>
                <span className="font-bold text-primary">NPR {estimatedAmount.toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Preferred payment method</Label>
              {[
                { id: "khalti", label: "Khalti", icon: Wallet },
                { id: "esewa", label: "eSewa", icon: Wallet },
                { id: "card", label: "Card", icon: CreditCard },
                { id: "bank_transfer", label: "Bank transfer", icon: CreditCard },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPaymentMethod(id)}
                  className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${paymentMethod === id ? "border-primary bg-primary/5" : "border-border"}`}
                >
                  <Icon className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
              {fieldErrors.paymentMethod?.[0] && <p className="text-xs font-semibold text-destructive">{fieldErrors.paymentMethod[0]}</p>}
              <p className="text-xs text-muted-foreground">
                The database will calculate the final amount and create a pending payment record. This screen does not mark a payment as complete.
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="flex gap-2">
          {step > 1 && <Button type="button" variant="outline" onClick={() => setStep((current) => current - 1)}>Back</Button>}
          {step < 3 ? (
            <Button type="button" variant="hero" onClick={handleNext} disabled={step === 1 && servicesLoading}>
              <CalendarIcon className="mr-2 h-4 w-4" />Continue
            </Button>
          ) : (
            <Button type="button" variant="hero" onClick={handleBooking} disabled={isProcessing}>
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create booking request
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BookingDialog;
