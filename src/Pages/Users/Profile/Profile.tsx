// Profile.tsx — aligned with your Supabase schema & policies
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import supabase from "@/server/supabase";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import Sidebar from "../Components/Sidebar";
import Navbar from "@/components/utils/Navbar";
import { Footer } from "@/components/utils/Footer";
import Loading from "@/components/utils/Loading";
import StoryCard from "../Components/story-card";
import type { Story } from "@/lib/types";

/** ─────────────────────────────────────────────────────────────────────────────
 *  DB-aligned types (community_members, stories)
 *  - community_members.email is NOT NULL in DB → keep as string (no null)
 *  - Only select / write columns that exist in your schema
 *  ────────────────────────────────────────────────────────────────────────────*/
type CommunityMember = {
  user_id: string;
  name: string;
  email: string; // NOT NULL in DB
  avatar_url: string | null;
  bio: string | null;
  stories_count: number;
  join_date: string;
};

type CommunityMemberRow = {
  user_id: string;
  name: string | null;
  email: string; // NOT NULL in DB, but we safeguard in mapping
  avatar_url: string | null;
  bio: string | null;
  stories_count: number | null;
  join_date: string | null;
};

function mapRowToMember(row: CommunityMemberRow): CommunityMember {
  return {
    user_id: row.user_id,
    name: row.name ?? "Anonymous",
    email: row.email ?? "", // DB is NOT NULL; empty string is still valid text
    avatar_url: row.avatar_url ?? null,
    bio: row.bio ?? null,
    stories_count: row.stories_count ?? 0,
    join_date: row.join_date ?? new Date().toISOString(),
  };
}

interface StoryRow {
  id: string;
  title: string | null;
  content: string | null;
  author_id: string | null;
  created_at: string | null;
  tags: string[] | null;
}

function mapRowToStory(row: StoryRow): Story {
  return {
    id: row.id,
    slug: String(row.id),
    title: row.title ?? "",
    content: row.content ?? "",
    full_content: row.content ?? "",
    author: {
      id: row.author_id ?? null,
      name: row.author_id ? "User" : "Anonymous",
      anonymous: !row.author_id,
      avatar: null,
      verified: false,
    },
    created_at: row.created_at ?? new Date().toISOString(),
    category: "general",
    likes: 0,
    comments_count: 0,
    views: 0,
    tags: Array.isArray(row.tags) ? row.tags : [],
    featured: false,
  } as Story;
}

const SERVICE_TYPES = ["lawyer", "therapist", "activist", "support-group"] as const;
const SERVICE_AVAILABILITY = ["available", "limited", "unavailable"] as const;
const SERVICE_STATUSES = ["pending", "approved", "rejected"] as const;

type ServiceType = (typeof SERVICE_TYPES)[number];
type AvailabilityType = (typeof SERVICE_AVAILABILITY)[number];
type SupportStatus = (typeof SERVICE_STATUSES)[number];

type ContactInfo = {
  address: string;
  phone: string;
  email: string;
};

type SupportServiceRow = {
  id: string;
  name: string | null;
  type: string | null;
  title: string | null;
  specialization: string | null;
  description: string | null;
  contact_info: Record<string, unknown> | null;
  website: string | null;
  availability: string | null;
  status: string | null;
  verified: boolean | null;
  languages: string[] | null;
  tags: string[] | null;
  created_at: string | null;
  updated_at: string | null;
};

type SupportService = {
  id: string;
  name: string;
  type: ServiceType;
  title: string;
  specialization: string;
  description: string;
  contact: ContactInfo;
  website: string;
  availability: AvailabilityType;
  status: SupportStatus;
  verified: boolean;
  languages: string[];
  tags: string[];
  created_at: string;
  updated_at: string;
};

type SupportServiceFormState = {
  name: string;
  title: string;
  specialization: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  availability: AvailabilityType;
  type: ServiceType;
  languages: string;
  tags: string;
};

