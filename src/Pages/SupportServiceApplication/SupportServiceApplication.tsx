// SupportServiceApplication.tsx — aligned with your DB schema & RLS policies
import { useState } from "react";
import supabase from "@/server/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Mail, Phone, MapPin, User, Briefcase, Languages, FileText, Globe, ShieldCheck, Sparkles } from "lucide-react";
import Navbar from "@/components/utils/Navbar";
import { Footer } from "@/components/utils/Footer";
import LiveChat from "@/components/Home/LiveChat";
import { useNavigate } from "react-router-dom";
import type { PostgrestError } from "@supabase/supabase-js";
import { logRecentActivity } from "@/lib/recentActivity";

// DB-allowed values
const VALID_TYPES = ["lawyer", "therapist", "activist", "support-group"] as const;
type ServiceType = (typeof VALID_TYPES)[number];

// Matches availability_type enum in DB
const VALID_AVAILABILITY = ["available", "limited", "unavailable"] as const;
type AvailabilityType = (typeof VALID_AVAILABILITY)[number];

interface FormData {
  name: string;
  type: ServiceType | "";
  title: string;
  specialization: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  availability: AvailabilityType | "";
  languages: string; // comma-separated in the form
  credentials: string;
  tags: string; // comma-separated in the form
}

function toCSVArray(s: string) {
  return s
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function normalizeWebsite(url: string) {
  const t = url.trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

const SupportServiceApplication = () => {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    type: "",
    title: "",
    specialization: "",
    description: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    availability: "",
    languages: "",
    credentials: "",
    tags: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value as FormData[keyof FormData] } as FormData));
  };

  const validateForm = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\+?\d{10,15}$/;

    if (!formData.name.trim()) return "Name is required.";
    if (!formData.type || !VALID_TYPES.includes(formData.type as ServiceType)) return "Valid service type is required.";
    if (!formData.title.trim()) return "Title is required.";
    if (!formData.specialization.trim()) return "Specialization is required.";
    if (!formData.description.trim()) return "Description is required.";
    if (!formData.address.trim()) return "Address is required.";
    if (!formData.phone.trim() || !phoneRegex.test(formData.phone)) return "Valid phone number is required (e.g., +232456789).";
    if (!formData.email.trim() || !emailRegex.test(formData.email)) return "Valid email is required.";
    if (!formData.availability || !VALID_AVAILABILITY.includes(formData.availability as AvailabilityType)) return "Availability is required.";
    if (!formData.languages.trim()) return "At least one language is required.";
    if (!formData.credentials.trim()) return "Credentials are required.";

    if (formData.website.trim()) {
      try {
        new URL(normalizeWebsite(formData.website));
      } catch {
        return "Website must be a valid URL (e.g., https://example.com).";
      }
    }

    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      // RLS: writes require authenticated user
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) { toast.error("Please sign in to submit."); navigate("/auth/login"); return; }

      // Build payload aligned to DB columns (let DB defaults fill created_at/updated_at/verified/reviews)
      const payload = {
        name: formData.name.trim(),
        type: formData.type as ServiceType, // text in DB
        title: formData.title.trim(),
        specialization: formData.specialization.trim(),
        description: formData.description.trim(),
        contact_info: {
          address: formData.address.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim(),
        }, // jsonb
        website: formData.website.trim() ? normalizeWebsite(formData.website) : null, // text
        availability: formData.availability as AvailabilityType, // enum availability_type
        languages: toCSVArray(formData.languages), // text[]
        credentials: formData.credentials.trim(),
        tags: toCSVArray(formData.tags), // text[]
        status: "pending" as const, // enum support_status; default is 'pending'
        // Do NOT send rating/reviews/verified/avatar unless necessary; DB defaults handle them.
      };

      const { data: inserted, error } = await supabase
        .from("support_services")
        .insert(payload)
        .select("id,name,status")
        .single();
      if (error) throw error;

      await logRecentActivity({
        message: `Support service application submitted: ${inserted?.name ?? payload.name}`,
        type: "support",
        status: inserted?.status ?? payload.status,
      });

      toast.success("Application submitted successfully! You'll be notified once reviewed.");

      setFormData({
        name: "",
        type: "",
        title: "",
        specialization: "",
        description: "",
        address: "",
        phone: "",
        email: "",
        website: "",
        availability: "",
        languages: "",
        credentials: "",
        tags: "",
      });
    } catch (err: unknown) {
      console.error("Error submitting application:", err);
      const pg = err as Partial<PostgrestError>;
      const code = pg?.code ?? "";
      const msg = pg?.message ?? (err instanceof Error ? err.message : "Failed to submit application.");

      // Helpful messages for common RLS / enum errors
      if (code === "42501" || /row-level security/i.test(String(msg))) {
        toast.error("Submission blocked by access policy. Please sign in and try again.");
      } else if (code === "22P02") {
        toast.error("Invalid data format. Please check your inputs.");
      } else if (code === "23514") {
        toast.error("One or more fields failed validation. Please review and try again.");
      } else {
        toast.error(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/30">
      <Navbar />
      <main id="main" className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
        <div className="max-w-3xl mx-auto text-center mb-8">
          <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground bg-background/60 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 mr-1.5 text-primary" /> Partner Application
          </span>
          <h1 className="mt-3 text-3xl md:text-5xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-primary to-rose-500 bg-clip-text text-transparent">Support Service Application</span>
          </h1>
          <p className="mt-2 text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            Apply to offer your services. We review submissions within 3–5 business days.
          </p>
        </div>

        {/* Communication */}
        <div className="max-w-6xl mx-auto mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Communication</CardTitle>
              <CardDescription>Use templated messages to keep applicants informed. Secure messaging for requested edits.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-1">Templates</p>
                <div className="grid md:grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={async () => {
                      const msg = `Hello ${formData.name || "there"},\n\nWe received your support service application and will review it within 3–5 business days. We will contact you if we need any additional information.\n\nThank you!`;
                      await navigator.clipboard.writeText(msg);
                      toast.success("Copied: Application received template");
                    }}
                  >
                    Copy: Application received
                  </Button>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      const msg = `Hello ${formData.name || "there"},\n\nWe reviewed your application. Please update the following: [list requested edits].\n\nUse the secure messaging link in your dashboard to reply and upload documents.`;
                      await navigator.clipboard.writeText(msg);
                      toast.success("Copied: Request edits template");
                    }}
                  >
                    Copy: Request edits
                  </Button>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Secure message (preview)</p>
                <div className="rounded-md border p-3 text-sm text-muted-foreground">
                  Direct secure messaging is enabled after you submit. You will receive a link by email to continue the conversation safely.
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Requirements & Status */}
        <div className="max-w-3xl mx-auto mt-6 mb-6">
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-xl">Requirements Checklist</CardTitle>
              <CardDescription>Eligibility, documents, and review timeline.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Valid contact details and service description</li>
                <li>• Credentials or references (optional but recommended)</li>
                <li>• Review timeline: 3–7 business days</li>
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Status Tracker</CardTitle>
              <CardDescription>Submitted → Under Review → Approved / Changes Requested</CardDescription>
            </CardHeader>
          </Card>
        </div>

        <div className="mx-auto max-w-6xl grid gap-6 lg:grid-cols-2">
          <Card className="w-full shadow-sm">
            <CardHeader className="pb-4 border-b">
              <CardTitle className="flex items-center gap-2 text-xl md:text-2xl justify-center">
                <ShieldCheck className="h-5 w-5 text-primary" /> Verified Partners
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="flex items-center gap-2">
                      <User className="h-4 w-4" /> Name
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="name"
                        name="name"
                        className="pl-9"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="Full name or organization name"
                        required
                        disabled={isSubmitting}
                        aria-label="Name"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type" className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4" /> Service Type
                    </Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) => handleSelectChange("type", value)}
                      disabled={isSubmitting}
                      aria-label="Service Type"
                    >
                      <SelectTrigger id="type">
                        <SelectValue placeholder="Select service type" />
                      </SelectTrigger>
                      <SelectContent>
                        {VALID_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type.replace("-", " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" /> Title
                    </Label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="title"
                        name="title"
                        className="pl-9"
                        value={formData.title}
                        onChange={handleInputChange}
                        placeholder="E.g., Licensed Clinical Psychologist"
                        required
                        disabled={isSubmitting}
                        aria-label="Title"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="specialization" className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4" /> Specialization
                    </Label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="specialization"
                        name="specialization"
                        className="pl-9"
                        value={formData.specialization}
                        onChange={handleInputChange}
                        placeholder="E.g., Family Law, Trauma Therapy"
                        required
                        disabled={isSubmitting}
                        aria-label="Specialization"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" /> Description
                  </Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Describe your services..."
                    rows={4}
                    required
                    disabled={isSubmitting}
                    aria-label="Description"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="address" className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" /> Address
                    </Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="address"
                        name="address"
                        className="pl-9"
                        value={formData.address}
                        onChange={handleInputChange}
                        placeholder="Full address"
                        required
                        disabled={isSubmitting}
                        aria-label="Address"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-2">
                      <Phone className="h-4 w-4" /> Phone
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        className="pl-9"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="+1234567890"
                        required
                        disabled={isSubmitting}
                        aria-label="Phone"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" /> Email
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        className="pl-9"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="email@example.com"
                        required
                        disabled={isSubmitting}
                        aria-label="Email"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website" className="flex items-center gap-2">
                      <Globe className="h-4 w-4" /> Website (optional)
                    </Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="website"
                        name="website"
                        className="pl-9"
                        value={formData.website}
                        onChange={handleInputChange}
                        placeholder="https://example.com"
                        disabled={isSubmitting}
                        aria-label="Website"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="availability" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" /> Availability
                    </Label>
                    <Select
                      value={formData.availability}
                      onValueChange={(value) => handleSelectChange("availability", value)}
                      disabled={isSubmitting}
                      aria-label="Availability"
                    >
                      <SelectTrigger id="availability">
                        <SelectValue placeholder="Select availability" />
                      </SelectTrigger>
                      <SelectContent>
                        {VALID_AVAILABILITY.map((availability) => (
                          <SelectItem key={availability} value={availability}>
                            {availability.charAt(0).toUpperCase() + availability.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="languages" className="flex items-center gap-2">
                      <Languages className="h-4 w-4" /> Languages
                    </Label>
                    <div className="relative">
                      <Languages className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="languages"
                        name="languages"
                        className="pl-9"
                        value={formData.languages}
                        onChange={handleInputChange}
                        placeholder="E.g., English, Spanish, French"
                        required
                        disabled={isSubmitting}
                        aria-label="Languages"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Enter languages separated by commas</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="credentials" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" /> Credentials
                    </Label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="credentials"
                        name="credentials"
                        className="pl-9"
                        value={formData.credentials}
                        onChange={handleInputChange}
                        placeholder="E.g., Licensed Therapist, JD"
                        required
                        disabled={isSubmitting}
                        aria-label="Credentials"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tags" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" /> Tags (optional)
                    </Label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="tags"
                        name="tags"
                        className="pl-9"
                        value={formData.tags}
                        onChange={handleInputChange}
                        placeholder="E.g., trauma, legal-aid, counseling"
                        disabled={isSubmitting}
                        aria-label="Tags"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Enter tags separated by commas</p>
                  </div>
                </div>

                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Submitting..." : "Submit Application"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Live preview */}
          <Card className="w-full shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">Listing Preview</CardTitle>
              <CardDescription>See how your profile will appear in the directory.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="group hover:shadow-lg transition-all rounded-xl border p-4">
                <div className="flex items-start gap-4">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-sm font-semibold">
                    {(formData.name || "S").slice(0, 1)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-lg font-semibold">{formData.name || "Service Name"}</p>
                    </div>
                    <div className="flex items-center gap-2 mb-2 text-sm">
                      <span className="px-2 py-0.5 rounded border text-xs">
                        {(formData.type || "therapist").toString().replace("-", " ")}
                      </span>
                      {formData.availability && (
                        <span className="px-2 py-0.5 rounded border text-xs bg-muted">
                          {String(formData.availability).charAt(0).toUpperCase() + String(formData.availability).slice(1)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                      {formData.description || "Your service description will appear here."}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {formData.email && (
                        <Button size="sm" variant="outline">
                          <Mail className="h-4 w-4 mr-2" /> Email
                        </Button>
                      )}
                      {formData.phone && (
                        <Button size="sm" variant="outline">
                          <Phone className="h-4 w-4 mr-2" /> Call
                        </Button>
                      )}
                      {formData.website && (
                        <Button size="sm" variant="outline">
                          <Globe className="h-4 w-4 mr-2" /> Website
                        </Button>
                      )}
                      <Button size="sm" variant="ghost">
                        Request Callback
                      </Button>
                    </div>
                  </div>
                </div>
                {formData.languages && (
                  <p className="mt-3 text-xs text-muted-foreground">Languages: {formData.languages}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <LiveChat />
      <Footer />
    </div>
  );
};

export default SupportServiceApplication;
