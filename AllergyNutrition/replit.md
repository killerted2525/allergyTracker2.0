# AllergyTracker - Full Stack Application

## Overview

AllergyTracker is a modern web application designed to help users manage and track food allergies and dietary schedules. The application features a calendar-based interface for scheduling and tracking food consumption with customizable frequencies and visual indicators.

## System Architecture

### Full Stack Structure
- **Frontend**: React with TypeScript, using Vite as the build tool
- **Backend**: Express.js server with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **UI Framework**: shadcn/ui components with Tailwind CSS
- **State Management**: TanStack Query for server state management

### Directory Structure
```
├── client/          # React frontend application
├── server/          # Express.js backend API
├── shared/          # Shared TypeScript schemas and types
├── components.json  # shadcn/ui configuration
└── migrations/      # Database migration files
```

## Key Components

### Frontend Architecture
- **React 18** with TypeScript for type safety
- **Vite** for fast development and optimized builds
- **shadcn/ui** component library with Radix UI primitives
- **Tailwind CSS** for styling with Apple-inspired design system
- **TanStack Query** for API state management and caching
- **React Hook Form** with Zod validation for form handling
- **Wouter** for lightweight client-side routing

### Backend Architecture
- **Express.js** server with TypeScript
- **RESTful API** design pattern
- **Drizzle ORM** for database operations
- **Zod** for runtime type validation
- **In-memory storage** with interface for easy database migration

### Data Storage
- **PostgreSQL** database (configured via Drizzle)
- **Neon Database** serverless PostgreSQL provider
- **Drizzle ORM** for type-safe database operations
- **Database migrations** managed through Drizzle Kit

## Data Flow

1. **Client Requests**: React components make API calls using TanStack Query
2. **API Layer**: Express.js routes handle HTTP requests with validation
3. **Business Logic**: Server-side logic processes requests and manages data
4. **Data Persistence**: Drizzle ORM interacts with PostgreSQL database
5. **Response**: JSON responses sent back to client with proper error handling

### Database Schema
- **Users Table**: Stores user accounts with username and hashed passwords
- **Foods Table**: Stores food items with name, instructions, color, frequency, and status
- **Schedule Entries Table**: Tracks daily food scheduling with completion status
- **Foreign Key Relationships**: Foods and schedule entries are linked to users for data isolation

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL connection for serverless environments
- **drizzle-orm**: Type-safe ORM for database operations
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Accessible UI primitives
- **react-hook-form**: Form state management
- **zod**: Runtime type validation

### Development Tools
- **TypeScript**: Static type checking
- **Vite**: Build tool and development server
- **Tailwind CSS**: Utility-first CSS framework
- **ESBuild**: Fast JavaScript bundler for production

## Deployment Strategy

### Build Process
1. **Frontend Build**: Vite compiles React app to static assets
2. **Backend Build**: ESBuild bundles Express server for Node.js
3. **Database Setup**: Drizzle migrations ensure schema consistency

### Environment Configuration
- **Development**: Local development with hot reload
- **Production**: Optimized builds with environment-specific configurations
- **Database**: Environment-specific DATABASE_URL configuration

### Deployment Architecture
- **Static Assets**: Frontend served from `dist/public`
- **API Server**: Express.js backend serves API routes
- **Database**: PostgreSQL hosted on Neon (serverless)
- **Environment Variables**: Secure configuration for database connections

