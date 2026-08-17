import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import OwnerResourceDialog from "@/components/owner/OwnerResourceDialog";

export interface EditableInstituteProfile {
  id: string;
  name: string;
  short_name: string | null;
  type: string | null;
  location: string | null;
  website: string | null;
  description: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  youtube_url: string | null;
  admission_status: string | null;
}

interface InstituteProfileEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  institute: EditableInstituteProfile;
  ownerUserId: string;
  onSaved: () => void;
}

const fieldClassName = "rounded-xl border-[#eadfd7] bg-white";

const InstituteProfileEditor = ({
  open,
  onOpenChange,
  institute,
  ownerUserId,
  onSaved,
}: InstituteProfileEditorProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [type, setType] = useState("");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [admissionStatus, setAdmissionStatus] = useState("closed");

  useEffect(() => {
    if (!open) return;
    setName(institute.name);
    setShortName(institute.short_name ?? "");
    setType(institute.type ?? "college");
    setLocation(institute.location ?? "");
    setWebsite(institute.website ?? "");
    setDescription(institute.description ?? "");
    setContactEmail(institute.contact_email ?? "");
    setContactPhone(institute.contact_phone ?? "");
    setYoutubeUrl(institute.youtube_url ?? "");
    setAdmissionStatus(institute.admission_status ?? "closed");
  }, [institute, open]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    const result = await (supabase as any)
      .from("institutes")
      .update({
        name: name.trim(),
        short_name: shortName.trim() || null,
        type: type.trim() || null,
        location: location.trim() || null,
        website: website.trim() || null,
        description: description.trim() || null,
        contact_email: contactEmail.trim() || null,
        contact_phone: contactPhone.trim() || null,
        youtube_url: youtubeUrl.trim() || null,
        admission_status: admissionStatus,
      })
      .eq("id", institute.id)
      .eq("owner_user_id", ownerUserId);
    setIsSubmitting(false);

    if (result.error) {
      toast({ variant: "destructive", title: "Institute profile was not saved", description: result.error.message });
      return;
    }
    toast({
      title: "Institute profile updated",
      description: "The public college detail page now reads these saved profile fields.",
    });
    onOpenChange(false);
    onSaved();
  };

  return (
    <OwnerResourceDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit institute profile"
      description="Verification, ranking, featured placement, subscription, and approval status remain protected Super Admin fields."
      submitLabel="Save profile"
      isSubmitting={isSubmitting}
      onSubmit={handleSubmit}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="institute-profile-name">Institute name</Label><Input id="institute-profile-name" required maxLength={180} value={name} onChange={(event) => setName(event.target.value)} className={fieldClassName} /></div>
        <div className="space-y-2"><Label htmlFor="institute-profile-short-name">Short name</Label><Input id="institute-profile-short-name" maxLength={80} value={shortName} onChange={(event) => setShortName(event.target.value)} className={fieldClassName} /></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="institute-profile-type">Institution type</Label><Input id="institute-profile-type" maxLength={80} value={type} onChange={(event) => setType(event.target.value)} className={fieldClassName} /></div>
        <div className="space-y-2"><Label>Admissions</Label><Select value={admissionStatus} onValueChange={setAdmissionStatus}><SelectTrigger className={fieldClassName}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="open">Open</SelectItem><SelectItem value="closed">Closed</SelectItem><SelectItem value="upcoming">Upcoming</SelectItem></SelectContent></Select></div>
      </div>
      <div className="space-y-2"><Label htmlFor="institute-profile-description">Description</Label><Textarea id="institute-profile-description" value={description} onChange={(event) => setDescription(event.target.value)} className={fieldClassName} rows={6} /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="institute-profile-location">Location</Label><Input id="institute-profile-location" value={location} onChange={(event) => setLocation(event.target.value)} className={fieldClassName} /></div>
        <div className="space-y-2"><Label htmlFor="institute-profile-website">Website</Label><Input id="institute-profile-website" type="url" value={website} onChange={(event) => setWebsite(event.target.value)} className={fieldClassName} /></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="institute-profile-email">Contact email</Label><Input id="institute-profile-email" type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} className={fieldClassName} /></div>
        <div className="space-y-2"><Label htmlFor="institute-profile-phone">Contact phone</Label><Input id="institute-profile-phone" value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} className={fieldClassName} /></div>
      </div>
      <div className="space-y-2"><Label htmlFor="institute-profile-youtube">YouTube video URL</Label><Input id="institute-profile-youtube" type="url" value={youtubeUrl} onChange={(event) => setYoutubeUrl(event.target.value)} className={fieldClassName} /></div>
    </OwnerResourceDialog>
  );
};

export default InstituteProfileEditor;
