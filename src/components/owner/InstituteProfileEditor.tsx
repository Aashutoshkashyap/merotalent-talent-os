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
import { SignedMediaUploader } from "@/components/media/SignedMediaUploader";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export interface EditableInstituteProfile {
  id: string;
  name: string;
  short_name: string | null;
  type: string | null;
  location: string | null;
  map_location: string | null;
  website: string | null;
  description: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  youtube_url: string | null;
  admission_status: string | null;
  logo_url?: string | null;
  cover_image_url?: string | null;
  chairperson_name?: string | null;
  chairperson_designation?: string | null;
  chairperson_message?: string | null;
  principal_name?: string | null;
  principal_designation?: string | null;
  principal_message?: string | null;
}

interface InstituteProfileEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  institute: EditableInstituteProfile;
  onSaved: () => void;
}

const fieldClassName = "rounded-xl border-[#eadfd7] bg-white";

const InstituteProfileEditor = ({
  open,
  onOpenChange,
  institute,
  onSaved,
}: InstituteProfileEditorProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [type, setType] = useState("");
  const [location, setLocation] = useState("");
  const [mapLocation, setMapLocation] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [admissionStatus, setAdmissionStatus] = useState("closed");
  const [chairpersonName, setChairpersonName] = useState("");
  const [chairpersonDesignation, setChairpersonDesignation] = useState("");
  const [chairpersonMessage, setChairpersonMessage] = useState("");
  const [principalName, setPrincipalName] = useState("");
  const [principalDesignation, setPrincipalDesignation] = useState("");
  const [principalMessage, setPrincipalMessage] = useState("");
  const [logoPath, setLogoPath] = useState("");
  const [coverPath, setCoverPath] = useState("");
  const [aiKeywords, setAiKeywords] = useState("");
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(institute.name);
    setShortName(institute.short_name ?? "");
    setType(institute.type ?? "college");
    setLocation(institute.location ?? "");
    setMapLocation(institute.map_location ?? "");
    setWebsite(institute.website ?? "");
    setDescription(institute.description ?? "");
    setContactEmail(institute.contact_email ?? "");
    setContactPhone(institute.contact_phone ?? "");
    setYoutubeUrl(institute.youtube_url ?? "");
    setAdmissionStatus(institute.admission_status ?? "closed");
    setChairpersonName(institute.chairperson_name ?? "");
    setChairpersonDesignation(institute.chairperson_designation ?? "");
    setChairpersonMessage(institute.chairperson_message ?? "");
    setPrincipalName(institute.principal_name ?? "");
    setPrincipalDesignation(institute.principal_designation ?? "");
    setPrincipalMessage(institute.principal_message ?? "");
    setLogoPath(institute.logo_url ?? "");
    setCoverPath(institute.cover_image_url ?? "");
  }, [institute, open]);

  const saveMedia = async (kind: "logo" | "cover", path: string) => {
    const { error } = await (supabase as any).rpc("update_my_college_media", {
      p_institute_id: institute.id,
      p_logo_path: kind === "logo" ? path : null,
      p_cover_path: kind === "cover" ? path : null,
    });
    if (error) throw error;
    if (kind === "logo") setLogoPath(path);
    else setCoverPath(path);
    toast({ title: `${kind === "logo" ? "Logo" : "Cover image"} updated` });
    onSaved();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    const result = await (supabase as any).rpc("update_my_college_profile", {
      p_institute_id: institute.id,
      p_profile: {
        name: name.trim(),
        short_name: shortName.trim() || null,
        type: type.trim() || null,
        location: location.trim() || null,
        map_location: mapLocation.trim() || null,
        website: website.trim() || null,
        description: description.trim() || null,
        contact_email: contactEmail.trim() || null,
        contact_phone: contactPhone.trim() || null,
        youtube_url: youtubeUrl.trim() || null,
        admission_status: admissionStatus,
        chairperson_name: chairpersonName.trim() || null,
        chairperson_designation: chairpersonDesignation.trim() || null,
        chairperson_message: chairpersonMessage.trim() || null,
        principal_name: principalName.trim() || null,
        principal_designation: principalDesignation.trim() || null,
        principal_message: principalMessage.trim() || null,
      },
    });
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

  const generateDescriptionDraft = async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.access_token) {
      toast({ variant: "destructive", title: "Sign in again before generating a draft" });
      return;
    }
    setIsGeneratingDraft(true);
    try {
      const response = await fetch("/api/v1/ai/generate", {
        method: "POST",
        headers: { Authorization: `Bearer ${data.session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ module: "college", entityType: "college", entityId: institute.id, title: name || institute.name, keywords: aiKeywords, context: `Type: ${type}; Location: ${location}` }),
      });
      const payload = await response.json() as { data?: { draft?: string }; error?: { message?: string } };
      if (!response.ok || !payload.data?.draft) throw new Error(payload.error?.message || "AI generation is unavailable.");
      setDescription(payload.data.draft);
      toast({ title: "Editable AI draft added", description: "Review and edit the description before saving the profile." });
    } catch (error) {
      toast({ variant: "destructive", title: "AI draft unavailable", description: error instanceof Error ? error.message : "Please try again." });
    } finally {
      setIsGeneratingDraft(false);
    }
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
      <div className="space-y-2"><Label htmlFor="institute-profile-description">Description</Label><Textarea id="institute-profile-description" value={description} onChange={(event) => setDescription(event.target.value)} className={fieldClassName} rows={6} /><div className="flex flex-col gap-2 sm:flex-row"><Input value={aiKeywords} onChange={(event) => setAiKeywords(event.target.value)} maxLength={1000} placeholder="Optional AI keywords, e.g. engineering, research, admissions" className={fieldClassName} /><Button type="button" variant="outline" onClick={generateDescriptionDraft} disabled={isGeneratingDraft} className="rounded-xl"><Sparkles className="mr-2 h-4 w-4" />{isGeneratingDraft ? "Generating…" : "Generate draft"}</Button></div><p className="text-xs text-muted-foreground">Available only when your assigned college plan or explicit feature grant includes AI description generation.</p></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="institute-profile-location">Location</Label><Input id="institute-profile-location" value={location} onChange={(event) => setLocation(event.target.value)} className={fieldClassName} /></div>
        <div className="space-y-2"><Label htmlFor="institute-profile-website">Website</Label><Input id="institute-profile-website" type="url" value={website} onChange={(event) => setWebsite(event.target.value)} className={fieldClassName} /></div>
      </div>
      <div className="space-y-2"><Label htmlFor="institute-profile-map-location">Campus map pin</Label><Input id="institute-profile-map-location" maxLength={500} placeholder="Paste an exact address or coordinates, e.g. 27.6774, 85.3188" value={mapLocation} onChange={(event) => setMapLocation(event.target.value)} className={fieldClassName} /><p className="text-xs text-muted-foreground">This controls the full-width Google map on the public college page.</p></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="institute-profile-email">Contact email</Label><Input id="institute-profile-email" type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} className={fieldClassName} /></div>
        <div className="space-y-2"><Label htmlFor="institute-profile-phone">Contact phone</Label><Input id="institute-profile-phone" value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} className={fieldClassName} /></div>
      </div>
      <div className="space-y-2"><Label htmlFor="institute-profile-youtube">YouTube video URL</Label><Input id="institute-profile-youtube" type="url" value={youtubeUrl} onChange={(event) => setYoutubeUrl(event.target.value)} className={fieldClassName} /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <SignedMediaUploader label="College logo" module="college_logo" resourceId={institute.id} onUploaded={async ([asset]) => { if (asset) await saveMedia("logo", asset.path); }} />
        <SignedMediaUploader label="College cover image" module="college_cover" resourceId={institute.id} onUploaded={async ([asset]) => { if (asset) await saveMedia("cover", asset.path); }} />
        {(logoPath || coverPath) && <p className="sm:col-span-2 text-xs text-muted-foreground">Images are stored as controlled College Media assets and become public only through this approved profile.</p>}
      </div>
      <div className="rounded-xl border border-[#eadfd7] p-4 space-y-4">
        <p className="text-sm font-bold text-slate-900">Chairperson</p>
        <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Name</Label><Input value={chairpersonName} onChange={(event) => setChairpersonName(event.target.value)} maxLength={180} className={fieldClassName} /></div><div className="space-y-2"><Label>Designation</Label><Input value={chairpersonDesignation} onChange={(event) => setChairpersonDesignation(event.target.value)} maxLength={180} className={fieldClassName} /></div></div>
        <div className="space-y-2"><Label>Message</Label><Textarea value={chairpersonMessage} onChange={(event) => setChairpersonMessage(event.target.value)} maxLength={5000} rows={4} className={fieldClassName} /></div>
      </div>
      <div className="rounded-xl border border-[#eadfd7] p-4 space-y-4">
        <p className="text-sm font-bold text-slate-900">Principal</p>
        <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Name</Label><Input value={principalName} onChange={(event) => setPrincipalName(event.target.value)} maxLength={180} className={fieldClassName} /></div><div className="space-y-2"><Label>Designation</Label><Input value={principalDesignation} onChange={(event) => setPrincipalDesignation(event.target.value)} maxLength={180} className={fieldClassName} /></div></div>
        <div className="space-y-2"><Label>Message</Label><Textarea value={principalMessage} onChange={(event) => setPrincipalMessage(event.target.value)} maxLength={5000} rows={4} className={fieldClassName} /></div>
      </div>
    </OwnerResourceDialog>
  );
};

export default InstituteProfileEditor;
