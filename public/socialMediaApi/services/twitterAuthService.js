import fetch from "node-fetch";
import { twitterConfig } from "../config/twitterConfig.js";
import { logExternalApiCall } from "../../services/logger.js";

export const twitterAuthService = {
  createAuthUrl() {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: twitterConfig.clientId,
      redirect_uri: twitterConfig.redirectUri,
      scope: twitterConfig.scopes,
      state: "secureRandomState123", 
      code_challenge: "challenge",
      code_challenge_method: "plain"
    });

    return `${twitterConfig.authorizeUrl}?${params.toString()}`;
  },

  /**
   * Creates Basic Auth header for token requests
   * Twitter requires: Authorization: Basic base64(clientId:clientSecret)
   */
  getBasicAuthHeader() {
    const credentials = `${twitterConfig.clientId}:${twitterConfig.clientSecret}`;
    const base64Credentials = Buffer.from(credentials).toString('base64');
    return `Basic ${base64Credentials}`;
  },

  async exchangeCodeForToken(code) {
    const startTime = Date.now();
    const body = new URLSearchParams({
      code,
      grant_type: "authorization_code",
      redirect_uri: twitterConfig.redirectUri,
      code_verifier: "challenge",
    });

    try {
      const resp = await fetch(twitterConfig.tokenUrl, {
        method: "POST",
        headers: { 
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": this.getBasicAuthHeader() // ADD THIS!
        },
        body
      });

      const json = await resp.json();
      const duration = Date.now() - startTime;

      if (!resp.ok) {
        logExternalApiCall('Twitter API', 'exchangeCodeForToken', {
          duration,
          success: false,
          statusCode: resp.status,
          errorMessage: json.error_description || json.error || "Token exchange failed"
        });
        throw new Error(json.error_description || json.error || "Token exchange failed");
      }

      logExternalApiCall('Twitter API', 'exchangeCodeForToken', {
        duration,
        success: true,
        statusCode: resp.status
      });

      return json;
    } catch (error) {
      const duration = Date.now() - startTime;
      logExternalApiCall('Twitter API', 'exchangeCodeForToken', {
        duration,
        success: false,
        errorMessage: error.message
      });
      throw error;
    }
  },

  // Get the authenticated user's info (including their ID)
  async getUserInfo(accessToken) {
    const startTime = Date.now();
    
    try {
      const resp = await fetch("https://api.twitter.com/2/users/me", {
        headers: { 
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const json = await resp.json();
      const duration = Date.now() - startTime;

      if (!resp.ok) {
        logExternalApiCall('Twitter API', 'getUserInfo', {
          duration,
          success: false,
          statusCode: resp.status,
          errorMessage: json.error || "Failed to get user info"
        });
        throw new Error(json.error || "Failed to get user info");
      }

      logExternalApiCall('Twitter API', 'getUserInfo', {
        duration,
        success: true,
        statusCode: resp.status,
        userId: json.data?.id,
        username: json.data?.username
      });

      return json.data; // Returns { id, name, username }
    } catch (error) {
      const duration = Date.now() - startTime;
      logExternalApiCall('Twitter API', 'getUserInfo', {
        duration,
        success: false,
        errorMessage: error.message
      });
      throw error;
    }
  },

  async refreshAccessToken(refreshToken) {
    const startTime = Date.now();
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });

    try {
      const resp = await fetch(twitterConfig.tokenUrl, {
        method: "POST",
        headers: { 
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": this.getBasicAuthHeader() // Need Basic Auth here too!
        },
        body
      });

      const json = await resp.json();
      const duration = Date.now() - startTime;

      if (!resp.ok) {
        logExternalApiCall('Twitter API', 'refreshAccessToken', {
          duration,
          success: false,
          statusCode: resp.status,
          errorMessage: json.error || "Refresh failed"
        });
        throw new Error(json.error || "Refresh failed");
      }

      logExternalApiCall('Twitter API', 'refreshAccessToken', {
        duration,
        success: true,
        statusCode: resp.status
      });

      return json;
    } catch (error) {
      const duration = Date.now() - startTime;
      logExternalApiCall('Twitter API', 'refreshAccessToken', {
        duration,
        success: false,
        errorMessage: error.message
      });
      throw error;
    }
  }
};