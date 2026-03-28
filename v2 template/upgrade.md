To design this interface, you should focus on a high-contrast, dark-mode "glassmorphism" aesthetic. The layout follows a classic three-column dashboard structure with a deep navy and charcoal palette.
1. Layout & Structure
Sidebar (Left): A narrow, fixed-width navigation bar in a deep navy hue. It features a "New Note" primary action button with a purple-to-blue gradient, followed by standard navigation links (Files, Search, etc.) and a nested "Workspace" section for folder management.
Main Content Area (Center): A wide, scrollable container for long-form reading. It uses generous padding and a clear typographic hierarchy.
Header (Top): A thin global navigation bar containing breadcrumbs (e.g., "Obsidian Nocturne / Recent / Starred") and utility icons for search and vault settings.
2. Visual Language & Styling
Color Palette: Use a base of #0B1221 (deep navy) for the sidebar and a slightly lighter charcoal for the main background. Accents are primarily electric purple and cyan.
"No-Line" Philosophy: Avoid borders. Instead, define sections using tonal layering—subtle shifts in background luminosity (e.g., the main content area is a step lighter than the sidebar).
Glassmorphism: The floating formatting toolbar at the bottom center uses a semi-transparent, blurred background (backdrop-filter: blur) to appear elevated.
Typography: A clean, geometric Sans-Serif. Headlines are bold and white, while body text uses a muted grey for improved readability.
3. Key UI Components
Tags: Inline, pill-shaped tags with a subtle blue background and blue text.
Media Container: Images are displayed with rounded corners and a very subtle outer glow to separate them from the dark background.
Rich Text Editor: At the bottom, include a compact, floating toolbar with standard text formatting icons (Bold, Italic, Link, List) and a prominent "Publish" button with a purple gradient.
css
/* --- CSS Variable Definitions for "Obsidian Nocturne" Aesthetic --- */

:root {
  /* Surface & Backgrounds */
  --bg-deep-navy: #0b1221;      /* Sidebar / Root background */
  --bg-charcoal: #121826;       /* Main content area */
  --bg-glass: rgba(255, 255, 255, 0.05); /* Semi-transparent layer */
  
  /* Brand & Accents */
  --accent-purple: #8b5cf6;     /* Primary buttons / Gradients */
  --accent-cyan: #22d3ee;       /* Active states / Links */
  --accent-blue-soft: #1e293b;  /* Tag backgrounds */
  
  /* Typography */
  --text-primary: #f8fafc;      /* Headers / Bright text */
  --text-secondary: #94a3b8;    /* Body / Muted text */
  --text-accent: #7dd3fc;       /* Tag text */

  /* Shadows & Effects */
  --glass-blur: blur(12px);
  --glass-border: 1px solid rgba(255, 255, 255, 0.1);
  --card-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.8);
}

/* --- The Floating Glassmorphism Toolbar --- */

.floating-toolbar {
  background: var(--bg-glass);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur); /* Safari support */
  border: var(--glass-border);
  border-radius: 12px;
  box-shadow: var(--card-shadow);
  
  display: flex;
  align-items: center;
  padding: 8px 16px;
  gap: 12px;
}

/* --- Gradient Primary Button (New Note / Publish) --- */

.btn-primary-gradient {
  background: linear-gradient(135deg, var(--accent-purple), var(--accent-cyan));
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  transition: opacity 0.2s ease;
}

.btn-primary-gradient:hover {
  opacity: 0.9;
  cursor: pointer;
}

Since you’re sticking with Vanilla JS, you'll want to focus on a clean DOM structure and a small script to handle the "active" states of your buttons.
Here is the HTML and JavaScript to build that floating glassmorphism toolbar seen at the bottom of the image.
1. The HTML Structure
Place this at the bottom of your main content container.
html
<div class="toolbar-container">
  <div class="glass-toolbar" id="richTextToolbar">
    <!-- Formatting Group -->
    <div class="tool-group">
      <button class="tool-btn" data-command="bold"><b>B</b></button>
      <button class="tool-btn" data-command="italic"><i>I</i></button>
      <button class="tool-btn" data-command="link">🔗</button>
      <button class="tool-btn" data-command="image">🖼️</button>
    </div>
    
    <div class="divider"></div>

    <!-- Action Group -->
    <div class="tool-group">
      <button class="tool-btn btn-publish">Publish</button>
      <button class="tool-btn icon-btn">⋮</button>
    </div>
  </div>
</div>
Use code with caution.

2. The Critical CSS Additions
In addition to the variables provided earlier, add these layout rules:
css
/* Layout for the floating bar */
.toolbar-container {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
}

