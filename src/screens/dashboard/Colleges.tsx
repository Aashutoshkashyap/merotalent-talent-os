import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  MapPin,
  GraduationCap,
  Sparkles,
  Send,
  Loader2,
  CheckCircle2,
  Search,
  ChevronLeft,
  ChevronRight,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { logUserActivity } from "@/lib/activityLogger";
import { submitAuthenticatedModuleForm } from "@/lib/forms/module-form-client";
import { StudentProfileRequirement } from "@/components/forms/StudentProfileRequirement";
import { missingStudentProfileFields } from "@/lib/student/profile-readiness";
import {
  fetchPublicInstitutes,
  resolveCollegeMediaUrl,
  getInstitutePrograms,
  institutePath,
  type InstituteRecord,
  type InstituteCategory,
} from "@/lib/institutes/public-institutes";
import { ExternalLink, Globe2 } from "lucide-react";

type Level = "+2" | "Bachelors" | "Masters";
const PAGE_SIZE = 6;

export default function Colleges() {
  const { user, profile, session, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<InstituteCategory>("all");
  const [page, setPage] = useState(1);
  const [institutes, setInstitutes] = useState<InstituteRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedCollege, setSelectedCollege] = useState<InstituteRecord | null>(null);
  const [selectedDetailCollege, setSelectedDetailCollege] = useState<InstituteRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [level, setLevel] = useState<Level>("Bachelors");
  const [targetProgram, setTargetProgram] = useState("");
  const [previousSchool, setPreviousSchool] = useState("");
  const [previousGpa, setPreviousGpa] = useState("");
  const [tempAddress, setTempAddress] = useState("");
  const [permAddress, setPermAddress] = useState("");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [appliedCollegeNames, setAppliedCollegeNames] = useState<Set<string>>(new Set());

  useEffect(() => {
    setPhone(profile?.phone || "");
    setTempAddress((current) => current || profile?.location || "");
  }, [profile?.phone, profile?.location]);

  useEffect(() => {
    if (!user) return;
    const fetchUserApps = async () => {
      try {
        const res = await fetch("/api/v1/institutes/applications");
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          const names = json.data.map((id: string) => String(id || "")).filter(Boolean);
          setAppliedCollegeNames(new Set(names));
        }
      } catch (err) {
        console.error("Failed to load user college applications", err);
      }
    };
    void fetchUserApps();
  }, [user]);

  useEffect(() => {
    let current = true;
    setIsLoading(true);

    const loadData = async () => {
      try {
        const result = await fetchPublicInstitutes({
          search,
          category,
          location: "",
          affiliation: "",
          admissionStatus: "",
          sort: "recommended",
          limit: page * PAGE_SIZE,
        });

        if (!current) return;
        setTotalCount(result.count);
        // Slice active page range for optimal rendering
        const startIndex = (page - 1) * PAGE_SIZE;
        setInstitutes(result.institutes.slice(startIndex, startIndex + PAGE_SIZE));
      } catch (e) {
        console.error("Failed to fetch database institutes", e);
        if (current) setInstitutes([]);
      } finally {
        if (current) setIsLoading(false);
      }
    };

    const timer = setTimeout(loadData, 200);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [search, category, page]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  const handleOpenApply = (college: InstituteRecord) => {
    setSelectedCollege(college);
    setIsSuccess(false);
    setIsModalOpen(true);
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !session) {
      toast({ variant: "destructive", title: "Authentication required", description: "Please sign in to apply." });
      return;
    }
    if (missingStudentProfileFields("college_application", profile, user.email).length) {
      toast({ variant: "destructive", title: "Complete your profile", description: "Add the missing profile details before applying." });
      return;
    }

    const isNepalPhone = /^(?:98|97)\d{8}$/.test(phone.trim());
    if (phone.trim() && !isNepalPhone) {
      toast({ title: "Phone Warning", description: "Nepal mobile numbers start with 98 or 97." });
    }

    setIsSubmitting(true);
    try {
      await submitAuthenticatedModuleForm({
        accessToken: session.access_token,
        module: "college_application",
        values: {
          collegeId: selectedCollege?.id,
          fullName: profile!.full_name || "",
          email: user.email || "",
          phone: phone,
          intendedCourse: targetProgram,
          preferredIntake: level,
          currentQualification: `${previousSchool} (${previousGpa})`,
          message: `Temporary Address: ${tempAddress}\nPermanent Address: ${permAddress}`,
        },
      });

      if (selectedCollege) {
        logUserActivity(
          {
            id: `college-${selectedCollege.id}`,
            kind: "college",
            title: selectedCollege.name,
            detail: targetProgram || level,
            status: "applied",
            occurredAt: new Date().toISOString(),
            href: "/dashboard/colleges",
          },
          user.id
        );
        // The initial fetch keys this set by institute_id; keep both so the
        // "Applied" badge survives a reload as well as this optimistic update.
        setAppliedCollegeNames((prev) => new Set(prev).add(selectedCollege.id).add(selectedCollege.name));
      }

      setIsSuccess(true);
      toast({ title: "Application Submitted!", description: `Your inquiry for ${selectedCollege?.name} was sent.` });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Application Failed",
        description: err?.message || "Could not submit your application. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#0073e6] uppercase tracking-wider mb-1">
            <Building2 className="w-4 h-4" />
            Partner Colleges & Universities
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Explore Institutions</h1>
          <p className="text-xs sm:text-sm text-slate-500 font-semibold">
            Explore approved institutions, compare programs, and submit direct admission inquiries.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by name or location..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-10 h-10 rounded-xl text-xs"
            />
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 bg-slate-100/80 p-1 rounded-2xl">
          {[
            { id: "all", label: "All Institutions" },
            { id: "college", label: "Colleges & Universities" },
            { id: "plus-two", label: "+2 Institutions" },
            { id: "school", label: "Schools" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setCategory(cat.id as InstituteCategory);
                setPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                category === cat.id
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <span className="text-xs font-extrabold text-slate-500">
          Showing {institutes.length} of {totalCount} institutions
        </span>
      </div>

      {/* College Cards Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-3xl border border-slate-200/80">
          <Loader2 className="w-8 h-8 text-[#0073e6] animate-spin mb-3" />
          <p className="text-xs font-bold text-slate-600">Loading institutions from database...</p>
        </div>
      ) : institutes.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/80 p-6">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-base font-black text-slate-800">No institutions found</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Try adjusting your search query or filter selection.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {institutes.map((college) => {
            const coverImage = resolveCollegeMediaUrl(college.cover_image_url || college.logo_url);
            const categoryLabel = college.institution_category
              ? college.institution_category.toUpperCase()
              : "ACADEMIC";

            const isApplied = appliedCollegeNames.has(college.name) || appliedCollegeNames.has(college.id);

            return (
              <div
                key={college.id}
                className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="h-40 w-full relative overflow-hidden bg-slate-100">
                    <img
                      src={coverImage}
                      alt={college.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://images.unsplash.com/photo-1562774053-701939374585?w=600&auto=format&fit=crop&q=80";
                      }}
                    />
                    {isApplied && (
                      <div className="absolute top-3 left-3 bg-emerald-500 text-white px-2.5 py-1 rounded-full text-[10px] font-black flex items-center gap-1 border border-emerald-400 shadow-xs">
                        <CheckCircle2 className="w-3 h-3" />
                        Applied
                      </div>
                    )}
                    {college.is_featured && (
                      <div className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full border border-white/40 bg-blue-700 px-2.5 py-1 text-[10px] font-black text-white shadow-sm">
                        <Star className="h-3 w-3 fill-current" aria-hidden="true" />
                        Featured
                      </div>
                    )}
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-black text-[#0073e6] border border-white/40">
                      {categoryLabel}
                    </div>
                  </div>

                  <div className="p-5 space-y-2.5">
                    <h3 className="text-lg font-black text-slate-900 tracking-tight line-clamp-1">
                      {college.name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 truncate">
                      <MapPin className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                      <span className="truncate">{college.location || "Nepal"}</span>
                    </div>
                    {college.description && (
                      <p className="text-xs text-slate-600 leading-relaxed font-medium line-clamp-2">
                        {college.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="px-5 pb-5 pt-3 flex items-center justify-between border-t border-slate-100 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedDetailCollege(college)}
                    className="text-xs font-bold rounded-xl px-3 py-1.5 h-8 border-slate-200 hover:bg-slate-50"
                  >
                    View Details
                  </Button>
                  <Button
                    onClick={() => handleOpenApply(college)}
                    disabled={isApplied}
                    className={`font-extrabold text-xs rounded-xl px-4 py-1.5 h-8 ${
                      isApplied ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : "bg-[#0073e6] hover:bg-[#0062c4] text-white"
                    }`}
                  >
                    {isApplied ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        Applied
                      </>
                    ) : (
                      "Apply Now"
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-xl text-xs font-bold"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>

          <span className="text-xs font-extrabold text-slate-700">
            Page {page} of {totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-xl text-xs font-bold"
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Application Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900">
              Apply to {selectedCollege?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-semibold">
              Fill out your educational details below to submit an official admission inquiry.
            </DialogDescription>
          </DialogHeader>

          {isSuccess ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-slate-900">Inquiry Sent Successfully!</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
                The admissions department of <span className="font-bold text-slate-800">{selectedCollege?.name}</span> has received your details and will contact you at {phone || user?.email}.
              </p>
              <Button
                onClick={() => setIsModalOpen(false)}
                className="bg-[#071a3d] text-white text-xs font-bold rounded-xl px-6"
              >
                Close Window
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmitApplication} className="space-y-4 pt-2">
              <StudentProfileRequirement module="college_application" profile={profile} email={user?.email} onRefresh={refreshProfile} />
              <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                Applying as <span className="font-bold">{profile?.full_name || "Student"}</span> · {user?.email || "Email unavailable"}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Target Level *</Label>
                  <Select value={level} onValueChange={(val: Level) => setLevel(val)}>
                    <SelectTrigger className="h-10 text-xs rounded-xl">
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="+2">+2 / High School</SelectItem>
                      <SelectItem value="Bachelors">Bachelors Degree</SelectItem>
                      <SelectItem value="Masters">Masters Degree</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Target Program Name *</Label>
                  <Input
                    placeholder={level === "+2" ? "Science / Management" : level === "Bachelors" ? "B.E. Computer / CSIT" : "M.Sc. CSIT / MBA"}
                    value={targetProgram}
                    onChange={(e) => setTargetProgram(e.target.value)}
                    className="h-10 text-xs rounded-xl"
                    required
                  />
                </div>
              </div>

              {/* Adaptive Education Fields */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                <span className="text-[11px] font-black uppercase text-[#0073e6] tracking-wider">
                  {level === "+2" ? "Previous SEE School Details" : level === "Bachelors" ? "Previous +2 / High School Details" : "Previous Bachelors College Details"}
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700">
                      {level === "+2" ? "SEE School Name *" : level === "Bachelors" ? "+2 High School Name *" : "Bachelors College Name *"}
                    </Label>
                    <Input
                      placeholder={level === "+2" ? "e.g. St. Xavier's School" : level === "Bachelors" ? "e.g. Prasadi Academy" : "e.g. Pulchowk Campus"}
                      value={previousSchool}
                      onChange={(e) => setPreviousSchool(e.target.value)}
                      className="h-9 text-xs bg-white rounded-lg"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700">
                      {level === "+2" ? "SEE GPA / Grade *" : level === "Bachelors" ? "+2 Stream & GPA *" : "Bachelors Degree & CGPA *"}
                    </Label>
                    <Input
                      placeholder={level === "+2" ? "e.g. 3.85 GPA" : level === "Bachelors" ? "e.g. Science - 3.65 GPA" : "e.g. B.Sc. CSIT - 3.7 CGPA"}
                      value={previousGpa}
                      onChange={(e) => setPreviousGpa(e.target.value)}
                      className="h-9 text-xs bg-white rounded-lg"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Temporary Address *</Label>
                  <Input
                    placeholder="e.g. Koteshwor, Kathmandu"
                    value={tempAddress}
                    onChange={(e) => setTempAddress(e.target.value)}
                    className="h-10 text-xs rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Permanent Address *</Label>
                  <Input
                    placeholder="e.g. Pokhara, Kaski"
                    value={permAddress}
                    onChange={(e) => setPermAddress(e.target.value)}
                    className="h-10 text-xs rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Contact Number (Nepal) *</Label>
                <Input
                  placeholder="e.g. 9801010802"
                  value={phone}
                  readOnly
                  className="h-10 text-xs rounded-xl"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="text-xs font-bold rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || missingStudentProfileFields("college_application", profile, user?.email).length > 0}
                  className="bg-[#0073e6] hover:bg-[#0062c4] text-white text-xs font-extrabold rounded-xl px-6"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                  Submit Application
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Individual Institution Detail Modal Dialog */}
      <Dialog
        open={selectedDetailCollege !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedDetailCollege(null);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl p-0">
          {selectedDetailCollege && (
            <div>
              {/* Cover Banner */}
              <div className="relative h-48 w-full bg-slate-900 overflow-hidden">
                <img
                  src={resolveCollegeMediaUrl(
                    selectedDetailCollege.cover_image_url || selectedDetailCollege.logo_url
                  )}
                  alt={selectedDetailCollege.name}
                  className="w-full h-full object-cover opacity-80"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://images.unsplash.com/photo-1562774053-701939374585?w=600&auto=format&fit=crop&q=80";
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between">
                  <div>
                    <span className="bg-[#0073e6] text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border border-white/20">
                      {selectedDetailCollege.institution_category || "Academic"}
                    </span>
                    <h2 className="text-2xl font-black text-white mt-1 leading-tight">
                      {selectedDetailCollege.name}
                    </h2>
                    <p className="text-xs text-white/80 font-semibold flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-red-400" />
                      {selectedDetailCollege.location || "Nepal"}
                    </p>
                  </div>
                  <Link
                    to={institutePath(selectedDetailCollege)}
                    target="_blank"
                    className="inline-flex items-center gap-1 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-xs font-extrabold px-3 py-1.5 rounded-xl transition-all"
                  >
                    Full Page <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Body Details */}
              <div className="p-6 space-y-6">
                {/* Stats Bar */}
                <div className="grid grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-slate-400">Affiliation</span>
                    <p className="text-xs font-black text-slate-900 mt-0.5">
                      {selectedDetailCollege.affiliation || "Tribhuvan University"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-slate-400">Established</span>
                    <p className="text-xs font-black text-slate-900 mt-0.5">
                      {selectedDetailCollege.established_year || "N/A"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-slate-400">Admissions</span>
                    <p className="text-xs font-black text-emerald-600 mt-0.5 capitalize">
                      {selectedDetailCollege.admission_status || "Open"}
                    </p>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-1.5">
                    Overview & Description
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {selectedDetailCollege.description ||
                      "Nepal's accredited institution offering quality academic degree programs and technical education tracks."}
                  </p>
                </div>

                {/* Offered Programs */}
                {(() => {
                  const programs = getInstitutePrograms(selectedDetailCollege.courses_offered);
                  if (programs.length === 0) return null;
                  return (
                    <div>
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2">
                        Courses & Programs Offered ({programs.length})
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {programs.map((prog, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs font-bold text-slate-800"
                          >
                            <GraduationCap className="w-4 h-4 text-[#0073e6] shrink-0" />
                            <span className="truncate">{prog.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Salient Features */}
                {selectedDetailCollege.salient_features && selectedDetailCollege.salient_features.length > 0 && (
                  <div>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2">
                      Key Highlights & Features
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedDetailCollege.salient_features.map((feat, idx) => (
                        <span
                          key={idx}
                          className="bg-blue-50 text-[#0073e6] border border-blue-100 text-xs font-extrabold px-3 py-1 rounded-full"
                        >
                          ✓ {feat}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Footer */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  {selectedDetailCollege.website && (
                    <a
                      href={selectedDetailCollege.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-extrabold text-slate-600 hover:text-[#0073e6]"
                    >
                      <Globe2 className="w-4 h-4" /> Official Website
                    </a>
                  )}
                  <Button
                    onClick={() => {
                      const col = selectedDetailCollege;
                      setSelectedDetailCollege(null);
                      handleOpenApply(col);
                    }}
                    className="bg-[#0073e6] hover:bg-[#0062c4] text-white font-extrabold text-xs rounded-xl px-6 py-2.5 ml-auto"
                  >
                    Apply / Inquiry Now
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
