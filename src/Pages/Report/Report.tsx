import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Lock, AlertTriangle, FileText, Upload } from "lucide-react"
import { Navbar } from "@/components/utils/Navbar"
import { Footer } from "@/components/utils/Footer"
import { FileUpload } from "@/components/ui/file-upload"

const Report = () => {
    const [isAnonymous, setIsAnonymous] = useState(false)
    const [reportType, setReportType] = useState("")

    return (
        <div>
            <Navbar />
            <main className="container mx-auto px-4 py-8">
                {/* Header Section */}
                <div className="max-w-4xl mx-auto mb-8">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Secure Incident Reporting</h1>
                        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                            Your safety and privacy are our top priorities. This secure form allows you to report incidents
                            confidentially and connect with appropriate support services.
                        </p>
                    </div>

                    {/* Security Notice */}
                    <Card className="border-green-200 bg-green-50 mb-8">
                        <CardContent className="pt-6">
                            <div className="flex items-start space-x-3">
                                <Lock className="h-6 w-6 text-green-600 mt-1" />
                                <div>
                                    <h3 className="font-semibold text-green-800 mb-2">Your Report is Secure</h3>
                                    <ul className="text-sm text-green-700 space-y-1">
                                        <li>• All information is encrypted and stored securely</li>
                                        <li>• You can choose to remain anonymous</li>
                                        <li>• Your report will only be shared with authorized support personnel</li>
                                        <li>• You control what information you share and when</li>
                                    </ul>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Emergency Notice */}
                    <Card className="border-red-200 bg-red-50 mb-8">
                        <CardContent className="pt-6">
                            <div className="flex items-start space-x-3">
                                <AlertTriangle className="h-6 w-6 text-red-600 mt-1" />
                                <div>
                                    <h3 className="font-semibold text-red-800 mb-2">In Immediate Danger?</h3>
                                    <p className="text-sm text-red-700 mb-3">
                                        If you are in immediate physical danger, please call 911 or your local emergency services.
                                    </p>
                                    <Button asChild className="bg-red-600 hover:bg-red-700 text-white">
                                        <a href="/crisis-support">Get Emergency Help</a>
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Report Form */}
                <div className="max-w-4xl mx-auto">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                                <FileText className="h-6 w-6" />
                                <span>Incident Report Form</span>
                            </CardTitle>
                            <CardDescription>
                                Please provide as much detail as you feel comfortable sharing. All fields marked with * are required.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <form className="space-y-6">
                                {/* Anonymous Reporting Option */}
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="anonymous"
                                        checked={isAnonymous}
                                        onCheckedChange={checked => setIsAnonymous(checked === true)}
                                    />
                                    <Label htmlFor="anonymous" className="text-sm font-medium">
                                        I want to submit this report anonymously
                                    </Label>
                                </div>

                                {/* Contact Information (if not anonymous) */}
                                {!isAnonymous && (
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="firstName">First Name *</Label>
                                            <Input id="firstName" placeholder="Enter your first name" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="lastName">Last Name *</Label>
                                            <Input id="lastName" placeholder="Enter your last name" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="email">Email Address *</Label>
                                            <Input id="email" type="email" placeholder="Enter your email" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="phone">Phone Number (Optional)</Label>
                                            <Input id="phone" type="tel" placeholder="Enter your phone number" />
                                        </div>
                                    </div>
                                )}

                                {/* Incident Type */}
                                <div className="space-y-2">
                                    <Label htmlFor="incidentType">Type of Incident *</Label>
                                    <Select value={reportType} onValueChange={setReportType}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select the type of incident" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="domestic-violence">Domestic Violence</SelectItem>
                                            <SelectItem value="sexual-assault">Sexual Assault</SelectItem>
                                            <SelectItem value="harassment">Harassment</SelectItem>
                                            <SelectItem value="stalking">Stalking</SelectItem>
                                            <SelectItem value="workplace-abuse">Workplace Abuse</SelectItem>
                                            <SelectItem value="online-abuse">Online Abuse</SelectItem>
                                            <SelectItem value="other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Incident Details */}
                                <div className="space-y-2">
                                    <Label htmlFor="incidentDescription">Incident Description *</Label>
                                    <Textarea
                                        id="incidentDescription"
                                        placeholder="Please describe what happened. Include as much detail as you feel comfortable sharing."
                                        className="min-h-[120px]"
                                    />
                                </div>

                                {/* Date and Location */}
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="incidentDate">Date of Incident</Label>
                                        <Input id="incidentDate" type="date" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="incidentLocation">Location (Optional)</Label>
                                        <Input id="incidentLocation" placeholder="City, State or general area" />
                                    </div>
                                </div>
                                {/* Evidence Upload */}
                                <div className="space-y-2">
                                    <Label className="flex items-center">
                                        <Upload className="h-4 w-4 mr-2" />
                                        Evidence (Optional)
                                    </Label>
                                    <div className="w-full max-w-4xl mx-auto min-h-96 border border-dashed bg-white border-neutral-200 rounded-lg">
                                        <FileUpload/>
                                        <p className="text-xs text-gray-500 mt-1 flex justify-center text-center">
                                            Files are encrypted and stored securely
                                        </p>
                                    </div>
                                </div>
                                {/* Perpetrator Information */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold">Perpetrator Information (Optional)</h3>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="perpetratorName">Name (if known)</Label>
                                            <Input id="perpetratorName" placeholder="Enter name if known" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="relationship">Relationship to You</Label>
                                            <Select>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select relationship" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="partner">Current/Former Partner</SelectItem>
                                                    <SelectItem value="family">Family Member</SelectItem>
                                                    <SelectItem value="friend">Friend/Acquaintance</SelectItem>
                                                    <SelectItem value="coworker">Coworker</SelectItem>
                                                    <SelectItem value="stranger">Stranger</SelectItem>
                                                    <SelectItem value="other">Other</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>

                                {/* Support Needed */}
                                <div className="space-y-2">
                                    <Label htmlFor="supportNeeded">What kind of support are you looking for?</Label>
                                    <Textarea
                                        id="supportNeeded"
                                        placeholder="Let us know how we can best support you (counseling, legal aid, safety planning, etc.)"
                                        className="min-h-[80px]"
                                    />
                                </div>

                                {/* Consent and Submission */}
                                <div className="space-y-4">
                                    <div className="flex items-start space-x-2">
                                        <Checkbox id="consent" />
                                        <Label htmlFor="consent" className="text-sm leading-relaxed">
                                            I understand that this report will be reviewed by trained professionals and that appropriate
                                            support resources will be provided. I consent to being contacted (if I provided contact
                                            information) regarding this report and available services.
                                        </Label>
                                    </div>

                                    <div className="flex items-start space-x-2">
                                        <Checkbox id="accuracy" />
                                        <Label htmlFor="accuracy" className="text-sm leading-relaxed">
                                            I certify that the information provided in this report is accurate to the best of my knowledge.
                                        </Label>
                                    </div>
                                </div>

                                {/* Submit Button */}
                                <div className="flex flex-col sm:flex-row gap-4 pt-6">
                                    <Button type="submit">
                                        Submit Report
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                {/* Additional Resources */}
                <div className="max-w-4xl mx-auto mt-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Need Immediate Support?</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <h4 className="font-semibold mb-2">National Hotlines</h4>
                                    <ul className="text-sm space-y-1 text-gray-600">
                                        <li>National Domestic Violence Hotline: </li>
                                        <li>Sexual Assault Hotline: </li>
                                        <li>Crisis Text Line: </li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-semibold mb-2">Online Resources</h4>
                                    <ul className="text-sm space-y-1">
                                        <li>
                                            <a href="/resources" className="text-primary hover:underline">
                                                Local Support Services
                                            </a>
                                        </li>
                                        <li>
                                            <a href="/education" className="text-primary hover:underline">
                                                Safety Planning Guide
                                            </a>
                                        </li>
                                        <li>
                                            <a href="/crisis-support" className="text-primary hover:underline">
                                                Emergency Resources
                                            </a>
                                        </li>
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

export default Report