## Recent Changes
```
Recent Updates:
- October 13, 2025: Replaced Replit Auth with platform-agnostic authentication
  • Removed all Replit-specific auth code (works on any platform now)
  • Implemented simple username/password authentication with bcrypt hashing
  • Added session regeneration on login/register to prevent session fixation attacks
  • Created tabbed login/register UI with form validation
  • Each user now has private, isolated food lists and schedules
  • Fully compatible with Render deployment (no Replit dependencies)
  • Requires SESSION_SECRET environment variable in production for security
- August 07, 2025: READY FOR DEPLOYMENT - Simplified and optimized
  • Removed AI camera scanner to eliminate OpenAI dependency
  • Perfect mobile portrait layout with proper button sizing (36px) and spacing
  • Streamlined responsive design with optimized padding and text sizes
  • App is fully functional and deployment-ready with no external dependencies
- August 07, 2025: PERFECTED THE APP - Final polish and optimization complete
  • Enhanced AI-powered camera scanner with advanced handwriting recognition
  • Applied perfect Apple-inspired design with glassmorphism effects and animations
  • Streamlined interface by removing bulk actions and quick actions for cleaner focus
  • Added comprehensive error handling and enhanced user feedback throughout
  • Implemented perfect mobile responsiveness with 44px+ touch targets
  • Enhanced OpenAI Vision API prompts for maximum accuracy and food detection
  • Added performance optimizations with GPU acceleration and smooth animations
  • Perfect loading states, success animations, and accessibility features
- August 07, 2025: Simplified interface - AI scanner removed
  • Removed AI-powered camera scanner to eliminate external dependencies
  • Streamlined calendar interface for faster loading and easier deployment
  • Focused on core functionality: food management, scheduling, and tracking
  • Cleaner, simpler user experience without complex AI features
- July 14, 2025: UI cleanup and streamlining
  • Removed tips display feature entirely per user request
  • Removed duplicate Quick Actions section from calendar bottom
  • Cleaned up unnecessary meal type icons and labels
  • Fixed all JavaScript null pointer errors in event handlers
  • Resolved duplicate support button issue
  • Streamlined interface to focus on core calendar functionality
- July 14, 2025: Enhanced Apple Calendar export with recurring events
  • Apple Calendar export now creates recurring events instead of one-time events
  • Events repeat automatically based on food frequencies (daily, weekly, etc.)
  • Added calendar subscription feature for automatic updates
  • Calendar updates when app data changes without needing re-export
  • Subscription URL provides live calendar feed that syncs with all devices
- July 14, 2025: Added Render deployment configuration
  • Created comprehensive deployment guides for easy publishing
  • Added render.yaml configuration for automated deployment
  • Included deployment script and step-by-step instructions
  • Configured for free hosting on Render with PostgreSQL database
- July 10, 2025: Mobile responsiveness improvements and orientation support
  • Fixed buttons extending off-screen on mobile devices
  • Added full descriptive names on all buttons (no abbreviations)
  • Implemented proper mobile spacing and padding (p-3 on mobile, p-6 on desktop)
  • Added landscape orientation support with compact layouts
  • Enhanced touch targets for better mobile interaction
  • Improved responsive text sizing across all components
- July 10, 2025: Prepared for Vercel deployment
  • Created vercel.json configuration for serverless deployment
  • Added api/index.ts for Vercel serverless functions
  • Created comprehensive deployment guide (DEPLOYMENT.md)
  • Set up GitHub repository preparation files
  • Ready for free hosting on Vercel with automatic deployments
- July 10, 2025: Added tip system and support integration
  • Added rotating tips display that changes every 15 seconds (minimal Minecraft-style)
  • Added floating support button for direct text messaging
  • Support button opens SMS to 914-300-4674 on mobile devices
  • Desktop users get phone number copied to clipboard
  • Tips include helpful allergy management advice
- July 10, 2025: Database integration and start date picker
  • Implemented PostgreSQL database for persistent data storage
  • Added start date picker to food form
  • Data now persists when app is closed and reopened
  • Foods automatically generate schedule entries from selected start date
- July 07, 2025: Enhanced UI with colorful design and sleek logo
  • Added custom frequency input (e.g., "Every day", "3 times per week")
  • Expanded color palette with 10 vibrant color options
  • Created modern logo with calendar grid and health heart icon
  • Added gradient backgrounds and glassmorphism effects
  • Improved visual appeal with backdrop blur and enhanced shadows
- July 07, 2025: Initial setup and core functionality
```

## User Preferences
```
Preferred communication style: Simple, everyday language.
Mobile-first development: Always check mobile responsiveness and test layouts on mobile screens.
Button labeling: Always use full, descriptive names on buttons - avoid abbreviations like "Q" for "Quick Actions".
Orientation support: Ensure app works properly in both portrait and landscape orientations on mobile devices.
Deployment platform: Always deploy to Render (never Replit deployment) - user uses Chromebook with Render for free hosting.
```