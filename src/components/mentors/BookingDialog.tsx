"use client";
import { isNeonClientRuntime } from "@/lib/backend-selection";
import { paymentErrorMessage, postSignedCheckoutForm, requireAvailableNeonPayment } from "@/lib/payments/browser-checkout";


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
import { StudentProfileRequirement } from "@/components/forms/StudentProfileRequirement";
import { missingStudentProfileFields } from "@/lib/student/profile-readiness";

interface Mentor {
  id: string;
  name: string;
  hourlyRate: number;
  expertise: string[];
  availability?: { days?: string[]; startTime?: string; endTime?: string; timezone?: string } | null;
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

const defaultTimeSlots = ["09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00", "18:00"];
const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const timeLabel = (value: string) => new Date(`2000-01-01T${value}:00`).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

const postToCheckout = (checkoutUrl: string, fields: Record<string, string>) =>
  postSignedCheckoutForm({ checkoutUrl, checkoutFields: fields });

const BookingDialog = ({ isOpen, onClose, onSubmitted, mentor }: BookingDialogProps) => {
  const staging = isNeonClientRuntime();
  const { toast } = useToast();
  const { profile, session, user, refreshProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState("");
  const [duration, setDuration] = useState("60");
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [paymentMethod] = useState("esewa");
  const [services, setServices] = useState<MentorService[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setFullName(profile?.full_name || "");
    setEmail(user?.email || profile?.email || "");
    setPhone(profile?.phone || "");
    setAddress(profile?.location || "");
  }, [isOpen, profile?.email, profile?.full_name, profile?.phone, profile?.location, user?.email]);

  useEffect(() => {
    if (!isOpen) return;
    let current = true;
    setServicesLoading(true);
    setServicesError(null);
    setServices([]);
    setSelectedServiceId("");

    void (async () => {
      if (staging) {
        try {
          const response = await fetch(`/api/v1/mentors/${mentor.id}`, { cache: "no-store" });
          const body = await response.json();
          if (!response.ok) throw new Error(body.error?.message || "Services unavailable.");
          if (!current) return;
          const availableServices = (body.data?.services ?? []) as MentorService[];
          setServices(availableServices);
          setSelectedServiceId(availableServices[0]?.id ?? "");
        } catch (error) { if (current) setServicesError(error instanceof Error ? error.message : "Services unavailable."); }
        finally { if (current) setServicesLoading(false); }
        return;
      }
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
  }, [isOpen, mentor.id, staging]);

  const selectedService = services.find((service) => service.id === selectedServiceId) ?? null;
  const timeSlots = defaultTimeSlots.filter((time) => {
    const start = mentor.availability?.startTime;
    const end = mentor.availability?.endTime;
    return (!start || time >= start) && (!end || time < end);
  });
  const availableDays = mentor.availability?.days ?? [];
  const durationMinutes = selectedService?.duration_minutes ?? Number(duration);
  const estimatedAmount = selectedService?.price ?? mentor.hourlyRate * (durationMinutes / 60);
  const profileIncomplete = Boolean(user && missingStudentProfileFields("mentor_booking", profile, user.email).length);

  const requireCompleteProfile = () => {
    if (!profileIncomplete) return true;
    toast({
      variant: "destructive",
      title: "Complete your profile",
      description: "Save the missing details in My Profile, then select I’ve updated it before continuing.",
    });
    return false;
  };

  const handleNext = () => {
    if (!requireCompleteProfile()) return;
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
    setSelectedServiceId("");
    setFieldErrors({});
  };

  const handleBooking = async () => {
    if (!(staging ? user : session && user) || !selectedDate) {
      toast({
        variant: "destructive",
        title: "Login required",
        description: "Sign in again before booking a session.",
      });
      return;
    }

    if (!requireCompleteProfile()) return;
    setIsProcessing(true);
    setFieldErrors({});
    try {
      if (staging) {
        if (!selectedService) throw new Error("Choose an available mentor service.");
        if (Number(selectedService.price) > 0) await requireAvailableNeonPayment();
        const start = new Date(`${format(selectedDate, "yyyy-MM-dd")}T${selectedTime}:00`);
        const end = new Date(start.getTime() + selectedService.duration_minutes * 60_000);
        const response = await fetch("/api/v1/mentors/book", { method: "POST",
          headers: { "Content-Type": "application/json" }, credentials: "same-origin",
          body: JSON.stringify({ mentorId: mentor.id, mentorServiceId: selectedService.id,
            scheduledStart: start.toISOString(), scheduledEnd: end.toISOString(), topic, notes }) });
        const payload = await response.json();
        if (!response.ok) throw new Error(paymentErrorMessage(payload, "Booking failed."));
        if (Number(selectedService.price) > 0) {
          const checkoutResponse = await fetch("/api/v1/neon-staging/payments/checkout", {
            method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
            body: JSON.stringify({ kind: "mentor_booking", targetId: payload.data.id }),
          });
          const checkout = await checkoutResponse.json();
          onSubmitted?.(payload.data.id);
          if (!checkoutResponse.ok || !checkout.data?.checkoutUrl || !checkout.data?.checkoutFields) {
            toast({ title: "Booking pending payment", description: paymentErrorMessage(checkout,
              "Your booking was saved, but checkout could not start. No payment was taken or confirmed.") });
            resetForm(); onClose(); return;
          }
          postToCheckout(checkout.data.checkoutUrl, checkout.data.checkoutFields);
          return;
        } else {
          toast({ title: "Free session confirmed", description: "Your session has been reserved." });
        }
        onSubmitted?.(payload.data.id);
        resetForm(); onClose();
        return;
      }
      const result = await submitAuthenticatedModuleForm({
        accessToken: session.access_token,
        module: "mentor_booking",
        values: {
          mentorId: mentor.id,
          ...(selectedService ? { mentorServiceId: selectedService.id } : {}),
          fullName: fullName.trim() || user.email,
          email: email.trim() || user.email,
          phone: phone.trim(),
          scheduledDate: format(selectedDate, "yyyy-MM-dd"),
          scheduledTime: selectedTime,
          durationMinutes: String(durationMinutes),
          topic,
          notes: [address ? `Location: ${address}` : "", notes].filter(Boolean).join("\n"),
          paymentMethod: "esewa",
        },
      });

      if (estimatedAmount > 0) {
        toast({
          title: "Booking created",
          description: "Initiating secure payment with eSewa...",
        });

        const checkoutRes = await fetch("/api/v1/payments/checkout", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ bookingId: result.id }),
        });

        const checkoutPayload = await checkoutRes.json();
        if (!checkoutRes.ok || !checkoutPayload.data?.checkoutUrl || !checkoutPayload.data?.checkoutFields) {
          toast({
            variant: "destructive",
            title: "eSewa Checkout Unavailable",
            description: checkoutPayload.error?.message || "eSewa checkout could not be created. Please try again or contact support.",
          });
          onSubmitted?.(result.id);
          resetForm();
          onClose();
          return;
        }

        postToCheckout(checkoutPayload.data.checkoutUrl, checkoutPayload.data.checkoutFields);
      } else {
        toast({
          title: "Booking request created",
          description: `Your free session request with ${mentor.name} has been submitted.`,
        });
        onSubmitted?.(result.id);
        resetForm();
        onClose();
      }
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
            {step === 3 && "Review your session details and complete payment"}
          </DialogDescription>
        </DialogHeader>
        {user && <StudentProfileRequirement module="mentor_booking" profile={profile} email={user.email} onRefresh={refreshProfile} />}

        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Date</Label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0)) || (availableDays.length > 0 && !availableDays.includes(dayNames[date.getDay()]))}
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
                    {timeLabel(time)}
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
                <Input id="booking-full-name" autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} readOnly={Boolean(user)} />
                {fieldErrors.fullName?.[0] && <p className="text-xs font-semibold text-destructive">{fieldErrors.fullName[0]}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="booking-email">Email</Label>
                <Input id="booking-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} readOnly={Boolean(user)} />
                {fieldErrors.email?.[0] && <p className="text-xs font-semibold text-destructive">{fieldErrors.email[0]}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="booking-phone">Phone *</Label>
                <Input id="booking-phone" type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="e.g. 9801010802" readOnly={Boolean(user)} />
                {fieldErrors.phone?.[0] && <p className="text-xs font-semibold text-destructive">{fieldErrors.phone[0]}</p>}
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="booking-address">Address *</Label>
                <Input id="booking-address" placeholder="e.g. Kathmandu, Nepal" value={address} onChange={(event) => setAddress(event.target.value)} readOnly={Boolean(user)} />
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
              <Label>Payment method</Label>
              <div className="flex w-full items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-50/50 p-3.5 text-left transition-colors dark:bg-emerald-950/20">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#60BB46] font-bold text-xs text-white shadow-sm">
                    eSewa
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">eSewa Mobile Wallet</p>
                    <p className="text-xs text-muted-foreground">Pay securely via eSewa account</p>
                  </div>
                </div>
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#60BB46] text-xs text-white">
                  ✓
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                You will be redirected securely to eSewa to complete your payment upon submitting.
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
            <Button type="button" variant="hero" onClick={handleBooking} disabled={isProcessing || !topic.trim() || !fullName.trim() || !phone.trim()}>
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Wallet className="mr-2 h-4 w-4" />
              {estimatedAmount > 0 ? "Continue to Pay" : "Confirm Free Session"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BookingDialog;
