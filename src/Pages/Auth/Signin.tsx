import React from 'react'
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Image from "@/assets/safespacelogo.png"
import { Link } from "react-router-dom"
import { ArrowLeft } from "lucide-react"

const Signin = ({
    className,
    ...props
}: React.ComponentProps<"div">) => {
    return (
         <div>
            <Link to="/" className="absolute left-4 top-4 md:left-8 md:top-8 ">
                <Button variant="ghost" className="flex items-center gap-1 cursor-pointer">
                    <ArrowLeft className="h-5 w-5 text-primary" />
                    <span className="font-lora">Back</span>
                </Button>
            </Link>
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card className="overflow-hidden">
                <CardContent className="grid p-0 md:grid-cols-2">
                    <form className="p-6 md:p-8">
                        <div className="flex flex-col gap-6">
                            <div className="flex flex-col items-center text-center">
                                <h1 className="text-2xl font-Lora font-bold">Admin Login</h1>
                                <p className="text-balance font-pt-serif text-neutral-800">
                                    Login to your safe space account
                                </p>
                            </div>
                            <div className="grid gap-2 font-lexend-deca">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="m@example.com"
                                    required
                                />
                            </div>
                            <div className="grid gap-2 font-lexend-deca">
                                <div className="flex items-center">
                                    <Label htmlFor="password">Password</Label>
                                </div>
                                <Input id="password" type="password" required />
                            </div>
                            <Button type="submit">
                                Login
                            </Button>
                        </div>
                    </form>
                    <div className="relative hidden md:block">
                        <img
                            src={Image}
                            alt="Image"
                            className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
        </div>
    )
}

export default Signin