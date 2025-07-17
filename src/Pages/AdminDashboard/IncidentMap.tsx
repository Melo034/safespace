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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { MapPin, AlertTriangle, Search, Filter, Calendar, Users, Eye } from "lucide-react"

// Mock incident data with coordinates
const mockIncidents = [
    {
        id: "1",
        type: "Domestic Violence",
        priority: "High",
        status: "Open",
        location: "Downtown Area",
        coordinates: { lat: 40.7128, lng: -74.0060 },
        reportedAt: "2024-01-15 14:30",
        description: "Urgent assistance needed",
        anonymized: true
    },
    {
        id: "2",
        type: "Sexual Harassment",
        priority: "Medium",
        status: "In Progress",
        location: "Business District",
        coordinates: { lat: 40.7589, lng: -73.9851 },
        reportedAt: "2024-01-14 09:15",
        description: "Workplace harassment report",
        anonymized: false
    },
    {
        id: "3",
        type: "Child Abuse",
        priority: "Critical",
        status: "Resolved",
        location: "Residential Area",
        coordinates: { lat: 40.6892, lng: -74.0445 },
        reportedAt: "2024-01-13 16:45",
        description: "Child safety concern",
        anonymized: true
    },
    {
        id: "4",
        type: "Stalking",
        priority: "High",
        status: "Open",
        location: "University Campus",
        coordinates: { lat: 40.8075, lng: -73.9626 },
        reportedAt: "2024-01-12 11:20",
        description: "Stalking incident reported",
        anonymized: true
    }
]

const mockSafeSpaces = [
    {
        id: "1",
        name: "Women's Shelter Downtown",
        type: "Shelter",
        address: "123 Safe Street, Downtown",
        coordinates: { lat: 40.7200, lng: -74.0100 },
        phone: "+1-555-SHELTER",
        available: true
    },
    {
        id: "2",
        name: "Crisis Counseling Center",
        type: "Counseling",
        address: "456 Help Avenue, Midtown",
        coordinates: { lat: 40.7589, lng: -73.9851 },
        phone: "+1-555-HELP",
        available: true
    },
    {
        id: "3",
        name: "Legal Aid Office",
        type: "Legal Support",
        address: "789 Justice Blvd, Legal District",
        coordinates: { lat: 40.7410, lng: -74.0014 },
        phone: "+1-555-LEGAL",
        available: true
    }
]

