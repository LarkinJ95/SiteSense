# replit.md

## Overview

AbateIQ is a comprehensive full-stack web application for managing site surveys and environmental assessments. The application allows users to create surveys, record observations, upload photos, and track the progress of site inspections. It's designed for professionals conducting environmental or structural assessments who need to systematically document findings and manage survey data.

## Recent Updates (January 2025)
- **Authentication System**: Created complete user authentication with login, registration, and user profile management pages with role-based access control
- **Admin Dashboard**: Built comprehensive admin interface for user management, system monitoring, and configuration with user statistics and system health metrics
- **User Profile Management**: Added user profile page with personal information editing, notification preferences, security settings, and account deletion
- **Role-Based Pages**: Implemented proper routing for authentication pages (/login, /register, /admin, /profile) with appropriate access controls
- **White-Label Platform**: Added comprehensive white-label customization system with logo uploads, brand color customization, content management, and complete data management capabilities
- **Object Storage Integration**: Integrated Replit Object Storage for secure file uploads including logos and other assets with proper upload handling
- **Admin User Management**: Added "Add New User" functionality to admin dashboard with comprehensive user creation forms and backend API support
- **Footer Enhancement**: Added admin-only footer links with proper role-based visibility and development mode fallbacks
- **Air Sample Management Interface**: Added comprehensive air sample management within air monitoring jobs with full CRUD operations, detailed sample tracking, and real-time status updates
- **Air Samples Tab Integration**: Created dedicated "Air Samples" tab in job detail view with add, edit, delete functionality and detailed sample display cards
- **Sample Form Validation**: Built comprehensive air sample forms with validation for analyte types, collection times, flow rates, personnel assignment, and field notes
- **Personnel Integration**: Updated personnel system to use "State Accreditation Number" instead of "Employee ID" for better field identification and compliance tracking
- **Daily Weather Logging System**: Added comprehensive daily weather log tracking for multi-day air monitoring operations with GPS-enabled location capture and automated weather data retrieval using WeatherAPI.com
- **US Standard Weather Units**: Implemented complete US standard measurement system (°F, mph, inHg) for all weather data display and logging throughout the application
- **Multi-Day Sampling Support**: Created dedicated weather log interface allowing field teams to record daily weather conditions during extended air sampling campaigns with date/time tracking
- **Job-Based Air Monitoring System**: Completely restructured air monitoring to be job-centric with comprehensive job management including job name, job number, address, weather conditions, and client information
- **Air Monitoring Jobs Database**: Added `airMonitoringJobs` table as the primary container for air sampling projects, with air samples now linked to specific jobs rather than just surveys
- **Advanced Job Management Interface**: Created job-focused UI with job cards showing status, location, weather, dates, and project manager information with integrated weather logs tab
- **GPS Location Integration**: Added one-click GPS coordinate capture for accurate job location recording with proper geolocation permissions handling
- **Automated Weather Data Retrieval**: Integrated WeatherAPI.com for automatic weather condition autofill including temperature, humidity, pressure, wind speed/direction, and detailed weather descriptions
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
- Changed application name from "SiteSurvey Pro" to "AbateIQ" 
- Updated branding throughout application interface and documentation
- **NEW ADVANCED FEATURES EXPANSION (January 13, 2025)**: Complete implementation of 7 major new features:
  - **Custom Report Builder**: Full report template creation system with drag-and-drop sections, field selection, layout customization, chart/photo/map inclusion, and automated report generation with PDF output
  - **Client Portal Management**: Comprehensive client access control system with portal customization, survey access management, download permissions, commenting capabilities, and custom branding per client
  - **Internal Messaging System**: Complete team communication platform with threaded conversations, priority levels, survey-linked discussions, real-time messaging, file attachments, and message search/filtering
  - **Advanced Notification System**: Multi-channel notification delivery (email, SMS, in-app) with priority-based alerts, compliance deadlines, survey updates, system notifications, and customizable notification preferences
  - **Chain of Custody Tracking**: Full sample custody management with GPS-enabled transfer recording, barcode scanning, temperature monitoring, witness signatures, photo documentation, and complete audit trail
  - **Compliance Dashboard & Tracking**: Automated regulatory compliance monitoring with EPA/OSHA rule tracking, deadline alerts, evidence management, compliance status visualization, and automated rule checking
  - **Real-time Collaboration Features**: Live survey editing sessions, shared cursors, change tracking, participant management, and collaborative review capabilities
- **FINAL DEPLOYMENT & BUG FIXES (January 13, 2025)**: 
  - **Air Sample Update Fix**: Resolved "failed to update sample" error through enhanced error handling in storage methods and improved API endpoint validation
  - **Field Tools Weather Enhancement**: Converted weather widget to display US standard units (°F, mph, inHg) and restored GPS location button functionality with proper permissions handling
  - **Advanced Air Monitoring API**: Added comprehensive API endpoints for equipment management, quality control checks, PEL alerts, and air sample analysis with proper integration
  - **Chain of Custody Component**: Created complete chain of custody management interface with GPS-enabled transfer tracking, audit trails, and real-time status updates
  - **On-Site Server Documentation**: Developed comprehensive README.md and DEPLOYMENT.md with complete setup instructions for on-premise server deployment including security hardening, monitoring, and backup procedures
  - **Air Sample Results Section**: Added comprehensive lab results tracking with result values, units, uncertainty, regulatory limits (PEL/TLV/REL), and results posting functionality with lab report dates and personnel assignment
  - **Production Deployment Fix**: Created DEPLOYMENT-FIX.md with immediate solutions for package.json deployment errors, including directory structure verification and corrected npm commands

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