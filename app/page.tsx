"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { BotIcon, MoonIcon, StarIcon, SunIcon } from "lucide-react";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { Restaurant } from "./restaurants";
import Link from "next/link";

function getCurrentLatLng(options?: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, options));
}

const mapContainerStyle = {
  width: "75vw",
  height: "25vh",
};

function geocodeFromLatLng(lat: number, lng: number) {
  const geocoder = new window.google.maps.Geocoder();
  const OK = window.google.maps.GeocoderStatus.OK;

  const latlng = { lat, lng };
  return new Promise<google.maps.GeocoderResult[] | null>(function (resolve, reject) {
    geocoder.geocode({ location: latlng }, function (results, status) {
      if (status !== OK) {
        reject(status);
      }
      resolve(results);
    });
  });
}

export default function Home() {
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY!,
    libraries: ["places"],
  });
  const [isDarkMode, setIsDarkMode] = useState(false);
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle("dark");
  };
  const [currentLocation, setCurrentLocation] = useState<google.maps.LatLng | null>(null);
  const [neighborhood, setNeighborhood] = useState<google.maps.GeocoderResult | null>(null);
  const [city, setCity] = useState<google.maps.GeocoderResult | null>(null);

  const [isAiLoading, setIsAiLoading] = useState(false);
  const [results, setResults] = useState<{ top3: Restaurant[] } | null>(null);
  useEffect(() => {
    const loadCurrentLocation = async () => {
      const position = await getCurrentLatLng({
        enableHighAccuracy: true,
        timeout: 5000, // 5 seconds
        maximumAge: 15 * 60 * 1000, // 15 minutes
      });
      const { latitude, longitude } = position.coords;
      console.log("location", position.coords);
      setCurrentLocation(new google.maps.LatLng(latitude, longitude));

      const geocodes = await geocodeFromLatLng(latitude, longitude);
      if (geocodes) {
        console.log("geocodes", geocodes);
        setNeighborhood(geocodes.find((geocode) => geocode.types.includes("neighborhood")) ?? null);
        setCity(geocodes.find((geocode) => geocode.types.includes("locality")) ?? null);
      }
    };
    if (isLoaded) {
      loadCurrentLocation();
    }
  }, [isLoaded]);

  const neighborhoodName = neighborhood?.address_components.find((component) =>
    component.types.includes("neighborhood")
  )?.long_name;
  const cityName = city?.address_components.find((component) => component.types.includes("locality"))?.long_name;
  const myLocationName = [neighborhoodName, cityName].filter(Boolean).join(", ");

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const onLoad = useCallback((map: google.maps.Map) => setMap(map), []);
  const onUnmount = useCallback(() => setMap(null), []);

  useEffect(() => {
    if (isLoaded && map && currentLocation) {
      map.setCenter(currentLocation);
      map.setZoom(14);
      setIsAiLoading(true);
      fetch(
        `/api/restaurants?${new URLSearchParams({
          lat: String(currentLocation.lat()),
          lng: String(currentLocation.lng()),
        }).toString()}`
      )
        .then((res) => res.json())
        .then((results) => {
          console.log("results", results);
          setResults(results);
          setIsAiLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setIsAiLoading(false);
        });
    }
  }, [isLoaded, map, currentLocation]);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-between p-24">
      <div className="fixed top-4 right-4">
        <Button variant="ghost" size="icon" onClick={toggleDarkMode} className="rounded-full">
          {isDarkMode ? <SunIcon className="w-6 h-6" /> : <MoonIcon className="w-6 h-6" />}
          <span className="sr-only">Toggle dark mode</span>
        </Button>
      </div>
      <Card>
        <CardHeader className="flex items-center">
          <CardTitle>Where to eat?</CardTitle>
          {myLocationName && <CardDescription>in {myLocationName}</CardDescription>}
        </CardHeader>
        <CardContent>
          {isLoaded && (
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              zoom={14}
              onLoad={onLoad}
              onUnmount={onUnmount}
              options={{
                mapTypeControl: false,
                streetViewControl: false,
              }}
            >
              {currentLocation && <Marker position={currentLocation} />}
              {results &&
                results.top3.map((restaurant) =>
                  restaurant.place?.geometry?.location ? (
                    <Marker
                      key={restaurant.id}
                      position={restaurant.place.geometry.location}
                      icon={{
                        url: restaurant.place.icon!,
                        scaledSize: new google.maps.Size(16, 16),
                      }}
                    />
                  ) : null
                )}
            </GoogleMap>
          )}
          {isAiLoading && <div>Loading...</div>}
          {!isAiLoading && results && results.top3 && <TopRestaurants restaurants={results.top3} />}
        </CardContent>
      </Card>
    </main>
  );
}

function starRatingClassName(score: number, stars: number) {
  if (score >= stars - 0.5) {
    return "fill-primary stroke-black";
  } else {
    return "fill-none stroke-muted-foreground";
  }
}

const TopRestaurants = ({ restaurants }: { restaurants: Restaurant[] }) => {
  return (
    <section className="grid grid-cols-1 gap-6 p-4">
      {restaurants.map((restaurant) => (
        <div className="relative overflow-hidden transition-transform duration-300 ease-in-out rounded-lg shadow-lg group hover:shadow-xl hover:-translate-y-2">
          <Link href={restaurant.detail.url} className="absolute inset-0 z-10" prefetch={false} target="_blank">
            <span className="sr-only">View</span>
          </Link>
          <div className="p-6 bg-background">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">{restaurant.name}</h3>
              <div className="flex flex-col items-end gap-1 text-sm font-semibold">
                <div className="flex items-center gap-1">
                  <BotIcon className={`w-4 h-4 ${starRatingClassName(restaurant.ai.score, 1)}`} />
                  <BotIcon className={`w-4 h-4 ${starRatingClassName(restaurant.ai.score, 2)}`} />
                  <BotIcon className={`w-4 h-4 ${starRatingClassName(restaurant.ai.score, 3)}`} />
                  <BotIcon className={`w-4 h-4 ${starRatingClassName(restaurant.ai.score, 4)}`} />
                  <BotIcon className={`w-4 h-4 ${starRatingClassName(restaurant.ai.score, 5)}`} />
                  <span className="text-muted-foreground">{restaurant.ai.score}</span>
                </div>
                <div className="flex items-center gap-1">
                  <StarIcon className={`w-4 h-4 ${starRatingClassName(restaurant.detail.rating, 1)}`} />
                  <StarIcon className={`w-4 h-4 ${starRatingClassName(restaurant.detail.rating, 2)}`} />
                  <StarIcon className={`w-4 h-4 ${starRatingClassName(restaurant.detail.rating, 3)}`} />
                  <StarIcon className={`w-4 h-4 ${starRatingClassName(restaurant.detail.rating, 4)}`} />
                  <StarIcon className={`w-4 h-4 ${starRatingClassName(restaurant.detail.rating, 5)}`} />
                  <span className="text-muted-foreground">{restaurant.detail.rating}</span>
                </div>
              </div>
            </div>
            {restaurant.ai.bestDish && (
            <p className="mb-4 text-muted-foreground">
              The best dish is {restaurant.ai.bestDish}
            </p>
            )}
            <p className="text-sm text-muted-foreground">
              The AI bot says: {restaurant.ai.reason}
            </p>
          </div>
        </div>
      ))}
    </section>
  );
};
