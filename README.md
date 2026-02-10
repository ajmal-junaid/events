# Rental Management System

A comprehensive rental management system built with Next.js 14, MongoDB, Prisma, and NextAuth.js.

## Prerequisites

-   **Node.js**: Version 18+ (Recommended: 20 LTS)
-   **MongoDB**: A running instance (Local or Atlas)

## Getting Started

### 1. Installation

```bash
# Clone the repository (if applicable) or navigate to project directory
cd rental-system

# Install dependencies
npm install
```

### 2. Environment Configuration

Ensure you have a `.env` file in the root directory with the following variables:

```env
# MongoDB Connection String
DATABASE_URL="mongodb+srv://username:password@cluster.mongodb.net/rental-system?retryWrites=true&w=majority"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="vSMo9XLh4OD3WiSIJBX2daAX3gK8dCRaGwDiAfYGHho="
```

*Note: The `NEXTAUTH_SECRET` has been auto-generated for you. If you deploy to production, generate a new one using `openssl rand -base64 32`.*

### 3. Database Setup

Synchronize your Prisma schema with the MongoDB database:

```bash
# Generate Prisma Client
npx prisma generate

# Push schema to database
npx prisma db push
```

**(Optional) Seed Initial Data**
If you need an initial admin account, you can create one via the Signup page or by manually inserting into the database if you haven't implemented a seeder yet.

### 4. Running the Application

```bash
# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Seeding

To create the initial admin account and default branch, run:

```bash
npx prisma db seed
```

## Default Login Credentials

If you have run the seeding script, you can use these credentials to log in:

-   **Email**: `admin@rental.com`
-   **Password**: `admin123`

## Troubleshooting

-   **Port in Use**: If port 3000 is busy, Next.js will try 3001. You can force a port with `PORT=3000 npm run dev`.
-   **NextAuth Error (NO_SECRET)**: Ensure `NEXTAUTH_SECRET` is in `.env` and you have restarted the server after adding it.
-   **Prisma Errors**: Run `npx prisma generate` again if you change the schema.
-   **Missing Admin**: If you can't log in, ensure you ran `npx prisma db seed`.

## Features at a Glance

-   **Multi-Branch Management**: Manage inventory across different locations.
-   **Order Processing**: Real-time stock availability checks.
-   **Financials**: Invoice generation and payment tracking.
-   **Dashboard**: Analytics and reporting.
-   **PWA**: Installable on mobile devices.
