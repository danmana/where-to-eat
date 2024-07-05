import { Client, PlacesNearbyResponseData } from "@googlemaps/google-maps-services-js";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
const client = new Client({});

function bayesianAverageRating(rating: number, numRatings: number, c: number, m: number) {
  if (numRatings + m === 0) {
    return rating;
  }
  return (rating * numRatings + c * m) / (numRatings + m);
}

function sortItemsByBayesianAverage(items: PlacesNearbyResponseData["results"]) {
  // Calculate the average rating across all items
  let totalRatings = 0;
  let totalSum = 0;

  items.forEach((item) => {
    totalRatings += item.user_ratings_total || 0;
    totalSum += (item.rating || 0) * (item.user_ratings_total || 0);
  });

  const c = totalSum / totalRatings;

  // Choose a reasonable value for m, such as the median number of ratings
  const numRatingsArray = items.map((item) => item.user_ratings_total).sort((a, b) => (a || 0) - (b || 0));
  const m = numRatingsArray[Math.floor(numRatingsArray.length / 2)] || 0;

  // Calculate the Bayesian average rating for each item
  const bayesianRatings = items.map((item) => ({
    ...item,
    bayesianRating: bayesianAverageRating(item.rating || 0, item.user_ratings_total || 0, c, m),
  }));

  // Sort items by the Bayesian average rating in descending order
  return bayesianRatings.sort((a, b) => b.bayesianRating - a.bayesianRating);
}

export const dynamic = "force-dynamic"; // defaults to auto
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = +searchParams.get("lat")!;
  const lng = +searchParams.get("lng")!;

  console.time("placesNearby");
  const places = (
    await client.placesNearby({
      params: {
        location: {
          lat,
          lng,
        },
        radius: 1000,
        type: "restaurant",
        opennow: true,
        key: process.env.NEXT_PUBLIC_GOOGLE_API_KEY!,
      },
    })
  ).data.results;
  console.timeEnd("placesNearby");

  // pick the top restaurants by bayesian average rating
  const topByGoogleRatings = sortItemsByBayesianAverage(places).slice(0, 7);

  console.time("placeDetails");
  const details = await Promise.all(
    topByGoogleRatings.map((place) =>
      client
        .placeDetails({
          params: {
            place_id: place.place_id!,
            key: process.env.NEXT_PUBLIC_GOOGLE_API_KEY!,
            fields: [
              "place_id",
              "name",
              "editorial_summary",
              "reviews",
              "serves_beer",
              "serves_breakfast",
              "serves_dinner",
              "serves_wine",
              "url",
              "user_ratings_total",
              "rating",
            ],
          },
        })
        .then((result) => result.data.result)
    )
  );
  console.timeEnd("placeDetails");

  const prompt = `Score the following restaurants based on their quality of service.
Scores should range between 1 and 5, with higher scores indicating better service. The higher the score, the better the service.
Take into account the restaurant description and user reviews.
You can use the google rating to break ties, but it should not be the only factor in your score.

Google ratings are on a scale of 1 to 5, with 1 being the lowest and 5 being the highest.
User reviews are on a scale of 1 to 5, with 1 being the lowest and 5 being the highest.

We are looking for restaurants with good food, good service, and good value for money.
We are not looking for restaurants that are part of a hotel or bed and breakfast.

For each restaurant reply with its id, name, score, and reason.
If available in the review, add the best dish (the one with the highest rated review or most reviews).

When giving the score, add a single sentence with the reason for the score.
The reason should be a very short sentence containing the main reason for the score.
Do not use boilerplate text like "Excellent reviews", focus instead on the main atomic reason for the score.
Examples of good reasons:
- score 4.9: good authentic Romanian food
- score 3.8: good food, but slow and grumpy service
Examples of bad reasons:
- Excellent reviews highlight authentic Romanian food, attentive staff, and great value for money. // too verbose
- Generally good reviews for food and service, but notable complaints about slow and grumpy service. // too long, avoid general statements


More examples:
A restaurant with description "Relaxed units with kitchens in an unassuming apartment hotel offering a restaurant."
score: 1.2, reason: not a stand-alone restaurant, it is part of a hotel

Example:
A restaurant with user review "It seems unreal to me how you can't cook decent rice, it was so bad that I had to throw it away" should have
score: 1, the food is incredibly bad

Restaurants:

    ${details
      .map(
        (detail) =>
          `id: ${detail.place_id}
name: ${detail.name}
description: ${detail.editorial_summary?.overview}
google rating: ${detail.rating} from ${detail.user_ratings_total} users
user reviews:
${detail.reviews?.map((review) => `- rating ${review.rating}/5, review: ${review.text}`).join("\n")}

`
      )
      .join("\n")}
`;

  console.log(prompt);

  console.time("ai");
  const {
    object: { scores },
  } = await generateObject({
    model: openai("gpt-4o"),
    schema: z.object({
      scores: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          score: z.number(),
          reason: z.string(),
          bestDish: z.string(),
        })
      ),
    }),
    prompt,
  });
  console.timeEnd("ai");

  const restaurants = scores.map((score) => {
    const detail = details.find((detail) => detail.place_id === score.id);
    const place = topByGoogleRatings.find((place) => place.place_id === score.id);
    return {
      id: score.id,
      name: detail?.name || place?.name || score.name,
      detail,
      place,
      ai: {
        score: score.score,
        reason: score.reason,
        bestDish: score.bestDish,
      },
      bayesianRating: place?.bayesianRating,
    };
  });

  // sort by ai score descending, rating descending
  restaurants.sort((a, b) => {
    const aiCmp = b.ai.score - a.ai.score;
    const bayesianRatingCmp = (b.bayesianRating || 0) - (a.bayesianRating || 0);
    const ratingCmp = (b.detail?.rating || 0) - (a.detail?.rating || 0);
    return aiCmp || bayesianRatingCmp || ratingCmp;
  });

  return Response.json({
    top3: restaurants.slice(0, 3),
    topByGoogleRatings,
    restaurants,
    scores,
    details,
    places,
    lat,
    lng,
  });
}
