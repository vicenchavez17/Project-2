import { twitterAuthService } from "../services/twitterAuthService.js";

export const twitterAuthController = {
  beginAuth(req, res) {
    const url = twitterAuthService.createAuthUrl();
    res.redirect(url);
  },

  async handleCallback(req, res) {
    const { code, error } = req.query;
    
    if (error) {
        // Redirect to callback page with error
        return res.redirect(`/twitter-callback.html?error=${encodeURIComponent(error)}`);
    }

    try {
        const tokenData = await twitterAuthService.exchangeCodeForToken(code);
        const userInfo = await twitterAuthService.getUserInfo(tokenData.access_token);

        // Redirect to callback page with credentials
        const redirectUrl = `/twitter-callback.html?twitterAccess=${tokenData.access_token}&twitterUserId=${userInfo.id}`;
        res.redirect(redirectUrl);
    } catch (err) {
        console.error("Callback error:", err);
        res.redirect(`/twitter-callback.html?error=${encodeURIComponent(err.message)}`);
    }
  }
};