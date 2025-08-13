# replit.md

## Overview

SiteSurvey Pro is a comprehensive full-stack web application for managing site surveys and environmental assessments. The application allows users to create surveys, record observations, upload photos, and track the progress of site inspections. It's designed for professionals conducting environmental or structural assessments who need to systematically document findings and manage survey data.

## Recent Updates (December 2024)
- Enhanced survey types to support combination surveys (Asbestos + Lead + Cadmium)
- Expanded material type options for better hazmat survey coverage
- Fixed TypeScript errors and improved error handling
- Database schema optimized for PostgreSQL with Drizzle ORM
- Complete CRUD functionality for surveys, observations, and photo uploads

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The client-side is built with React and TypeScript using Vite as the build tool. The UI follows a modern component-based architecture:

- **Component Library**: Uses shadcn/ui components built on top of Radix UI primitives for consistent, accessible UI elements
- **Styling**: Tailwind CSS with custom CSS variables for theming, supporting both light and dark modes
- **State Management**: React Query (@tanstack/react-query) for server state management and caching
- **Routing**: Uses wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation for type-safe form handling
- **File Structure**: Organized with separate directories for components, pages, hooks, and utilities

### Backend Architecture
The server is an Express.js application with TypeScript:

- **API Design**: RESTful API endpoints for surveys, observations, and photos
- **File Uploads**: Multer middleware for handling image uploads with size and type restrictions
- **Error Handling**: Centralized error handling middleware with structured error responses
- **Logging**: Custom request logging middleware for API endpoints
- **Development**: Vite integration for hot module replacement in development

### Data Storage Solutions
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Schema**: Well-structured relational schema with surveys, observations, and observation photos tables
- **Connection**: Uses Neon serverless PostgreSQL with connection pooling
- **Migrations**: Drizzle Kit for database schema management and migrations
- **File Storage**: Local file system storage for uploaded images (uploads directory)

### Authentication and Authorization
The current implementation does not include authentication mechanisms, suggesting this may be added later or handled externally.

### Development and Build Process
- **Monorepo Structure**: Shared schema and types between client and server in the `/shared` directory
- **TypeScript**: Strict TypeScript configuration with path mapping for clean imports
- **Build Process**: Vite for client bundling, esbuild for server bundling
- **Development**: Concurrent development with Vite dev server and TSX for server hot reloading

## External Dependencies

### Database Services
- **Neon Database**: Serverless PostgreSQL hosting with WebSocket connections
- **Drizzle ORM**: Type-safe database toolkit for PostgreSQL operations

### UI and Component Libraries
- **Radix UI**: Headless, accessible UI components for complex interactions
- **shadcn/ui**: Pre-built component library based on Radix UI
- **Lucide React**: Icon library for consistent iconography

### Development Tools
- **Vite**: Fast build tool with HMR for development
- **TypeScript**: Static type checking across the entire application
- **Tailwind CSS**: Utility-first CSS framework for styling
- **PostCSS**: CSS processing with Autoprefixer

### Runtime Dependencies
- **React Query**: Server state management and caching
- **React Hook Form**: Form state management with validation
- **Zod**: Runtime type validation and schema definition
- **date-fns**: Date manipulation and formatting utilities
- **wouter**: Lightweight routing library for React

### File Upload and Processing
- **Multer**: Express middleware for handling multipart/form-data and file uploads
- **File System**: Node.js fs/promises for server-side file operations

The application uses a modern, type-safe tech stack optimized for developer experience and maintainability, with careful attention to UI/UX through accessible component libraries and responsive design patterns.