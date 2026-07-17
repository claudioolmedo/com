# AGENTS.md - Claudio Olmedo Website Portfolio

This repository hosts the static personal website and portfolio for Claudio Olmedo (`claudioolmedo.com`).

## Mission

Keep the site focused on the One Dollar Computer project as the main product and life mission, followed by the educational, open hardware, and social mission. Avoid complex dependencies and keep the page static, loading fast, and responsive.


## Directory Structure

*   `index.html` - main page layout.
*   `sticks.html` - article on ice cream sticks in education.
*   `css/style.css` - theme and layouts.
*   `js/main.js` - site logic and transitions.
*   `js/fs-menu.js` - full screen menu handler.
*   `images/` - branding assets, background imagery, and slides.
*   `link/` - redirect page to easily share the site during presentations.
*   `preview/` - staging area for features before they go on the main `index.html`. Confirm at `/preview/`, then promote to the homepage.
*   `3d/viewer.html` - interactive 3D board viewer embedded on the homepage.

## Preview workflow

1. Ship new UI experiments under `preview/` (not on `index.html`).
2. Share `https://claudioolmedo.com/preview/` for confirmation.
3. Only after approval, promote the feature into the main homepage.

## Guidelines for Agents

1.  **Keep it Static:** Prefer pure HTML, CSS, and vanilla JS over importing runtime frameworks.
2.  **Maintain Aesthetics:** Keep the design clean, with ample spacing, balanced grids, and high-quality visuals.
3.  **Agent Discoverability:** Keep `llms.txt`, `AGENTS.md`, and `.well-known/mcp-server-card` accurate.
4.  **No Jekyll:** Because this repository is hosted on GitHub Pages, use the `.nojekyll` file at the root to ensure hidden files like `.well-known/mcp-server-card` are served correctly.
