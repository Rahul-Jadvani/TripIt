import { z } from 'zod';

export const publishProjectSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .min(5, 'Title must be at least 5 characters')
    .max(100, 'Title must be less than 100 characters'),
  
  description: z.string()
    .min(1, 'Description is required')
    .min(50, 'Description must be at least 50 characters')
    .max(2000, 'Description must be less than 2000 characters'),
  
  tagline: z.string()
    .max(200, 'Tagline must be less than 200 characters')
    .optional()
    .default(''),
  
  demoUrl: z.string()
    .url('Invalid URL format')
    .optional()
    .or(z.literal('')),
  
  githubUrl: z.string()
    .min(1, 'GitHub URL is required')
    .url('Invalid URL format'),
  
  hackathonName: z.string()
    .max(200, 'Hackathon name must be less than 200 characters')
    .optional()
    .default(''),
  
  hackathonDate: z.string()
    .optional()
    .default(''),
  
  techStack: z.array(z.string()).optional().default([]),
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

export type ChainFormInput = z.infer<typeof chainSchema>;
