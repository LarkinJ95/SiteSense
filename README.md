# AbateIQ - Environmental Health & Safety Survey Management Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-13%2B-blue.svg)](https://www.postgresql.org/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange.svg)](https://developers.cloudflare.com/workers/)

Build trigger: 2026-02-06

## Overview

AbateIQ is a comprehensive full-stack web application designed for environmental health and safety professionals to manage site surveys, environmental assessments, and regulatory compliance. The platform streamlines field data collection, documentation, and reporting for asbestos, lead, cadmium, and air monitoring surveys.

### Key Features

- **Survey Management**: Complete CRUD operations for environmental surveys with combination survey support
- **Air Monitoring System**: Job-based air monitoring with equipment management, quality control, and automated PEL highlighting
- **Chain of Custody**: GPS-enabled sample tracking with barcode scanning and audit trails
- **Advanced Reporting**: Custom report builder with automated generation and compliance tracking
- **Client Portal**: Secure client access with customizable permissions and branding
- **Real-time Collaboration**: Live survey editing with shared cursors and change tracking
- **Internal Messaging**: Team communication platform with threaded conversations
- **Compliance Dashboard**: Automated EPA/OSHA rule tracking with deadline alerts
- **White-Label Platform**: Complete branding customization and data management
- **Mobile-First Design**: Responsive interface optimized for field use

## System Requirements

### Minimum Requirements
- **CPU**: 2-core processor (Intel Core i3 or AMD equivalent)
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 20GB available disk space
- **Network**: Stable internet connection for weather data and updates

### Recommended Requirements (Production)
- **CPU**: 4-core processor (Intel Core i5/i7 or AMD equivalent)
- **RAM**: 16GB or higher
- **Storage**: 50GB+ SSD storage
- **Network**: High-speed internet connection
- **OS**: Ubuntu 20.04+, CentOS 8+, or Windows Server 2019+

## Quick Start

### Development Setup (Cloudflare Workers)

```bash
# Clone the repository
git clone https://github.com/LarkinJ95/sitesense.git
cd SiteSense-main

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Set up the database
npm run db:push

# Start development server
npm run dev
```

Visit `http://127.0.0.1:5050` to access the application.

### Production Deployment (Cloudflare-native)

See [DEPLOYMENT.md](./DEPLOYMENT.md) for comprehensive deployment instructions including Docker, cloud providers, and on-premise setup.
Cloudflare Workers and Pages are the supported production targets for this repo.

## Architecture

### Technology Stack

**Frontend**
- React 18 with TypeScript
- Vite for build tooling and hot reload
- Tailwind CSS for styling
- shadcn/ui component library
- React Query for state management
- Wouter for routing

**Backend**
- Cloudflare Workers + Hono
- TypeScript for type safety
- Drizzle ORM for database operations
- Neon serverless Postgres (fetch-based)
- Cloudflare R2 for file uploads

**Database**
- PostgreSQL 13+ (primary)
- Neon serverless PostgreSQL (cloud option)

**External Services**
- WeatherAPI.com for weather data
- Cloudflare R2 for file storage

### Project Structure

```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Application pages/routes
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utilities and configurations
│   │   └── contexts/       # React contexts
├── server/                 # Cloudflare Worker API
│   ├── db.ts              # Database configuration
│   ├── routes.ts          # API route definitions
│   ├── storage.ts         # Data access layer
│   └── worker.ts          # Worker entry point
├── shared/                 # Shared types and schemas
│   └── schema.ts          # Database schema definitions
└── docs/                  # Documentation
```

## Features Documentation

### Survey Management
- Create, edit, and manage environmental surveys
- Support for combination surveys (Asbestos + Lead + Cadmium)
- GPS-enabled observation tracking
- Photo documentation with metadata
- Status workflow management

### Air Monitoring System
- Job-based air sampling management
- Equipment tracking and calibration
- Quality control checks with automated validation
- PEL (Permissible Exposure Limit) monitoring with real-time alerts
- Weather condition logging
- Personnel assignment and tracking

### Advanced Features
- **Custom Report Builder**: Drag-and-drop report template creation
- **Client Portal**: Secure client access with custom branding
- **Chain of Custody**: Complete sample tracking with GPS and signatures
- **Compliance Dashboard**: Automated regulatory compliance monitoring
- **Real-time Collaboration**: Live editing sessions with multiple users
- **Internal Messaging**: Team communication with file attachments
- **Notification System**: Multi-channel alerts (email, SMS, in-app)

## API Documentation

### Authentication
All API endpoints require proper authentication. The system uses Neon Auth JWTs with role-based access control.

### Core Endpoints

