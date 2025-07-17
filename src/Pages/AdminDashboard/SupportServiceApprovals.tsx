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
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    Plus, Search, Filter, Edit, Trash2, Eye, CheckCircle,
    MapPin, Phone, Mail, Globe, Star, Scale, Heart, Shield, Users
} from "lucide-react"

const mockSupport = [
    {
        id: "SUP-001",
        name: "Legal Aid Society NYC",
        type: "lawyer",
        title: "Pro Bono Legal Services",
        specialization: "Domestic Violence Legal Aid",
        description: "Provides free legal services to domestic violence survivors including restraining orders, custody cases, and immigration assistance.",
        contactInfo: {
            phone: "+1 (555) 123-4567",
            email: "info@legalaidnyc.org",
            website: "https://legalaidnyc.org",
            address: "123 Legal Street, New York, NY 10001"
        },
        availability: "available",
        languages: ["English", "Spanish", "Mandarin"],
        credentials: "Licensed attorney in NY, 10+ years experience",
        status: "approved",
        rating: 4.8,
        reviews: 156,
        lastUpdated: "2024-01-10"
    },
    {
        id: "SUP-002",
        name: "Dr. Sarah Wilson",
        type: "therapist",
        title: "Trauma-Informed Therapist",
        specialization: "PTSD & Trauma Recovery",
        description: "Specialized trauma therapist using EMDR and CBT techniques. Offers sliding scale fees for survivors.",
        contactInfo: {
            phone: "+1 (555) 987-6543",
            email: "dr.wilson@healingminds.com",
            website: "https://sarahwilsontherapy.com",
            address: "456 Therapy Lane, Los Angeles, CA 90210"
        },
        availability: "available",
        languages: ["English"],
        credentials: "Licensed Clinical Psychologist, PhD in Psychology",
        status: "approved",
        rating: 4.9,
        reviews: 87,
        lastUpdated: "2024-01-08"
    },
    {
        id: "SUP-003",
        name: "Survivors United",
        type: "activist",
        title: "Advocacy Organization",
        specialization: "Policy Reform & Community Organizing",
        description: "Grassroots organization advocating for policy changes and providing community support for survivors.",
        contactInfo: {
            phone: "+1 (555) 456-7890",
            email: "contact@survivorsunited.org",
            website: "https://survivorsunited.org",
            address: "789 Justice Ave, Chicago, IL 60601"
        },
        availability: "available",
        languages: ["English", "Spanish"],
        credentials: "501(c)(3) Non-profit organization since 2018",
        status: "pending",
        rating: 0,
        reviews: 0,
        lastUpdated: "2024-01-05"
    }
]



