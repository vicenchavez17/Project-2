# Cloud Logging Setup Guide

## Overview
Your application now uses **Google Cloud Logging** (Winston integration) to track user activity and system events. All logs are sent to both the console (for development) and Google Cloud Logging (for production monitoring).

---

## What's Being Logged

### 1. **Authentication Events**
- **User Registration**: Success and failures (duplicate email)
- **User Login**: Success and failed attempts (invalid credentials)
- **Metadata**: Email, username, timestamp

### 2. **Image Generation Activity**
- **User Queries**: Search terms for apparel
- **Detected Apparel**: All items found by Vision API
- **Selected Apparel**: Which item was used for generation
- **Image IDs**: Generated image identifiers
- **Duration**: Processing time in milliseconds

### 3. **External API Calls**
- **Vision API**: Object localization, label detection, image properties
- **AI Platform**: Image generation predictions
- **Metadata**: Duration, objects detected, API operation type

### 4. **HTTP Requests**
- **All API Endpoints**: Method, path, status code
- **User Information**: Email (if authenticated)
- **Performance**: Request duration
- **Client Details**: IP address, user agent

### 5. **Errors & Warnings**
- **Application Errors**: Full stack traces
- **Failed Logins**: Invalid credentials attempts
- **Processing Failures**: Image generation errors

---

## File Structure

```
public/
├── services/
│   ├── logger.js              # Winston + Cloud Logging configuration
│   └── authService.js         # Updated with auth logging
└── middleware/
    └── loggingMiddleware.js   # HTTP request/response logging

server.js                      # Updated with logging integration
```

---

## How to View Logs

### **Option 1: Console (Development)**
Logs automatically print to your terminal when running the server:
```bash
npm run dev
```

Example output:
```
2025-11-30 14:32:15 [info]: HTTP POST /auth/login - 200 {"userId":"user@example.com","duration":245}
2025-11-30 14:32:20 [info]: Auth Event: LOGIN_SUCCESS {"userId":"user@example.com"}
```

### **Option 2: Google Cloud Console (Production)**

1. **Navigate to Cloud Logging**:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Select your project
   - Go to **Logging** → **Logs Explorer**

2. **Filter Logs**:
   ```
   logName="projects/YOUR_PROJECT_ID/logs/apparel-app-logs"
   ```

3. **Search by Activity Type**:
   ```
   jsonPayload.activityType="LOGIN_SUCCESS"
   jsonPayload.activityType="IMAGE_GENERATION"
   jsonPayload.activityType="EXTERNAL_API_CALL"
   ```

4. **Search by User**:
   ```
   jsonPayload.userId="user@example.com"
   ```

5. **View Errors Only**:
   ```
   severity="ERROR"
   ```

---

## Environment Variables

Make sure these are set in your `.env` file:

```env
# Required for Cloud Logging to work
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account-key.json
GOOGLE_CLOUD_PROJECT=your-project-id

# Optional: Set log level (default: info)
LOG_LEVEL=info
```

**Log Levels** (from most to least verbose):
- `debug` - Detailed debugging information
- `info` - General informational messages (default)
- `warn` - Warning messages
- `error` - Error messages only

---

## Log Structure

All logs follow this structure:

```json
{
  "timestamp": "2025-11-30T14:32:15.123Z",
  "severity": "INFO",
  "message": "Auth Event: LOGIN_SUCCESS",
  "service": "apparel-recommendation-service",
  "activityType": "LOGIN_SUCCESS",
  "category": "authentication",
  "userId": "user@example.com",
  "metadata": {
    "username": "john_doe",
    "ip": "192.168.1.1",
    "userAgent": "Mozilla/5.0..."
  }
}
```

### Key Fields:
- `activityType`: Type of event (LOGIN_SUCCESS, IMAGE_GENERATION, etc.)
- `category`: Grouping (authentication, image-processing, api, http, error)
- `userId`: User email or "anonymous"
- `duration`: Time taken in milliseconds
- `metadata`: Event-specific additional data

---

## Sample Log Queries

### Find all failed login attempts:
```
logName="projects/YOUR_PROJECT_ID/logs/apparel-app-logs"
jsonPayload.activityType="WARNING"
jsonPayload.message=~"Login attempt"
```

### Find slow image generations (>5 seconds):
```
logName="projects/YOUR_PROJECT_ID/logs/apparel-app-logs"
jsonPayload.activityType="IMAGE_GENERATION"
jsonPayload.metadata.duration>5000
```

### Find all Vision API calls:
```
logName="projects/YOUR_PROJECT_ID/logs/apparel-app-logs"
jsonPayload.service="Vision API"
```

### Find errors for a specific user:
```
logName="projects/YOUR_PROJECT_ID/logs/apparel-app-logs"
severity="ERROR"
jsonPayload.userId="user@example.com"
```

---

## Setting Up Alerts (Optional)

You can create alerts in Google Cloud Console to notify you of issues:

1. **Go to Monitoring** → **Alerting** → **Create Policy**

2. **Example Alert: Failed Login Threshold**
   - Condition: Log match
   - Filter: `jsonPayload.message=~"Login attempt with invalid password"`
   - Threshold: More than 5 occurrences in 5 minutes

3. **Example Alert: High Error Rate**
   - Condition: Log match
   - Filter: `severity="ERROR"`
   - Threshold: More than 10 errors in 10 minutes

---

## Cost Considerations

**Cloud Logging Pricing**:
- **Free Tier**: 50 GB per project per month
- **After Free Tier**: $0.50 per GB

**Typical Usage** (for student projects):
- ~100 requests/day = ~10 MB/month
- ~1,000 requests/day = ~100 MB/month
- Well within free tier for most use cases

**Retention**:
- Default: 30 days
- Can be configured up to 400 days

---

## Troubleshooting

### Logs not appearing in Cloud Console?

1. **Check credentials**:
   ```bash
   echo $GOOGLE_APPLICATION_CREDENTIALS
   ```
   Should point to your service account JSON file.

2. **Verify service account permissions**:
   - Needs `Logs Writer` role
   - Go to IAM & Admin → IAM → Check your service account

3. **Check console output**:
   - Logs should still appear in terminal even if Cloud Logging fails
   - Look for Winston error messages

### Too many logs?

Reduce log level in `.env`:
```env
LOG_LEVEL=warn  # Only warnings and errors
```

Or disable Cloud Logging in development by commenting out the transport in `logger.js`.

---

## Next Steps

1. **Run your server**: `npm run dev`
2. **Generate some activity**: Login, upload images, etc.
3. **Check Cloud Console**: View logs in Logs Explorer
4. **Set up alerts**: Optional monitoring for production

---

## Support

- [Cloud Logging Documentation](https://cloud.google.com/logging/docs)
- [Winston Documentation](https://github.com/winstonjs/winston)
- [Log Query Language](https://cloud.google.com/logging/docs/view/logging-query-language)
