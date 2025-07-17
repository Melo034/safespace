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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,  PieChart, Pie, Cell } from 'recharts'
import { TrendingUp, Users, AlertTriangle, MessageSquare, BookOpen, MapPin, Eye, ThumbsUp } from "lucide-react"

const monthlyData = [
    { month: 'Jan', reports: 45, stories: 12, resources: 8, support: 15 },
    { month: 'Feb', reports: 52, stories: 18, resources: 12, support: 22 },
    { month: 'Mar', reports: 38, stories: 25, resources: 15, support: 28 },
    { month: 'Apr', reports: 42, stories: 32, resources: 18, support: 35 },
    { month: 'May', reports: 35, stories: 28, resources: 22, support: 40 },
    { month: 'Jun', reports: 48, stories: 35, resources: 25, support: 45 }
]

const impactData = [
    { name: 'Lives Impacted', value: 1247 },
    { name: 'Support Provided', value: 892 },
    { name: 'Resources Shared', value: 2341 },
    { name: 'Stories Shared', value: 456 }
]

const typeDistribution = [
    { name: 'Domestic Violence', value: 45, color: '#dc2626' },
    { name: 'Sexual Harassment', value: 32, color: '#ea580c' },
    { name: 'Child Abuse', value: 18, color: '#ca8a04' },
    { name: 'Other', value: 25, color: '#16a34a' }
]

const engagementData = [
    { metric: 'Story Views', current: 15420, previous: 12340, change: 25 },
    { metric: 'Comments', current: 892, previous: 756, change: 18 },
    { metric: 'Likes', current: 2341, previous: 2100, change: 11 },
    { metric: 'Shares', current: 456, previous: 402, change: 13 }
]

const Analytics = () => {
    const totalReports = monthlyData.reduce((sum, month) => sum + month.reports, 0)
    const totalStories = monthlyData.reduce((sum, month) => sum + month.stories, 0)
    const totalResources = monthlyData.reduce((sum, month) => sum + month.resources, 0)
    const totalSupport = monthlyData.reduce((sum, month) => sum + month.support, 0)
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
                                    <BreadcrumbPage className="font-medium">Analytics</BreadcrumbPage>
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
                            <h1 className="text-3xl font-bold text-foreground">Analytics Dashboard</h1>
                            <p className="text-muted-foreground">Platform usage and impact metrics</p>
                        </div>
                    </div>

                    {/* Key Performance Indicators */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
                                <AlertTriangle className="h-4 w-4 text-destructive" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{totalReports}</div>
                                <div className="flex items-center text-xs text-muted-foreground">
                                    <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                                    +12% from last month
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Community Stories</CardTitle>
                                <MessageSquare className="h-4 w-4 text-primary" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{totalStories}</div>
                                <div className="flex items-center text-xs text-muted-foreground">
                                    <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                                    +25% from last month
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Resources Shared</CardTitle>
                                <BookOpen className="h-4 w-4 text-secondary" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{totalResources}</div>
                                <div className="flex items-center text-xs text-muted-foreground">
                                    <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                                    +18% from last month
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Support Services</CardTitle>
                                <Users className="h-4 w-4 text-accent" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{totalSupport}</div>
                                <div className="flex items-center text-xs text-muted-foreground">
                                    <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                                    +32% from last month
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Monthly Trends */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Monthly Activity Trends</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={monthlyData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="month" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="reports" fill="#dc2626" name="Reports" />
                                    <Bar dataKey="stories" fill="#2563eb" name="Stories" />
                                    <Bar dataKey="resources" fill="#16a34a" name="Resources" />
                                    <Bar dataKey="support" fill="#ca8a04" name="Support" />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Report Type Distribution */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Report Type Distribution</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={250}>
                                    <PieChart>
                                        <Pie
                                            data={typeDistribution}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {typeDistribution.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* Impact Metrics */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Platform Impact</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {impactData.map((item, index) => (
                                    <div key={index} className="flex items-center justify-between">
                                        <span className="text-sm font-medium">{item.name}</span>
                                        <div className="flex items-center gap-2">
                                            <Progress value={(item.value / 2500) * 100} className="w-24" />
                                            <span className="text-sm font-bold">{item.value.toLocaleString()}</span>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Engagement Metrics */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Community Engagement</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {engagementData.map((item, index) => (
                                    <div key={index} className="p-4 border rounded-lg">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium">{item.metric}</span>
                                            {item.metric === 'Story Views' && <Eye className="h-4 w-4 text-muted-foreground" />}
                                            {item.metric === 'Comments' && <MessageSquare className="h-4 w-4 text-muted-foreground" />}
                                            {item.metric === 'Likes' && <ThumbsUp className="h-4 w-4 text-muted-foreground" />}
                                        </div>
                                        <div className="text-2xl font-bold mb-1">{item.current.toLocaleString()}</div>
                                        <div className="flex items-center text-xs">
                                            <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                                            <span className="text-green-500">+{item.change}%</span>
                                            <span className="text-muted-foreground ml-1">vs last month</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Geographic Distribution */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <MapPin className="h-5 w-5" />
                                Geographic Distribution
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-4 border rounded-lg">
                                    <div className="text-lg font-semibold mb-2">Urban Areas</div>
                                    <Progress value={65} className="mb-2" />
                                    <span className="text-sm text-muted-foreground">65% of reports</span>
                                </div>
                                <div className="p-4 border rounded-lg">
                                    <div className="text-lg font-semibold mb-2">Suburban Areas</div>
                                    <Progress value={25} className="mb-2" />
                                    <span className="text-sm text-muted-foreground">25% of reports</span>
                                </div>
                                <div className="p-4 border rounded-lg">
                                    <div className="text-lg font-semibold mb-2">Rural Areas</div>
                                    <Progress value={10} className="mb-2" />
                                    <span className="text-sm text-muted-foreground">10% of reports</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}

export default Analytics