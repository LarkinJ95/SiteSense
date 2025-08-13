# replit.md

## Overview

SiteSense is a comprehensive full-stack web application for managing site surveys and environmental assessments. The application allows users to create surveys, record observations, upload photos, and track the progress of site inspections. It's designed for professionals conducting environmental or structural assessments who need to systematically document findings and manage survey data.

## Recent Updates (January 2025)
- **Job-Based Air Monitoring System**: Completely restructured air monitoring to be job-centric with comprehensive job management including job name, job number, address, weather conditions, and client information
- **Air Monitoring Jobs Database**: Added `airMonitoringJobs` table as the primary container for air sampling projects, with air samples now linked to specific jobs rather than just surveys
- **Advanced Job Management Interface**: Created job-focused UI with job cards showing status, location, weather, dates, and project manager information
- **GPS Location Integration**: Added one-click GPS coordinate capture for accurate job location recording with proper geolocation permissions handling
- **Automated Weather Data Retrieval**: Integrated Open-Meteo free weather API for automatic weather condition autofill including temperature, humidity, pressure, wind speed/direction, and weather descriptions
- **Weather and Environmental Tracking**: Integrated comprehensive environmental condition logging including temperature, humidity, barometric pressure, wind speed/direction, and weather conditions at the job level
- **Personnel Management System**: Created comprehensive personnel profile creation with medical clearance tracking, certifications, and contact information
- **Client and Project Management**: Added client name, project manager, and detailed job information tracking for professional project management
- **Advanced Search & Filtering System**: Implemented comprehensive filtering by status, survey type, date range, and sorting options with persistent URL state
- **Bulk Operations**: Added multi-select functionality for surveys with bulk download and delete operations
- **Dashboard Analytics**: Integrated visual analytics with Recharts including status distribution pie charts, survey type bar charts, and monthly trend analysis
- **Mobile Optimization**: Enhanced touch interactions, responsive layouts, and mobile-first design patterns throughout the application
- Enhanced status system with comprehensive workflow stages: Draft → Scheduled → In Progress → Samples Sent to Lab → Report Completed → Report Sent → Completed (plus On Hold/Archived)
- Added comprehensive survey editing functionality with status progression support
- Optimized reports for printing with floating print button, page break controls, and keyboard shortcuts (Ctrl+P)
- Enhanced report generation with quantity analysis by hazardous areas and samples, including material breakdown tables
- Fixed dark mode text contrast issues across dashboard buttons and status badges
- Added edit buttons on both dashboard and surveys page for quick access
- Enhanced site photo upload feature with full integration across all views
- Changed application name from "SiteSurvey Pro" to "SiteSense" 
- Updated branding throughout application interface and documentation

## Previous Updates (December 2024)
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