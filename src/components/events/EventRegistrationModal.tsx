import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Ticket,
  Users,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { registerForEventApi, type EventDetail, type EventTicketType, type EventProgram } from "@/lib/events/events-client";
import { postSignedCheckoutForm, startEsewaCheckout } from "@/lib/payments/browser-checkout";
import TicketPassCard from "./TicketPassCard";

interface EventRegistrationModalProps {
  event: EventDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function EventRegistrationModal({
  event,
  open,
  onOpenChange,
  onSuccess,
}: EventRegistrationModalProps) {
  const { session, profile, user } = useAuth();
  const staging = process.env.NEXT_PUBLIC_MEROTALENT_BACKEND_MODE === "neon-staging";
  const { toast } = useToast();

  const [step, setStep] = useState<"select_ticket" | "details" | "team" | "confirmation">("select_ticket");
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(
    event.programs && event.programs.length > 0 ? event.programs[0].id : null
  );
  const [selectedTicketType, setSelectedTicketType] = useState<EventTicketType | null>(
    event.ticket_types && event.ticket_types.length > 0 ? event.ticket_types[0] : null
  );
  const [quantity, setQuantity] = useState<number>(1);
  const [teamName, setTeamName] = useState("");

  // Primary Registrant Form
  const [primaryDetails, setPrimaryDetails] = useState({
    fullName: profile?.full_name || "",
    email: profile?.email || "",
    phone: profile?.phone || "",
    college: "",
    studentId: "",
  });

  // Custom Fields Responses
  const [customResponses, setCustomResponses] = useState<Record<string, any>>({});

  // Team Participants List
  const [teamMembers, setTeamMembers] = useState<
    Array<{ fullName: string; email: string; phone: string; college: string; studentId: string; roleInTeam: string }>
  >([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationResult, setRegistrationResult] = useState<any>(null);

  // Available ticket types filtered by program if applicable
  const availableTicketTypes = (event.ticket_types || []).filter((tt) => {
    if (!tt.is_active) return false;
    if (selectedProgramId && tt.program_id && tt.program_id !== selectedProgramId) return false;
    return true;
  });

  const isTeamTicket = selectedTicketType?.ticket_kind === "team";
  const unitPrice = selectedTicketType ? Number(selectedTicketType.price) : Number(event.ticket_price || 0);
  const totalAmount = unitPrice * quantity;
  const isFree = totalAmount === 0 || event.event_type === "free";

  const handleNextToDetails = () => {
    if (isTeamTicket && selectedTicketType) {
      // Prepopulate team members array
      if (teamMembers.length === 0) {
        setTeamMembers([
          {
            fullName: primaryDetails.fullName || profile?.full_name || "",
            email: primaryDetails.email || profile?.email || "",
            phone: primaryDetails.phone || profile?.phone || "",
            college: "",
            studentId: "",
            roleInTeam: "leader",
          },
        ]);
      }
    }
    setStep("details");
  };

  const handleNextToTeam = () => {
    if (!primaryDetails.fullName.trim()) {
      toast({ variant: "destructive", title: "Name required", description: "Please enter your full name." });
      return;
    }
    // Check required custom fields
    if (event.registration_fields) {
      for (const field of event.registration_fields) {
        if (field.required && !customResponses[field.field_key]) {
          toast({
            variant: "destructive",
            title: "Required field missing",
            description: `Please fill out "${field.field_label}".`,
          });
          return;
        }
      }
    }

    if (isTeamTicket) {
      setStep("team");
    } else {
      void handleSubmitRegistration();
    }
  };

  const handleAddMember = () => {
    if (selectedTicketType && teamMembers.length >= selectedTicketType.max_team_size) {
      toast({
        variant: "destructive",
        title: "Team limit reached",
        description: `Maximum team size for this tier is ${selectedTicketType.max_team_size} members.`,
      });
      return;
    }
    setTeamMembers([
      ...teamMembers,
      { fullName: "", email: "", phone: "", college: "", studentId: "", roleInTeam: "member" },
    ]);
  };

  const handleRemoveMember = (index: number) => {
    if (index === 0) {
      toast({ variant: "destructive", title: "Cannot remove team lead" });
      return;
    }
    setTeamMembers(teamMembers.filter((_, idx) => idx !== index));
  };

  const handleSubmitRegistration = async () => {
    if (!(staging ? user : session?.access_token)) {
      toast({ variant: "destructive", title: "Authentication required", description: "Please sign in to register." });
      return;
    }

    if (isTeamTicket && selectedTicketType) {
      if (!teamName.trim()) {
        toast({ variant: "destructive", title: "Team name required", description: "Please provide a team name." });
        return;
      }
      if (teamMembers.length < selectedTicketType.min_team_size) {
        toast({
          variant: "destructive",
          title: "Incomplete team",
          description: `This tier requires at least ${selectedTicketType.min_team_size} team members.`,
        });
        return;
      }
      // Validate team member names
      for (let i = 0; i < teamMembers.length; i++) {
        if (!teamMembers[i].fullName.trim()) {
          toast({
            variant: "destructive",
            title: "Member details missing",
            description: `Please enter the full name for team member #${i + 1}.`,
          });
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      const participantsPayload = isTeamTicket
        ? teamMembers
        : Array.from({ length: quantity }, (_, idx) => ({
            fullName: idx === 0 ? primaryDetails.fullName : `Attendee ${idx + 1}`,
            email: idx === 0 ? primaryDetails.email : undefined,
            phone: idx === 0 ? primaryDetails.phone : undefined,
            college: primaryDetails.college || undefined,
            studentId: primaryDetails.studentId || undefined,
            roleInTeam: "attendee",
          }));

      const payload = {
        programId: selectedProgramId,
        ticketTypeId: selectedTicketType?.id || null,
        attendeeCount: isTeamTicket ? teamMembers.length : quantity,
        teamName: isTeamTicket ? teamName : null,
        participants: participantsPayload,
        customResponses,
      };

      const result = await registerForEventApi(event.id, payload, staging ? undefined : session!.access_token);
      setRegistrationResult(result);

      if (result.isFree) {
        setStep("confirmation");
        toast({
          title: "Registration Confirmed!",
          description: `You are registered for ${event.title}. Digital pass generated.`,
        });
        onSuccess?.();
      } else {
        if (staging) {
          const checkoutResponse = await fetch("/api/v1/neon-staging/payments/checkout", {
            method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
            body: JSON.stringify({ kind: "event_registration", targetId: result.registration.id }),
          });
          const checkout = await checkoutResponse.json();
          onSuccess?.();
          if (!checkoutResponse.ok || !checkout.data?.checkoutUrl || !checkout.data?.checkoutFields) {
            toast({ title: "Registration pending payment", description: "Your registration was saved, but eSewa sandbox checkout is unavailable. No payment was taken and no paid ticket was issued." });
            return;
          }
          postSignedCheckoutForm({ checkoutUrl: checkout.data.checkoutUrl, checkoutFields: checkout.data.checkoutFields });
          return;
        }
        toast({
          title: "Registration Stored",
          description: "Redirecting to payment gateway to complete ticket purchase...",
        });
        // Redirect to eSewa checkout
        await startEsewaCheckout(session!.access_token, {
          eventRegistrationId: result.registration.id,
        });
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: err.message || "Failed to complete registration.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-8">
        <DialogHeader>
          <div className="flex items-center gap-2 text-xs font-bold text-[#0073e6]">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Event Registration</span>
          </div>
          <DialogTitle className="text-2xl font-black text-slate-900">
            {event.title}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            {step === "select_ticket" && "Select your program session and ticket tier."}
            {step === "details" && "Provide your participant and registration details."}
            {step === "team" && "Enter your team name and member information."}
            {step === "confirmation" && "Your digital ticket pass has been generated."}
          </DialogDescription>
        </DialogHeader>

        {/* STEP 1: Select Program & Ticket Type */}
        {step === "select_ticket" && (
          <div className="mt-4 space-y-6">
            {/* Multi-Program Selector */}
            {event.is_multi_program && event.programs && event.programs.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-slate-600">Select Program / Session</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {event.programs.map((prog) => (
                    <button
                      key={prog.id}
                      type="button"
                      onClick={() => setSelectedProgramId(prog.id)}
                      className={`flex flex-col text-left rounded-2xl border p-3.5 transition-all ${
                        selectedProgramId === prog.id
                          ? "border-[#0073e6] bg-blue-50/50 shadow-sm ring-1 ring-[#0073e6]"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <span className="font-extrabold text-sm text-slate-900">{prog.title}</span>
                      <span className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                        <Calendar className="h-3 w-3 text-[#0073e6]" />
                        {new Date(prog.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {prog.venue && <span className="text-[11px] text-slate-400 mt-0.5">{prog.venue}</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Ticket Tier Selector */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-slate-600">Choose Ticket Tier</Label>
              <div className="grid gap-3">
                {availableTicketTypes.length > 0 ? (
                  availableTicketTypes.map((tt) => {
                    const isSoldOut = tt.total_quantity !== null && tt.total_quantity !== undefined && (tt.quantity_sold || 0) >= tt.total_quantity;
                    const isSelected = selectedTicketType?.id === tt.id;

                    return (
                      <button
                        key={tt.id}
                        type="button"
                        disabled={isSoldOut}
                        onClick={() => setSelectedTicketType(tt)}
                        className={`flex items-center justify-between rounded-2xl border p-4 text-left transition-all ${
                          isSelected
                            ? "border-[#0073e6] bg-blue-50/40 shadow-sm ring-1 ring-[#0073e6]"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        } ${isSoldOut ? "opacity-50 cursor-not-allowed bg-slate-50" : ""}`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-900">{tt.name}</span>
                            <Badge variant="outline" className="text-[10px] font-bold uppercase">
                              {tt.ticket_kind}
                            </Badge>
                            {isSoldOut && (
                              <Badge variant="destructive" className="text-[10px]">Sold Out</Badge>
                            )}
                          </div>
                          {tt.description && (
                            <p className="text-xs text-slate-500 max-w-md">{tt.description}</p>
                          )}
                          {tt.ticket_kind === "team" && (
                            <p className="text-[11px] font-semibold text-blue-600">
                              Team Size: {tt.min_team_size} - {tt.max_team_size} members
                            </p>
                          )}
                        </div>

                        <div className="text-right">
                          <span className="text-lg font-black text-slate-900">
                            {Number(tt.price) === 0 ? "Free" : `${tt.currency} ${Number(tt.price).toLocaleString()}`}
                          </span>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center justify-between">
                    <div>
                      <span className="font-extrabold text-slate-900">General Registration</span>
                      <p className="text-xs text-slate-500">Standard admission for this event.</p>
                    </div>
                    <span className="text-lg font-black text-slate-900">
                      {event.event_type === "free" ? "Free" : `${event.currency} ${Number(event.ticket_price).toLocaleString()}`}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Quantity Selector (for individual tickets) */}
            {!isTeamTicket && (
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <span className="font-bold text-sm text-slate-900">Number of Tickets</span>
                  <p className="text-xs text-slate-500">Select how many passes you need.</p>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 rounded-full p-0"
                    disabled={quantity <= (selectedTicketType?.min_per_order || 1)}
                    onClick={() => setQuantity(Math.max((selectedTicketType?.min_per_order || 1), quantity - 1))}
                  >
                    -
                  </Button>
                  <span className="font-extrabold text-base text-slate-900 w-4 text-center">{quantity}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 rounded-full p-0"
                    disabled={quantity >= (selectedTicketType?.max_per_order || 10)}
                    onClick={() => setQuantity(Math.min((selectedTicketType?.max_per_order || 10), quantity + 1))}
                  >
                    +
                  </Button>
                </div>
              </div>
            )}

            {/* Price Summary */}
            <div className="rounded-2xl bg-slate-900 p-4 text-white flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Total Amount</span>
                <p className="text-xl font-black text-white">
                  {isFree ? "Free Registration" : `${event.currency || "NPR"} ${totalAmount.toLocaleString()}`}
                </p>
              </div>
              <Button onClick={handleNextToDetails} className="bg-[#0073e6] hover:bg-[#0062c4] font-bold">
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: Primary Details & Custom Questions */}
        {step === "details" && (
          <div className="mt-4 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Full Name *</Label>
                <Input
                  value={primaryDetails.fullName}
                  onChange={(e) => setPrimaryDetails({ ...primaryDetails, fullName: e.target.value })}
                  placeholder="Your full name"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Email Address *</Label>
                <Input
                  type="email"
                  value={primaryDetails.email}
                  onChange={(e) => setPrimaryDetails({ ...primaryDetails, email: e.target.value })}
                  placeholder="you@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Phone Number *</Label>
                <Input
                  value={primaryDetails.phone}
                  onChange={(e) => setPrimaryDetails({ ...primaryDetails, phone: e.target.value })}
                  placeholder="+977 98XXXXXXXX"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">College / Institution</Label>
                <Input
                  value={primaryDetails.college}
                  onChange={(e) => setPrimaryDetails({ ...primaryDetails, college: e.target.value })}
                  placeholder="e.g. Pulchowk Campus"
                />
              </div>
            </div>

            {/* Configurable Custom Registration Fields */}
            {event.registration_fields && event.registration_fields.length > 0 && (
              <div className="space-y-4 border-t border-slate-100 pt-4">
                <h4 className="text-xs font-bold uppercase text-slate-600">Additional Information</h4>
                {event.registration_fields.map((field) => (
                  <div key={field.id} className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">
                      {field.field_label} {field.required && "*"}
                    </Label>
                    {field.field_type === "textarea" ? (
                      <Textarea
                        value={customResponses[field.field_key] || ""}
                        onChange={(e) => setCustomResponses({ ...customResponses, [field.field_key]: e.target.value })}
                        placeholder={field.placeholder || ""}
                        rows={3}
                      />
                    ) : (
                      <Input
                        type={field.field_type === "number" ? "number" : field.field_type === "email" ? "email" : "text"}
                        value={customResponses[field.field_key] || ""}
                        onChange={(e) => setCustomResponses({ ...customResponses, [field.field_key]: e.target.value })}
                        placeholder={field.placeholder || ""}
                      />
                    )}
                    {field.help_text && <p className="text-[11px] text-slate-400">{field.help_text}</p>}
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <Button variant="ghost" onClick={() => setStep("select_ticket")} className="text-slate-600">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button
                onClick={handleNextToTeam}
                disabled={isSubmitting}
                className="bg-[#0073e6] hover:bg-[#0062c4] font-bold"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
                  </>
                ) : isTeamTicket ? (
                  <>
                    Team Members <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                ) : isFree ? (
                  "Confirm Free Registration"
                ) : (
                  `Proceed to Payment (${event.currency || "NPR"} ${totalAmount.toLocaleString()})`
                )}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Team Members (For Team Tickets) */}
        {step === "team" && (
          <div className="mt-4 space-y-5">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Team / Project Name *</Label>
              <Input
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="e.g. ByteCrafters"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase text-slate-600">
                  Team Members ({teamMembers.length} / {selectedTicketType?.max_team_size || 4})
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddMember}
                  disabled={Boolean(selectedTicketType && teamMembers.length >= selectedTicketType.max_team_size)}
                  className="text-xs"
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add Member
                </Button>
              </div>

              {teamMembers.map((member, idx) => (
                <div key={idx} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-900">
                      {idx === 0 ? "Team Lead (Primary)" : `Member #${idx + 1}`}
                    </span>
                    {idx > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(idx)}
                        className="h-7 text-xs text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                      </Button>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      placeholder="Full Name *"
                      value={member.fullName}
                      onChange={(e) => {
                        const updated = [...teamMembers];
                        updated[idx].fullName = e.target.value;
                        setTeamMembers(updated);
                      }}
                    />
                    <Input
                      placeholder="Email Address"
                      type="email"
                      value={member.email}
                      onChange={(e) => {
                        const updated = [...teamMembers];
                        updated[idx].email = e.target.value;
                        setTeamMembers(updated);
                      }}
                    />
                    <Input
                      placeholder="Phone Number"
                      value={member.phone}
                      onChange={(e) => {
                        const updated = [...teamMembers];
                        updated[idx].phone = e.target.value;
                        setTeamMembers(updated);
                      }}
                    />
                    <Input
                      placeholder="College / Student ID"
                      value={member.studentId}
                      onChange={(e) => {
                        const updated = [...teamMembers];
                        updated[idx].studentId = e.target.value;
                        setTeamMembers(updated);
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <Button variant="ghost" onClick={() => setStep("details")} className="text-slate-600">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button
                onClick={handleSubmitRegistration}
                disabled={isSubmitting}
                className="bg-[#0073e6] hover:bg-[#0062c4] font-bold"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
                  </>
                ) : isFree ? (
                  "Confirm Free Team Registration"
                ) : (
                  `Proceed to Payment (${event.currency || "NPR"} ${totalAmount.toLocaleString()})`
                )}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: Instant Confirmation with Digital Pass */}
        {step === "confirmation" && registrationResult && (
          <div className="mt-4 space-y-6">
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-center">
              <CheckCircle className="mx-auto h-8 w-8 text-emerald-600" />
              <h3 className="mt-2 text-lg font-black text-emerald-900">Registration Confirmed!</h3>
              <p className="text-xs text-emerald-700">
                Registration Code: <span className="font-mono font-bold">{registrationResult.registrationNumber}</span>
              </p>
            </div>

            {registrationResult.tickets && registrationResult.tickets.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase text-slate-600">Your Digital Passes</h4>
                <div className="grid gap-4">
                  {registrationResult.tickets.map((tkt: any) => (
                    <TicketPassCard
                      key={tkt.id}
                      ticket={{
                        ...tkt,
                        event: {
                          id: event.id,
                          title: event.title,
                          start_date: event.start_date,
                          end_date: event.end_date,
                          location: event.location,
                          format: event.format,
                          cover_image_url: event.cover_image_url,
                        },
                        ticket_type: selectedTicketType || undefined,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            <Button onClick={() => onOpenChange(false)} className="w-full bg-[#0073e6] hover:bg-[#0062c4] font-bold">
              Done & Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
