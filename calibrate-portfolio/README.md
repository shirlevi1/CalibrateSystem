> **Private portfolio draft.** The case study, architecture summary, and screenshot candidates require explicit client and owner approval before publication.

# Calibrate

Calibrate is a project and workflow management portal. Clients can follow project progress, find documents, and see who to contact. Administrators use dedicated views to manage accounts and communicate with users.

## The problem

When project updates, documents, and contacts are spread across tools and conversations, teams spend more time working out the current status and what needs to happen next.

## The solution

- **Project dashboard and tracking.** The dashboard highlights the active stage and gives users shortcuts to key project views.
- **Document access.** Dedicated views organize required, missing, and completion documents, with downloads where available.
- **Team and account views.** Users can find project contacts, and administrators can create and manage accounts.
- **Notifications and messaging.** The portal surfaces project updates and supports administrator communication.

## Full-stack engineering

- **Responsive React interfaces.** React Router organizes project, document, notification, and account screens. A shared API module connects these views to Django REST endpoints.
- **Authentication and authorization.** The backend uses cookie-based JWT authentication and checks administrator permissions on protected endpoints. The application also supports account recovery and password changes.
- **Workflow and API behavior.** Project views display the active stage alongside document requirements. The API validates inputs and distinguishes invalid requests, missing records, and upstream service failures.

## Technology stack

React · JavaScript and JSX · React Router · Material UI · Vite · Python · Django REST Framework · Simple JWT · MySQL

## Interface showcase

Five redacted application captures are available in the separate private review package. Each candidate requires explicit client and owner approval before it can be included in a public case study.

## Architecture

The React client exchanges JSON with a Django REST API. The API handles authentication and authorization, and Django uses MySQL for application data.

[Read the architecture summary](docs/architecture.md)

## Project status

This is a private portfolio case study. Application source code is excluded. Demo availability is unverified.

