"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { BeerIcon, BotIcon, MoonIcon, StarIcon, SunIcon, UtensilsIcon, WineIcon } from "lucide-react";
import Link from "next/link";
import { Restaurant } from "./restaurants";


const mapContainerStyle = {
  width: "65vw",
  height: "25vh",
};

function getCurrentLatLng(options?: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => 
    navigator.geolocation.getCurrentPosition(resolve, reject, options)
  );
}

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
        timeout: 3000, // 3 seconds
        maximumAge: 15 * 60 * 1000, // 15 minutes
      });
      const { latitude, longitude } = position.coords;
      // const latitude = 46.7554633,
      //   longitude = 23.5671347;
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
          {!myLocationName && <CardDescription>Loading your GPS location...</CardDescription>}
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
                styles: isDarkMode
                  ? [
                      { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
                      { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
                      { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
                      {
                        featureType: "administrative.locality",
                        elementType: "labels.text.fill",
                        stylers: [{ color: "#d59563" }],
                      },
                      {
                        featureType: "poi",
                        elementType: "labels.text.fill",
                        stylers: [{ color: "#d59563" }],
                      },
                      {
                        featureType: "poi.park",
                        elementType: "geometry",
                        stylers: [{ color: "#263c3f" }],
                      },
                      {
                        featureType: "poi.park",
                        elementType: "labels.text.fill",
                        stylers: [{ color: "#6b9a76" }],
                      },
                      {
                        featureType: "road",
                        elementType: "geometry",
                        stylers: [{ color: "#38414e" }],
                      },
                      {
                        featureType: "road",
                        elementType: "geometry.stroke",
                        stylers: [{ color: "#212a37" }],
                      },
                      {
                        featureType: "road",
                        elementType: "labels.text.fill",
                        stylers: [{ color: "#9ca5b3" }],
                      },
                      {
                        featureType: "road.highway",
                        elementType: "geometry",
                        stylers: [{ color: "#746855" }],
                      },
                      {
                        featureType: "road.highway",
                        elementType: "geometry.stroke",
                        stylers: [{ color: "#1f2835" }],
                      },
                      {
                        featureType: "road.highway",
                        elementType: "labels.text.fill",
                        stylers: [{ color: "#f3d19c" }],
                      },
                      {
                        featureType: "transit",
                        elementType: "geometry",
                        stylers: [{ color: "#2f3948" }],
                      },
                      {
                        featureType: "transit.station",
                        elementType: "labels.text.fill",
                        stylers: [{ color: "#d59563" }],
                      },
                      {
                        featureType: "water",
                        elementType: "geometry",
                        stylers: [{ color: "#17263c" }],
                      },
                      {
                        featureType: "water",
                        elementType: "labels.text.fill",
                        stylers: [{ color: "#515c6d" }],
                      },
                      {
                        featureType: "water",
                        elementType: "labels.text.stroke",
                        stylers: [{ color: "#17263c" }],
                      },
                    ]
                  : undefined,
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
      <div className="flex justify-center items-center text-sm text-muted-foreground mt-8">
        Made with ❤️ by{" "}
        <a href="https://x.com/danmana" target="_blank" className="underline ml-2">
          @danmana
        </a>
      </div>
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
      {!restaurants.length && <div className="text-center text-muted-foreground">No restaurants found nearby</div>}
      {restaurants.map((restaurant) => (
        <div
          key={restaurant.id}
          className="relative overflow-hidden transition-transform duration-300 ease-in-out rounded-lg shadow-lg group hover:shadow-xl hover:-translate-y-2"
        >
          <Link href={restaurant.detail.url} className="absolute inset-0 z-10" prefetch={false} target="_blank">
            <span className="sr-only">View</span>
          </Link>
          <div className="p-6 bg-background">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">
                {restaurant.name}

                {restaurant.detail.serves_beer && <BeerIcon className="w-6 h-6 text-primary ml-1 inline-block" />}
                {restaurant.detail.serves_wine && <WineIcon className="w-6 h-6 text-primary ml-1 inline-block" />}
              </h3>
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
                <UtensilsIcon className="w-4 h-4 mr-2 inline-block" />
                Best dish: {restaurant.ai.bestDish}
              </p>
            )}
            <p className="mb-4 text-muted-foreground">
              <BotIcon className="w-4 h-4 mr-2 inline-block" />
              {restaurant.ai.reason}
            </p>
          </div>
        </div>
      ))}
    </section>
  );
};
