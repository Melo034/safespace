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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Users, FileText, MessageSquare, Clock, CheckCircle, Bell, Search, XCircle, Activity, MapPin } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

const stats = [
    {
        title: "Active Alerts",
        value: "12",
        description: "Urgent alerts requiring attention",
        icon: AlertTriangle,
        color: "text-red-600",
        bgColor: "bg-red-50"
    },
    {
        title: "Total Reports",
        value: "248",
        description: "Reports received this month",
        icon: FileText,
        color: "text-blue-600",
        bgColor: "bg-blue-50"
    },
    {
        title: "Support Services",
        value: "156",
        description: "Verified support providers",
        icon: Users,
        color: "text-green-600",
        bgColor: "bg-green-50"
    },
    {
        title: "Community Stories",
        value: "89",
        description: "Shared experiences",
        icon: MessageSquare,
        color: "text-purple-600",
        bgColor: "bg-purple-50"
    },
    {
        title: "Resolved Cases",
        value: "89",
        description: "+5% this week",
        icon: MessageSquare,
        color: "text-purple-600",
        bgColor: "bg-purple-50"
    },
    {
        title: "Resources Shared",
        value: "89",
        description: "+5% this week",
        icon: MessageSquare,
        color: "text-purple-600",
        bgColor: "bg-purple-50"
    }
]

const recentActivity = [
    {
        id: 1,
        type: "alert",
        message: "Emergency alert received from downtown area",
        time: "2 minutes ago",
        status: "active"
    },
    {
        id: 2,
        type: "report",
        message: "New incident report submitted anonymously",
        time: "15 minutes ago",
        status: "pending"
    },
    {
        id: 3,
        type: "support",
        message: "New therapist verified and added to directory",
        time: "1 hour ago",
        status: "completed"
    },
    {
        id: 4,
        type: "story",
        message: "Community member shared their recovery story",
        time: "2 hours ago",
        status: "published"
    }
]

const mockAlerts = [
    {
        id: "ALT-001",
        type: "emergency",
        priority: "high",
        title: "High Priority Report - Immediate Attention Required",
        message: "New domestic violence report with active threat - requires immediate response",
        location: "New York, NY",
        timestamp: "2 minutes ago",
        status: "active",
        reportId: "REP-001"
    },
    {
        id: "ALT-002",
        type: "system",
        priority: "medium",
        title: "System Maintenance Notification",
        message: "Scheduled maintenance window tonight from 11 PM - 2 AM EST",
        location: "System-wide",
        timestamp: "1 hour ago",
        status: "info",
        reportId: null
    },
    {
        id: "ALT-003",
        type: "warning",
        priority: "medium",
        title: "Multiple Reports from Same Area",
        message: "3 reports received from downtown Chicago area in the last 24 hours",
        location: "Chicago, IL",
        timestamp: "3 hours ago",
        status: "investigating",
        reportId: "REP-002"
    },
    {
        id: "ALT-004",
        type: "resolved",
        priority: "low",
        title: "Support Request Resolved",
        message: "Legal aid request successfully connected with pro bono attorney",
        location: "Los Angeles, CA",
        timestamp: "6 hours ago",
        status: "resolved",
        reportId: "REP-003"
    }
]


