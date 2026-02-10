import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import prisma from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { User, Mail, Shield, Building, Phone } from "lucide-react"

export default async function ProfilePage() {
    const session = await getServerSession(authOptions)

    if (!session) {
        redirect("/login")
    }

    const user = await prisma.user.findUnique({
        where: {
            id: session.user.id
        },
        include: {
            branch: true
        }
    })

    if (!user) {
        return <div>User not found</div>
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Profile</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="col-span-4 md:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Personal Information
                        </CardTitle>
                        <User className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col gap-6 mt-4">
                            <div className="flex items-center gap-4">
                                <Avatar className="h-20 w-20">
                                    <AvatarImage src="" alt={user.name || "User"} />
                                    <AvatarFallback className="text-xl">
                                        {user.name?.slice(0, 2).toUpperCase() || "US"}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <h3 className="text-2xl font-bold">{user.name}</h3>
                                    <div className="flex items-center gap-2 text-muted-foreground mt-1">
                                        <Badge variant="outline">{user.role.replace("_", " ")}</Badge>
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-1">
                                <p className="text-sm font-medium leading-none text-muted-foreground">Email</p>
                                <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-lg">{user.email}</span>
                                </div>
                            </div>

                            <div className="grid gap-1">
                                <p className="text-sm font-medium leading-none text-muted-foreground">User ID</p>
                                <div className="flex items-center gap-2">
                                    <Shield className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-mono text-sm">{user.id}</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {user.branch && (
                    <Card className="col-span-4 md:col-span-2">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Branch Information
                            </CardTitle>
                            <Building className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col gap-6 mt-4">
                                <div className="flex items-center gap-4">
                                    <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <Building className="h-8 w-8 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold">{user.branch.name}</h3>
                                        <p className="text-sm text-muted-foreground">{user.branch.address}</p>
                                    </div>
                                </div>

                                <div className="grid gap-1">
                                    <p className="text-sm font-medium leading-none text-muted-foreground">Contact</p>
                                    <div className="flex items-center gap-2">
                                        <Phone className="h-4 w-4 text-muted-foreground" />
                                        <span>{user.branch.phone}</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
