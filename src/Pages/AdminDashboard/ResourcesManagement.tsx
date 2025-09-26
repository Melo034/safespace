// src/components/admin/ResourcesManagement.tsx
import { useEffect, useState } from "react";
import supabase from "@/server/supabase";
import { AppSidebar } from "@/components/utils/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, Image as ImageIcon, Globe, Edit, Trash, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useAdminSession } from "@/hooks/useAdminSession";
import AdminHeader from "@/components/admin/AdminHeader";

/* ---------- DB-aligned types & constants ---------- */
const VALID_CATEGORIES = [
  "safety-planning",
  "legal-aid",
  "counseling",
  "emergency",
  "education",
] as const;
type CategoryType = (typeof VALID_CATEGORIES)[number];

type ResourceTypeDB = "pdf" | "website";

type DbResourceRow = {
  id: string;
  title: string | null;
  category: string | null;
  description: string | null;
  type: ResourceTypeDB | null;
  url: string | null;
  image: string | null;         // keep column name `image` to match DB
  tags: string[] | null;
  downloads: number | null;
  views: number | null;
  is_verified: boolean | null;
};

type UiResource = {
  id: string;
  title: string;
  category: CategoryType | ""; // keep empty string if unknown
  description: string;
  type: ResourceTypeDB;
  url: string;
  image: string;
  tags: string[];
  downloads: number;
  views: number;
  is_verified: boolean;
};

const toUi = (r: DbResourceRow): UiResource => ({
  id: r.id,
  title: r.title ?? "",
  category: ((r.category ?? "") as CategoryType | ""),
  description: r.description ?? "",
  type: (r.type ?? "website") as ResourceTypeDB,
  url: r.url ?? "",
  image: r.image ?? "",
  tags: Array.isArray(r.tags) ? r.tags : [],
  downloads: Number(r.downloads ?? 0),
  views: Number(r.views ?? 0),
  is_verified: !!r.is_verified,
});

const RESOURCES_BUCKET = "resources"; // single bucket; we store under pdfs/ and images/