function toContactInfo(value: Record<string, unknown> | null): ContactInfo {
  const source = (value ?? {}) as { address?: unknown; phone?: unknown; email?: unknown };
  const address = typeof source.address === "string" ? source.address : "";
  const phone = typeof source.phone === "string" ? source.phone : "";
  const email = typeof source.email === "string" ? source.email : "";
  return { address, phone, email };
}

function mapSupportRow(row: SupportServiceRow): SupportService {
  const contact = toContactInfo(row.contact_info ?? null);
  const availability = SERVICE_AVAILABILITY.includes(String(row.availability) as AvailabilityType)
    ? (row.availability as AvailabilityType)
    : "unavailable";
  const status = SERVICE_STATUSES.includes(String(row.status) as SupportStatus)
    ? (row.status as SupportStatus)
    : "pending";
  const type = SERVICE_TYPES.includes(String(row.type) as ServiceType)
    ? (row.type as ServiceType)
    : "support-group";

  return {
    id: row.id,
    name: row.name ?? "Untitled Service",
    type,
    title: row.title ?? "",
    specialization: row.specialization ?? "",
    description: row.description ?? "",
    contact,
    website: row.website ?? "",
    availability,
    status,
    verified: row.verified ?? false,
    languages: Array.isArray(row.languages) ? row.languages : [],
    tags: Array.isArray(row.tags) ? row.tags : [],
    created_at: row.created_at ?? new Date().toISOString(),
    updated_at: row.updated_at ?? new Date().toISOString(),
  };
}

