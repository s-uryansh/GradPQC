import { z } from "zod"

export const UserSchema = z.object({
  id: z.string(), 
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password_hash: z.string(),
  created_at: z.date().optional(),
})

export type User = z.infer<typeof UserSchema>

export const CreateUserSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(8)
})

export type CreateUser = z.infer<typeof CreateUserSchema>