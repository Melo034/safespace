import { useState, useCallback } from "react";
import supabase from "@/server/supabase";
import type { PostgrestError } from "@supabase/supabase-js";
import Navbar from "@/components/utils/Navbar";
import { Footer } from "@/components/utils/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Lock, AlertTriangle, FileText, User, Mail, Phone as PhoneIcon, Calendar, MapPin, ShieldCheck, Upload, X } from "lucide-react";
import { useDropzone } from "react-dropzone";
import LiveChat from "@/components/Home/LiveChat";
import type { ReportType } from "@/lib/types";
import { toast } from "sonner";

const Report = () => {
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [reportType, setReportType] = useState<ReportType["type"] | "">("");
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    description: "",
    incidentDate: "",
    location: "",
    perpetratorName: "",
    relationship: "",
    supportNeeded: "",
    consent: false,
    accuracy: false,
  });
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onDrop = useCallback((accepted: File[]) => {
    setFiles((prev) => {
      const next = new Map<string, File>();
      const addAll = (arr: File[]) => arr.forEach((f) => next.set(`${f.name}:${f.size}`, f));
      addAll(prev);
      addAll(accepted);
      return Array.from(next.values());
    });
  }, []);

  const removeFile = (key: string) => {
    setFiles((prev) => prev.filter((f) => `${f.name}:${f.size}` !== key));
  };

  const clearFiles = () => setFiles([]);

  // Public bucket expected
  const uploadEvidence = async (evidenceFiles: File[]) => {
    if (!evidenceFiles.length) return [] as string[];

    const bucket = "reports";
    const prefix = `reports/${Date.now()}`;

    const uploads = evidenceFiles.map(async (file, idx) => {
      const path = `${prefix}/${idx}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
      return urlData.publicUrl;
    });

    return Promise.all(uploads);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.consent || !formData.accuracy) {
      toast.warning("Please agree to the consent and accuracy terms.");
      return;
    }
    if (!reportType) {
      toast.warning("Please select an incident type.");
      return;
    }
    if (!formData.description.trim()) {
      toast.warning("Please provide a description of the incident.");
      return;
    }
    if (!formData.incidentDate || !formData.location.trim()) {
      toast.warning("Please provide the incident date and location.");
      return;
    }
    if (!isAnonymous) {
      if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim()) {
        toast.warning("Please provide your first name, last name, and email or submit anonymously.");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const reportedBy: string | null = isAnonymous ? null : auth.user?.id ?? null;

      let evidenceUrls: string[] = [];
      try {
        evidenceUrls = await uploadEvidence(files);
      } catch (uploadErr) {
        console.error("uploadEvidence error:", uploadErr);
        toast.error(uploadErr instanceof Error ? uploadErr.message : String(uploadErr));
        setIsSubmitting(false);
        return;
      }

      const isoIncident = formData.incidentDate
        ? new Date(formData.incidentDate).toISOString()
        : new Date().toISOString();

      const reportData = {
        title: `${String(reportType).toUpperCase()} REPORT - ${new Date().toISOString().split("T")[0]}`,
        description: [
          formData.description.trim(),
          formData.perpetratorName ? `\nPerpetrator: ${formData.perpetratorName}` : "",
          formData.relationship ? `\nRelationship: ${formData.relationship}` : "",
          formData.supportNeeded ? `\nSupport needed: ${formData.supportNeeded}` : "",
          !isAnonymous
            ? `\nReporter (form): ${formData.firstName} ${formData.lastName} | ${formData.email} | ${formData.phone || ""}`
            : "",
        ]
          .filter(Boolean)
          .join(""),
        type: reportType,
        priority: "Low",
        status: "Open",
        location: formData.location,
        reported_by: reportedBy,
        reported_at: isoIncident,
        assigned_to: null as string | null,
        tags: [reportType, isAnonymous ? "anonymous" : "identified"] as string[],
        follow_up_actions: formData.supportNeeded ? [formData.supportNeeded] : ([] as string[]),
        evidence: evidenceUrls,
        contact_info: isAnonymous
          ? null
          : {
              first_name: formData.firstName,
              last_name: formData.lastName,
              email: formData.email,
              phone: formData.phone,
            },
      };
      const { error } = await supabase.from("reports").insert(reportData);
      if (error) {
        const dbError = error as PostgrestError;
        console.error("insert error:", {
          message: dbError.message,
          details: dbError.details,
          hint: dbError.hint,
          code: dbError.code,
        });
        throw error;
      }

      toast.success("Report submitted successfully.");

      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        description: "",
        incidentDate: "",
        location: "",
        perpetratorName: "",
        relationship: "",
        supportNeeded: "",
        consent: false,
        accuracy: false,
      });
      setFiles([]);
      setReportType("");
      setIsAnonymous(false);
    } catch (err: unknown) {
      console.error("Error submitting report:", err);
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === "string"
          ? err
          : "Failed to submit report. Please try again.";
      if (String(msg).toLowerCase().includes("row-level security")) {
        toast.error(
          "Your report could not be saved due to security rules. For anonymous submissions, inserts with reported_by = NULL must be allowed."
        );
      } else {
        toast.error(String(msg));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/30">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto mb-8">
          <div className="text-center mb-8">
            <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground bg-background/60 backdrop-blur">
              <ShieldCheck className="h-3.5 w-3.5 mr-1.5 text-primary" /> Secure & Confidential
            </span>
            <h1 className="mt-4 text-3xl md:text-5xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-primary to-rose-500 bg-clip-text text-transparent">Report an Incident</span>
            </h1>
            <p className="mt-3 text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
              Your safety and privacy come first. Share details securely and access the right support.
            </p>
          </div>

          <Card className="border-green-200/60 bg-green-50/70 dark:bg-emerald-950/20 mb-8">
            <CardContent className="pt-6">
              <div className="flex items-start space-x-3">
                <Lock className="h-6 w-6 text-emerald-600 mt-1" />
                <div>
                  <h3 className="font-semibold text-emerald-900 dark:text-emerald-300 mb-2">Your report is protected</h3>
                  <ul className="text-sm text-emerald-800/90 dark:text-emerald-200/90 space-y-1">
                    <li>• Encrypted storage and restricted access</li>
                    <li>• Option to stay anonymous</li>
                    <li>• Only authorized support can view</li>
                    <li>• You decide what to share</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200/70 bg-red-50/70 dark:bg-rose-950/20 mb-8">
            <CardContent className="pt-6">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-6 w-6 text-rose-600 mt-1" />
                <div>
                  <h3 className="font-semibold text-rose-900 dark:text-rose-300 mb-2">In immediate danger?</h3>
                  <p className="text-sm text-rose-800/90 dark:text-rose-200/90 mb-3">
                    If you’re in physical danger now, call your local emergency services.
                  </p>
                  <Button asChild className="bg-rose-600 hover:bg-rose-700 text-white shadow-sm">
                    <a href="/support">Get Emergency Help</a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader className="pb-4 border-b">
              <CardTitle className="flex items-center gap-2 text-xl md:text-2xl">
                <FileText className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                Submit a Report
              </CardTitle>
              <CardDescription>
                Fields marked with <span className="text-destructive">*</span> are required.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-3">
                  <Label htmlFor="anonymous" className="flex items-center gap-2 text-sm">
                    <Checkbox
                      id="anonymous"
                      checked={isAnonymous}
                      onCheckedChange={(checked) => setIsAnonymous(Boolean(checked))}
                    />
                    Submit Anonymously
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  </Label>
                  <p className="text-xs text-muted-foreground">We won’t collect your identity if you choose to remain anonymous.</p>
                </div>

                {!isAnonymous && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">Your Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name <span className="text-destructive">*</span></Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="firstName"
                            className="pl-9"
                            placeholder="Jane"
                            value={formData.firstName}
                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name <span className="text-destructive">*</span></Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="lastName"
                            className="pl-9"
                            placeholder="Doe"
                            value={formData.lastName}
                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="email"
                            type="email"
                            className="pl-9"
                            placeholder="jane@example.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <div className="relative">
                          <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="phone"
                            type="tel"
                            className="pl-9"
                            placeholder="Optional"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="reportType">Incident Type <span className="text-destructive">*</span></Label>
                  <Select value={reportType} onValueChange={(value) => setReportType(value as ReportType["type"] | "")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select incident type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="harassment">Harassment</SelectItem>
                      <SelectItem value="discrimination">Discrimination</SelectItem>
                      <SelectItem value="violence">Violence</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description of Incident <span className="text-destructive">*</span></Label>
                  <Textarea
                    id="description"
                    placeholder="Describe what happened, including who was involved and any relevant context."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                    rows={5}
                  />
                  <p className="text-xs text-muted-foreground">Avoid sharing sensitive details that could reveal your identity if you prefer anonymity.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="incidentDate">Date of Incident <span className="text-destructive">*</span></Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="incidentDate"
                        type="date"
                        className="pl-9"
                        value={formData.incidentDate}
                        onChange={(e) => setFormData({ ...formData, incidentDate: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location of Incident <span className="text-destructive">*</span></Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="location"
                        className="pl-9"
                        placeholder="City, address, or description"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="perpetratorName">Perpetrator Name (if known)</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="perpetratorName"
                        className="pl-9"
                        placeholder="Optional"
                        value={formData.perpetratorName}
                        onChange={(e) => setFormData({ ...formData, perpetratorName: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="relationship">Relationship to Perpetrator</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="relationship"
                        className="pl-9"
                        placeholder="Optional"
                        value={formData.relationship}
                        onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="supportNeeded">What kind of support are you looking for?</Label>
                  <Textarea
                    id="supportNeeded"
                    rows={3}
                    placeholder="Counseling, legal aid, safety planning, etc. (optional)"
                    className="min-h-[80px]"
                    value={formData.supportNeeded}
                    onChange={(e) => setFormData({ ...formData, supportNeeded: e.target.value })}
                  />
                </div>

                <div className="space-y-3">
                  <Label>Evidence Upload</Label>
                  <Dropzone files={files} onDrop={onDrop} onRemove={removeFile} onClear={clearFiles} />
                  <p className="text-xs text-muted-foreground">Only upload files you’re comfortable sharing. You can blur/redact sensitive info.</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="consent"
                      checked={formData.consent}
                      onCheckedChange={(checked) => setFormData({ ...formData, consent: Boolean(checked) })}
                    />
                    <Label htmlFor="consent" className="text-sm leading-relaxed">I consent to contact (if provided) and understand trained professionals will review this report.</Label>
                  </div>

                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="accuracy"
                      checked={formData.accuracy}
                      onCheckedChange={(checked) => setFormData({ ...formData, accuracy: Boolean(checked) })}
                    />
                    <Label htmlFor="accuracy" className="text-sm leading-relaxed">
                      I certify the information provided in this report is accurate to the best of my knowledge.
                    </Label>
                  </div>
                </div>

                <Button type="submit"  disabled={isSubmitting}>
                  {isSubmitting ? "Submitting..." : "Submit Report"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="max-w-4xl mx-auto mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <PhoneIcon className="h-5 w-5 text-primary" /> Need Immediate Support?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">National Hotlines</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>Domestic Violence Hotline: 116</li>
                    <li>Sexual Assault Hotline: 116</li>
                    <li>Crisis Text Line: Text HOME to 116</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Online Resources</h4>
                  <ul className="text-sm space-y-1">
                    <li>
                      <a href="/resources" className="text-primary hover:underline">Local Support Services</a>
                    </li>
                    <li>
                      <a href="/resources" className="text-primary hover:underline">Safety Planning Guide</a>
                    </li>
                    <li>
                      <a href="/resources" className="text-primary hover:underline">Crisis Support</a>
                    </li>
                  </ul>
                </div>
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

export default Report;

type DropzoneProps = {
  files: File[];
  onDrop: (accepted: File[]) => void;
  onRemove: (key: string) => void;
  onClear: () => void;
};

const Dropzone = ({ files, onDrop, onRemove, onClear }: DropzoneProps) => {
  const humanSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    multiple: true,
    maxSize: 10 * 1024 * 1024, // 10MB per file
    accept: {
      "image/*": [".jpg", ".jpeg", ".png", ".gif", ".webp"],
      "application/pdf": [".pdf"],
    },
  });

  return (
    <div>
      <div
        {...getRootProps()}
        className={`group relative rounded-lg border-2 border-dashed p-6 md:p-8 text-center cursor-pointer transition-colors ${
          isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:bg-muted/40"
        }`}
      >
        <input {...getInputProps()} aria-label="Upload evidence files" />
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Upload className="h-5 w-5" />
          </div>
          <p className="text-sm">
            <span className="font-medium text-primary">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-muted-foreground">PNG, JPG, or PDF up to 10MB each</p>
        </div>
      </div>

      {fileRejections.length > 0 && (
        <div className="mt-2 text-xs text-destructive">
          Some files were rejected. Ensure each file is an image/PDF and under 10MB.
        </div>
      )}

      {files.length > 0 && (
        <div className="mt-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Selected files ({files.length})</span>
            <button
              type="button"
              onClick={onClear}
              className="text-xs text-muted-foreground hover:text-foreground"
              aria-label="Clear all files"
            >
              Clear all
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {files.map((f) => {
              const key = `${f.name}:${f.size}`;
              return (
                <div
                  key={key}
                  className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-sm"
                >
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate max-w-[10rem] md:max-w-[14rem]" title={f.name}>
                    {f.name}
                  </span>
                  <span className="text-xs text-muted-foreground">{humanSize(f.size)}</span>
                  <button
                    type="button"
                    onClick={() => onRemove(key)}
                    className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full hover:bg-muted"
                    aria-label={`Remove ${f.name}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