function toCSVArray(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function fromArrayToCSV(arr: string[]): string {
  return arr.join(", ");
}

function normalizeWebsite(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function humanizeType(value: string): string {
  return value.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusVariant(status: SupportStatus): "secondary" | "outline" | "default" {
  switch (status) {
    case "approved":
      return "default";
    case "rejected":
      return "secondary";
    default:
      return "outline";
  }
}

const Profile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [member, setMember] = useState<CommunityMember | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [supportServices, setSupportServices] = useState<SupportService[]>([]);
  const [supportLoading, setSupportLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<SupportService | null>(null);
  const [serviceForm, setServiceForm] = useState<SupportServiceFormState | null>(null);
  const [supportDialogOpen, setSupportDialogOpen] = useState(false);
  const [serviceSaving, setServiceSaving] = useState(false);
  const [supportError, setSupportError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const { data: userResp, error: userErr } = await supabase.auth.getUser();
        if (userErr) throw userErr;
        const user = userResp.user;
        if (!user) {
          setError("You must be logged in to view this page.");
          navigate("/auth/login");
          return;
        }

        // 1) Get or create community member profile (RLS: *_self policies)
        const { data: profileRow, error: profileErr } = await supabase
          .from("community_members")
          .select("user_id,name,email,avatar_url,bio,stories_count,join_date")
          .eq("user_id", user.id)
          .maybeSingle<CommunityMemberRow>();
        if (profileErr) throw profileErr;

        let currentMember: CommunityMember;

        if (!profileRow) {
          const insertPayload = {
            user_id: user.id,
            name: (user.user_metadata?.name as string | undefined) || "Anonymous",
            email: user.email ?? "", // DB requires NOT NULL
            avatar_url: (user.user_metadata?.avatar_url as string | undefined) ?? null,
            bio: null,
            stories_count: 0,
          };

          const { data: inserted, error: insertErr } = await supabase
            .from("community_members")
            .insert(insertPayload)
            .select("user_id,name,email,avatar_url,bio,stories_count,join_date")
            .single<CommunityMemberRow>();

          if (insertErr) throw insertErr;
          currentMember = mapRowToMember(inserted);
        } else {
          currentMember = mapRowToMember(profileRow);
        }
        setMember(currentMember);

        // 2) Fetch member's stories (only existing schema columns)
        const { data: storiesRows, error: storiesErr } = await supabase
          .from("stories")
          .select("id,title,content,author_id,created_at,tags")
          .eq("author_id", user.id)
          .order("created_at", { ascending: false });
        if (storiesErr) throw storiesErr;

        const userStories = (storiesRows ?? []).map((r) => mapRowToStory(r as StoryRow));
        setStories(userStories);

        // 3) Fetch support services created by the user
        const { data: supportRows, error: supportErr } = await supabase
          .from("support_services")
          .select(
            "id,name,type,title,specialization,description,contact_info,website,availability,status,verified,languages,tags,created_at,updated_at"
          )
          .eq("created_by", user.id)
          .order("created_at", { ascending: false });
        if (supportErr) throw supportErr;

        const services = (supportRows ?? []).map((row) => mapSupportRow(row as SupportServiceRow));
        setSupportServices(services);
        setSupportLoading(false);

        // 4) Update stories_count if changed (RLS: update_self_or_admin)
        if ((currentMember.stories_count ?? 0) !== userStories.length) {
          await supabase
            .from("community_members")
            .update({ stories_count: userStories.length, updated_at: new Date().toISOString() })
            .eq("user_id", user.id);
          setMember((prev) => (prev ? { ...prev, stories_count: userStories.length } : prev));
        }
      } catch (err) {
        console.error("Error loading profile:", err);
        setError("Failed to load profile. Please try again.");
        toast.error("Failed to load profile. Please try again.");
        setSupportLoading(false);
      } finally {
        setLoading(false);
        setSupportLoading(false);
      }
    };

    void init();
  }, [navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setMember((prev) => (prev ? ({ ...prev, [name]: value } as CommunityMember) : prev));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setAvatarFile(e.target.files[0]);
  };

  const buildFormStateFromService = (service: SupportService): SupportServiceFormState => ({
    name: service.name,
    title: service.title,
    specialization: service.specialization,
    description: service.description,
    address: service.contact.address,
    phone: service.contact.phone,
    email: service.contact.email,
    website: service.website,
    availability: service.availability,
    type: service.type,
    languages: fromArrayToCSV(service.languages),
    tags: fromArrayToCSV(service.tags),
  });

  const openSupportDialog = (service: SupportService) => {
    setSelectedService(service);
    setServiceForm(buildFormStateFromService(service));
    setSupportError(null);
    setSupportDialogOpen(true);
  };

  const closeSupportDialog = () => {
    setSupportDialogOpen(false);
    setServiceForm(null);
    setSupportError(null);
    setSelectedService(null);
  };

  const handleServiceFormChange = <K extends keyof SupportServiceFormState>(field: K, value: SupportServiceFormState[K]) => {
    setServiceForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleSupportSave = async () => {
    if (!selectedService || !serviceForm) return;

    setServiceSaving(true);
    setSupportError(null);

    try {
      const name = serviceForm.name.trim();
      const title = serviceForm.title.trim();
      const specialization = serviceForm.specialization.trim();
      const description = serviceForm.description.trim();
      const address = serviceForm.address.trim();
      const phone = serviceForm.phone.trim();
      const email = serviceForm.email.trim();
      const website = normalizeWebsite(serviceForm.website);

      if (!name) {
        setSupportError("Service name is required.");
        return;
      }
      if (!title) {
        setSupportError("Professional title is required.");
        return;
      }
      if (!specialization) {
        setSupportError("Specialization is required.");
        return;
      }
      if (!description) {
        setSupportError("Description is required.");
        return;
      }
      if (!address) {
        setSupportError("Address is required.");
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (email && !emailRegex.test(email)) {
        setSupportError("Please provide a valid contact email.");
        return;
      }

      const languages = toCSVArray(serviceForm.languages);
      const tags = toCSVArray(serviceForm.tags);

      const payload = {
        name,
        title,
        specialization,
        description,
        contact_info: {
          address,
          phone,
          email,
        },
        website,
        availability: serviceForm.availability,
        type: serviceForm.type,
        languages,
        tags,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("support_services")
        .update(payload)
        .eq("id", selectedService.id)
        .select(
          "id,name,type,title,specialization,description,contact_info,website,availability,status,verified,languages,tags,created_at,updated_at"
        )
        .single<SupportServiceRow>();

      if (error) throw error;

      const updated = mapSupportRow(data);
      setSupportServices((prev) => prev.map((svc) => (svc.id === updated.id ? updated : svc)));
      closeSupportDialog();
      toast.success("Support service updated.");
    } catch (err) {
      console.error("Error updating support service:", err);
      setSupportError(
        err instanceof Error ? err.message : "Failed to update the support service. Please try again."
      );
      toast.error("Failed to update support service.");
    } finally {
      setServiceSaving(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;

    setIsSaving(true);
    try {
      // Verify auth
      const { data: userResp } = await supabase.auth.getUser();
      const user = userResp.user;
      if (!user) throw new Error("Not authenticated.");

      let avatarUrl = member.avatar_url;

      if (avatarFile) {
        if (!["image/jpeg", "image/png", "image/webp"].includes(avatarFile.type)) {
          throw new Error("Avatar must be JPEG, PNG, or WEBP.");
        }
        if (avatarFile.size > 5 * 1024 * 1024) {
          throw new Error("Avatar must be less than 5MB.");
        }

        const path = `${user.id}/${Date.now()}_${avatarFile.name}`;
        const { error: uploadErr } = await supabase.storage
          .from("avatars")
          .upload(path, avatarFile, { cacheControl: "3600", upsert: false });
        if (uploadErr) throw uploadErr;

        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
        avatarUrl = urlData.publicUrl;
      }

      // DB: email is NOT NULL → ensure string
      const payload = {
        name: (member.name || "Anonymous").trim(),
        email: (member.email || "").trim(),
        avatar_url: avatarUrl,
        bio: (member.bio || "")?.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (!payload.email) {
        throw new Error("Email is required.");
      }

      const { error: updateErr } = await supabase
        .from("community_members")
        .update(payload)
        .eq("user_id", member.user_id);

      if (updateErr) throw updateErr;

      setMember((prev) => (prev ? ({ ...prev, ...payload } as CommunityMember) : prev));
      setAvatarFile(null);
      setIsEditing(false);
      toast.success("Profile updated successfully.");
    } catch (err) {
      console.error("Error saving profile:", err);
      toast.error(err instanceof Error ? err.message : "Failed to save profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="py-20 sm:py-32 container mx-auto px-4 md:px-6 max-w-6xl">
          <div className="container flex-1 items-start md:grid md:grid-cols-[220px_1fr] md:gap-6 lg:grid-cols-[240px_1fr] lg:gap-10 py-8">
            <Sidebar />
            <main className="flex w-full flex-col mx-auto overflow-hidden justify-center items-center h-64">
              <Loading />
            </main>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div className="py-20 sm:py-32 container mx-auto px-4 md:px-6 max-w-6xl text-red-600">
          <div className="container flex-1 items-start md:grid md:grid-cols-[220px_1fr] md:gap-6 lg:grid-cols-[240px_1fr] lg:gap-10 py-8">
            <Sidebar />
            <main className="flex w-full flex-col overflow-hidden">
              {error}
              <Button onClick={() => window.location.reload()} className="mt-4">
                Retry
              </Button>
            </main>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (!member) return null;

  return (
    <>
      <Navbar />
      <div id="main" className="py-20 sm:py-32 container mx-auto px-4 md:px-6 max-w-6xl">
        <div className="container flex-1 items-start md:grid md:grid-cols-[220px_1fr] md:gap-6 lg:grid-cols-[240px_1fr] lg:gap-10 py-8">
          <Sidebar />
          <main className="flex w-full flex-col overflow-hidden">
            <div className="mb-6 flex items-center justify-between">
              <h1 className="text-2xl font-bold">My Profile</h1>
              {!isEditing && (
                <Button onClick={() => setIsEditing(true)} className="bg-primary hover:bg-primary/80">
                  Edit Profile
                </Button>
              )}
            </div>

            {isEditing ? (
              <form onSubmit={handleSave} className="space-y-6">
                <div className="mb-6 flex flex-col items-center">
                  <div className="relative">
                    <Avatar className="h-36 w-36 rounded-full border-2 border-primary/80 overflow-hidden">
                      <AvatarImage
                        className="h-full w-full object-cover"
                        src={avatarFile ? URL.createObjectURL(avatarFile) : member.avatar_url || "/Images/placeholder.jpg"}
                        alt={member.name}
                      />
                      <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="absolute bottom-0 right-0 cursor-pointer rounded-full bg-primary p-1">
                      <Camera className="h-4 w-4 text-white" />
                      <input
                        type="file"
                        className="absolute inset-0 cursor-pointer opacity-0"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleAvatarChange}
                        aria-label="Upload profile picture"
                      />
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">Click the camera icon to change your profile picture</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      name="name"
                      value={member.name}
                      onChange={handleChange}
                      required
                      aria-required="true"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={member.email}
                      onChange={handleChange}
                      required
                      aria-required="true"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    name="bio"
                    value={member.bio ?? ""}
                    onChange={handleChange}
                    className="min-h-[100px]"
                    placeholder="Tell us about yourself..."
                  />
                </div>

                <div className="flex justify-end gap-4">
                  <Button type="button" variant="outline" onClick={() => setIsEditing(false)} disabled={isSaving}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-primary hover:bg-primary/80" disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="mb-6 flex flex-col items-center">
                  <Avatar className="h-36 w-36 rounded-full border-2 border-primary/80 overflow-hidden">
                    <AvatarImage
                      className="h-full w-full object-cover"
                      src={member.avatar_url || "/Images/placeholder.jpg"}
                      alt={member.name}
                    />
                    <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Full Name</h3>
                    <p className="mt-1">{member.name}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Email</h3>
                    <p className="mt-1">{member.email}</p>
                  </div>
                </div>

                {member.bio && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Bio</h3>
                    <p className="mt-1">{member.bio}</p>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-medium text-gray-500">Joined</h3>
                  <p className="mt-1">{new Date(member.join_date).toLocaleDateString()}</p>
                </div>

                <div className="mt-8 space-y-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-2xl font-bold">My Support Services ({supportServices.length})</h2>
                    <Button asChild size="sm" variant="outline">
                      <Link to="/support/apply">Submit new application</Link>
                    </Button>
                  </div>

                  {supportLoading ? (
                    <div className="flex justify-center py-6">
                      <Loading />
                    </div>
                  ) : supportServices.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      {supportServices.map((service) => (
                        <div key={service.id} className="rounded-lg border bg-card p-4 shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="text-lg font-semibold text-foreground">{service.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {service.title || service.specialization || "Professional"}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Badge variant={statusVariant(service.status)}>{humanizeType(service.status)}</Badge>
                              <Badge variant="outline">{humanizeType(service.availability)}</Badge>
                              {service.verified && <Badge variant="secondary">Verified</Badge>}
                            </div>
                          </div>

                          <p className="mt-3 text-sm text-muted-foreground line-clamp-3">
                            {service.description || "No description provided yet."}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <span>{humanizeType(service.type)}</span>
                            {service.languages.length > 0 && (
                              <span>Languages: {service.languages.join(", ")}</span>
                            )}
                          </div>

                          <div className="mt-3 text-xs text-muted-foreground">
                            Last updated {new Date(service.updated_at).toLocaleString()}
                          </div>

                          <div className="mt-4 flex items-center justify-between">
                            <div className="text-xs text-muted-foreground">
                              Contact: {service.contact.email || "—"} | {service.contact.phone || "—"}
                            </div>
                            <Button size="sm" variant="outline" onClick={() => openSupportDialog(service)}>
                              Manage listing
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                      <p>You haven't submitted any support services yet.</p>
                      <Button asChild className="mt-3">
                        <Link to="/support/apply">Apply to become a support provider</Link>
                      </Button>
                    </div>
                  )}
                </div>

                <div className="mt-8">
                  <h2 className="mb-4 text-2xl font-bold">My Stories ({stories.length})</h2>
                  {stories.length > 0 ? (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                      {stories.map((story) => (
                        <StoryCard key={story.id} story={story} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500">
                      You haven't submitted any stories yet.{" "}
                      <Button asChild variant="link" className="p-0 text-primary">
                        <Link to="/stories">Submit one now!</Link>
                      </Button>
                    </p>
                  )}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
      <Dialog open={supportDialogOpen} onOpenChange={(open) => { if (!open) closeSupportDialog(); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Support Service</DialogTitle>
          </DialogHeader>
          {selectedService && serviceForm ? (
            <div className="space-y-5">
              {supportError && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {supportError}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="support-name">Service Name</Label>
                  <Input
                    id="support-name"
                    value={serviceForm.name}
                    onChange={(e) => handleServiceFormChange("name", e.target.value)}
                    placeholder="Safe Haven Counseling"
                    disabled={serviceSaving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="support-type">Service Type</Label>
                  <Select
                    value={serviceForm.type}
                    onValueChange={(value) => handleServiceFormChange("type", value as ServiceType)}
                    disabled={serviceSaving}
                  >
                    <SelectTrigger id="support-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICE_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {humanizeType(type)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="support-title">Professional Title</Label>
                  <Input
                    id="support-title"
                    value={serviceForm.title}
                    onChange={(e) => handleServiceFormChange("title", e.target.value)}
                    placeholder="Licensed Therapist"
                    disabled={serviceSaving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="support-specialization">Specialization</Label>
                  <Input
                    id="support-specialization"
                    value={serviceForm.specialization}
                    onChange={(e) => handleServiceFormChange("specialization", e.target.value)}
                    placeholder="Trauma-informed care"
                    disabled={serviceSaving}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="support-description">Description</Label>
                <Textarea
                  id="support-description"
                  value={serviceForm.description}
                  onChange={(e) => handleServiceFormChange("description", e.target.value)}
                  className="min-h-[120px]"
                  placeholder="Describe the services you provide, including who you support and how to get help."
                  disabled={serviceSaving}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="support-availability">Availability</Label>
                  <Select
                    value={serviceForm.availability}
                    onValueChange={(value) => handleServiceFormChange("availability", value as AvailabilityType)}
                    disabled={serviceSaving}
                  >
                    <SelectTrigger id="support-availability">
                      <SelectValue placeholder="Select availability" />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICE_AVAILABILITY.map((option) => (
                        <SelectItem key={option} value={option}>
                          {humanizeType(option)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="support-website">Website</Label>
                  <Input
                    id="support-website"
                    value={serviceForm.website}
                    onChange={(e) => handleServiceFormChange("website", e.target.value)}
                    placeholder="https://example.com"
                    disabled={serviceSaving}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="support-address">Address</Label>
                  <Input
                    id="support-address"
                    value={serviceForm.address}
                    onChange={(e) => handleServiceFormChange("address", e.target.value)}
                    placeholder="123 Safe Street, Freetown"
                    disabled={serviceSaving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="support-phone">Phone</Label>
                  <Input
                    id="support-phone"
                    value={serviceForm.phone}
                    onChange={(e) => handleServiceFormChange("phone", e.target.value)}
                    placeholder="+23270000000"
                    disabled={serviceSaving}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="support-email">Contact Email</Label>
                <Input
                  id="support-email"
                  type="email"
                  value={serviceForm.email}
                  onChange={(e) => handleServiceFormChange("email", e.target.value)}
                  placeholder="contact@example.com"
                  disabled={serviceSaving}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="support-languages">Languages</Label>
                  <Input
                    id="support-languages"
                    value={serviceForm.languages}
                    onChange={(e) => handleServiceFormChange("languages", e.target.value)}
                    placeholder="English, Krio"
                    disabled={serviceSaving}
                  />
                  <p className="text-xs text-muted-foreground">Separate languages with commas.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="support-tags">Tags</Label>
                  <Input
                    id="support-tags"
                    value={serviceForm.tags}
                    onChange={(e) => handleServiceFormChange("tags", e.target.value)}
                    placeholder="trauma, legal-aid"
                    disabled={serviceSaving}
                  />
                  <p className="text-xs text-muted-foreground">Keywords help survivors find you.</p>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={closeSupportDialog} disabled={serviceSaving}>
                  Cancel
                </Button>
                <Button onClick={handleSupportSave} disabled={serviceSaving}>
                  {serviceSaving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex justify-center py-10">
              <Loading />
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Footer />
    </>
  );
};

export default Profile;
