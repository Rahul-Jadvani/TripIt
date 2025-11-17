# Bold Design Component Patterns

This guide shows how to implement components using the bold, interactive design system. Each pattern includes both Tailwind CSS utilities and styled-components examples.

---

## 🔘 Button Patterns

### Primary Button - Tailwind CSS

```jsx
import { ReactNode } from 'react';

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export function PrimaryButton({ children, onClick, disabled, className }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        btn-primary
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className || ''}
      `}
    >
      {children}
    </button>
  );
}
```

### Primary Button - Styled Components

```jsx
import styled from 'styled-components';

const StyledButton = styled.button`
  padding: 12px 24px;
  font-size: 18px;
  font-weight: bold;
  background-color: #FFFF00;
  color: #000000;
  border: 4px solid #000000;
  border-radius: 15px;
  box-shadow: 4px 6px 0px rgba(0, 0, 0, 0.8);
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background-color: #FF1A7F;
    transform: translateX(-100%);
    z-index: -1;
    transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }

  &:hover {
    transform: translate(2px, 2px);
    box-shadow: 2px 3px 0px rgba(0, 0, 0, 0.8);
  }

  &:hover::after {
    transform: translateX(0);
  }

  &:active {
    filter: saturate(0.85);
    transform: translate(4px, 4px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export function PrimaryButton({ children, ...props }) {
  return <StyledButton {...props}>{children}</StyledButton>;
}
```

---

## 🎴 Card Patterns

### Interactive Project Card

```jsx
import { Card } from '@/components/ui/card';

interface ProjectCardProps {
  title: string;
  tagline: string;
  score: number;
  creator: string;
  creatorVerified?: boolean;
  date: string;
  technologies: string[];
  stats: {
    upvotes: number;
    comments: number;
    badges: number;
  };
  onAction?: () => void;
}

export function ProjectCard({
  title,
  tagline,
  score,
  creator,
  creatorVerified,
  date,
  technologies,
  stats,
  onAction,
}: ProjectCardProps) {
  return (
    <div className="card-interactive overflow-hidden cursor-pointer" onClick={onAction}>
      <div className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-foreground line-clamp-2">
              {title}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {tagline}
            </p>
          </div>

          {/* Score Badge */}
          <div className="flex-shrink-0 badge-primary text-center py-3 px-4">
            <div className="text-2xl font-black text-foreground">{score}</div>
            <div className="text-xs font-bold text-foreground">Score</div>
          </div>
        </div>

        {/* Creator Info */}
        <div className="flex items-center gap-3 border-t-4 border-black pt-3">
          <div className="w-8 h-8 rounded-full bg-primary font-bold flex items-center justify-center text-foreground">
            {creator[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground">
              {creator}
              {creatorVerified && <span className="badge-success ml-2 inline">✓</span>}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {date}
            </p>
          </div>
        </div>

        {/* Tech Stack */}
        <div className="flex flex-wrap gap-2 pt-2">
          {technologies.slice(0, 3).map((tech) => (
            <span key={tech} className="badge-muted text-xs">
              {tech}
            </span>
          ))}
          {technologies.length > 3 && (
            <span className="badge-muted text-xs">
              +{technologies.length - 3}
            </span>
          )}
        </div>

        {/* Stats Footer */}
        <div className="flex items-center justify-between border-t-4 border-black pt-4">
          <div className="flex gap-6 text-sm font-bold">
            <span>👍 {stats.upvotes}</span>
            <span>💬 {stats.comments}</span>
            {stats.badges > 0 && <span>🏆 {stats.badges}</span>}
          </div>

          <div className="flex gap-2">
            <button className="btn-secondary px-3 py-2 text-sm">Demo</button>
            <button className="btn-secondary px-3 py-2 text-sm">Code</button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 🏷️ Badge System

### Badge Component

```jsx
type BadgeType = 'primary' | 'success' | 'muted';

interface BadgeProps {
  children: ReactNode;
  type?: BadgeType;
  icon?: ReactNode;
  className?: string;
}

export function Badge({ children, type = 'muted', icon, className }: BadgeProps) {
  const badgeClass = {
    primary: 'badge-primary',
    success: 'badge-success',
    muted: 'badge-muted',
  }[type];

  return (
    <span className={`${badgeClass} ${className || ''}`}>
      {icon && <span className="mr-1">{icon}</span>}
      {children}
    </span>
  );
}

// Usage
<Badge type="primary">✓ Verified</Badge>
<Badge type="success">✓ Complete</Badge>
<Badge type="muted">+3 more</Badge>
```

---

## 🔗 Link Patterns

### Custom Link with Animation

```jsx
import { Link } from 'react-router-dom';

interface CustomLinkProps {
  to: string;
  children: ReactNode;
  external?: boolean;
  className?: string;
}

export function CustomLink({ to, children, external, className }: CustomLinkProps) {
  const Element = external ? 'a' : Link;
  const props = external ? { href: to, target: '_blank', rel: 'noopener noreferrer' } : { to };

  return (
    <Element
      {...props}
      className={`text-primary font-bold relative inline-block transition-all duration-250 ${className || ''}`}
    >
      {children}
    </Element>
  );
}