const IncidentMap = () => {
    const [selectedIncident, setSelectedIncident] = useState<any>(null)
    const [selectedSafeSpace, setSelectedSafeSpace] = useState<any>(null)
    const [mapView, setMapView] = useState("incidents") // incidents, safe-spaces, heatmap
    const [timeFilter, setTimeFilter] = useState("all")
    const [typeFilter, setTypeFilter] = useState("all")
    const [searchTerm, setSearchTerm] = useState("")

    const filteredIncidents = mockIncidents.filter(incident => {
        const matchesSearch = incident.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
            incident.type.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesType = typeFilter === "all" || incident.type === typeFilter
        const matchesTime = timeFilter === "all" || true // Implement time filtering logic

        return matchesSearch && matchesType && matchesTime
    })

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case "Critical": return "bg-red-600"
            case "High": return "bg-orange-500"
            case "Medium": return "bg-yellow-500"
            case "Low": return "bg-green-500"
            default: return "bg-gray-500"
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
                                    <BreadcrumbPage className="font-medium">Incident Map</BreadcrumbPage>
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
                            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                                <MapPin className="h-8 w-8" />
                                Geographic Map View
                            </h1>
                            <p className="text-muted-foreground">Visual incident tracking and safe space mapping</p>
                        </div>
                        <div className="flex gap-2">
                            <Badge variant="outline">
                                {filteredIncidents.length} Incidents
                            </Badge>
                            <Badge variant="outline">
                                {mockSafeSpaces.length} Safe Spaces
                            </Badge>
                        </div>
                    </div>

                    {/* Controls */}
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex flex-wrap gap-4 items-center">
                                <div className="flex gap-2">
                                    <Button
                                        variant={mapView === "incidents" ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setMapView("incidents")}
                                    >
                                        <AlertTriangle className="h-4 w-4 mr-1" />
                                        Incidents
                                    </Button>
                                    <Button
                                        variant={mapView === "safe-spaces" ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setMapView("safe-spaces")}
                                    >
                                        <Users className="h-4 w-4 mr-1" />
                                        Safe Spaces
                                    </Button>
                                    <Button
                                        variant={mapView === "heatmap" ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setMapView("heatmap")}
                                    >
                                        <Eye className="h-4 w-4 mr-1" />
                                        Heatmap
                                    </Button>
                                </div>

                                <div className="flex-1 min-w-[200px]">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search locations..."
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
                                        <SelectItem value="Stalking">Stalking</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select value={timeFilter} onValueChange={setTimeFilter}>
                                    <SelectTrigger className="w-[180px]">
                                        <Calendar className="h-4 w-4 mr-2" />
                                        <SelectValue placeholder="Time" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Time</SelectItem>
                                        <SelectItem value="24h">Last 24 Hours</SelectItem>
                                        <SelectItem value="7d">Last 7 Days</SelectItem>
                                        <SelectItem value="30d">Last 30 Days</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Map Area */}
                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <MapPin className="h-5 w-5" />
                                    Interactive Map
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="bg-muted rounded-lg h-[500px] flex items-center justify-center relative overflow-hidden">
                                    {/* Simulated Map Background */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-green-100 opacity-20" />
                                    <div className="absolute inset-0 grid grid-cols-12 grid-rows-8 gap-1 p-4">
                                        {/* Grid pattern to simulate map */}
                                        {Array.from({ length: 96 }).map((_, i) => (
                                            <div key={i} className="bg-gray-200/30 rounded-sm" />
                                        ))}
                                    </div>

                                    {/* Incident Markers */}
                                    {mapView === "incidents" && filteredIncidents.map((incident, index) => (
                                        <div
                                            key={incident.id}
                                            className={`absolute w-4 h-4 rounded-full cursor-pointer border-2 border-white shadow-lg ${getPriorityColor(incident.priority)}`}
                                            style={{
                                                left: `${20 + (index * 15)}%`,
                                                top: `${30 + (index * 10)}%`,
                                            }}
                                            onClick={() => setSelectedIncident(incident)}
                                        />
                                    ))}

                                    {/* Safe Space Markers */}
                                    {mapView === "safe-spaces" && mockSafeSpaces.map((space, index) => (
                                        <div
                                            key={space.id}
                                            className="absolute w-6 h-6 bg-green-500 rounded-full cursor-pointer border-2 border-white shadow-lg flex items-center justify-center"
                                            style={{
                                                left: `${25 + (index * 20)}%`,
                                                top: `${40 + (index * 8)}%`,
                                            }}
                                            onClick={() => setSelectedSafeSpace(space)}
                                        >
                                            <Users className="h-3 w-3 text-white" />
                                        </div>
                                    ))}

                                    {/* Heatmap Overlay */}
                                    {mapView === "heatmap" && (
                                        <>
                                            <div className="absolute w-32 h-32 bg-red-500/30 rounded-full blur-lg" style={{ left: "20%", top: "25%" }} />
                                            <div className="absolute w-24 h-24 bg-orange-500/30 rounded-full blur-lg" style={{ left: "45%", top: "35%" }} />
                                            <div className="absolute w-20 h-20 bg-yellow-500/30 rounded-full blur-lg" style={{ left: "65%", top: "20%" }} />
                                        </>
                                    )}

                                    <div className="text-center text-muted-foreground">
                                        <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                        <p>Interactive Map View</p>
                                        <p className="text-sm">Click on markers for details</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {/* Statistics */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Quick Stats</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm">Active Incidents</span>
                                        <Badge variant="destructive">
                                            {mockIncidents.filter(i => i.status === "Open").length}
                                        </Badge>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm">In Progress</span>
                                        <Badge variant="default">
                                            {mockIncidents.filter(i => i.status === "In Progress").length}
                                        </Badge>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm">Safe Spaces</span>
                                        <Badge variant="secondary">
                                            {mockSafeSpaces.filter(s => s.available).length}
                                        </Badge>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm">High Priority</span>
                                        <Badge variant="destructive">
                                            {mockIncidents.filter(i => i.priority === "High" || i.priority === "Critical").length}
                                        </Badge>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Selected Item Details */}
                            {selectedIncident && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">Incident Details</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div>
                                            <label className="text-sm font-medium">Type</label>
                                            <p className="text-sm text-muted-foreground">{selectedIncident.type}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium">Priority</label>
                                            <Badge variant={selectedIncident.priority === "Critical" ? "destructive" : "default"}>
                                                {selectedIncident.priority}
                                            </Badge>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium">Status</label>
                                            <Badge variant="outline">{selectedIncident.status}</Badge>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium">Location</label>
                                            <p className="text-sm text-muted-foreground">{selectedIncident.location}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium">Reported</label>
                                            <p className="text-sm text-muted-foreground">{selectedIncident.reportedAt}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium">Description</label>
                                            <p className="text-sm text-muted-foreground">{selectedIncident.description}</p>
                                        </div>
                                        <Button size="sm" className="w-full">
                                            View Full Report
                                        </Button>
                                    </CardContent>
                                </Card>
                            )}

                            {selectedSafeSpace && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">Safe Space Details</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div>
                                            <label className="text-sm font-medium">Name</label>
                                            <p className="text-sm text-muted-foreground">{selectedSafeSpace.name}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium">Type</label>
                                            <Badge variant="secondary">{selectedSafeSpace.type}</Badge>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium">Address</label>
                                            <p className="text-sm text-muted-foreground">{selectedSafeSpace.address}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium">Phone</label>
                                            <p className="text-sm text-muted-foreground">{selectedSafeSpace.phone}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium">Status</label>
                                            <Badge variant={selectedSafeSpace.available ? "secondary" : "destructive"}>
                                                {selectedSafeSpace.available ? "Available" : "Full"}
                                            </Badge>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button size="sm" className="flex-1">
                                                Get Directions
                                            </Button>
                                            <Button size="sm" variant="outline" className="flex-1">
                                                Call Now
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Legend */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Map Legend</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 bg-red-600 rounded-full" />
                                        <span className="text-sm">Critical Priority</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 bg-orange-500 rounded-full" />
                                        <span className="text-sm">High Priority</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                                        <span className="text-sm">Medium Priority</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 bg-green-500 rounded-full" />
                                        <span className="text-sm">Safe Spaces</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}

export default IncidentMap