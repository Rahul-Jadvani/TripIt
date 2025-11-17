# Bold Interactive Design System

## Overview

This design system uses **bold colors, thick borders, strong shadows, and interactive animations** to create a playful yet professional interface. Every element communicates with confidence and provides clear interactive feedback.

---

## 🎨 Color Palette

### Primary Colors

| Name | Value | Hex | Usage |
|------|-------|-----|-------|
| **Background** | `0 0% 8%` | `#141414` | Main page background |
| **Foreground** | `0 0% 98%` | `#FAFAFA` | Text on background |
| **Card** | `0 0% 12%` | `#1F1F1F` | Card backgrounds |
| **Primary** | `51 100% 50%` | `#FFFF00` | Yellow buttons, accents |
| **Accent** | `330 100% 55%` | `#FF1A7F` | Pink hover states |
| **Secondary** | `0 0% 25%` | `#404040` | Secondary buttons |
| **Success** | `120 100% 45%` | `#00CC00` | Success states |
| **Destructive** | `0 100% 60%` | `#FF3333` | Error states |

### Special Effects

- **Thick Border**: `4px solid #000000`
- **Button Shadow**: `4px 6px 0px rgba(0, 0, 0, 0.8)` (offset down-right)
- **Button Hover Shadow**: `2px 3px 0px rgba(0, 0, 0, 0.8)` (reduced on hover)
- **Card Shadow**: `6px 8px 0px rgba(0, 0, 0, 0.6)`
- **Card Hover Shadow**: `8px 10px 0px rgba(0, 0, 0, 0.6)`

---

## 🔘 Buttons

### Primary Button

```jsx
<button className="btn-primary">
  Click Me
</button>
```