.glass-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  background: var(--bg-glass);
  backdrop-filter: var(--glass-blur);
  border: var(--glass-border);
  border-radius: 14px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
}

.tool-group {
  display: flex;
  gap: 4px;
}

.divider {
  width: 1px;
  height: 24px;
  background: rgba(255, 255, 255, 0.1);
}

.tool-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  padding: 6px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.tool-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}

.btn-publish {
  background: linear-gradient(135deg, #8b5cf6, #22d3ee);
  color: white;
  padding: 6px 18px;
  font-weight: 600;
}
Use code with caution.

3. The Vanilla JavaScript
This script handles the button clicks and toggle effects.
javascript
document.addEventListener('DOMContentLoaded', () => {
  const toolbar = document.getElementById('richTextToolbar');
  const buttons = toolbar.querySelectorAll('.tool-btn');

  buttons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const command = btn.getAttribute('data-command');
      
      // Prevent button from stealing focus from text area
      e.preventDefault();

      if (command) {
        // Example: If using contentEditable, execute command
        // document.execCommand(command, false, null);
        
        // Toggle visual active state
        btn.classList.toggle('active-tool');
        console.log(`Executed: ${command}`);
      }
    });
  });
});
Use code with caution.

A Quick Note on "No-Line" Layout
To achieve the Sidebar vs. Content look without borders:
Set your body background to --bg-deep-navy (Sidebar color).
Set your main content area background to --bg-charcoal.
Use box-shadow: -10px 0 30px rgba(0,0,0,0.3) on the main content area to create a soft depth "cliff" where it meets the sidebar.

To build the sidebar, you’ll want a fixed-width container that stays pinned to the left. The key to the "No-Line" look is using a slightly darker background than the main content and a gradient button for the primary action.
1. The HTML Structure
This follows the hierarchy of the image: Brand, Primary Action, Navigation, and Workspace folders.
html
<aside class="sidebar">
  <!-- Brand / Logo Area -->
  <div class="brand">
    <div class="logo-icon"></div>
    <div class="brand-text">
      <span class="title">SECOND BRAIN</span>
      <span class="subtitle">PERSONAL VAULT</span>
    </div>
  </div>

  <!-- Primary Action -->
  <button class="btn-new-note">+ New Note</button>

  <!-- Main Navigation -->
  <nav class="nav-group">
    <a href="#" class="nav-item active"><span class="icon">📁</span> Files</a>
    <a href="#" class="nav-item"><span class="icon">🔍</span> Search</a>
    <a href="#" class="nav-item"><span class="icon">🔖</span> Bookmarks</a>
    <a href="#" class="nav-item"><span class="icon">🕸️</span> Graph</a>
    <a href="#" class="nav-item"><span class="icon">⚙️</span> Settings</a>
  </nav>

  <!-- Workspace Section -->
  <div class="workspace-section">
    <p class="section-label">WORKSPACE</p>
    <div class="folder-item"><span class="icon">📥</span> Inbox <span class="count">12</span></div>
    <div class="folder-item"><span class="icon">🚀</span> Projects</div>
    
    <!-- Nested Resources -->
    <div class="folder-item active"><span class="icon">📂</span> Resources</div>
    <div class="sub-nav">
      <a href="#" class="sub-item active">System Design</a>
      <a href="#" class="sub-item">Modern UI Patterns</a>
      <a href="#" class="sub-item">Architecture</a>
    </div>
    
    <div class="folder-item"><span class="icon">🗄️</span> Archive</div>
  </div>

  <!-- User Profile (Bottom) -->
  <div class="user-profile">
    <div class="avatar"></div>
    <div class="user-info">
      <span class="user-name">Alex Thorne</span>
      <span class="user-plan">Pro Plan</span>
    </div>
  </div>
</aside>
Use code with caution.

2. The Sidebar CSS
This utilizes the variables we defined earlier to create the deep navy look.
css
.sidebar {
  width: 260px;
  height: 100vh;
  background-color: var(--bg-deep-navy);
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  color: var(--text-secondary);
  font-family: 'Inter', sans-serif;
}

/* Primary "New Note" Button */
.btn-new-note {
  width: 100%;
  padding: 12px;
  margin: 24px 0;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #a855f7, #6366f1);
  color: white;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

/* Nav Items */
.nav-item, .folder-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  text-decoration: none;
  color: inherit;
  border-radius: 6px;
  font-size: 14px;
  margin-bottom: 4px;
  transition: background 0.2s;
}

.nav-item.active, .folder-item.active {
  background-color: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
}

