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
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertTriangle, Eye, Edit, Trash2, Search, Filter, MapPin, Calendar, User, MessageSquare } from "lucide-react"
import { toast } from "sonner";

const mockReports = [
    {
        id: "1",
        title: "Domestic Violence Incident",
        description: "Urgent assistance needed for domestic violence situation",
        type: "Domestic Violence",
        priority: "High",
        status: "Open",
        location: "Downtown Area",
        reportedBy: "Anonymous",
        reportedAt: "2024-01-15 14:30",
        assignedTo: "Officer Johnson",
        tags: ["urgent", "domestic"],
        followUpActions: ["Police contacted", "Safe house arranged"],
        evidence: ["Photos", "Audio recording"]
    },
    {
        id: "2",
        title: "Workplace Harassment",
        description: "Ongoing sexual harassment at workplace",
        type: "Sexual Harassment",
        priority: "Medium",
        status: "In Progress",
        location: "Business District",
        reportedBy: "Sarah M.",
        reportedAt: "2024-01-14 09:15",
        assignedTo: "Case Worker Alice",
        tags: ["workplace", "harassment"],
        followUpActions: ["HR contacted", "Legal consultation scheduled"],
        evidence: ["Email screenshots", "Witness statements"]
    },
    {
        id: "3",
        title: "Child Abuse Report",
        description: "Suspected child abuse in neighborhood",
        type: "Child Abuse",
        priority: "Critical",
        status: "Resolved",
        location: "Residential Area",
        reportedBy: "Teacher Linda",
        reportedAt: "2024-01-13 16:45",
        assignedTo: "Child Services",
        tags: ["child", "abuse", "resolved"],
        followUpActions: ["Child removed to safety", "Case closed"],
        evidence: ["Medical report", "School records"]
    }
]

