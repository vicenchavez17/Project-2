# Analytics with Cloud Logging and BigQuery

## Overview

This app uses **Google Cloud Logging** for analytics event tracking, which can be exported to **BigQuery** for analysis and dashboards. This approach uses GCP services you already have access to.

## How It Works

1. **Frontend** tracks user events (clicks, page views, generations, etc.)
2. **Backend** receives events and logs them to **Cloud Logging** with structured metadata
3. **Cloud Logging** stores all events with queryable fields
4. **BigQuery** (optional) can import logs for SQL-based analytics and dashboards

## Setup Instructions

### 1. Viewing Analytics in Cloud Logging

Analytics events are automatically logged. To view them:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **Logging** → **Logs Explorer**
3. Filter by:
   ```
   resource.type="gae_app"
   jsonPayload.activityType="ANALYTICS_EVENT"
   ```

### 2. Export to BigQuery (Recommended for Analytics)

To run SQL queries and create dashboards:

1. **Create BigQuery Dataset**:
   - Go to **BigQuery** in GCP Console
   - Click **Create Dataset**
   - Name: `analytics_data`
   - Region: Same as your App Engine region

2. **Create Log Sink**:
   - Go to **Logging** → **Log Router**
   - Click **Create Sink**
   - Name: `analytics-to-bigquery`
   - Sink destination: **BigQuery dataset**
   - Select your `analytics_data` dataset
   - Add filter:
     ```
     resource.type="gae_app"
     jsonPayload.activityType="ANALYTICS_EVENT"
     ```
   - Click **Create Sink**

3. **Wait for Data**:
   - BigQuery will create tables automatically
   - Events will appear within minutes
   - Table name: `analytics_data.apparel-app-logs_YYYYMMDD`

### 3. Query Analytics Data

Once data in BigQuery, run SQL queries:

#### **Total Unique Users**
```sql
SELECT 
  COUNT(DISTINCT jsonPayload.userId) as total_users
FROM `outfit-cs651.analytics_data.apparel-app-logs_*`
WHERE jsonPayload.activityType = 'ANALYTICS_EVENT'
  AND jsonPayload.userId != 'anonymous'
  AND _TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY))
```

#### **Average Generations Per User**
```sql
WITH user_generations AS (
  SELECT 
    jsonPayload.userId as user_id,
    COUNT(*) as generation_count
  FROM `outfit-cs651.analytics_data.apparel-app-logs_*`
  WHERE jsonPayload.activityType = 'ANALYTICS_EVENT'
    AND jsonPayload.eventName = 'generation_complete'
    AND jsonPayload.status = 'success'
    AND _TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY))
  GROUP BY user_id
)
SELECT 
  AVG(generation_count) as avg_generations_per_user,
  MIN(generation_count) as min_generations,
  MAX(generation_count) as max_generations
FROM user_generations
```

#### **Average Generation Time (milliseconds)**
```sql
SELECT 
  AVG(CAST(jsonPayload.duration AS INT64)) as avg_generation_time_ms,
  AVG(CAST(jsonPayload.duration AS INT64)) / 1000 as avg_generation_time_seconds
FROM `outfit-cs651.analytics_data.apparel-app-logs_*`
WHERE jsonPayload.activityType = 'ANALYTICS_EVENT'
  AND jsonPayload.eventName = 'generation_complete'
  AND jsonPayload.status = 'success'
  AND _TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY))
```

#### **Daily Active Users**
```sql
SELECT 
  DATE(timestamp) as date,
  COUNT(DISTINCT jsonPayload.userId) as daily_active_users
FROM `outfit-cs651.analytics_data.apparel-app-logs_*`
WHERE jsonPayload.activityType = 'ANALYTICS_EVENT'
  AND _TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY))
GROUP BY date
ORDER BY date DESC
```

#### **Generation Success Rate**
```sql
SELECT 
  jsonPayload.status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM `outfit-cs651.analytics_data.apparel-app-logs_*`
WHERE jsonPayload.activityType = 'ANALYTICS_EVENT'
  AND jsonPayload.eventName = 'generation_complete'
  AND _TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY))
GROUP BY jsonPayload.status
```