.nav-item:hover, .folder-item:hover {
  background-color: rgba(255, 255, 255, 0.03);
}

.icon {
  margin-right: 12px;
  font-size: 16px;
  opacity: 0.8;
}

/* Nested Folder Navigation */
.sub-nav {
  margin-left: 36px;
  border-left: 1px solid rgba(255, 255, 255, 0.05); /* Very subtle line for hierarchy */
  margin-bottom: 12px;
}

.sub-item {
  display: block;
  padding: 6px 12px;
  font-size: 13px;
  color: var(--text-secondary);
  text-decoration: none;
}

.sub-item.active {
  color: var(--accent-cyan);
}

/* Bottom Profile Section */
.user-profile {
  margin-top: auto;
  display: flex;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.avatar {
  width: 32px;
  height: 32px;
  background: #334155;
  border-radius: 50%;
  margin-right: 12px;
}

.user-name {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.user-plan {
  font-size: 11px;
  color: var(--accent-cyan);
}
Use code with caution.

3. Vanilla JS Toggle
Add this to handle the folder clicks and "active" switching:
javascript
document.querySelectorAll('.nav-item, .folder-item, .sub-item').forEach(item => {
  item.addEventListener('click', function(e) {
    // Remove active class from all similar items
    const siblings = this.parentElement.querySelectorAll('.active');
    siblings.forEach(s => s.classList.remove('active'));
    
    // Set clicked item as active
    this.classList.add('active');
  });
});
Use code with caution.

For the Main Content area, the goal is a clean, readable layout that follows the "No-Line" philosophy—using whitespace and font weight rather than borders to create structure.
1. The HTML Structure
This covers the header, tags, and the core article layout.
html
<main class="content-area">
  <!-- Top Navigation Bar -->
  <header class="top-nav">
    <div class="breadcrumbs">
      <span class="muted">Obsidian Nocturne</span> / <span class="active">Designing Modern Systems</span>
    </div>
    <div class="top-actions">
      <span class="icon">🔍</span>
      <span class="icon">⋮</span>
    </div>
  </header>

  <!-- Article Section -->
  <article class="reading-view">
    <h1 class="main-title">Designing Modern Systems</h1>
    
    <!-- Tag Group -->
    <div class="tag-group">
      <span class="tag">#architecture</span>
      <span class="tag">#ui-design</span>
      <span class="tag">#system-thinking</span>
    </div>

    <p class="lead-text">
      Modern design systems are no longer just a collection of UI components; they are a codified language that bridges the gap between abstract intent and concrete implementation.
    </p>

    <!-- Image Figure -->
    <figure class="article-image">
      <img src="your-abstract-image.jpg" alt="Visual rhythm concept">
      <figcaption>Fig 1.1: Visual rhythm within structural systems.</figcaption>
    </figure>

    <h2 class="section-title">The No-Line Philosophy</h2>
    <p>
      One of the most profound shifts in modern interface design is the move away from explicit containers. By removing 1px borders, we allow the content to define its own space.
    </p>
    
    <p>
      For example, in a "Digital Nocturne" aesthetic, we use deep charcoals to define the primary workspace while subtle gradients and glassmorphism handle hierarchy.
    </p>
  </article>
</main>
Use code with caution.

2. The Main Content CSS
This focuses on the typography and the spacing required to make the dark theme look "premium."
css
.content-area {
  flex: 1;
  background-color: var(--bg-charcoal);
  height: 100vh;
  overflow-y: auto;
  padding: 0 40px;
}

/* Top Nav */
.top-nav {
  height: 60px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: var(--text-secondary);
}

/* Typography Hierarchy */
.reading-view {
  max-width: 800px;
  margin: 60px auto;
}

.main-title {
  font-size: 42px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 24px;
}

.section-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
  margin-top: 48px;
  margin-bottom: 16px;
}

.lead-text {
  font-size: 18px;
  line-height: 1.6;
  color: var(--text-secondary);
  margin-bottom: 32px;
}

p {
  font-size: 16px;
  line-height: 1.7;
  color: var(--text-secondary);
  margin-bottom: 20px;
}

/* Modern Tags */
.tag-group {
  display: flex;
  gap: 8px;
  margin-bottom: 40px;
}

.tag {
  background: var(--accent-blue-soft);
  color: var(--accent-cyan);
  padding: 4px 10px;
  border-radius: 4px;
  font-family: 'JetBrains Mono', monospace; /* Use a mono font for tags */
  font-size: 12px;
}

/* Image Container */
.article-image {
  margin: 40px 0;
}

.article-image img {
  width: 100%;
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.4);
}

