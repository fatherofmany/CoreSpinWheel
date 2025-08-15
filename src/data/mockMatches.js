// src/data/mockMatches.js
export const mockMatches = {
  "premier-league": [
    {
      id: 1001,
      home: { name: "Arsenal", logo: "https://media.api-sports.io/football/teams/42.png", score: 2, odds: 1.5 },
      away: { name: "Chelsea", logo: "https://media.api-sports.io/football/teams/49.png", score: 1, odds: 2.2 },
      time: "75'",
      venue: "Emirates Stadium",
      predictionPool: 3200,
      totalPredictions: 180,
      status: "2H",
      events: [],
    },
    {
      id: 1002,
      home: { name: "Liverpool", logo: "https://media.api-sports.io/football/teams/40.png", score: 0, odds: 1.8 },
      away: { name: "Man City", logo: "https://media.api-sports.io/football/teams/50.png", score: 0, odds: 2.1 },
      time: "19:30",
      venue: "Anfield",
      predictionPool: 4100,
      totalPredictions: 220,
      status: "NS",
      events: [],
    },
  ],
  "la-liga": [
    {
      id: 1003,
      home: { name: "Barcelona", logo: "https://media.api-sports.io/football/teams/529.png", score: 3, odds: 1.4 },
      away: { name: "Real Madrid", logo: "https://media.api-sports.io/football/teams/541.png", score: 2, odds: 2.8 },
      time: "FT",
      venue: "Camp Nou",
      predictionPool: 5500,
      totalPredictions: 310,
      status: "FT",
      events: [],
    },
  ],
};