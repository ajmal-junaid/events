import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar"

export function RecentSales({ data }: { data: any[] }) {
    return (
        <div className="space-y-4 md:space-y-8">
            {data.map((order) => (
                <div className="flex items-center" key={order.id}>
                    <Avatar className="h-9 w-9">
                        <AvatarImage src="/avatars/01.png" alt="Avatar" />
                        <AvatarFallback>{order.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="ml-4 space-y-1">
                        <p className="text-sm font-medium leading-none">{order.name}</p>
                        <p className="text-sm text-muted-foreground">
                            {order.email}
                        </p>
                    </div>
                    <div className="ml-auto font-medium">
                        {new Intl.NumberFormat("en-IN", {
                            style: "currency",
                            currency: "INR",
                        }).format(order.amount)}
                    </div>
                </div>
            ))}
        </div>
    )
}
