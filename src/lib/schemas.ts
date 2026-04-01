import { z } from "zod"

export const branchSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    address: z.string().min(5, "Address must be at least 5 characters"),
    phone: z.string().min(10, "Phone number must be at least 10 digits"),
    logo: z.string().url("Must be a valid URL").optional().or(z.literal("")),
})

export type BranchFormValues = z.infer<typeof branchSchema>

export const userSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal("")),
    role: z.enum(["SUPER_ADMIN", "BRANCH_MANAGER", "STAFF", "THIRD_PARTY"]),
    branchId: z.string().optional(),
})

export type UserFormValues = z.infer<typeof userSchema>

export const createUserSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    role: z.enum(["SUPER_ADMIN", "BRANCH_MANAGER", "STAFF", "THIRD_PARTY"]),
    branchId: z.string().optional(),
})

export const productSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    category: z.string().min(2, "Category is required"),
    basePrice: z.coerce.number().min(0, "Price must be a positive number"),
    totalStock: z.coerce.number().min(0, "Total stock must be a positive number"),
    image: z.string().url("Must be a valid URL").optional().or(z.literal("")),
})

export type ProductFormValues = z.infer<typeof productSchema>

export const inventorySchema = z.object({
    branchId: z.string().min(1, "Branch ID is required"),
    productId: z.string().min(1, "Product ID is required"),
    quantity: z.coerce.number().min(0, "Quantity must be 0 or more"),
})

export type InventoryFormValues = z.infer<typeof inventorySchema>

export const customerSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    phone: z.string()
        .length(10, "Phone number must be exactly 10 digits")
        .regex(/^\d+$/, "Phone number must contain only digits"),
    address: z.string().optional(),
    notes: z.string().optional(),
})

export type CustomerFormValues = z.infer<typeof customerSchema>

export const orderItemSchema = z.object({
    productId: z.string().min(1),
    quantity: z.number().min(1),
    unitPrice: z.number().min(0),
})

export const orderSchema = z.object({
    customerId: z.string().min(1, "Customer is required"),
    branchId: z.string().min(1, "Branch is required"),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    items: z.array(orderItemSchema).min(1, "Order must have at least one item"),
    totalAmount: z.number().min(0),
    paidAmount: z.number().min(0).optional(),
    paymentMethod: z.enum(["CASH", "UPI", "TRANSFER"]).optional(),
}).superRefine((data, ctx) => {
    if (data.endDate < data.startDate) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "End date cannot be before start date",
            path: ["endDate"],
        })
    }
    if (typeof data.paidAmount === "number" && data.paidAmount > data.totalAmount) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Paid amount cannot exceed total amount",
            path: ["paidAmount"],
        })
    }
})

export type OrderFormValues = z.infer<typeof orderSchema>

export const paymentSchema = z.object({
    orderId: z.string().min(1),
    amount: z.coerce.number().min(1),
    method: z.enum(["CASH", "UPI", "TRANSFER"]),
})

export type PaymentFormValues = z.infer<typeof paymentSchema>

export const enquiryItemSchema = z.object({
    productId: z.string().min(1, "Product is required"),
    quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
    quotedUnitPrice: z.coerce.number().min(0, "Quoted unit price cannot be negative").optional(),
})

export const publicEnquirySchema = z.object({
    customerName: z.string().min(2, "Customer name is required"),
    customerPhone: z.string()
        .min(10, "Phone number must be at least 10 digits")
        .regex(/^\d+$/, "Phone number must contain only digits"),
    customerEmail: z.string().email("Invalid email").optional().or(z.literal("")),
    customerAddress: z.string().optional(),
    requirements: z.string().optional(),
    branchId: z.string().min(1, "Branch is required"),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    items: z.array(enquiryItemSchema.omit({ quotedUnitPrice: true })).min(1, "At least one product is required"),
}).superRefine((data, ctx) => {
    if (data.endDate < data.startDate) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "End date cannot be before start date",
            path: ["endDate"],
        })
    }
})

export const enquiryAdminUpdateSchema = z.object({
    status: z.enum(["NEW", "QUOTED", "APPROVED", "DECLINED", "CONVERTED"]).optional(),
    quoteAmount: z.coerce.number().min(0).optional(),
    adminNotes: z.string().optional(),
    requirements: z.string().optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    items: z.array(enquiryItemSchema).optional(),
}).superRefine((data, ctx) => {
    if (data.startDate && data.endDate && data.endDate < data.startDate) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "End date cannot be before start date",
            path: ["endDate"],
        })
    }
})
