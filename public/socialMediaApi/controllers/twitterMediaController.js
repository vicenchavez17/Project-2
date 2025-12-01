import { twitterApiService } from "../services/twitterApiService.js";

export const twitterMediaController = {
  // GET /twitter/media
  async fetchMedia(req, res) {
    try {
      const { accessToken, twitterUserId } = req.query;
      if (!accessToken || !twitterUserId) {
        return res.status(400).json({ error: "Missing user info" });
      }

      const images = await twitterApiService.getUserMedia(accessToken, twitterUserId);
      res.json({ images });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
};
