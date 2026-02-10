# Deployment Guide for Render

## Prerequisites
1. GitHub repository with your code
2. Render account (free tier available)
3. MongoDB Atlas database (already configured)
4. Cloudinary account for image uploads

## Environment Variables

Add these to your Render service:

```
DATABASE_URL=your_mongodb_connection_string
NEXTAUTH_URL=https://your-app.onrender.com
NEXTAUTH_SECRET=your_secret_key_here
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
NEXT_PUBLIC_APP_URL=https://your-app.onrender.com
```

## Render Configuration

### Build Command
```
npm install && npx prisma generate
```

### Start Command
```
npm run start
```

## Keep-Alive Setup

The application includes a built-in keep-alive mechanism that prevents Render's free tier from spinning down:

- Health check endpoint: `/api/health`
- Automatically pings every 14 minutes
- Only runs in production

### External Keep-Alive (Optional)

For additional reliability, you can use external services:

1. **UptimeRobot** (Free):
   - Add monitor: `https://your-app.onrender.com/api/health`
   - Check interval: 5 minutes

2. **Cron-job.org** (Free):
   - URL: `https://your-app.onrender.com/api/health`
   - Interval: Every 10 minutes

## Post-Deployment Steps

1. Run database migration:
   ```
   npx prisma db push
   ```

2. Create initial super admin user through MongoDB directly or via API

3. Test the application thoroughly

## Monitoring

- Check Render logs for any errors
- Monitor `/api/health` endpoint status
- Set up alerts for downtime (via UptimeRobot)
