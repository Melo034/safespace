import { AppSidebar } from "@/components/utils/app-sidebar"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar"
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Edit, Trash2, Eye, Filter, FileText, Link as LinkIcon, Video, Download } from "lucide-react";
import {toast} from "sonner";

interface Resource {
    id: string;
    title: string;
    description: string;
    type: "document" | "video" | "link" | "download";
    url: string;
    category: string;
    status: "active" | "inactive";
    downloads: number;
    views: number;
    createdAt: string;
    updatedAt: string;
}

const ResourcesManagement = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [filterType, setFilterType] = useState<string>("all");
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        type: "document" as Resource["type"],
        url: "",
        category: "",
        status: "active" as Resource["status"]
    });

    const [resources, setResources] = useState<Resource[]>([
        {
            id: "1",
            title: "Safety Guidelines PDF",
            description: "Comprehensive safety guidelines for emergency situations",
            type: "document",
            url: "/docs/safety-guidelines.pdf",
            category: "Safety",
            status: "active",
            downloads: 245,
            views: 567,
            createdAt: "2024-01-15",
            updatedAt: "2024-01-20"
        },
        {
            id: "2",
            title: "Emergency Response Training Video",
            description: "Step-by-step emergency response training for first responders",
            type: "video",
            url: "https://example.com/training-video",
            category: "Training",
            status: "active",
            downloads: 89,
            views: 234,
            createdAt: "2024-01-10",
            updatedAt: "2024-01-15"
        },
        {
            id: "3",
            title: "Mental Health Resources",
            description: "Links to mental health support and counseling services",
            type: "link",
            url: "https://mentalhealth.org",
            category: "Support",
            status: "inactive",
            downloads: 0,
            views: 123,
            createdAt: "2024-01-05",
            updatedAt: "2024-01-10"
        }
    ]);

    const filteredResources = resources.filter(resource => {
        const matchesSearch = resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            resource.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            resource.category.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === "all" || resource.status === filterStatus;
        const matchesType = filterType === "all" || resource.type === filterType;

        return matchesSearch && matchesStatus && matchesType;
    });

    const handleAddResource = () => {
        const newResource: Resource = {
            id: Date.now().toString(),
            ...formData,
            downloads: 0,
            views: 0,
            createdAt: new Date().toISOString().split('T')[0],
            updatedAt: new Date().toISOString().split('T')[0]
        };

        setResources([...resources, newResource]);
        setIsAddDialogOpen(false);
        resetForm();
        toast("Success",{
            description: "Resource added successfully"
        });
    };

    const handleEditResource = () => {
        if (!selectedResource) return;

        const updatedResources = resources.map(resource =>
            resource.id === selectedResource.id
                ? { ...resource, ...formData, updatedAt: new Date().toISOString().split('T')[0] }
                : resource
        );

        setResources(updatedResources);
        setIsEditDialogOpen(false);
        resetForm();
        toast("Success",{
            description: "Resource updated successfully"
        });
    };

    const handleDeleteResource = (id: string) => {
        setResources(resources.filter(resource => resource.id !== id));
        toast( "Success",{
            description: "Resource deleted successfully"
        });
    };

    const handleViewResource = (resource: Resource) => {
        setSelectedResource(resource);
        setIsViewDialogOpen(true);
    };

    const handleEditClick = (resource: Resource) => {
        setSelectedResource(resource);
        setFormData({
            title: resource.title,
            description: resource.description,
            type: resource.type,
            url: resource.url,
            category: resource.category,
            status: resource.status
        });
        setIsEditDialogOpen(true);
    };

    const resetForm = () => {
        setFormData({
            title: "",
            description: "",
            type: "document",
            url: "",
            category: "",
            status: "active"
        });
        setSelectedResource(null);
    };

    const getResourceIcon = (type: Resource["type"]) => {
        switch (type) {
            case "document": return <FileText className="h-4 w-4" />;
            case "video": return <Video className="h-4 w-4" />;
            case "link": return <LinkIcon className="h-4 w-4" />;
            case "download": return <Download className="h-4 w-4" />;
            default: return <FileText className="h-4 w-4" />;
        }
    };

    const getStatusColor = (status: Resource["status"]) => {
        return status === "active" ? "bg-green-500" : "bg-red-500";
    };
    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2 border-b">
                    <div className="flex items-center gap-2 px-3">
                        <SidebarTrigger />
                        <Separator orientation="vertical" className="mr-2 h-4" />
                        <Breadcrumb>
                            <BreadcrumbList>
                                <BreadcrumbItem className="hidden md:block">
                                    <BreadcrumbLink href="/admin-dashboard">
                                        Admin Dashboard
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator className="hidden md:block" />
                                <BreadcrumbItem>
                                    <BreadcrumbPage className="font-medium">Resources Management</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>
                    <div className="flex-1 flex justify-end pr-4">
                        <img src="/path/to/admin-avatar.png" alt="Admin Avatar" className="w-8 h-8 rounded-full" />
                        <span className="ml-2 text-sm text-muted-foreground">Admin Name</span>
                    </div>
                </header>
                <div className="p-6 space-y-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold">Resources Management</h1>
                            <p className="text-muted-foreground">Manage educational resources and materials</p>
                        </div>
                        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                            <DialogTrigger asChild>
                                <Button onClick={() => setIsAddDialogOpen(true)}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Resource
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Add New Resource</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                    <Input
                                        placeholder="Resource title"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    />
                                    <Textarea
                                        placeholder="Description"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    />
                                    <Select value={formData.type} onValueChange={(value: Resource["type"]) => setFormData({ ...formData, type: value })}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="document">Document</SelectItem>
                                            <SelectItem value="video">Video</SelectItem>
                                            <SelectItem value="link">Link</SelectItem>
                                            <SelectItem value="download">Download</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Input
                                        placeholder="URL"
                                        value={formData.url}
                                        onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                    />
                                    <Input
                                        placeholder="Category"
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    />
                                    <Select value={formData.status} onValueChange={(value: Resource["status"]) => setFormData({ ...formData, status: value })}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="active">Active</SelectItem>
                                            <SelectItem value="inactive">Inactive</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Button onClick={handleAddResource} className="w-full">Add Resource</Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Resources Overview</CardTitle>
                            <div className="flex gap-4 items-center">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search resources..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                                <Select value={filterStatus} onValueChange={setFilterStatus}>
                                    <SelectTrigger className="w-32">
                                        <Filter className="h-4 w-4 mr-2" />
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="inactive">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Select value={filterType} onValueChange={setFilterType}>
                                    <SelectTrigger className="w-32">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Types</SelectItem>
                                        <SelectItem value="document">Document</SelectItem>
                                        <SelectItem value="video">Video</SelectItem>
                                        <SelectItem value="link">Link</SelectItem>
                                        <SelectItem value="download">Download</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Title</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Views</TableHead>
                                        <TableHead>Downloads</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredResources.map((resource) => (
                                        <TableRow key={resource.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {getResourceIcon(resource.type)}
                                                    <div>
                                                        <p className="font-medium">{resource.title}</p>
                                                        <p className="text-sm text-muted-foreground truncate max-w-xs">
                                                            {resource.description}
                                                        </p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="capitalize">
                                                    {resource.type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{resource.category}</TableCell>
                                            <TableCell>
                                                <Badge className={getStatusColor(resource.status)}>
                                                    {resource.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{resource.views}</TableCell>
                                            <TableCell>{resource.downloads}</TableCell>
                                            <TableCell>
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleViewResource(resource)}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleEditClick(resource)}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleDeleteResource(resource.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* Edit Dialog */}
                    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>Edit Resource</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <Input
                                    placeholder="Resource title"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                />
                                <Textarea
                                    placeholder="Description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                                <Select value={formData.type} onValueChange={(value: Resource["type"]) => setFormData({ ...formData, type: value })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="document">Document</SelectItem>
                                        <SelectItem value="video">Video</SelectItem>
                                        <SelectItem value="link">Link</SelectItem>
                                        <SelectItem value="download">Download</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Input
                                    placeholder="URL"
                                    value={formData.url}
                                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                />
                                <Input
                                    placeholder="Category"
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                />
                                <Select value={formData.status} onValueChange={(value: Resource["status"]) => setFormData({ ...formData, status: value })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="inactive">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button onClick={handleEditResource} className="w-full">Update Resource</Button>
                            </div>
                        </DialogContent>
                    </Dialog>

                    {/* View Dialog */}
                    <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>Resource Details</DialogTitle>
                            </DialogHeader>
                            {selectedResource && (
                                <div className="space-y-4">
                                    <div>
                                        <h3 className="font-semibold">{selectedResource.title}</h3>
                                        <p className="text-sm text-muted-foreground mt-2">{selectedResource.description}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="font-medium">Type:</span>
                                            <Badge variant="outline" className="ml-2 capitalize">
                                                {selectedResource.type}
                                            </Badge>
                                        </div>
                                        <div>
                                            <span className="font-medium">Category:</span>
                                            <span className="ml-2">{selectedResource.category}</span>
                                        </div>
                                        <div>
                                            <span className="font-medium">Status:</span>
                                            <Badge className={`ml-2 ${getStatusColor(selectedResource.status)}`}>
                                                {selectedResource.status}
                                            </Badge>
                                        </div>
                                        <div>
                                            <span className="font-medium">Views:</span>
                                            <span className="ml-2">{selectedResource.views}</span>
                                        </div>
                                        <div>
                                            <span className="font-medium">Downloads:</span>
                                            <span className="ml-2">{selectedResource.downloads}</span>
                                        </div>
                                        <div>
                                            <span className="font-medium">Created:</span>
                                            <span className="ml-2">{selectedResource.createdAt}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <span className="font-medium">URL:</span>
                                        <p className="text-sm text-muted-foreground mt-1 break-all">{selectedResource.url}</p>
                                    </div>
                                </div>
                            )}
                        </DialogContent>
                    </Dialog>
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}

export default ResourcesManagement