const Dashboard = () => {
    const [alerts, setAlerts] = useState(mockAlerts)
    const [searchTerm, setSearchTerm] = useState("")
    const [typeFilter, setTypeFilter] = useState("all")
    const [priorityFilter, setPriorityFilter] = useState("all")

    const getAlertIcon = (type: string) => {
        switch (type) {
            case 'emergency': return AlertTriangle
            case 'warning': return AlertTriangle
            case 'system': return Activity
            case 'resolved': return CheckCircle
            default: return Bell
        }
    }

    const getAlertColor = (priority: string) => {
        switch (priority) {
            case 'high': return 'destructive'
            case 'medium': return 'warning'
            case 'low': return 'success'
            default: return 'secondary'
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'destructive'
            case 'investigating': return 'warning'
            case 'resolved': return 'success'
            case 'info': return 'info'
            default: return 'secondary'
        }
    }

    const filteredAlerts = alerts.filter(alert => {
        const matchesSearch = alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            alert.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
            alert.location.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesType = typeFilter === "all" || alert.type === typeFilter
        const matchesPriority = priorityFilter === "all" || alert.priority === priorityFilter

        return matchesSearch && matchesType && matchesPriority
    })

    const handleDismissAlert = (id: string) => {
        setAlerts(alerts.filter(alert => alert.id !== id))
    }

    const handleMarkResolved = (id: string) => {
        setAlerts(alerts.map(alert =>
            alert.id === id ? { ...alert, status: "resolved", type: "resolved" } : alert
        ))
    }

    const getActivityIcon = (type: string) => {
        switch (type) {
            case "alert": return AlertTriangle
            case "report": return FileText
            case "support": return Users
            case "story": return MessageSquare
            default: return Clock
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
                                    <BreadcrumbPage className="font-medium">Dashboard</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>
                    <div className="flex-1 flex justify-end pr-4">
                        <img src="/path/to/admin-avatar.png" alt="Admin Avatar" className="w-8 h-8 rounded-full" />
                        <span className="ml-2 text-sm text-muted-foreground">Admin Name</span>
                    </div>
                </header>
                <div className="flex flex-col gap-4 p-4">
                    <h1 className="text-3xl font-bold text-foreground">Dashboard Overview</h1>
                    <p className="text-muted-foreground mt-2">
                        Monitor platform activity and manage support services
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6  p-4">
                    {stats.map((stat) => {
                        const IconComponent = stat.icon
                        return (
                            <Card key={stat.title} className="hover:shadow-lg transition-shadow">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">
                                        {stat.title}
                                    </CardTitle>
                                    <div className={`h-8 w-8 rounded-full ${stat.bgColor} flex items-center justify-center`}>
                                        <IconComponent className={`h-4 w-4 ${stat.color}`} />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                                    <p className="text-xs text-muted-foreground">{stat.description}</p>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
                {/* Recent Activity */}
                <div className="flex flex-col gap-4 p-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Activity</CardTitle>
                            <CardDescription>Latest platform updates and activities</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {recentActivity.map((activity) => {
                                    const IconComponent = getActivityIcon(activity.type)
                                    return (
                                        <div key={activity.id} className="flex items-center space-x-4 p-3 rounded-lg bg-muted/30">
                                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                <IconComponent className="h-4 w-4 text-primary" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-foreground">{activity.message}</p>
                                                <p className="text-xs text-muted-foreground">{activity.time}</p>
                                            </div>
                                            <Badge variant={"secondary"} className="text-xs">
                                                {activity.status}
                                            </Badge>
                                        </div>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Emergency Alert Banner */}
                    <Card className="border-red-200 bg-red-50">
                        <CardContent className="pt-6">
                            <div className="flex items-start space-x-3">
                                <AlertTriangle className="h-6 w-6 text-red-600 mt-1" />
                                <div className="flex-1">
                                    <h3 className="font-semibold text-red-800 mb-2">System Status</h3>
                                    <p className="text-sm text-red-700 mb-3">
                                        All emergency services are operational. Response teams are on standby 24/7.
                                    </p>
                                    <div className="flex items-center space-x-2">
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                        <span className="text-sm text-green-700 font-medium">All systems operational</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
                <div className="space-y-6 flex flex-col gap-4 p-4">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-foreground mb-2">Alert Management</h1>
                            <p className="text-muted-foreground">Monitor and manage system alerts, emergency notifications, and warnings</p>
                        </div>
                        <div className="flex items-center space-x-2 mt-4 md:mt-0">
                            <Badge variant="destructive" className="animate-pulse">
                                {alerts.filter(a => a.status === 'active').length} Active
                            </Badge>
                            <Badge variant={"destructive"}>
                                {alerts.filter(a => a.status === 'investigating').length} Investigating
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
                                        placeholder="Search alerts by title, message, or location..."
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
                                            <SelectItem value="emergency">Emergency</SelectItem>
                                            <SelectItem value="warning">Warning</SelectItem>
                                            <SelectItem value="system">System</SelectItem>
                                            <SelectItem value="resolved">Resolved</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                                        <SelectTrigger className="w-32">
                                            <SelectValue placeholder="Priority" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Priority</SelectItem>
                                            <SelectItem value="high">High</SelectItem>
                                            <SelectItem value="medium">Medium</SelectItem>
                                            <SelectItem value="low">Low</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Alerts List */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                                <Bell className="h-5 w-5" />
                                <span>Active Alerts ({filteredAlerts.length})</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[600px]">
                                <div className="space-y-4">
                                    {filteredAlerts.map(alert => {
                                        const IconComponent = getAlertIcon(alert.type)
                                        return (
                                            <Alert key={alert.id} className={`relative ${alert.priority === 'high' ? 'border-destructive' : ''}`}>
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-start space-x-3">
                                                        <IconComponent className={`h-5 w-5 mt-0.5 ${alert.priority === 'high' ? 'text-destructive' :
                                                            alert.priority === 'medium' ? 'text-warning' : 'text-success'
                                                            }`} />
                                                        <div className="flex-1 space-y-2">
                                                            <div className="flex items-center space-x-2">
                                                                <AlertTitle className="text-sm font-medium">{alert.title}</AlertTitle>
                                                                <Badge variant={"destructive"}>
                                                                    {alert.priority}
                                                                </Badge>
                                                                <Badge variant={getStatusColor(alert.status) as any}>
                                                                    {alert.status}
                                                                </Badge>
                                                            </div>
                                                            <AlertDescription className="text-sm text-muted-foreground">
                                                                {alert.message}
                                                            </AlertDescription>
                                                            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                                                                <div className="flex items-center space-x-1">
                                                                    <MapPin className="h-3 w-3" />
                                                                    <span>{alert.location}</span>
                                                                </div>
                                                                <div className="flex items-center space-x-1">
                                                                    <Clock className="h-3 w-3" />
                                                                    <span>{alert.timestamp}</span>
                                                                </div>
                                                                {alert.reportId && (
                                                                    <div className="flex items-center space-x-1">
                                                                        <span>Report: {alert.reportId}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        {alert.status === 'active' && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleMarkResolved(alert.id)}
                                                            >
                                                                <CheckCircle className="h-4 w-4 mr-1" />
                                                                Resolve
                                                            </Button>
                                                        )}
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleDismissAlert(alert.id)}
                                                        >
                                                            <XCircle className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </Alert>
                                        )
                                    })}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}

export default Dashboard