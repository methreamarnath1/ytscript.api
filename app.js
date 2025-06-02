const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const NEWS_API_KEY =
  process.env.NEWS_API_KEY || "57dddbca8dc741a0bf948b510c772889";
const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY || AIzaSyBpq2t7s42CxzbNrvKQAKzwGnh_m3skq84;

const VALID_CATEGORIES = [
  "business",
  "entertainment",
  "general",
  "health",
  "science",
  "sports",
  "technology",
];

app.get("/ytScript", async (req, res) => {
  try {
    const { category = "sports" } = req.query;

    // Validate category
    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({
        error: "Invalid category",
        validCategories: VALID_CATEGORIES,
      });
    }

    const newsRes = await axios.get("https://newsapi.org/v2/top-headlines", {
      params: {
        apiKey: NEWS_API_KEY, // Fix: apikey -> apiKey
        country: "us",
        category: category,
        pageSize: 5, // Increased to ensure we get results
        language: "en", // Added language parameter
      },
    });
    const articles = newsRes.data.articles;
    if (!articles || articles.length === 0) {
      return res.status(404).json({ error: "No news found" });
    }
    const fullText = articles
      .map((a) => `${a.title}\n${a.description || ""}\n${a.content || ""}`)
      .join("\n\n");
    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: `Based on these news articles, please:
1. Create a concise news summary
2. Generate an engaging YouTube Shorts script (30-60 seconds)

News Articles:
${fullText}

Format the response as:
[NEWS SUMMARY]
<summary here>

[YOUTUBE SCRIPT]
<script here>`,
            },
          ],
        },
      ],
    };
    const geminiRes = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      requestBody,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    const ytScript = geminiRes.data.candidates?.[0]?.content?.parts?.[0]?.text;
    res.json({
      category,
      summaryGenerated: {
        summary:
          ytScript
            ?.match(/\[NEWS SUMMARY\]\s*([\s\S]*?)\n\n\[YOUTUBE SCRIPT\]/)?.[1]
            ?.trim() || "",
        script:
          ytScript?.match(/\[YOUTUBE SCRIPT\]\s*([\s\S]*)/)?.[1]?.trim() || "",
      },
      source: "Gemini AI",
      totalArticles: articles.length,
      articles: articles.map((a) => ({ title: a.title, url: a.url })),
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Error:", err.message);
    res.status(500).json({ error: "Failed to summarize news" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(
    `✅ Mini News Summarizer running at http://localhost:${PORT}/ytScript`
  )
);