/* ---------- Component ---------- */
const ResourcesManagement = () => {
  const { loading: sessionLoading } = useAdminSession();

  const [resources, setResources] = useState<UiResource[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentResource, setCurrentResource] = useState<UiResource | null>(null);
  const [formData, setFormData] = useState<Partial<UiResource>>({
    title: "",
    category: "",
    description: "",
    type: "website",
    url: "",
    image: "",
    tags: [],
    is_verified: false,
    downloads: 0,
    views: 0,
  });
  const [file, setFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [docProgress, setDocProgress] = useState<number>(0);
  const [imgProgress, setImgProgress] = useState<number>(0);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      const { data, error } = await supabase
        .from("resources")
        .select(
          [
            "id",
            "title",
            "category",
            "description",
            "type",
            "url",
            "image",
            "tags",
            "downloads",
            "views",
            "is_verified",
          ].join(",")
        )
        .order("title", { ascending: true });

      if (error) {
        console.error(error);
        toast.error("Failed to load resources.");
        return;
      }
      if (!alive) return;
      setResources(
        Array.isArray(data) && data.every((item) => typeof item === "object" && item !== null && "id" in item)
          ? (data as DbResourceRow[]).map(toUi)
          : []
      );
    };

    if (!sessionLoading) load();

    // realtime
    const sub = supabase
      .channel("resources_changes_rm")
      .on("postgres_changes", { event: "*", schema: "public", table: "resources" }, (payload) => {
        if (payload.eventType === "DELETE") {
          const delId = (payload.old as { id?: string } | null)?.id;
          if (!delId) return;
          setResources((prev) => prev.filter((x) => x.id !== delId));
          return;
        }

        const r = payload.new as Partial<DbResourceRow> | null;
        if (!r || !r.id) return;

        const safe: UiResource = toUi({
          id: r.id,
          title: (r.title ?? "") as string,
          category: (r.category ?? "") as string,
          description: (r.description ?? "") as string,
          type: (r.type ?? "website") as ResourceTypeDB,
          url: (r.url ?? "") as string,
          image: (r.image ?? "") as string,
          tags: (Array.isArray(r.tags) ? r.tags : []) as string[],
          downloads: Number(r.downloads ?? 0),
          views: Number(r.views ?? 0),
          is_verified: !!r.is_verified,
        });

        if (payload.eventType === "INSERT") {
          setResources((prev) => [safe, ...prev]);
        } else if (payload.eventType === "UPDATE") {
          setResources((prev) => prev.map((x) => (x.id === safe.id ? safe : x)));
        }
      })
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(sub);
    };
  }, [sessionLoading]);

  /* ---------- file handlers ---------- */
  const handleDocFile = (files: FileList | null) => {
    const f = files?.[0] ?? null;
    if (!f) {
      setFile(null);
      return;
    }
    if (f.type !== "application/pdf") {
      toast.error("Only PDF files are allowed.");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      toast.error("PDF must be less than 5MB.");
      return;
    }
    setFile(f);
  };

  const handleImageFile = (files: FileList | null) => {
    const f = files?.[0] ?? null;
    if (!f) {
      setImageFile(null);
      return;
    }
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(f.type)) {
      toast.error("Image must be JPEG, PNG, or WEBP.");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB.");
      return;
    }
    setImageFile(f);
  };

  /* ---------- storage helpers ---------- */
  const uploadToBucket = async (prefix: "pdfs" | "images", f: File) => {
    const safeName = f.name.replace(/[^\w.-]/g, "_");
    const path = `${prefix}/${Date.now()}_${safeName}`;
    const { data, error } = await supabase.storage
      .from(RESOURCES_BUCKET)
      .upload(path, f, { cacheControl: "3600", upsert: false });
    if (error) throw error;
    const { data: pub } = supabase.storage.from(RESOURCES_BUCKET).getPublicUrl(data.path);
    return pub.publicUrl;
  };

  const uploadFile = async (
    prefix: "pdfs" | "images",
    f: File,
    setProgress?: (n: number) => void
  ) => {
    try {
      setProgress?.(10);
    } catch {
      // ignore progress errors
    }
    const url = await uploadToBucket(prefix, f);
    try {
      setProgress?.(100);
    } catch {
      // ignore progress errors
    }
    return url;
  };

  /* ---------- create / update ---------- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // required fields
    if (!formData.title || !formData.category || !formData.description) {
      toast.error("Fill all required fields.");
      return;
    }
    if (!VALID_CATEGORIES.includes(formData.category as CategoryType)) {
      toast.error("Invalid category.");
      return;
    }
    if (formData.type === "website" && !formData.url) {
      toast.error("Website URL required.");
      return;
    }
    if (formData.type === "pdf" && !file) {
      toast.error("Upload a PDF.");
      return;
    }

    setBusy(true);
    try {
      // upload doc or image if present
      let url = formData.url || "";
      if (formData.type === "pdf" && file) {
        setDocProgress(0);
        url = await uploadFile("pdfs", file, setDocProgress);
      }

      let imageUrl = formData.image || "";
      if (imageFile) {
        setImgProgress(0);
        imageUrl = await uploadFile("images", imageFile, setImgProgress);
      } else if (!imageUrl) {
        imageUrl = "/placeholder-image.png";
      }

      // payload aligned with DB columns
      const payload: Omit<DbResourceRow, "id"> = {
        title: (formData.title || "").trim(),
        category: (formData.category || "").trim(),
        description: (formData.description || "").trim(),
        type: (formData.type || "website") as ResourceTypeDB,
        url,
        image: imageUrl,
        tags: Array.isArray(formData.tags)
          ? (formData.tags as string[]).map((t) => t.trim()).filter(Boolean)
          : [],
        is_verified: !!formData.is_verified,
        downloads:
          (formData.type === "pdf" ? Number(formData.downloads ?? 0) : 0) || 0,
        views:
          (formData.type === "website" ? Number(formData.views ?? 0) : 0) || 0,
      };

      if (isEditing && currentResource) {
        const { error } = await supabase.from("resources").update(payload).eq("id", currentResource.id);
        if (error) throw error;
        toast.success("Resource updated.");
      } else {
        const { error } = await supabase.from("resources").insert([payload]);
        if (error) throw error;
        toast.success("Resource added.");
      }

      resetForm();
    } catch (err) {
      console.error(err);
      const msg =
        (typeof err === "object" &&
          err &&
          ("message" in err
            ? (err as { message: string }).message
            : "details" in err
            ? (err as { details: string }).details
            : null)) ||
        "Submit failed.";
      toast.error(String(msg));
    } finally {
      setBusy(false);
      setTimeout(() => {
        setDocProgress(0);
        setImgProgress(0);
      }, 500);
    }
  };

  /* ---------- edit / delete / verify ---------- */
  const handleEdit = (r: UiResource) => {
    setIsEditing(true);
    setCurrentResource(r);
    setFormData({
      title: r.title,
      category: r.category,
      description: r.description,
      type: r.type,
      url: r.url,
      image: r.image,
      tags: r.tags,
      is_verified: r.is_verified,
      downloads: r.downloads,
      views: r.views,
    });
    setFile(null);
    setImageFile(null);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this resource")) return;
    try {
      setBusy(true);
      const { error } = await supabase.from("resources").delete().eq("id", id);
      if (error) throw error;
      toast.success("Resource deleted.");
    } catch (err) {
      console.error(err);
      toast.error("Delete failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleToggleVerify = async (id: string, is_verified: boolean) => {
    try {
      setBusy(true);
      const { error } = await supabase.from("resources").update({ is_verified: !is_verified }).eq("id", id);
      if (error) throw error;
      toast.success(is_verified ? "Unverified." : "Verified.");
    } catch (err) {
      console.error(err);
      toast.error("Update failed.");
    } finally {
      setBusy(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      category: "",
      description: "",
      type: "website",
      url: "",
      image: "",
      tags: [],
      is_verified: false,
      downloads: 0,
      views: 0,
    });
    setFile(null);
    setImageFile(null);
    setIsEditing(false);
    setCurrentResource(null);
  };

  const typeBadgeVariant = (t: ResourceTypeDB): "destructive" | "default" =>
    t === "pdf" ? "destructive" : "default";

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AdminHeader
          breadcrumb={[
            { href: "/admin-dashboard", label: "Admin Dashboard" },
            { label: "Resources Management" },
          ]}
        />

        <div className="p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Resources Management</h1>
            <p className="text-sm text-muted-foreground">Add, edit, or remove resources available to users</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {(() => {
              const total = resources.length;
              const websites = resources.filter((r) => r.type === "website").length;
              const pdfs = resources.filter((r) => r.type === "pdf").length;
              const verified = resources.filter((r) => r.is_verified).length;
              const plural = (n: number, s: string, p: string) => (n === 1 ? s : p);
              const stats = [
                { title: plural(total, "Resource", "Resources"), value: total, description: total === 0 ? "No resources yet" : `${total} total resources`, icon: Globe, bgColor: "bg-slate-100", color: "text-slate-600" },
                { title: plural(websites, "Website", "Websites"), value: websites, description: websites === 0 ? "No websites" : `${websites} websites`, icon: Globe, bgColor: "bg-blue-100", color: "text-blue-600" },
                { title: plural(pdfs, "PDF", "PDFs"), value: pdfs, description: pdfs === 0 ? "No PDFs" : `${pdfs} PDFs`, icon: FileText, bgColor: "bg-orange-100", color: "text-orange-600" },
                { title: "Verified", value: verified, description: verified === 0 ? "Not verified yet" : `${verified} verified`, icon: CheckCircle, bgColor: "bg-green-100", color: "text-green-600" },
              ];
              return stats.map((s) => (
                <Card key={s.title} className="group relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-background to-muted/40 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                  <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-primary/10 blur-2xl transition group-hover:bg-primary/20" />
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground tracking-wider uppercase">{s.title}</CardTitle>
                    <div className={`h-9 w-9 rounded-full ${s.bgColor} flex items-center justify-center ring-1 ring-border/40`}>
                      <s.icon className={`h-4 w-4 ${s.color}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-semibold tracking-tight text-foreground">{s.value}</div>
                    <p className="mt-1 text-xs text-muted-foreground">{s.description}</p>
                  </CardContent>
                </Card>
              ));
            })()}
          </div>

          {/* Category stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {VALID_CATEGORIES.map((cat) => {
              const value = resources.filter((r) => r.category === cat).length;
              return (
                <Card key={cat} className="rounded-xl border border-border/60 bg-gradient-to-br from-background to-muted/30 shadow-sm">
                  <CardContent className="p-4">
                    <div className="text-sm font-medium text-muted-foreground mb-1">{cat.replace("-", " ")}</div>
                    <div className="text-2xl font-semibold text-foreground">{value}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Form */}
          <Card className="rounded-xl border border-border/60 bg-gradient-to-br from-background to-muted/40 shadow-sm">
            <CardHeader>
              <CardTitle>{isEditing ? "Edit Resource" : "Add New Resource"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="title" className="text-sm font-medium">Title *</label>
                    <Input
                      id="title"
                      placeholder="Resource title"
                      value={formData.title || ""}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                      disabled={busy}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Category *</label>
                    <Select
                      value={formData.category || ""}
                      onValueChange={(v) => setFormData({ ...formData, category: v as CategoryType })}
                      disabled={busy}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {VALID_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c.replace("-", " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Description *</label>
                  <Textarea
                    placeholder="Short description"
                    value={formData.description || ""}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                    disabled={busy}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Type *</label>
                    <Select
                      value={formData.type || "website"}
                      onValueChange={(v) => setFormData({ ...formData, type: v as ResourceTypeDB })}
                      disabled={busy}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">PDF</SelectItem>
                        <SelectItem value="website">Website</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {formData.type === "pdf" ? "Upload PDF *" : "Website URL *"}
                    </label>
                    {formData.type === "pdf" ? (
                      <div className="group relative flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 p-6 text-center transition-colors hover:bg-muted/30">
                        <FileText className="mb-2 h-6 w-6 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          {file ? (
                            <span className="text-foreground font-medium">{file.name}</span>
                          ) : (
                            <>Click to select or drag &amp; drop a PDF</>
                          )}
                        </p>
                        <input
                          type="file"
                          accept="application/pdf"
                          className="absolute inset-0 cursor-pointer opacity-0"
                          onChange={(e) => handleDocFile(e.target.files)}
                          disabled={busy}
                        />
                        {busy && formData.type === "pdf" && file && (
                          <div className="mt-3 w-full">
                            <Progress value={docProgress} />
                          </div>
                        )}
                      </div>
                    ) : (
                      <Input
                        placeholder="https://..."
                        value={formData.url || ""}
                        onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                        required
                        disabled={busy}
                      />
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {formData.type === "pdf" ? "Image Upload (optional)" : "Image Upload *"}
                  </label>
                  <div className="group relative flex items-center gap-4 rounded-xl border border-dashed border-border/60 bg-muted/20 p-4 transition-colors hover:bg-muted/30">
                    <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-md ring-1 ring-border/40">
                      {imageFile ? (
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-ignore: createObjectURL available in browser
                        <img src={URL.createObjectURL(imageFile)} alt="preview" className="h-full w-full object-cover" />
                      ) : formData.image ? (
                        <img src={formData.image} alt="current" className="h-full w-full object-cover" />
                      ) : (
                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">
                        {imageFile ? (
                          <span className="text-foreground font-medium">{imageFile.name}</span>
                        ) : (
                          <>Click to select or drag &amp; drop an image (PNG/JPG/WEBP)</>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">Max 5MB</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="absolute inset-0 cursor-pointer opacity-0"
                      onChange={(e) => handleImageFile(e.target.files)}
                      disabled={busy}
                    />
                    {busy && (imageFile || formData.image) && (
                      <div className="absolute left-0 right-0 bottom-0 p-4">
                        <Progress value={imgProgress} />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Tags (comma-separated)</label>
                  <Input
                    placeholder="safety, legal, support"
                    value={Array.isArray(formData.tags) ? (formData.tags as string[]).join(", ") : ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean),
                      })
                    }
                    disabled={busy}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_verified"
                    className="accent-primary"
                    checked={!!formData.is_verified}
                    onChange={(e) => setFormData({ ...formData, is_verified: e.target.checked })}
                    disabled={busy}
                  />
                  <label htmlFor="is_verified" className="text-sm font-medium">Verified</label>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={busy}>
                    {busy ? "Submitting..." : isEditing ? "Update Resource" : "Add Resource"}
                  </Button>
                  {isEditing && (
                    <Button type="button" variant="outline" onClick={resetForm} disabled={busy}>
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Table */}
          <Card className="rounded-xl border border-border/60 bg-gradient-to-br from-background to-muted/40 shadow-sm">
            <CardHeader>
              <CardTitle>Manage Resources</CardTitle>
            </CardHeader>
            <CardContent>
              {busy && resources.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">Loading resources...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Metrics</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resources.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium text-foreground">{r.title}</TableCell>
                        <TableCell>{(r.category || "").replace("-", " ")}</TableCell>
                        <TableCell>
                          <Badge variant={typeBadgeVariant(r.type)}>
                            {r.type === "pdf" ? <FileText className="h-3 w-3 mr-1" /> : <Globe className="h-3 w-3 mr-1" />}
                            {r.type.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={r.is_verified ? "bg-green-500 text-white" : ""}>
                            {r.is_verified ? "Verified" : "Pending"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {r.type === "pdf" ? `${r.downloads} downloads` : `${r.views} views`}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-full"
                              onClick={() => handleEdit(r)}
                              disabled={busy}
                              aria-label={`Edit ${r.title}`}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-full"
                              onClick={() => handleToggleVerify(r.id, r.is_verified)}
                              disabled={busy}
                              aria-label={r.is_verified ? `Unverify ${r.title}` : `Verify ${r.title}`}
                            >
                              {r.is_verified ? <XCircle className="h-4 w-4 mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                              {r.is_verified ? "Unverify" : "Verify"}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="rounded-full"
                              onClick={() => handleDelete(r.id)}
                              disabled={busy}
                              aria-label={`Delete ${r.title}`}
                            >
                              <Trash className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {!busy && resources.length === 0 && (
                <div className="text-center py-10 text-muted-foreground">No resources found.</div>
              )}
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default ResourcesManagement;
