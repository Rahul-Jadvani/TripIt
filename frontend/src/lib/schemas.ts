import { z } from 'zod';

// Itinerary Publishing Schema (formerly publishProjectSchema)
export const publishProjectSchema = z.object({
  // Step 1: Basics
  title: z.string()
    .min(1, 'Itinerary title is required')
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title must be less than 200 characters'),

  tagline: z.string()
    .max(300, 'Teaser must be less than 300 characters')
    .optional()
    .default(''),

  description: z.string()
    .min(1, 'Trip overview is required')
    .min(50, 'Trip overview must be at least 50 characters')
    .max(5000, 'Trip overview must be less than 5000 characters'),

  destination: z.string()
    .min(1, 'Primary destination is required')
    .min(3, 'Destination must be at least 3 characters')
    .max(200, 'Destination must be less than 200 characters'),

  start_date: z.string()
    .min(1, 'Start date is required'),

  end_date: z.string()
    .min(1, 'End date is required'),

  duration_days: z.number()
    .min(1, 'Duration must be at least 1 day')
    .max(365, 'Duration must be less than 365 days')
    .optional(),

  difficulty_level: z.enum(['easy', 'moderate', 'hard', 'extreme'])
    .optional(),

  estimated_budget_min: z.number()
    .min(0)
    .optional(),

  estimated_budget_max: z.number()
    .min(0)
    .optional(),

  // Map Link (formerly githubUrl)
  githubUrl: z.string()
    .url('Invalid URL format')
    .optional()
    .or(z.literal('')),

  // Booking/Reference Link (formerly demoUrl)
  demoUrl: z.string()
    .url('Invalid URL format')
    .optional()
    .or(z.literal('')),

  // Step 2: Tags & Logistics
  techStack: z.array(z.string()).optional().default([]), // Safety & Gear Tags

  travel_type: z.string()
    .max(100)
    .optional()
    .default(''),

  // Step 3: Story & Safety
  hackathonName: z.string() // Day-by-Day Plan
    .max(10000, 'Day-by-day plan must be less than 10000 characters')
    .optional()
    .default(''),

  hackathonDate: z.string() // Safety Intelligence
    .max(5000, 'Safety notes must be less than 5000 characters')
    .optional()
    .default(''),
});

export type PublishProjectInput = z.infer<typeof publishProjectSchema>;

export const chainSchema = z.object({
  name: z.string()
    .min(1, 'Chain name is required')
    .min(3, 'Chain name must be at least 3 characters')
    .max(50, 'Chain name must be less than 50 characters'),

  description: z.string()
    .min(1, 'Description is required')
    .min(10, 'Description must be at least 10 characters')
    .max(500, 'Description must be less than 500 characters'),

  rules: z.string()
    .max(2000, 'Rules must be less than 2000 characters')
    .optional()
    .default(''),

  website: z.string()
    .url('Invalid URL format')
    .optional()
    .or(z.literal('')),

  twitter: z.string()
    .optional()
    .default(''),

  discord: z.string()
    .optional()
    .default(''),
});

export type CommunityFormInput = z.infer<typeof chainSchema>;