const SupportServiceApprovals = () => {
    const [support, setSupport] = useState(mockSupport)
    const [searchTerm, setSearchTerm] = useState("")
    const [typeFilter, setTypeFilter] = useState("all")
    const [statusFilter, setStatusFilter] = useState("all")
    const [selectedSupport, setSelectedSupport] = useState<any>(null)
    const [showViewDialog, setShowViewDialog] = useState(false)
    const [showEditDialog, setShowEditDialog] = useState(false)

    const typeIcons = {
        lawyer: Scale,
        therapist: Heart,
        activist: Shield,
        "support-group": Users
    }

    const filteredSupport = support.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.specialization.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.description.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesType = typeFilter === "all" || item.type === typeFilter
        const matchesStatus = statusFilter === "all" || item.status === statusFilter

        return matchesSearch && matchesType && matchesStatus
    })

    const handleView = (item: any) => {
        setSelectedSupport(item)
        setShowViewDialog(true)
    }

    const handleEdit = (item: any) => {
        setSelectedSupport(item)
        setShowEditDialog(true)
    }

    const handleDelete = (id: string) => {
        setSupport(support.filter(item => item.id !== id))
    }

    const handleApprove = (id: string) => {
        setSupport(support.map(item =>
            item.id === id ? { ...item, status: "approved" } : item
        ))
    }

    const handleReject = (id: string) => {
        setSupport(support.map(item =>
            item.id === id ? { ...item, status: "rejected" } : item
        ))
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved': return 'success'
            case 'pending': return 'warning'
            case 'rejected': return 'destructive'
            default: return 'secondary'
        }
    }

    const getAvailabilityColor = (availability: string) => {
        switch (availability) {
            case 'available': return 'success'
            case 'limited': return 'warning'
            case 'unavailable': return 'destructive'
            default: return 'secondary'
        }
    }


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
                                    <BreadcrumbPage className="font-medium">Support Service</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>
                    <div className="flex-1 flex justify-end pr-4">
                        <img src="/path/to/admin-avatar.png" alt="Admin Avatar" className="w-8 h-8 rounded-full" />
                        <span className="ml-2 text-sm text-muted-foreground">Admin Name</span>
                    </div>
                </header>
                <div className="flex flex-1 flex-col gap-4 p-4">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-foreground mb-2">Support Services</h1>
                            <p className="text-muted-foreground">Manage professional support services including lawyers, therapists, and advocates</p>
                        </div>
                        <div className="flex items-center space-x-2 mt-4 md:mt-0">
                            <Badge variant="success">
                                {support.filter(s => s.status === 'approved').length} Approved
                            </Badge>
                            <Badge variant="warning">
                                {support.filter(s => s.status === 'pending').length} Pending
                            </Badge>
                        </div>
                    </div>

                    {/* Search and Filters */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                                <Search className="h-5 w-5" />
                                <span>Search & Filter</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col lg:flex-row gap-4">
                                <div className="flex-1">
                                    <Input
                                        placeholder="Search by name, specialization, or description..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                                        <SelectTrigger className="w-40">
                                            <SelectValue placeholder="Type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Types</SelectItem>
                                            <SelectItem value="lawyer">Lawyers</SelectItem>
                                            <SelectItem value="therapist">Therapists</SelectItem>
                                            <SelectItem value="activist">Activists</SelectItem>
                                            <SelectItem value="support-group">Support Groups</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                                        <SelectTrigger className="w-32">
                                            <SelectValue placeholder="Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Status</SelectItem>
                                            <SelectItem value="pending">Pending</SelectItem>
                                            <SelectItem value="approved">Approved</SelectItem>
                                            <SelectItem value="rejected">Rejected</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Support Services List */}
                    <div className="grid gap-4">
                        {filteredSupport.map(item => {
                            const IconComponent = typeIcons[item.type as keyof typeof typeIcons] || Users
                            return (
                                <Card key={item.id}>
                                    <CardContent className="p-6">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-start space-x-4">
                                                <div className="p-2 bg-primary/10 rounded-lg">
                                                    <IconComponent className="h-6 w-6 text-primary" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center space-x-2 mb-2">
                                                        <h3 className="text-lg font-semibold">{item.name}</h3>
                                                        <Badge variant={getStatusColor(item.status)}>
                                                            {item.status}
                                                        </Badge>
                                                        <Badge variant={getAvailabilityColor(item.availability)}>
                                                            {item.availability}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground mb-1">{item.title}</p>
                                                    <p className="text-sm font-medium text-primary mb-2">{item.specialization}</p>
                                                    <p className="text-sm text-muted-foreground mb-3">{item.description}</p>

                                                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                                                        <div className="flex items-center space-x-1">
                                                            <MapPin className="h-3 w-3" />
                                                            <span>{item.contactInfo.address.split(',').slice(-2).join(',')}</span>
                                                        </div>
                                                        {item.rating > 0 && (
                                                            <div className="flex items-center space-x-1">
                                                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                                                <span>{item.rating} ({item.reviews} reviews)</span>
                                                            </div>
                                                        )}
                                                        <div>Languages: {item.languages.join(', ')}</div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center space-x-2">
                                                {item.status === 'pending' && (
                                                    <>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleApprove(item.id)}
                                                        >
                                                            <CheckCircle className="h-4 w-4 mr-1" />
                                                            Approve
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleReject(item.id)}
                                                        >
                                                            Reject
                                                        </Button>
                                                    </>
                                                )}
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleView(item)}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleEdit(item)}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleDelete(item.id)}
                                                    className="text-destructive hover:bg-destructive/10"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>

                    {/* View Dialog */}
                    <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
                        <DialogContent className="max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>Support Service Details</DialogTitle>
                            </DialogHeader>
                            {selectedSupport && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label className="text-sm font-medium">Name</Label>
                                            <p className="text-sm text-muted-foreground">{selectedSupport.name}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium">Type</Label>
                                            <p className="text-sm text-muted-foreground capitalize">{selectedSupport.type.replace('-', ' ')}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium">Description</Label>
                                        <p className="text-sm text-muted-foreground">{selectedSupport.description}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label className="text-sm font-medium">Phone</Label>
                                            <p className="text-sm text-muted-foreground">{selectedSupport.contactInfo.phone}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium">Email</Label>
                                            <p className="text-sm text-muted-foreground">{selectedSupport.contactInfo.email}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium">Credentials</Label>
                                        <p className="text-sm text-muted-foreground">{selectedSupport.credentials}</p>
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

export default SupportServiceApprovals