**Features:**
- Yellow background (#FFFF00)
- 4px thick black border
- 4px 6px black shadow
- Hover: Translates 2px down-right, shadow reduces to 2px 3px
- Hover: Pink background slides in from left
- Active: Saturate filter (85%), translates 4px down-right
- Text color: Black
- Font: Bold, 18px

### Secondary Button

```jsx
<button className="btn-secondary">
  Secondary
</button>
```

**Features:**
- Dark gray background (#404040)
- Same border and shadow as primary
- Hover: Darker gray slides in
- Active: Saturate filter
- White text

### Button Variants

#### With Icon
```jsx
<button className="btn-primary flex items-center gap-2">
  <Icon size={20} />
  <span>Action</span>
</button>
```

#### Loading State
```jsx
<button className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
  {isLoading ? 'Loading...' : 'Submit'}
</button>
```

---

## 🎴 Cards

### Basic Card

```jsx
<div className="card-elevated p-6">
  <h3>Card Title</h3>
  <p>Card content goes here</p>
</div>
```

**Features:**
- Dark background (#1F1F1F)
- 4px thick black border
- 6px 8px offset shadow
- Hover: Translates 2px down-right, shadow increases to 8px 10px
- 15px border radius
- Padding: 24px

### Interactive Card

```jsx
<div className="card-interactive p-6 cursor-pointer">
  <h3>Click Card</h3>
  <p>Pink slides in on hover</p>
</div>
```

**Features:**
- Same as basic card
- Pink background (with ::before pseudo-element) slides in from left on hover
- Creates a "reveal" animation effect

### Card Grid

```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <div className="card-elevated">...</div>
  <div className="card-interactive">...</div>
</div>
```

---

## 🏷️ Badges

### Primary Badge
```jsx
<span className="badge-primary">✓ Verified</span>
```
- Yellow background, black border, black text

### Success Badge
```jsx
<span className="badge-success">✓ Complete</span>
```
- Green background, black border, black text

### Muted Badge
```jsx
<span className="badge-muted">+3 more</span>
```
- Dark gray background, black border, white text

### Styling
- Padding: 8px 16px (py-2 px-4)
- Border: 2px solid black
- Border radius: full (rounded-full)
- Font: Bold, 14px
- Display: inline-flex with gap-1

---

## 🔗 Links

```jsx
<a href="/page">Click here</a>
```

**Features:**
- Yellow text (#FFFF00)
- Bold weight (600)
- Animated underline: Pink (accent) line slides in from left
- 250ms animation
- Hover: Underline extends to full width

**Styling:**
```css
a {
  color: var(--primary); /* Yellow */
  font-weight: 600;
  position: relative;
}

a::after {
  content: "";
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 0;
  height: 3px;
  background-color: var(--accent); /* Pink */
  transition: var(--transition-quick); /* 250ms */
}

a:hover::after {
  width: 100%;
}
```

---

## 📝 Form Elements

### Input Field

```jsx
<input
  type="text"
  placeholder="Enter text..."
  className="w-full"
/>
```

**Features:**
- Dark gray background
- 2px solid black border
- 15px border radius
- Yellow focus state (border + glow)
- Font weight: 500
- Padding: 12px 16px

### Styled Form

```jsx
<form className="space-y-6">
  <div>
    <label className="block font-bold mb-2">
      Name
    </label>
    <input type="text" placeholder="Your name" />
  </div>

  <div>
    <label className="block font-bold mb-2">
      Email
    </label>
    <input type="email" placeholder="your@email.com" />
  </div>

  <button type="submit" className="btn-primary w-full">
    Submit
  </button>
</form>
```

---

## ✏️ Typography

### Headings

```jsx
<h1>Major Heading</h1>        {/* 3rem, font-black */}
<h2>Section Heading</h2>      {/* 2.25rem, font-bold */}
<h3>Subsection Heading</h3>   {/* 1.875rem, font-bold */}
<h4>Minor Heading</h4>        {/* 1.5rem, font-bold */}
<h5>Small Heading</h5>        {/* 1.25rem, font-bold */}
<h6>Tiny Heading</h6>         {/* 1.25rem, font-bold */}
```

**Features:**
- All bold or font-black
- Tight letter spacing
- Dark text on light background

### Body Text

```jsx
<p className="text-lg leading-relaxed">
  Regular paragraph text with good readability.
</p>

<p className="text-sm text-muted-foreground">
  Muted secondary text
</p>
```

---

## 🎬 Animations & Transitions

### Quick Transitions
All interactive elements use **250ms** animations (not 300ms):

```css
transition: var(--transition-quick); /* all 0.25s */
```

### Hover Effects

#### Translate/Lift
```css
.hover-lift:hover {
  transform: translate(2px, 2px);
}
```

#### Slide Background
```css
.element::after {
  background: var(--accent);
  transform: translateX(-100%);
  transition: var(--transition-quick);
}

.element:hover::after {
  transform: translateX(0);
}
```

#### Underline Expand
```css
.link::after {
  width: 0;
  transition: var(--transition-quick);
}

.link:hover::after {
  width: 100%;
}
```

### Active States

```css
.btn-primary:active {
  filter: saturate(0.85);
  transform: translate(4px, 4px);
}
```

---

## 🧩 Component Examples

### Project Card

```jsx
<div className="card-interactive overflow-hidden">
  <div className="p-6 space-y-4">
    {/* Header */}
    <div className="flex items-start justify-between">
      <div>
        <h3 className="text-xl font-bold">Project Title</h3>
        <p className="text-sm text-muted-foreground">Tagline</p>
      </div>
      <div className="badge-primary">85</div>
    </div>

    {/* Creator Info */}
    <div className="flex items-center gap-3 border-t border-border pt-3">
      <Avatar />
      <div>
        <p className="font-bold">Creator Name</p>
        <p className="text-xs text-muted-foreground">Hackathon • Date</p>
      </div>
    </div>

    {/* Tech Stack */}
    <div className="flex flex-wrap gap-2">
      <span className="badge-muted">React</span>
      <span className="badge-muted">TypeScript</span>
      <span className="badge-muted">+1</span>
    </div>

    {/* Actions */}
    <div className="flex items-center justify-between border-t border-border pt-4">
      <div className="flex gap-4 text-sm">
        <span>👍 234</span>
        <span>💬 45</span>
        <span>🏆 2</span>
      </div>
      <div className="flex gap-2">
        <button className="btn-secondary px-3 py-2">Demo</button>
        <button className="btn-secondary px-3 py-2">Code</button>
      </div>
    </div>
  </div>
</div>
```

### Navigation Bar

```jsx
<header className="border-b-4 border-black bg-card">
  <div className="container flex items-center justify-between py-4 px-6">
    {/* Logo */}
    <a href="/" className="flex items-center gap-2 text-2xl font-black">
      🚀 0x.ship
    </a>

    {/* Navigation */}
    <nav className="flex gap-6">
      <a href="/">Home</a>
      <a href="/projects">Projects</a>
      <a href="/leaderboard">Leaderboard</a>
    </nav>

    {/* Actions */}
    <div className="flex gap-3">
      <button className="btn-primary">Publish</button>
      <button className="btn-secondary">Menu</button>
    </div>
  </div>
</header>
```

### Call-to-Action Section

```jsx
<section className="py-12 text-center">
  <h2 className="text-4xl font-black mb-4">Ready to Share?</h2>
  <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
    Join thousands of builders showcasing their hackathon projects.
  </p>
  <button className="btn-primary text-lg px-8 py-4">
    Publish Your Project
  </button>
</section>
```

---

## 🌓 Dark Theme Consistency

- **Background**: Almost black (#141414)
- **Cards**: Dark gray (#1F1F1F)
- **Borders**: 4px black - thick and prominent
- **Text**: Almost white (#FAFAFA) for high contrast
- **Accents**: Bold yellow and pink - stand out against dark bg

---

## ♿ Accessibility

### Color Contrast
- Yellow text on black: **19:1** (AAA+)
- White text on dark gray: **15:1** (AAA+)
- Focus states use thick borders and bright colors

### Interactive States
- All buttons have clear hover/active states
- Focus indicators are prominent (yellow rings)
- Touch targets are minimum 44x44px
- Animations use 250ms (perceptible but not slow)

### Keyboard Navigation
```css
*:focus-visible {
  outline: 3px solid var(--primary);
  outline-offset: 2px;
}
```

---

## 📐 Spacing System

Based on 4px grid:

| Name | Value | Usage |
|------|-------|-------|
| xs | 4px | Minimal gaps |
| sm | 8px | Small spacing |
| md | 16px | Standard spacing |
| lg | 24px | Card padding |
| xl | 32px | Section spacing |
| 2xl | 48px | Major spacing |

---

## 🚀 Implementation Checklist

When creating new components:

- [ ] Use `btn-primary` or `btn-secondary` for buttons
- [ ] Use `card-elevated` or `card-interactive` for containers
- [ ] Use `badge-primary`, `badge-success`, or `badge-muted` for labels
- [ ] Apply `hover-lift` or custom hover animations
- [ ] Use thick borders (4px) on interactive elements
- [ ] Add offset shadows (4px 6px for buttons, 6px 8px for cards)
- [ ] Use 250ms transitions (`transition-quick`)
- [ ] Bold typography with tight letter spacing
- [ ] Yellow primary actions, pink for hover states
- [ ] Test keyboard focus states (yellow outline)
- [ ] Verify color contrast (16:1 minimum for readability)
- [ ] Test animations on slower devices

---

## 🎯 Design Principles

1. **Bold & Confident**: Use vibrant colors and thick borders
2. **Interactive**: Every action has clear visual feedback
3. **Playful**: Animations and color reveal effects
4. **Accessible**: High contrast, clear focus states
5. **Consistent**: Same patterns throughout the app
6. **Responsive**: Works on mobile and desktop
7. **Fast**: 250ms animations feel snappy
8. **Professional**: Dark theme maintains sophistication

---

## 🔧 Customization

To modify the design system, edit these variables in `src/index.css`:

```css
:root {
  --primary: 51 100% 50%;        /* Yellow */
  --accent: 330 100% 55%;        /* Pink */
  --background: 0 0% 8%;         /* Almost black */
  --shadow-button: 4px 6px 0px rgba(0, 0, 0, 0.8);
  --transition-quick: all 0.25s;
}
```

---

**Last Updated**: October 2025
**Status**: ✅ Production Ready
