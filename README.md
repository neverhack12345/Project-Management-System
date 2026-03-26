# Project Management System

Markdown-first project and milestone tracker with:
- project folders as source of truth
- dashboard and search
- calendar + gantt timeline
- quick edit APIs that write back to markdown
- validation, stale detection, and weekly review reports

## Quick start

1. Install dependencies:
   - `npm install`
2. Create your first project:
   - `npm run new:project -- --name "My Project" --owner "You"`
3. Start the dashboard:
   - `npm run dev`
4. Open:
   - [http://localhost:3000](http://localhost:3000)

## Project layout

- `projects/<project-slug>/README.md` - canonical project metadata
- `projects/<project-slug>/spec.md` - requirements/spec
- `projects/<project-slug>/research.md` - research notes
- `projects/<project-slug>/milestones.md` - milestone metadata and notes
- `projects/<project-slug>/tasks.md` - task list

## Required metadata

The schema is documented in `docs/SCHEMA.md`.

## Useful scripts

- `npm run validate` - schema/date/status validation
- `npm run stale` - show stale projects (no updates in X days)
- `npm run review:weekly` - generate weekly markdown summary