const ReportManagement = () => {

    const [reports, setReports] = useState(mockReports)
    const [searchTerm, setSearchTerm] = useState("")
    const [typeFilter, setTypeFilter] = useState("all")
    const [statusFilter, setStatusFilter] = useState("all")
    const [priorityFilter, setPriorityFilter] = useState("all")
    const [selectedReport, setSelectedReport] = useState<any>(null)
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

    const filteredReports = reports.filter(report => {
        const matchesSearch = report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            report.description.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesType = typeFilter === "all" || report.type === typeFilter
        const matchesStatus = statusFilter === "all" || report.status === statusFilter
        const matchesPriority = priorityFilter === "all" || report.priority === priorityFilter

        return matchesSearch && matchesType && matchesStatus && matchesPriority
    })

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case "Critical": return "destructive"
            case "High": return "destructive"
            case "Medium": return "default"
            case "Low": return "secondary"
            default: return "default"
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case "Open": return "destructive"
            case "In Progress": return "default"
            case "Resolved": return "secondary"
            default: return "default"
        }
    }

    const handleEdit = (report: any) => {
        setSelectedReport(report)
        setIsEditDialogOpen(true)
    }

    const handleView = (report: any) => {
        setSelectedReport(report)
        setIsViewDialogOpen(true)
    }

    const handleDelete = (id: string) => {
        setReports(reports.filter(report => report.id !== id))
        toast({
            title: "Report Deleted",
            description: "The report has been successfully deleted.",
        })
    }

    const handleUpdateReport = (updatedReport: any) => {
        setReports(reports.map(report =>
            report.id === updatedReport.id ? updatedReport : report
        ))
        setIsEditDialogOpen(false)
        toast({
            title: "Report Updated",
            description: "The report has been successfully updated.",
        })
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
                                    <BreadcrumbPage className="font-medium">Report Management</BreadcrumbPage>
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
                            <h1 className="text-3xl font-bold text-foreground">Reports Management</h1>
                            <p className="text-muted-foreground">Monitor and manage incident reports</p>
                        </div>
                        <Badge variant="outline" className="text-lg px-3 py-1">
                            {filteredReports.length} Reports
                        </Badge>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center space-x-2">
                                    <AlertTriangle className="h-5 w-5 text-destructive" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">Open Cases</p>
                                        <p className="text-2xl font-bold">{reports.filter(r => r.status === "Open").length}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center space-x-2">
                                    <MessageSquare className="h-5 w-5 text-primary" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">In Progress</p>
                                        <p className="text-2xl font-bold">{reports.filter(r => r.status === "In Progress").length}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center space-x-2">
                                    <AlertTriangle className="h-5 w-5 text-destructive" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">Critical</p>
                                        <p className="text-2xl font-bold">{reports.filter(r => r.priority === "Critical").length}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center space-x-2">
                                    <AlertTriangle className="h-5 w-5 text-secondary" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">Resolved</p>
                                        <p className="text-2xl font-bold">{reports.filter(r => r.status === "Resolved").length}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Filters */}
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex flex-wrap gap-4">
                                <div className="flex-1 min-w-[200px]">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search reports..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-10"
                                        />
                                    </div>
                                </div>
                                <Select value={typeFilter} onValueChange={setTypeFilter}>
                                    <SelectTrigger className="w-[180px]">
                                        <Filter className="h-4 w-4 mr-2" />
                                        <SelectValue placeholder="Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Types</SelectItem>
                                        <SelectItem value="Domestic Violence">Domestic Violence</SelectItem>
                                        <SelectItem value="Sexual Harassment">Sexual Harassment</SelectItem>
                                        <SelectItem value="Child Abuse">Child Abuse</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="Open">Open</SelectItem>
                                        <SelectItem value="In Progress">In Progress</SelectItem>
                                        <SelectItem value="Resolved">Resolved</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Priority" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Priority</SelectItem>
                                        <SelectItem value="Critical">Critical</SelectItem>
                                        <SelectItem value="High">High</SelectItem>
                                        <SelectItem value="Medium">Medium</SelectItem>
                                        <SelectItem value="Low">Low</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Reports List */}
                    <div className="grid gap-4">
                        {filteredReports.map((report) => (
                            <Card key={report.id} className="border-l-4 border-l-primary">
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <h3 className="text-lg font-semibold">{report.title}</h3>
                                                <Badge variant={getPriorityColor(report.priority) as any}>
                                                    {report.priority}
                                                </Badge>
                                                <Badge variant={getStatusColor(report.status) as any}>
                                                    {report.status}
                                                </Badge>
                                            </div>
                                            <p className="text-muted-foreground mb-3">{report.description}</p>
                                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                                <div className="flex items-center gap-1">
                                                    <MapPin className="h-4 w-4" />
                                                    {report.location}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="h-4 w-4" />
                                                    {report.reportedAt}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <User className="h-4 w-4" />
                                                    {report.reportedBy}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleView(report)}
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleEdit(report)}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleDelete(report.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {report.tags.map((tag) => (
                                            <Badge key={tag} variant="secondary" className="text-xs">
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* View Report Dialog */}
                    <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                        <DialogContent className="max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>Report Details</DialogTitle>
                            </DialogHeader>
                            {selectedReport && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-medium">Title</label>
                                            <p className="text-sm text-muted-foreground">{selectedReport.title}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium">Type</label>
                                            <p className="text-sm text-muted-foreground">{selectedReport.type}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium">Priority</label>
                                            <Badge variant={getPriorityColor(selectedReport.priority) as any}>
                                                {selectedReport.priority}
                                            </Badge>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium">Status</label>
                                            <Badge variant={getStatusColor(selectedReport.status) as any}>
                                                {selectedReport.status}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">Description</label>
                                        <p className="text-sm text-muted-foreground mt-1">{selectedReport.description}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-medium">Location</label>
                                            <p className="text-sm text-muted-foreground">{selectedReport.location}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium">Reported By</label>
                                            <p className="text-sm text-muted-foreground">{selectedReport.reportedBy}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium">Reported At</label>
                                            <p className="text-sm text-muted-foreground">{selectedReport.reportedAt}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium">Assigned To</label>
                                            <p className="text-sm text-muted-foreground">{selectedReport.assignedTo}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium mb-2 block">Follow-up Actions</label>
                                        <ul className="list-disc list-inside space-y-1">
                                            {selectedReport.followUpActions.map((action: string, index: number) => (
                                                <li key={index} className="text-sm text-muted-foreground">{action}</li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium mb-2 block">Evidence</label>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedReport.evidence.map((item: string, index: number) => (
                                                <Badge key={index} variant="outline">{item}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </DialogContent>
                    </Dialog>

                    {/* Edit Report Dialog */}
                    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                        <DialogContent className="max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>Edit Report</DialogTitle>
                            </DialogHeader>
                            {selectedReport && (
                                <form onSubmit={(e) => {
                                    e.preventDefault()
                                    handleUpdateReport(selectedReport)
                                }} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-medium mb-2 block">Priority</label>
                                            <Select value={selectedReport.priority} onValueChange={(value) =>
                                                setSelectedReport({ ...selectedReport, priority: value })
                                            }>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Critical">Critical</SelectItem>
                                                    <SelectItem value="High">High</SelectItem>
                                                    <SelectItem value="Medium">Medium</SelectItem>
                                                    <SelectItem value="Low">Low</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium mb-2 block">Status</label>
                                            <Select value={selectedReport.status} onValueChange={(value) =>
                                                setSelectedReport({ ...selectedReport, status: value })
                                            }>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Open">Open</SelectItem>
                                                    <SelectItem value="In Progress">In Progress</SelectItem>
                                                    <SelectItem value="Resolved">Resolved</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium mb-2 block">Assigned To</label>
                                        <Input
                                            value={selectedReport.assignedTo}
                                            onChange={(e) => setSelectedReport({ ...selectedReport, assignedTo: e.target.value })}
                                        />
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                                            Cancel
                                        </Button>
                                        <Button type="submit">
                                            Update Report
                                        </Button>
                                    </div>
                                </form>
                            )}
                        </DialogContent>
                    </Dialog>
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}

export default ReportManagement