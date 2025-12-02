import dotenv from "dotenv";
dotenv.config();

export const twitterConfig = {
  clientId: process.env.TWITTER_CLIENT_ID,
  clientSecret: process.env.TWITTER_CLIENT_SECRET,
  redirectUri: process.env.TWITTER_REDIRECT_URI, 
  scopes: "tweet.read users.read offline.access",  // includes refresh tokens
  authorizeUrl: "https://twitter.com/i/oauth2/authorize",
  tokenUrl: "https://api.twitter.com/2/oauth2/token",
  userTweetsUrl: "https://api.twitter.com/2/users/:id/tweets",
};
