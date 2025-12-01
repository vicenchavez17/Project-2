import fetch from "node-fetch";
import { twitterConfig } from "../config/twitterConfig.js";

export const twitterApiService = {
  async getUserMedia(accessToken, twitterUserId) {
    // Updated URL to use correct endpoint
    const url = `https://api.twitter.com/2/users/${twitterUserId}/tweets`;
    
    // Request tweets with media attachments
    const params = new URLSearchParams({
      'max_results': '5', // Get last 5 tweets (adjust as needed, max 100)
      'expansions': 'attachments.media_keys',
      'media.fields': 'url,preview_image_url,type',
      'tweet.fields': 'created_at'
    });

    const resp = await fetch(`${url}?${params.toString()}`, {
      headers: { 
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const json = await resp.json();

    if (!resp.ok) {
      console.error("Twitter API error:", json);
      throw new Error(json.error?.message || json.detail || "Twitter media fetch failed");
    }

    // Check if we have data
    if (!json.data || json.data.length === 0) {
      return []; // No tweets found
    }

    // Extract media URLs from the response
    const media = json.includes?.media || [];
    
    // Filter for photos only and get their URLs
    const imageUrls = media
      .filter(m => m.type === 'photo') // Only get photos, not videos
      .map(m => m.url)
      .filter(Boolean); // Remove any undefined values

    return imageUrls;
  },
};