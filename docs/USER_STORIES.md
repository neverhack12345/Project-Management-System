# User Stories

## Task creation and tracking

- As a project operator, I want to quickly create a task with minimal required details so that task capture is fast.
- As a project operator, I want each task to require a deadline so that every task has a clear due date.
- As a project operator, I want tasks to be assigned to a specific project so that I can track the collection of tasks for that project.
- As a project operator, I want tasks to include optional fact references so that evidence requirements are connected directly to work items.

## Task dependencies

- As a project operator, I want a task to depend on multiple other tasks so that I can model prerequisite work.
- As a project operator, I want task dependencies to support both same-project and cross-project references so that I can represent real delivery chains across projects.
- As a project operator, I want to see when task dependencies are invalid or unresolved so that I can repair broken task links quickly.

## Cross-project visibility

- As a project operator, I want to see how tasks in one project depend on tasks in other projects so that I can understand cross-project blocking risks.
- As a project operator, I want dependency insights to include per-project task counts, blocked-by-dependency indicators, and fact-verification summaries so that I can prioritize follow-up.

## Kanban workflow

- As a project operator, I want a simple Kanban board with lanes backlog, todo, in-progress, and done so that I can manage task flow visually.
- As a project operator, I want to drag tasks between Kanban lanes so that I can update task progress quickly.
- As a project operator, I want lane changes to persist to the task source of truth so that board state survives refresh/restart.
- As a project operator, I want unresolved fact counts shown on Kanban cards so that I can quickly spot tasks with evidence gaps.

## Fact verification workflow

- As a project operator, I want a project-level fact registry with states `unknown`, `unverified`, `in-review`, and `verified` so that I can track certainty over time.
- As a project operator, I want verified facts to require at least one source and a verification note so that verification quality is auditable.
- As a project operator, I want linking between tasks and facts so that I can see which task is blocked by unverified information.
- As a project operator, I want moving a task to `done` blocked when linked facts are unresolved so that no task is marked complete with open ambiguity.
- As a project operator, I want moving a project to `done` blocked when unresolved facts remain so that project closure requires verified information.

