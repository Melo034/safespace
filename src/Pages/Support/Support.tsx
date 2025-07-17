import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Navbar } from "@/components/utils/Navbar"
import { Footer } from "@/components/utils/Footer"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Search, Filter, Star, MapPin, Phone,  Globe, 
  Scale, Heart, Users, Shield, MessageCircle, 
  CheckCircle
} from "lucide-react"

// Mock data for support services
const mockSupport = [
  {
    id: "SUP-001",
    name: "Sarah Johnson",
    type: "lawyer",
    title: "Family Law Attorney",
    specialization: "Domestic Violence & Family Law",
    description: "Experienced attorney specializing in domestic violence cases, protective orders, and family law matters. Offers free consultations for survivors.",
    location: "New York, NY",
    phone: "+1 (555) 123-4567",
    email: "sarah.johnson@legalaid.org",
    website: "https://sarahjohnsonlaw.com",
    avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&h=150&fit=crop&crop=face",
    rating: 4.9,
    reviews: 127,
    verified: true,
    available: true,
    languages: ["English", "Spanish"],
    tags: ["domestic-violence", "protective-orders", "free-consultation"]
  },
  {
    id: "SUP-002",
    name: "Dr. Maria Rodriguez",
    type: "therapist",
    title: "Licensed Clinical Psychologist",
    specialization: "Trauma & PTSD Therapy", 
    description: "Specialized in trauma-informed therapy for survivors of gender-based violence. Uses EMDR and CBT approaches.",
    location: "Los Angeles, CA",
    phone: "+1 (555) 987-6543",
    email: "dr.rodriguez@healingspace.com",
    website: "https://mariarodrieuztherapy.com",
    avatar: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150&h=150&fit=crop&crop=face",
    rating: 4.8,
    reviews: 89,
    verified: true,
    available: true,
    languages: ["English", "Spanish", "Portuguese"],
    tags: ["trauma-therapy", "ptsd", "emdr", "cbt"]
  },
  {
    id: "SUP-003",
    name: "Justice Warriors Collective",
    type: "activist",
    title: "Legal Advocacy Organization",
    specialization: "Policy Reform & Legal Advocacy",
    description: "Grassroots organization working on policy reform and providing legal advocacy for survivors of gender-based violence.",
    location: "Chicago, IL",
    phone: "+1 (555) 456-7890",
    email: "contact@justicewarriors.org",
    website: "https://justicewarriors.org",
    avatar: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=150&h=150&fit=crop",
    rating: 4.7,
    reviews: 156,
    verified: true,
    available: true,
    languages: ["English"],
    tags: ["policy-reform", "advocacy", "legal-support"]
  },
  {
    id: "SUP-004",
    name: "Healing Circle Support Group",
    type: "support-group",
    title: "Survivor Support Group",
    specialization: "Peer Support & Group Therapy",
    description: "Weekly support group for survivors facilitated by licensed therapists. Safe space for sharing and healing together.",
    location: "Virtual & Houston, TX",
    phone: "+1 (555) 321-0987",
    email: "info@healingcircle.org",  
    website: "https://healingcircle.org",
    avatar: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=150&h=150&fit=crop",
    rating: 4.9,
    reviews: 78,
    verified: true,
    available: true,
    languages: ["English", "Spanish"],
    tags: ["support-group", "peer-support", "virtual", "weekly-meetings"]
  },
  {
    id: "SUP-005",
    name: "Michael Chen",
    type: "lawyer",
    title: "Criminal Defense Attorney",
    specialization: "Victim Rights & Criminal Law",
    description: "Experienced in representing victims of violent crimes and ensuring their rights are protected throughout legal proceedings.",
    location: "San Francisco, CA",
    phone: "+1 (555) 654-3210",
    email: "mchen@victimrights.law",
    website: "https://micahelchenlaw.com",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    rating: 4.6,
    reviews: 92,
    verified: true,
    available: false,
    languages: ["English", "Mandarin"],
    tags: ["victim-rights", "criminal-law", "court-representation"]
  },
  {
    id: "SUP-006",
    name: "Dr. Jennifer Thompson",
    type: "therapist",
    title: "Trauma Specialist",
    specialization: "Family & Couples Therapy",
    description: "Specializes in helping families heal from trauma and domestic violence. Offers individual, couples, and family therapy sessions.",
    location: "Miami, FL",
    phone: "+1 (555) 789-0123",
    email: "dr.thompson@familyhealing.com",
    website: "https://jenniferthompsontherapy.com",
    avatar: "https://images.unsplash.com/photo-1594824292159-7d4ba94d5b4a?w=150&h=150&fit=crop&crop=face",
    rating: 4.8,
    reviews: 134,
    verified: true,
    available: true,
    languages: ["English"],
    tags: ["family-therapy", "couples-therapy", "trauma-recovery"]
  }
]

