# 0x.ship Design System & Guide

## 🎨 Design Philosophy

0x.ship uses a **modern, polished design** inspired by premium platforms like **DoraHacks** and **ProductHunt**. The design focuses on:

- **Clean aesthetics** with proper whitespace
- **Visual hierarchy** with clear typography
- **Micro-interactions** for better UX
- **Modern color palette** with cyan/blue gradients
- **Professional yet approachable** tone
- **Accessibility** and readability

---

## 🎯 Color Palette

### Primary Colors

```css
/* Deep Navy Dark Background */
--background: 210 40% 8%;  /* #0A1428 */

/* Almost White Foreground */
--foreground: 210 40% 98%; /* #F8F9FA */

/* Vibrant Cyan - Primary Action */
--primary: 180 100% 50%;   /* #00D4FF */

/* Card Background */
--card: 210 20% 15%;       /* #1E2A40 */

/* Subtle Borders */
--border: 210 20% 20%;     /* #293047 */

/* Muted Secondary Text */
--muted-foreground: 210 20% 70%; /* #8E9CB0 */
```

### Accent Colors

- **Success**: `120 100% 40%` (#00C853) - Green checkmarks
- **Destructive**: `0 84% 60%` (#FF5252) - Error states
- **Accent**: Cyan gradient for highlights

### Gradients

```css
/* Primary Gradient */
--gradient-primary: linear-gradient(135deg, #00D4FF 0%, #0099FF 100%);

/* Secondary Gradient */
--gradient-secondary: linear-gradient(135deg, #00D4FF 0%, #6366F1 100%);
```

---

## 📐 Typography System

### Headings

```css
h1 {
  font-size: 2.25rem;  /* 36px */
  font-weight: bold;
  letter-spacing: -0.02em;
}

h2 {
  font-size: 1.875rem; /* 30px */
  font-weight: 600;
}

h3 {
  font-size: 1.5rem;   /* 24px */
  font-weight: 600;
}
```

### Body Text

- **Large**: 1rem (16px) - Primary content
- **Regular**: 0.875rem (14px) - Secondary content
- **Small**: 0.75rem (12px) - Metadata, timestamps
- **XS**: 0.625rem (10px) - Labels, badges

### Font

- **Family**: Inter (system-ui fallback)
- **Line-height**: 1.5 for body, 1.3 for headings
- **Letter-spacing**: Normal for body, tighter for headings

---

## 🧩 Component Styles

### Cards

All cards use the `.card-interactive` class for consistency:

```css
.card-interactive {
  @apply bg-card rounded-lg border border-border
         shadow-sm hover:shadow-lg hover:border-primary
         transition-smooth;
}
```

**Features:**
- Subtle shadow that lifts on hover
- Border highlights on primary color on hover
- Smooth transitions
- Proper padding (24px)

### Buttons

#### Primary Button
```css
.btn-primary {
  background: linear-gradient(135deg, #00D4FF, #0099FF);
  color: #0A1428;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-weight: 500;
}

/* On hover: shadow increases */
/* On active: scale down slightly (0.95) */
```

#### Secondary Button
```css
.btn-secondary {
  background: #354662;
  color: #F8F9FA;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
}

/* On hover: background lightens */
```

### Badges

#### Badge Primary (Blue)
```html
<span class="badge-primary">
  ✓ Verified
</span>
```

Styling:
- Background: `#00D4FF / 10%` opacity
- Border: `#00D4FF / 20%` opacity
- Text color: `#00D4FF`
- Padding: 0.75rem 0.75rem
- Border-radius: full (9999px)
- Font-size: 0.875rem

#### Badge Success (Green)
```html
<span class="badge-success">
  ✓ Verified
</span>
```

#### Badge Muted
```html
<span class="badge-muted">
  +3 more
</span>
```

### Shadows

```css
--shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.25);
--shadow-md: 0 4px 16px rgba(0, 0, 0, 0.35);
--shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.4);
--shadow-glow: 0 0 20px rgba(0, 212, 255, 0.15);
```

---

## 🎬 Animations & Transitions

### Standard Transition
```css
transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
```

Applied to:
- Links
- Buttons (on hover)
- Cards (on hover)
- Input focus states

### Scale Animation (Button Press)
```css
active:scale-95; /* Subtle press feedback */
```

### Glow Effect
```css
.glow-accent {
  box-shadow: 0 0 20px rgba(0, 212, 255, 0.15);
}
```

---

## 📱 Layout & Spacing

### Container
```css
max-width: 1400px;
padding: 2rem;
centered with mx-auto;
```

### Spacing Scale

```
xs:  0.25rem (4px)
sm:  0.5rem  (8px)
md:  1rem    (16px)
lg:  1.5rem  (24px)
xl:  2rem    (32px)
2xl: 3rem    (48px)
```

### Grid Gaps

- Mobile: 1rem (16px)
- Desktop: 1.5rem (24px)
- Large: 2rem (32px)

---

## 🎨 Component Examples

### ProjectCard Design

**Structure:**
```
┌─────────────────────────────┐
│ ⭐ Title        Score: 85   │
│    Tagline                  │
├─────────────────────────────┤
│ 👤 Creator                  │
│    Hackathon • Date         │
├─────────────────────────────┤
│ [React] [Solidity] [+1]    │
│ [🥇 Gold] [🥈 Silver]      │
├─────────────────────────────┤
│ 👍 234  💬 45  🏆 2  🔗     │
└─────────────────────────────┘
```

**Key Features:**
- Score badge with gradient background
- Creator avatar + verification badge
- Tech tags (truncated to 3, +count)
- Achievement badges
- Footer with stats and action buttons

### Navbar Design

**Layout:**
```
🚀 0x.ship    Feed  Leaderboard  Search    [⚡ Publish] [👤 User]
```

**Features:**
- Logo with gradient glow effect
- Navigation items with hover states
- Publish button prominent
- User avatar dropdown
- Responsive (collapses on mobile)

---

## 🎯 Interaction Patterns

### Hover States

All interactive elements respond to hover:

```css
/* Link hover */
a:hover {
  color: #00D4FF;
  text-decoration: none;
}

/* Card hover */
.card-interactive:hover {
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  border-color: #00D4FF;
}

/* Button hover */
button:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
}
```

### Active States

```css
/* Button press */
button:active {
  transform: scale(0.95);
}

/* Tab active */
.tab[data-state="active"] {
  background-color: #00D4FF;
  color: #0A1428;
}
```

### Focus States

```css
/* Keyboard navigation */
:focus-visible {
  outline: 2px solid #00D4FF;
  outline-offset: 2px;
}
```

---

## 🌈 Brand Elements

### Icons

- **Library**: Lucide React
- **Size**: Typically 16px (body), 20px (headers)
- **Color**: Matches text color, or primary for actions
- **Spacing**: 0.5rem gap from text

### Logo Variations

**Main Logo**: Rocket icon with gradient glow

**Favicon**: Single rocket icon

**Word Mark**: "0x.ship" in cyan gradient

---

## ♿ Accessibility Features

### Color Contrast

- Foreground text on dark background: 16:1 ratio ✅
- Muted text on dark background: 8:1 ratio ✅
- Colors not used alone for meaning

### Typography

- Base font size: 16px minimum
- Line height: 1.5 for body text
- Line length: Max 65 characters for optimal readability

### Interactive Elements

- Minimum touch target: 44x44px
- Clear focus indicators
- No reliance on color alone
- Semantic HTML structure

---

## 📐 Responsive Design

### Breakpoints

```css
/* Mobile first approach */
sm:  640px   - Tablets
md:  768px   - Small desktops
lg:  1024px  - Large desktops
xl:  1280px  - Extra large
2xl: 1536px  - Full width
```

### Mobile-First Layout

- Single column on mobile
- Cards full width with padding
- Navigation simplified
- Typography scaled appropriately

### Desktop Layout

- Multi-column layouts
- Sidebar navigation
- Full-width cards with constraints
- Larger typography

---

## 🚀 Performance

### CSS Optimization

- Minimal vendor prefixes (modern browsers)
- CSS-in-JS via Tailwind utility classes
- No unused CSS (tree-shaking)
- Hardware acceleration for animations

### Image Optimization

- WebP format with fallbacks
- Lazy loading for below-fold content
- Responsive images with srcset

---

## 📋 Design Checklist

When creating new components:

- [ ] Use semantic colors from design system
- [ ] Apply proper typography hierarchy
- [ ] Add hover/focus states
- [ ] Use consistent spacing (4px grid)
- [ ] Ensure 16:1 color contrast for text
- [ ] Mobile responsive design
- [ ] Smooth transitions (0.3s easing)
- [ ] Proper shadow elevation
- [ ] Icon sizing and alignment
- [ ] Accessible focus states

---

## 🎨 Design Tools

- **Colors**: HSL for CSS variables
- **Typography**: Inter font family
- **Icons**: Lucide React (25 commonly used)
- **Components**: Shadcn/ui + custom
- **Animations**: Tailwind CSS + custom easing

---

## 📖 Related Files

- `src/index.css` - Design tokens and custom utilities
- `tailwind.config.ts` - Tailwind configuration
- `src/components/` - Component implementations
- `src/pages/` - Page layouts

---

**Last Updated**: October 2025
**Version**: 1.0 - Production Ready
