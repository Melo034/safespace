import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Navbar } from "@/components/utils/Navbar"
import { Footer } from "@/components/utils/Footer"
import { Download, ExternalLink, FileText, Globe, Search, Filter, Heart, BookOpen, Scale,  Shield, Phone } from "lucide-react"

// Mock data for resources
const mockResources = [
  {
    id: "RES-001",
    title: "Domestic Violence Safety Planning Guide",
    category: "safety-planning",
    description: "Comprehensive guide for creating personal safety plans and emergency strategies for domestic violence situations.",
    type: "pdf",
    url: "/docs/safety-planning-guide.pdf",
    image: "https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=400&h=300&fit=crop",
    tags: ["safety", "planning", "domestic-violence"],
    downloads: 1234,
    featured: true
  },
  {
    id: "RES-002", 
    title: "Understanding Your Legal Rights",
    category: "legal-aid",
    description: "Online platform providing comprehensive information about legal rights for survivors of gender-based violence.",
    type: "website",
    url: "https://legalrights-gbv.org",
    image: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&h=300&fit=crop",
    tags: ["legal", "rights", "survivors"],
    views: 5432,
    featured: false
  },
  {
    id: "RES-003",
    title: "Trauma-Informed Self-Care Handbook",
    category: "counseling",
    description: "Self-care strategies and healing techniques specifically designed for trauma survivors.",
    type: "pdf",
    url: "/docs/self-care-handbook.pdf", 
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop",
    tags: ["self-care", "trauma", "healing"],
    downloads: 987,
    featured: true
  },
  {
    id: "RES-004",
    title: "GBV Prevention Education Platform",
    category: "education",
    description: "Interactive online courses and workshops about gender-based violence prevention and awareness.",
    type: "website",
    url: "https://gbv-education.org",
    image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=300&fit=crop",
    tags: ["education", "prevention", "awareness"],
    views: 3210,
    featured: false
  },
  {
    id: "RES-005",
    title: "Emergency Contact Card Template",
    category: "emergency",
    description: "Printable emergency contact card with hotlines and safety information.",
    type: "pdf",
    url: "/docs/emergency-contact-card.pdf",
    image: "https://images.unsplash.com/photo-1584824486509-112e4181ff6b?w=400&h=300&fit=crop",
    tags: ["emergency", "contacts", "safety"],
    downloads: 2156,
    featured: false
  },
  {
    id: "RES-006",
    title: "Support Group Finder",
    category: "counseling",
    description: "Online directory to find local and virtual support groups for survivors.",
    type: "website",
    url: "https://supportgroups-finder.org",
    image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=300&fit=crop",
    tags: ["support-groups", "community", "healing"],
    views: 1876,
    featured: true
  }
]

const categoryIcons = {
  "safety-planning": Shield,
  "legal-aid": Scale,
  "counseling": Heart,
  "emergency": Phone,
  "education": BookOpen
}

const Resources = () => {
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")

  const filteredResources = mockResources.filter(resource => {
    const matchesSearch = resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         resource.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         resource.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesCategory = categoryFilter === "all" || resource.category === categoryFilter
    const matchesType = typeFilter === "all" || resource.type === typeFilter
    
    return matchesSearch && matchesCategory && matchesType
  })

  const handleResourceClick = (resource: any) => {
    if (resource.type === "website") {
      window.open(resource.url, "_blank")
    } else {
      // For PDFs, create a download link
      const link = document.createElement("a")
      link.href = resource.url
      link.download = resource.title
      link.click()
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Support Resources
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Access comprehensive resources, educational materials, and support tools 
            designed to help survivors of gender-based violence.
          </p>
        </div>

        {/* Featured Resources */}
        <div className="max-w-6xl mx-auto mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-6">Featured Resources</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockResources.filter(r => r.featured).map(resource => {
              const IconComponent = categoryIcons[resource.category as keyof typeof categoryIcons] || FileText
              return (
                <Card key={resource.id} className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-2 border-rose-200">
                  <div className="relative">
                    <img 
                      src={resource.image} 
                      alt={resource.title}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                    <div className="absolute top-2 right-2">
                      <Badge variant="secondary" className="bg-primary text-primary-foreground">
                        Featured
                      </Badge>
                    </div>
                    <div className="absolute bottom-2 left-2">
                      <Badge variant={resource.type === "pdf" ? "destructive" : "default"}>
                        {resource.type === "pdf" ? <FileText className="h-3 w-3 mr-1" /> : <Globe className="h-3 w-3 mr-1" />}
                        {resource.type.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <IconComponent className="h-5 w-5 text-primary" />
                        <Badge variant="outline" className="text-xs">
                          {resource.category.replace('-', ' ')}
                        </Badge>
                      </div>
                    </div>
                    <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
                      {resource.title}
                    </CardTitle>
                    <CardDescription className="line-clamp-3">
                      {resource.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1 mb-4">
                      {resource.tags.slice(0, 3).map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        {resource.type === "pdf" ? 
                          `${resource.downloads} downloads` : 
                          `${resource.views} views`
                        }
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => handleResourceClick(resource)}
                        className="group-hover:shadow-md transition-all"
                      >
                        {resource.type === "pdf" ? (
                          <>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </>
                        ) : (
                          <>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Visit
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="max-w-6xl mx-auto mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Search className="h-5 w-5" />
                <span>Find Resources</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search resources by title, description, or tags..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="safety-planning">Safety Planning</SelectItem>
                      <SelectItem value="legal-aid">Legal Aid</SelectItem>
                      <SelectItem value="counseling">Counseling</SelectItem>
                      <SelectItem value="emergency">Emergency</SelectItem>
                      <SelectItem value="education">Education</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="website">Website</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>


        {/* All Resources */}
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground">All Resources</h2>
            <div className="text-sm text-muted-foreground">
              Showing {filteredResources.length} of {mockResources.length} resources
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResources.map(resource => {
              const IconComponent = categoryIcons[resource.category as keyof typeof categoryIcons] || FileText
              return (
                <Card key={resource.id} className="group hover:shadow-lg transition-all duration-300 cursor-pointer">
                  <div className="relative">
                    <img 
                      src={resource.image} 
                      alt={resource.title}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                    <div className="absolute bottom-2 left-2">
                      <Badge variant={resource.type === "pdf" ? "destructive" : "default"}>
                        {resource.type === "pdf" ? <FileText className="h-3 w-3 mr-1" /> : <Globe className="h-3 w-3 mr-1" />}
                        {resource.type.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  <CardHeader>
                    <div className="flex items-center space-x-2 mb-2">
                      <IconComponent className="h-4 w-4 text-primary" />
                      <Badge variant="outline" className="text-xs">
                        {resource.category.replace('-', ' ')}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
                      {resource.title}
                    </CardTitle>
                    <CardDescription className="line-clamp-3">
                      {resource.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1 mb-4">
                      {resource.tags.slice(0, 3).map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        {resource.type === "pdf" ? 
                          `${resource.downloads} downloads` : 
                          `${resource.views} views`
                        }
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => handleResourceClick(resource)}
                        className="group-hover:shadow-md transition-all"
                      >
                        {resource.type === "pdf" ? (
                          <>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </>
                        ) : (
                          <>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Visit
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {filteredResources.length === 0 && (
            <div className="text-center py-12">
              <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No resources found</h3>
              <p className="text-muted-foreground">Try adjusting your search terms or filters.</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default Resources