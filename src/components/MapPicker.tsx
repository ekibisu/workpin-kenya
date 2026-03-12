import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useState, useEffect } from 'react';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});


interface MapPickerProps {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number, locationName?: string) => void;
}

function LocationMarker({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MapPicker({ lat, lng, onChange }: MapPickerProps) {
  const [position, setPosition] = useState<[number, number] | null>(lat && lng ? [lat, lng] : null);
  const [locationName, setLocationName] = useState<string>("");

  // Keep position in sync with props
  useEffect(() => {
    if (typeof lat === 'number' && typeof lng === 'number') {
      setPosition([lat, lng]);
    }
  }, [lat, lng]);

  // Reverse geocode when position changes
  useEffect(() => {
    const fetchLocationName = async () => {
      if (position) {
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${position[0]}&lon=${position[1]}`);
          const data = await response.json();
          const displayName = data.display_name || "";
          setLocationName(displayName);
          // Also call onChange with location name
          onChange(position[0], position[1], displayName);
        } catch (e) {
          setLocationName("");
          onChange(position[0], position[1], "");
        }
      }
    };
    fetchLocationName();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position]);

  const handleMapClick = (newLat: number, newLng: number) => {
    setPosition([newLat, newLng]);
    // onChange will be called after reverse geocode in useEffect
  };

  return (
    <>
      <MapContainer
        center={position || [-1.286389, 36.817223]} // Default: Nairobi
        zoom={13}
        style={{ height: 300, width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {position && <Marker position={position} />} 
        <LocationMarker onChange={handleMapClick} />
      </MapContainer>
      {position && (
        <div className="text-xs text-muted-foreground mt-1">
          {locationName ? `Location: ${locationName}` : "Fetching location name..."}
        </div>
      )}
    </>
  );
}

export default MapPicker;




