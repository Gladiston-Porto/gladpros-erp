import { z } from "zod";

export const createEstimationItemSchema = z.object({
    pricebookItemId: z.number().int().optional(),
    name: z.string().min(1, "Name is required"),
    quantity: z.number().min(0.01, "Quantity must be greater than 0"),
    unit: z.string().default("EA"),
    unitCost: z.number().min(0, "Cost cannot be negative"),
    margin: z.number().max(100, "Margin cannot exceed 100%").default(40), // 40% default margin
    markup: z.number().min(0).optional(),
    taxable: z.boolean().default(true)
});

export const createEstimationOptionSchema = z.object({
    name: z.string().min(1, "Option name is required"), // e.g. "Good"
    items: z.array(createEstimationItemSchema).default([])
});

export const createEstimationSchema = z.object({
    clienteId: z.number().int().positive(),
    projetoId: z.number().int().positive().optional(),
    name: z.string().min(1, "Estimation name is required"), // e.g. "HVAC Replacement"
    options: z.array(createEstimationOptionSchema).min(1, "At least one option is required")
});

export type CreateEstimationInput = z.infer<typeof createEstimationSchema>;
