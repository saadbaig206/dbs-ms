import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(4, 'Password must be at least 4 characters long'),
});

export const staffSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  role: z.string().min(2, 'Role is required'),
  salary: z.number().min(0, 'Salary must be a positive number'),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),
  email: z.string().email('Invalid email address'),
  joiningDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  status: z.enum(['Active', 'On Leave', 'Inactive']),
});

export const clientSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  phone: z.string().min(5, 'Phone number is required'),
  cnic: z.string().regex(/^\d{5}-\d{7}-\d{1}$/, 'CNIC must match format 12345-1234567-1').optional().or(z.literal('')),
  gender: z.enum(['Female', 'Male', 'Other']),
  age: z.number().int().min(0, 'Age must be a positive number'),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export const appointmentSchema = z.object({
  clientId: z.string().min(1, 'Client is required'),
  serviceId: z.string().min(1, 'Service is required'),
  staffId: z.string().min(1, 'Staff member is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  time: z.string().min(1, 'Time slot is required'),
  notes: z.string().optional(),
});
