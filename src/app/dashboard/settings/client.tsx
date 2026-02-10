"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ProfileSettings } from "./profile-settings"
import { User, Lock, Bell } from "lucide-react"

interface SettingsClientProps {
    user: {
        id: string
        name?: string | null
        email?: string | null
        role?: string | null
    }
}

export function SettingsClient({ user }: SettingsClientProps) {
    return (
        <Tabs defaultValue="profile" className="space-y-4">
            <TabsList>
                <TabsTrigger value="profile" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Profile
                </TabsTrigger>
                <TabsTrigger value="password" className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Password
                </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-4">
                <ProfileSettings user={user} />
            </TabsContent>

            <TabsContent value="password" className="space-y-4">
                <div>Password settings temporarily disabled</div>
            </TabsContent>
        </Tabs>
    )
}