```bash
# Surveys
GET    /api/surveys              # List all surveys
POST   /api/surveys              # Create new survey
GET    /api/surveys/:id          # Get survey details
PUT    /api/surveys/:id          # Update survey
DELETE /api/surveys/:id          # Delete survey

# Air Monitoring
GET    /api/air-monitoring-jobs  # List air monitoring jobs
POST   /api/air-monitoring-jobs  # Create new job
GET    /api/air-samples          # List air samples
POST   /api/air-samples          # Create new sample
PUT    /api/air-samples/:id      # Update sample

# Advanced Features
GET    /api/equipment            # List monitoring equipment
GET    /api/quality-control      # QC checks
GET    /api/pel-alerts           # PEL alerts
GET    /api/chain-of-custody     # Chain of custody records
```

## Configuration

### Environment Variables

Create a `.env` file with the following variables:

```env
# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/sitesense

# Weather API
WEATHERAPI_KEY=your_weatherapi_key

# Application Settings
NODE_ENV=production

# Neon Auth JWT Verification
NEON_JWKS_URL=https://ep-square-shape-ain65e34.neonauth.c-4.us-east-1.aws.neon.tech/neondb/auth/.well-known/jwks.json
NEON_JWT_ISSUER=https://ep-square-shape-ain65e34.neonauth.c-4.us-east-1.aws.neon.tech
NEON_JWT_AUDIENCE=https://ep-square-shape-ain65e34.neonauth.c-4.us-east-1.aws.neon.tech
```

### Cloudflare Variables

Set these in Cloudflare (Workers/Pages → Settings → Variables):

```env
DATABASE_URL=postgresql://user:password@host/db
WEATHERAPI_KEY=your_weatherapi_key
NEON_JWKS_URL=https://ep-square-shape-ain65e34.neonauth.c-4.us-east-1.aws.neon.tech/neondb/auth/.well-known/jwks.json
NEON_JWT_ISSUER=https://ep-square-shape-ain65e34.neonauth.c-4.us-east-1.aws.neon.tech
NEON_JWT_AUDIENCE=https://ep-square-shape-ain65e34.neonauth.c-4.us-east-1.aws.neon.tech
```

Create an R2 bucket named `abateiq-uploads` and bind it as `ABATEIQ_UPLOADS`.

## Cloudflare Deployment

1. Build the client
   ```bash
   npm run build
   ```
2. Deploy Worker + assets
   ```bash
   npx wrangler deploy
   ```

## Breaking Changes (Cloudflare-native)

- Express server has been replaced by a Cloudflare Worker.
- Local file uploads are now stored in Cloudflare R2.
- `npm run dev` now uses `wrangler dev` and runs on `http://127.0.0.1:5050`.

### Weather API Setup

1. Sign up for a free account at [WeatherAPI.com](https://www.weatherapi.com/)
2. Generate an API key
3. Add the key to your `.env` file as `WEATHERAPI_KEY`

## Database Setup

### PostgreSQL Installation

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### CentOS/RHEL
```bash
sudo dnf install postgresql postgresql-server
sudo postgresql-setup --initdb
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Database Configuration

```sql
-- Create database user
CREATE USER sitesense WITH PASSWORD 'your_secure_password';

-- Create database
CREATE DATABASE sitesense OWNER sitesense;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE sitesense TO sitesense;
```

### Schema Migration

```bash
# Apply database schema
npm run db:push

```

## Security Considerations

- Always use HTTPS in production
- Implement proper input validation
- Validate JWT `iss` and `aud` claims
- Regularly update dependencies
- Enable database connection encryption
- Implement rate limiting for API endpoints
- Use environment variables for sensitive configuration

## Performance Optimization

### Database Optimization
- Create appropriate indexes for frequently queried columns
- Use connection pooling
- Implement query optimization
- Regular database maintenance

### Application Optimization
- Enable gzip compression
- Implement caching strategies
- Optimize image sizes and formats
- Use CDN for static assets

## Troubleshooting

### Common Issues

**Database Connection Issues**
```bash
# Check PostgreSQL service status
sudo systemctl status postgresql

# Check connection
psql -h localhost -U sitesense -d sitesense
```

**Weather API Issues**
- Verify API key is valid and active
- Check rate limits
- Ensure internet connectivity

**File Upload Issues (R2)**
- Verify the R2 bucket exists and is bound as `ABATEIQ_UPLOADS`
- Check R2 permissions in Cloudflare
- Confirm uploads are being written to R2 in the Worker

### Logs and Monitoring

Application logs are available in:
- Development: `wrangler dev` console output
- Production: Cloudflare Workers logs

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, please contact:
- Email: support@sitesense.com
- Documentation: https://docs.sitesense.com
- Issues: https://github.com/your-org/sitesense/issues

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for a complete list of changes and version history.