// Styled version
const StyledLink = styled(Link)`
  color: #ffff00;
  font-weight: 600;
  position: relative;
  text-decoration: none;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);

  &::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 0;
    width: 0;
    height: 3px;
    background-color: #ff1a7f;
    transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }

  &:hover::after {
    width: 100%;
  }
`;
```

---

## 📝 Form Patterns

### Form Wrapper

```jsx
interface FormProps {
  title: string;
  onSubmit: (data: any) => void;
  children: ReactNode;
  submitLabel?: string;
}

export function Form({ title, onSubmit, children, submitLabel = 'Submit' }: FormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {title && (
        <h2 className="text-3xl font-bold text-foreground">
          {title}
        </h2>
      )}

      {children}

      <button type="submit" className="btn-primary w-full">
        {submitLabel}
      </button>
    </form>
  );
}

// Usage
<Form title="New Project" onSubmit={handleSubmit} submitLabel="Create">
  <div className="space-y-4">
    <FormField label="Title" name="title" />
    <FormField label="Description" name="description" as="textarea" />
  </div>
</Form>
```

### Form Field

```jsx
interface FormFieldProps {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  error?: string;
  as?: 'input' | 'textarea' | 'select';
}

export function FormField({
  label,
  name,
  type = 'text',
  placeholder,
  error,
  as = 'input',
}: FormFieldProps) {
  const Element = as;

  return (
    <div className="space-y-2">
      <label htmlFor={name} className="block font-bold text-foreground">
        {label}
      </label>

      <Element
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        className={`
          w-full px-4 py-3 rounded-[15px]
          bg-card text-foreground
          border-2 border-black
          font-medium
          focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary
          ${error ? 'border-destructive' : ''}
        `}
      />

      {error && (
        <p className="text-sm font-bold text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
```

---

## 🎬 Animation Utilities

### Slide-In Animation

```jsx
const SlideInContainer = styled.div`
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background-color: var(--accent);
    transform: translateX(-100%);
    z-index: -1;
    transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }

  &:hover::before {
    transform: translateX(0);
  }
`;
```

### Hover Lift

```jsx
const HoverLift = styled.div`
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    transform: translate(2px, 2px);
  }
`;
```

---

## 🧩 Complete Example: Project List

```jsx
import { useState } from 'react';
import { ProjectCard } from '@/components/ProjectCard';
import { PrimaryButton } from '@/components/Button';

export function ProjectsList() {
  const [projects, setProjects] = useState([
    {
      id: '1',
      title: 'DeFi Lending Platform',
      tagline: 'Decentralized lending with AI risk assessment',
      score: 85,
      creator: 'Alice Dev',
      creatorVerified: true,
      date: 'Mar 15, 2024',
      technologies: ['Solidity', 'React', 'TensorFlow'],
      stats: { upvotes: 234, comments: 45, badges: 1 },
    },
    // More projects...
  ]);

  const [isLoading, setIsLoading] = useState(false);

  const handleLoadMore = async () => {
    setIsLoading(true);
    // Fetch more projects
    setIsLoading(false);
  };

  return (
    <section className="py-12">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl font-black text-foreground mb-4">
            Discover Projects
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Explore amazing hackathon projects from talented builders worldwide.
          </p>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              {...project}
              onAction={() => console.log('View project', project.id)}
            />
          ))}
        </div>

        {/* Load More */}
        {projects.length > 0 && (
          <div className="mt-12 text-center">
            <PrimaryButton onClick={handleLoadMore} disabled={isLoading}>
              {isLoading ? 'Loading...' : 'Load More Projects'}
            </PrimaryButton>
          </div>
        )}
      </div>
    </section>
  );
}
```

---

## 🎨 Design Token References

### Spacing
```jsx
// Tailwind
className="p-6"     // 24px padding
className="gap-4"   // 16px gap
className="mb-12"   // 48px margin-bottom

// CSS Variables
padding: 24px;      // lg
gap: 16px;          // md
margin-bottom: 48px;// 2xl
```

### Colors
```jsx
// Background
className="bg-background"  // #141414
className="bg-card"        // #1F1F1F

// Text
className="text-foreground"        // #FAFAFA
className="text-muted-foreground"  // #BDBDBD

// Accents
className="bg-primary"     // #FFFF00
className="bg-accent"      // #FF1A7F
className="bg-success"     // #00CC00
```

### Shadows
```jsx
// Buttons
box-shadow: 4px 6px 0px rgba(0, 0, 0, 0.8);

// Cards
box-shadow: 6px 8px 0px rgba(0, 0, 0, 0.6);

// On Hover
box-shadow: 2px 3px 0px rgba(0, 0, 0, 0.8);
```

---

## ✅ Implementation Checklist

- [ ] Use semantic button components (PrimaryButton, SecondaryButton)
- [ ] Apply card patterns for containers
- [ ] Use badge system for labels and tags
- [ ] Implement form fields with proper styling
- [ ] Add hover states with translate(2px, 2px)
- [ ] Use 250ms transitions for all animations
- [ ] Bold typography with proper hierarchy
- [ ] 4px thick black borders on interactive elements
- [ ] Proper spacing (4px grid system)
- [ ] Yellow primary color, pink accents
- [ ] Test accessibility (focus states, contrast)
- [ ] Test on mobile and desktop

---

**Last Updated**: October 2025
**Version**: 1.0 - Production Ready
