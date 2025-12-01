import fetch from "node-fetch";
import { twitterConfig } from "../config/twitterConfig.js";

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
    const body = new URLSearchParams({
      code,
      grant_type: "authorization_code",
      redirect_uri: twitterConfig.redirectUri,
      code_verifier: "challenge",
    });

    const resp = await fetch(twitterConfig.tokenUrl, {
      method: "POST",
      headers: { 
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": this.getBasicAuthHeader() // ADD THIS!
      },
      body
    });

    const json = await resp.json();
    if (!resp.ok) {
      console.error("Token exchange error:", json);
      throw new Error(json.error_description || json.error || "Token exchange failed");
    }

    return json;
  },

  // Get the authenticated user's info (including their ID)
  async getUserInfo(accessToken) {
    const resp = await fetch("https://api.twitter.com/2/users/me", {
      headers: { 
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const json = await resp.json();
    if (!resp.ok) {
      console.error("Get user info error:", json);
      throw new Error(json.error || "Failed to get user info");
    }

    return json.data; // Returns { id, name, username }
  },

  async refreshAccessToken(refreshToken) {
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });

    const resp = await fetch(twitterConfig.tokenUrl, {
      method: "POST",
      headers: { 
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": this.getBasicAuthHeader() // Need Basic Auth here too!
      },
      body
    });

    const json = await resp.json();
    if (!resp.ok) {
      console.error("Refresh token error:", json);
      throw new Error(json.error || "Refresh failed");
    }

    return json;
  }
};