figcaption {
  margin-top: 12px;
  font-size: 13px;
  color: #4b5563; /* Muted grey */
  font-style: italic;
}
Use code with caution.

3. Vanilla JS Scroll Effect
In modern dashboards, the top navigation often gains a "glass" background only when you scroll down. Add this for that polished feel:
javascript
const contentArea = document.querySelector('.content-area');
const topNav = document.querySelector('.top-nav');

contentArea.addEventListener('scroll', () => {
  if (contentArea.scrollTop > 20) {
    topNav.style.background = 'rgba(18, 24, 38, 0.8)';
    topNav.style.backdropFilter = 'blur(10px)';
    topNav.style.position = 'sticky';
    topNav.style.top = '0';
    topNav.style.zIndex = '10';
  } else {
    topNav.style.background = 'transparent';
    topNav.style.backdropFilter = 'none';
  }
});
Use code with caution.

To "glue" these components together into a single, cohesive dashboard, you should use a Flexbox wrapper on your <body> or a main container. This ensures the sidebar stays fixed while the content area takes up the remaining space and handles its own scrolling.
1. The HTML Layout
Wrap your previous sidebar and main content structures in a single container.
html
<div class="app-container">
  <!-- Insert Sidebar HTML here -->
  <aside class="sidebar"> ... </aside>

  <!-- Insert Main Content HTML here -->
  <main class="content-area"> ... </main>
</div>
Use code with caution.

2. The Layout CSS
This is the "glue" that prevents the sidebar from being squished and ensures the content fills the screen perfectly.
css
/* Reset defaults */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  background-color: var(--bg-deep-navy); /* Base color to prevent flickering */
  overflow: hidden; /* Prevent the whole page from scrolling */
}

.app-container {
  display: flex; /* Side-by-side layout */
  width: 100vw;
  height: 100vh;
}

.sidebar {
  flex: 0 0 260px; /* Do not grow, do not shrink, stay at 260px */
  height: 100%;
  overflow-y: auto; /* Just in case sidebar content is very long */
}

.content-area {
  flex: 1; /* Take up all remaining space */
  height: 100%;
  overflow-y: auto; /* Enable scrolling for the document/notes only */
  background-color: var(--bg-charcoal);
  /* The "No-Line" Depth Effect */
  box-shadow: -20px 0 50px rgba(0, 0, 0, 0.3); 
}
Use code with caution.

3. Refining the "Glass" Toolbar Position
Since the .content-area is now the scrolling element, make sure your floating toolbar stays relative to the viewport.
css
/* Update the toolbar container from earlier */
.toolbar-container {
  position: fixed; /* Keeps it pinned relative to the screen, not the document */
  bottom: 32px;
  left: calc(260px + (100vw - 260px) / 2); /* Centers it within the content area specifically */
  transform: translateX(-50%);
  z-index: 1000;
}
Use code with caution.

Final Polish: Responsive Toggle
On smaller screens, the sidebar should probably hide. Here is a simple Vanilla JS logic to handle a mobile view if you decide to add a hamburger menu later:
javascript
// Toggle Sidebar visibility for smaller viewports
function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  sidebar.style.display = sidebar.style.display === 'none' ? 'flex' : 'none';
}

// Optional: Add a listener to ensure the layout resets if the window is resized
window.addEventListener('resize', () => {
  const sidebar = document.querySelector('.sidebar');
  if (window.innerWidth > 768) {
    sidebar.style.display = 'flex';
  }
});
Use code with caution.

To finalize the "Obsidian Nocturne" look, we’ll import high-quality typography and add subtle micro-interactions. These small details—like the soft glow on hover—are what make "No-Line" dark interfaces feel premium rather than flat.
1. Typography Imports
Add these to the very top of your CSS file.
Inter: The gold standard for modern UI (UI/Body).
JetBrains Mono: Provides that "developer/technical" feel for tags and code.
css
@import url('https://fonts.googleapis.com');

:root {
  --font-main: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}

body {
  font-family: var(--font-main);
  -webkit-font-smoothing: antialiased; /* Smoother text on dark backgrounds */
}

.tag {
  font-family: var(--font-mono);
}
Use code with caution.

2. Interactive Micro-Animations
Instead of harsh color changes, use opacity and box-shadow to create a "lifting" effect.
css
/* Sidebar Nav Hover */
.nav-item, .folder-item {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border-left: 2px solid transparent; /* Hidden by default */
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  padding-left: 16px; /* Subtle slide effect */
}