#### **Shopping Link Click-Through Rate**
```sql
WITH link_views AS (
  SELECT COUNT(*) as views
  FROM `outfit-cs651.analytics_data.apparel-app-logs_*`
  WHERE jsonPayload.activityType = 'ANALYTICS_EVENT'
    AND jsonPayload.eventName = 'view_shopping_links'
),
link_clicks AS (
  SELECT COUNT(*) as clicks
  FROM `outfit-cs651.analytics_data.apparel-app-logs_*`
  WHERE jsonPayload.activityType = 'ANALYTICS_EVENT'
    AND jsonPayload.eventName = 'click_shopping_link'
)
SELECT 
  views,
  clicks,
  ROUND(clicks * 100.0 / views, 2) as click_through_rate_percent
FROM link_views, link_clicks
```

#### **Most Popular Pages**
```sql
SELECT 
  jsonPayload.page_path as page,
  COUNT(*) as views
FROM `outfit-cs651.analytics_data.apparel-app-logs_*`
WHERE jsonPayload.activityType = 'ANALYTICS_EVENT'
  AND jsonPayload.eventName = 'page_view'
  AND _TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY))
GROUP BY page
ORDER BY views DESC
LIMIT 10
```

#### **User Engagement Funnel**
```sql
WITH funnel_data AS (
  SELECT 
    jsonPayload.userId,
    MAX(CASE WHEN jsonPayload.eventName = 'page_view' THEN 1 ELSE 0 END) as visited,
    MAX(CASE WHEN jsonPayload.eventName = 'login' OR jsonPayload.eventName = 'sign_up' THEN 1 ELSE 0 END) as signed_in,
    MAX(CASE WHEN jsonPayload.eventName = 'generation_start' THEN 1 ELSE 0 END) as started_generation,
    MAX(CASE WHEN jsonPayload.eventName = 'generation_complete' AND jsonPayload.status = 'success' THEN 1 ELSE 0 END) as completed_generation,
    MAX(CASE WHEN jsonPayload.eventName = 'click_shopping_link' THEN 1 ELSE 0 END) as clicked_shopping
  FROM `outfit-cs651.analytics_data.apparel-app-logs_*`
  WHERE jsonPayload.activityType = 'ANALYTICS_EVENT'
    AND _TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY))
  GROUP BY jsonPayload.userId
)
SELECT 
  SUM(visited) as total_visitors,
  SUM(signed_in) as signed_in_users,
  SUM(started_generation) as started_generation,
  SUM(completed_generation) as completed_generation,
  SUM(clicked_shopping) as clicked_shopping,
  ROUND(SUM(signed_in) * 100.0 / SUM(visited), 2) as signin_rate,
  ROUND(SUM(completed_generation) * 100.0 / SUM(started_generation), 2) as generation_success_rate,
  ROUND(SUM(clicked_shopping) * 100.0 / SUM(completed_generation), 2) as shopping_click_rate
FROM funnel_data
```

## Tracked Events

All events are logged with:
- `activityType: "ANALYTICS_EVENT"`
- `eventName`: Type of event
- `userId`: User identifier (email or 'anonymous')
- `category`: Event category
- `timestamp`: ISO timestamp
- Additional event-specific fields

#### 1. **Image Generation Metrics**

- **Event**: `generation_start`
  - When: User initiates image generation
  - Parameters:
    - `user_id`: User email or 'anonymous'
    - `event_label`: Image source ('upload', 'twitter', 'preloaded')
    - `event_category`: 'engagement'

- **Event**: `generation_complete`
  - When: Image generation finishes (success or failure)
  - Parameters:
    - `user_id`: User email or 'anonymous'
    - `value`: Generation time in milliseconds
    - `event_label`: 'success' or 'failure'
    - `metric_generation_time`: Duration metric

#### 2. **User Authentication**

- **Event**: `login`
  - When: User logs in
  - Parameters:
    - `user_id`: User email
    - `method`: Authentication method ('email')

