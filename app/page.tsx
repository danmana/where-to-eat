"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { MoonIcon, SunIcon } from "lucide-react";

function getCurrentLatLng(options?: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, options));
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
  const [isDarkMode, setIsDarkMode] = useState(false);
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle("dark");
  };
  const [currentLocation, setCurrentLocation] = useState<string | null>(null);
  const [neighborhood, setNeighborhood] = useState<google.maps.GeocoderResult | null>(null);
  const [city, setCity] = useState<google.maps.GeocoderResult | null>(null);
  useEffect(() => {
    const loadCurrentLocation = async () => {
      const position = await getCurrentLatLng({
        enableHighAccuracy: true,
        timeout: 5000, // 5 seconds
        maximumAge: 15 * 60 * 1000, // 15 minutes
      });
      const { latitude, longitude } = position.coords;
      const geocodes = await geocodeFromLatLng(latitude, longitude);
      if (geocodes) {
        const location = geocodes[0].formatted_address;
        setCurrentLocation(location);
        setNeighborhood(geocodes.find((geocode) => geocode.types.includes("neighborhood")) ?? null);
        setCity(geocodes.find((geocode) => geocode.types.includes("locality")) ?? null);
      }
    };
    loadCurrentLocation();
  }, []);

  const neighborhoodName = neighborhood?.address_components.find((component) =>
    component.types.includes("neighborhood")
  )?.long_name;
  const cityName = city?.address_components.find((component) => component.types.includes("locality"))?.long_name;
  const myLocationName = [neighborhoodName, cityName].filter(Boolean).join(", ");

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-between p-24">
      <div className="fixed top-4 right-4">
        <Button variant="ghost" size="icon" onClick={toggleDarkMode} className="rounded-full">
          {isDarkMode ? <SunIcon className="w-6 h-6" /> : <MoonIcon className="w-6 h-6" />}
          <span className="sr-only">Toggle dark mode</span>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Where to eat?</CardTitle>
          {myLocationName && <CardDescription>in {myLocationName}</CardDescription>}
        </CardHeader>
        <CardContent>
          <p>Card Content</p>
        </CardContent>
      </Card>
    </main>
  );
}