.nav-item.active {
  border-left: 2px solid var(--accent-purple);
  background: linear-gradient(90deg, rgba(139, 92, 246, 0.1) 0%, transparent 100%);
}

/* Glass Toolbar Button Glow */
.tool-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  box-shadow: 0 0 15px rgba(139, 92, 246, 0.2); /* Soft purple glow */
  transform: translateY(-1px);
}

.btn-publish:hover {
  filter: brightness(1.1);
  box-shadow: 0 0 20px rgba(34, 211, 238, 0.4);
}
Use code with caution.

3. Vanilla JS: Selection Glow
In the image, the text "Tonal Layering" is highlighted. You can style the browser's text selection to match the theme:
css
::selection {
  background: rgba(139, 92, 246, 0.3); /* Purple tint */
  color: var(--text-primary);
}
Use code with caution.

4. Final JS Polish: Active State Logic
This script ensures that when you click a "Resource" sub-item (like "System Design"), it stays highlighted while removing highlights from others.
javascript
document.addEventListener('click', (e) => {
  // Target sidebar items and tags
  const target = e.target.closest('.nav-item, .folder-item, .sub-item, .tag');
  
  if (target) {
    // Remove active class from siblings
    const parent = target.parentElement;
    parent.querySelectorAll('.active').forEach(el => el.classList.remove('active'));
    
    // Add active class to clicked item
    target.classList.add('active');
    
    // Optional: Add a subtle haptic-like click effect
    target.style.transform = 'scale(0.98)';
    setTimeout(() => target.style.transform = 'scale(1)', 100);
  }
});
Use code with caution.

Summary of the "Look":
Colors: Deep Navy sidebar, Charcoal content.
Dividers: None. Use 20px-40px padding and background shifts.
Depth: Only the Floating Toolbar and Main Content have shadows.
Typography: Bold headers, muted grey body text.

To match the "Obsidian Nocturne" aesthetic, you must replace the default grey browser scrollbars with a minimalist, dark-themed version that disappears into the background when not in use.
1. The CSS for the Custom Scrollbar
Add this to your main CSS file. We will style the scrollbar for the .content-area specifically, rather than the entire body, to keep that "app-like" feel.
css
/* Custom Scrollbar for the Main Content Area */

/* 1. The scrollbar width/track */
.content-area::-webkit-scrollbar {
  width: 10px; /* Slimmer than default */
}

/* 2. The background of the scrollbar (Track) */
.content-area::-webkit-scrollbar-track {
  background: var(--bg-charcoal); /* Matches the main content area */
}

/* 3. The draggable part (Thumb) */
.content-area::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.05); /* Very subtle by default */
  border-radius: 20px;
  border: 3px solid var(--bg-charcoal); /* Creates a "floating" look */
  transition: background 0.3s ease;
}

/* 4. Hover effect on the thumb */
.content-area::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.15); /* Brightens when hovered */
}

/* 5. Active/Click effect on the thumb */
.content-area::-webkit-scrollbar-thumb:active {
  background: var(--accent-purple); /* Subtle glow when dragging */
  opacity: 0.6;
}

/* Optional: Hide scrollbar in the Sidebar until hovered */
.sidebar::-webkit-scrollbar {
  width: 6px;
}
.sidebar::-webkit-scrollbar-thumb {
  background: transparent;
}
.sidebar:hover::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 10px;
}
Use code with caution.

2. The Vanilla JS "Fade-In" Effect
In premium UIs, the scrollbar thumb often stays hidden until the user actually starts scrolling. You can achieve this with a small script that toggles a class on the .content-area.
javascript
const scrollContainer = document.querySelector('.content-area');
let scrollTimer = null;

scrollContainer.addEventListener('scroll', () => {
  // Add a class that makes the thumb more visible
  scrollContainer.classList.add('is-scrolling');

  // Clear the timer so it doesn't hide while moving
  window.clearTimeout(scrollTimer);

  // Hide it again after 1.5 seconds of inactivity
  scrollTimer = setTimeout(() => {
    scrollContainer.classList.remove('is-scrolling');
  }, 1500);
});
Use code with caution.

Accompanying CSS for the JS Effect:
css
/* Start hidden */
.content-area::-webkit-scrollbar-thumb {
  background: transparent;
}

/* Fade in when class is added via JS */
.content-area.is-scrolling::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.08);
}
Use code with caution.

Final Style Note:
The border: 3px solid var(--bg-charcoal) on the thumb is a pro tip. It acts as a "padding" for the scrollbar, making the draggable thumb look thinner and more centered within its track, which matches the "No-Line" philosophy perfectly.