- **Event**: `sign_up`
  - When: New user registers
  - Parameters:
    - `user_id`: User email
    - `method`: Registration method ('email')

#### 3. **Shopping Link Interactions**

- **Event**: `view_shopping_links`
  - When: User views result page with shopping links
  - Parameters:
    - `user_id`: User email or 'anonymous'
    - `value`: Number of shopping links displayed
    - `event_category`: 'engagement'

- **Event**: `click_shopping_link`
  - When: User clicks a shopping link
  - Parameters:
    - `user_id`: User email or 'anonymous'
    - `event_label`: URL clicked
    - `value`: Position of link (0-indexed)
    - `event_category`: 'conversion'

#### 4. **Feature Usage**

- **Event**: `twitter_connect`
  - When: User connects Twitter account
  - Parameters:
    - `user_id`: User email or 'anonymous'
#### 5. **Error Tracking**

- **Event**: `exception`
  - When: An error occurs
  - Fields:
    - `userId`: User email or 'anonymous'
    - `errorType`: Type of error
    - `errorMessage`: Error description
    - `category`: 'error'

## Creating Dashboards

### Using Looker Studio (Free)
### Using Looker Studio (Free)

1. Go to [Looker Studio](https://lookerstudio.google.com/)
2. Click **Create** → **Data Source**
3. Select **BigQuery**
4. Choose your `analytics_data` dataset
5. Select the analytics table
6. Click **Add** to create visualizations

Recommended dashboard panels:
- **Scorecard**: Total users, avg generations per user
- **Time series**: Daily active users, generation times
- **Bar chart**: Most popular pages, event distribution
- **Funnel chart**: User journey conversion rates
- **Table**: Recent events, top users by activity

### Using BigQuery UI

Run queries directly in BigQuery console and save results as charts.

## Testing Analytics

Verify analytics are working:

1. **Test Events**: Use your app (sign in, generate image, etc.)
2. **View in Cloud Logging**:
   - Go to **Logging** → **Logs Explorer**
   - Filter: `jsonPayload.activityType="ANALYTICS_EVENT"`
   - You should see events appear within seconds

3. **Check BigQuery** (if configured):
   - Go to **BigQuery**
   - Run: 
     ```sql
     SELECT * FROM `outfit-cs651.analytics_data.apparel-app-logs_*`
     WHERE jsonPayload.activityType = 'ANALYTICS_EVENT'
     ORDER BY timestamp DESC
     LIMIT 10
     ```

## Privacy & Compliance

- User emails tracked as user IDs for authenticated users
- Anonymous users tracked as 'anonymous'
- No sensitive data (passwords, tokens) sent to analytics
- Data stored in your GCP project (you control it)
- Add privacy policy and cookie consent as needed

## Cost Considerations

- **Cloud Logging**: First 50 GB/month free, then $0.50/GB
- **BigQuery**: First 1 TB queries/month free, storage $0.02/GB/month
- Typical usage for this app: Very minimal cost (likely free tier)

## Files Created/Modified

- `frontend/src/utils/analytics.js` - Analytics utility (sends events to backend)
- `public/services/analyticsService.js` - Backend analytics service  
- `server.js` - Analytics endpoint (`/analytics/event`)
- `frontend/src/index.js` - Analytics initialization
- `frontend/src/App.js` - Page view tracking
- `frontend/src/pages/SelectImagePage.js` - Generation and Twitter events
- `frontend/src/pages/ResultPage.js` - Shopping link events
- `frontend/src/pages/SignInPage.js` - Authentication events
## Files Modified

- `frontend/src/utils/analytics.js` - Analytics utility functions
- `frontend/src/index.js` - GA initialization
- `frontend/src/App.js` - Page view tracking
- `frontend/src/pages/SelectImagePage.js` - Generation and Twitter events
- `frontend/src/pages/ResultPage.js` - Shopping link events
- `frontend/src/pages/SignInPage.js` - Authentication events
- `frontend/src/env` - GA Measurement ID configuration