const typeIcons = {
  lawyer: Scale,
  therapist: Heart,
  activist: Shield,
  "support-group": Users
}

const Support = () => {
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [locationFilter, setLocationFilter] = useState("all")
  const [availabilityFilter, setAvailabilityFilter] = useState("all")

  const filteredSupport = mockSupport.filter(support => {
    const matchesSearch = support.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         support.specialization.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         support.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         support.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesType = typeFilter === "all" || support.type === typeFilter
    const matchesLocation = locationFilter === "all" || support.location.toLowerCase().includes(locationFilter.toLowerCase())
    const matchesAvailability = availabilityFilter === "all" || 
                               (availabilityFilter === "available" && support.available) ||
                               (availabilityFilter === "unavailable" && !support.available)
    
    return matchesSearch && matchesType && matchesLocation && matchesAvailability
  })

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Professional Support
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Connect with verified lawyers, therapists, activists, and support groups 
            who specialize in helping survivors of gender-based violence.
          </p>
        </div>

        {/* Search and Filters */}
        <div className="max-w-6xl mx-auto mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Search className="h-5 w-5" />
                <span>Find Support</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search by name, specialization, or tags..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-full sm:w-40">
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
                  <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="Availability" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="unavailable">Unavailable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground">
              Available Support ({filteredSupport.length})
            </h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredSupport.map(support => {
              const IconComponent = typeIcons[support.type as keyof typeof typeIcons] || Users
              return (
                <Card key={support.id} className="group hover:shadow-lg transition-all duration-300">
                  <CardHeader>
                    <div className="flex items-start space-x-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={support.avatar} alt={support.name} />
                        <AvatarFallback>{support.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <CardTitle className="text-lg group-hover:text-primary transition-colors">
                            {support.name}
                          </CardTitle>
                          {support.verified && (
                            <CheckCircle className="h-4 w-4 text-success" />
                          )}
                        </div>
                        <div className="flex items-center space-x-2 mb-2">
                          <IconComponent className="h-4 w-4 text-primary" />
                          <Badge variant="outline" className="text-xs">
                            {support.type.replace('-', ' ')}
                          </Badge>
                          <Badge variant={support.available ? "default" : "secondary"} className="text-xs">
                            {support.available ? "Available" : "Unavailable"}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">
                          {support.title}
                        </p>
                        <p className="text-sm text-primary font-medium">
                          {support.specialization}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center space-x-1 mb-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium">{support.rating}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {support.reviews} reviews
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-4 line-clamp-3">
                      {support.description}
                    </CardDescription>
                    
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-4 w-4" />
                        <span>{support.location}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-4">
                      {support.tags.slice(0, 3).map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag.replace('-', ' ')}
                        </Badge>
                      ))}
                      {support.tags.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{support.tags.length - 3} more
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="default">
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Contact
                      </Button>
                      {support.phone && (
                        <Button size="sm" variant="outline">
                          <Phone className="h-4 w-4 mr-2" />
                          Call
                        </Button>
                      )}
                      {support.website && (
                        <Button size="sm" variant="outline">
                          <Globe className="h-4 w-4 mr-2" />
                          Website
                        </Button>
                      )}
                    </div>

                    {support.languages.length > 1 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs text-muted-foreground">
                          Languages: {support.languages.join(", ")}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {filteredSupport.length === 0 && (
            <div className="text-center py-12">
              <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No support services found</h3>
              <p className="text-muted-foreground">Try adjusting your search terms or filters.</p>
            </div>
          )}
        </div>

        {/* Emergency Support Section */}
        <div className="max-w-6xl mx-auto mt-12">
          <Card className="border-destructive/20 bg-destructive/5">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-destructive">
                <Shield className="h-5 w-5" />
                <span>Emergency Support</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Crisis Hotlines</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>National: 1-800-799-7233</li>
                    <li>Crisis Text: Text START to 88788</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Legal Emergency</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>Emergency Protection Orders</li>
                    <li>24/7 Legal Aid: 1-800-621-4357</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Immediate Safety</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>Emergency: 911</li>
                    <li>Safe Shelter: 1-800-942-6906</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default Support