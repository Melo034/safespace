import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import supabase from "@/server/supabase";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import Sidebar from "../Components/Sidebar";
import  Navbar  from "@/components/utils/Navbar";
import { Footer } from "@/components/utils/Footer";
import Loading from "@/components/utils/Loading";
import StoryCard from "../Components/story-card";
import type { Story } from "@/lib/types";

type CommunityMember = {
  user_id: string;
  name: string;
  email: string | null;
  avatar_url: string | null;
  bio: string | null;
  stories_count: number;
  join_date: string;
};

type CommunityMemberRow = {
  user_id: string;
  name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  stories_count?: number | null;
  join_date?: string | Date | null;
};

function mapRowToMember(row: CommunityMemberRow): CommunityMember {
  return {
    user_id: row.user_id,
    name: row.name ?? "Anonymous User",
    email: row.email ?? "",
    avatar_url: row.avatar_url ?? null,
    bio: row.bio ?? null,
    stories_count: row.stories_count ?? 0,
    join_date:
      typeof row.join_date === "string"
        ? row.join_date
        : row.join_date instanceof Date
        ? row.join_date.toISOString()
        : new Date().toISOString(),
  };
};

interface StoryRow {
  id: string | number;
  title?: string | null;
  content?: string | null;
  author_id?: string | null;
  created_at?: string | null;
  tags?: unknown;
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
    tags: Array.isArray(row.tags as string[]) ? (row.tags as string[]) : [],
    featured: false,
  } as Story;
}

const Profile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [member, setMember] = useState<CommunityMember | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
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

        // 1) Get or create community member profile
        const { data: profileRow, error: profileErr } = await supabase
          .from("community_members")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();
        if (profileErr) throw profileErr;

        let currentMember: CommunityMember;
        if (!profileRow) {
          const newRow = {
            user_id: user.id,
            name: user.user_metadata?.name || "Anonymous User",
            email: user.email ?? null,
            avatar_url: user.user_metadata?.avatar_url ?? null,
            bio: null,
            stories_count: 0,
            join_date: new Date().toISOString(),
          };
          const { data: inserted, error: insertErr } = await supabase
            .from("community_members")
            .insert(newRow)
            .select()
            .single();
          if (insertErr) throw insertErr;
          currentMember = mapRowToMember(inserted);
        } else {
          currentMember = mapRowToMember(profileRow);
        }
        setMember(currentMember);

        // 2) Fetch member's stories
        const { data: storiesRows, error: storiesErr } = await supabase
          .from("stories").select("id,title,content,author_id,created_at,tags")
          .eq("author_id", user.id)
          .order("created_at", { ascending: false });
        if (storiesErr) throw storiesErr;

        const userStories = (storiesRows ?? []).map(mapRowToStory);
        setStories(userStories);

        // 3) Update stories_count if changed
        if ((currentMember.stories_count ?? 0) !== userStories.length) {
          await supabase
            .from("community_members")
            .update({ stories_count: userStories.length })
            .eq("user_id", user.id);
          setMember((prev) => (prev ? { ...prev, stories_count: userStories.length } as CommunityMember : prev));
        }
      } catch (err) {
        console.error("Error loading profile:", err);
        setError("Failed to load profile. Please try again.");
        toast.error("Failed to load profile. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setMember((prev) => (prev ? { ...prev, [name]: value } as CommunityMember : prev));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setAvatarFile(e.target.files[0]);
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

        const path = `avatars/${user.id}/${Date.now()}_${avatarFile.name}`;
        const { error: uploadErr } = await supabase.storage.from("avatars").upload(path, avatarFile, {
          cacheControl: "3600",
          upsert: false,
        });
        if (uploadErr) throw uploadErr;

        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
        avatarUrl = urlData.publicUrl;
      }

      const payload = {
        name: (member.name || "").trim(),
        email: (member.email || "anonymous@example.com").trim(),
        avatar_url: avatarUrl,
        bio: (member.bio || "")?.trim() || null,
      };

      const { error: updateErr } = await supabase
        .from("community_members")
        .update(payload)
        .eq("user_id", member.user_id);

      if (updateErr) throw updateErr;

      setMember((prev) => (prev ? { ...prev, ...payload } as CommunityMember : prev));
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
      <div className="py-20 sm:py-32 container mx-auto px-4 md:px-6 max-w-6xl">
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
                      value={member.email ?? ""}
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
      <Footer />
    </>
  );
};

export default Profile;
