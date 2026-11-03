import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { GpsCoordinate } from '../types/gps';
import { ArrowRight, Loader2, MapPin, Search, X } from 'lucide-react';

interface LocationSearchProps {
  value?: string;
  onSelect: (coords: GpsCoordinate) => void;
  placeholder?: string;
  bias?: GpsCoordinate;
}

export function LocationSearch({ value, onSelect, placeholder, bias }: LocationSearchProps) {
  const placesLib = useMapsLibrary('places');
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const selectedAddressRef = useRef<string>('');
  const isEditingRef = useRef(false);
  const searchIdRef = useRef<number>(0);

  const [query, setQuery] = useState<string>(value ?? '');
  const [results, setResults] = useState<google.maps.places.PlacePrediction[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEditingRef.current) return;
    const nextValue = value ?? '';
    selectedAddressRef.current = nextValue;
    setQuery(nextValue);
    setResults([]);
    setIsOpen(false);
    setError(null);
  }, [value]);

  const runSearch = useCallback(async (input: string, showErrors: boolean) => {
    if (!placesLib) {
      if (showErrors) setError('La recherche Google est en cours de chargement.');
      return;
    }

    const requestId = ++searchIdRef.current;
    setIsSearching(true);
    setError(null);

    try {
      const { AutocompleteSessionToken, AutocompleteSuggestion } = placesLib;
      sessionTokenRef.current ??= new AutocompleteSessionToken();
      const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input,
        language: 'fr',
        ...(bias ? { locationBias: { center: { lat: bias.lat, lng: bias.lng }, radius: 50000 } } : {}),
        sessionToken: sessionTokenRef.current,
      });

      if (searchIdRef.current !== requestId) return;
      const predictions = suggestions
        .map((suggestion) => suggestion.placePrediction)
        .filter((prediction): prediction is google.maps.places.PlacePrediction => Boolean(prediction));

      setResults(predictions.slice(0, 6));
      setIsOpen(predictions.length > 0);
      if (predictions.length === 0 && showErrors) setError('Aucun lieu trouvé pour cette recherche.');
    } catch {
      if (searchIdRef.current === requestId && showErrors) {
        setError('Recherche indisponible. Vérifiez que Places API et Geocoding API sont activées.');
      }
    } finally {
      if (searchIdRef.current === requestId) setIsSearching(false);
    }
  }, [placesLib, bias, onSelect]);

  useEffect(() => {
    const input = query.trim();
    if (input.length < 2 || input === selectedAddressRef.current) return;
    const timer = setTimeout(() => void runSearch(input, false), 350);
    return () => clearTimeout(timer);
  }, [query, runSearch]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const input = query.trim();
    if (input.length < 2) {
      setError('Saisissez un nom de lieu ou une adresse.');
      return;
    }
    void runSearch(input, true);
  };

  const handleSelect = async (prediction: google.maps.places.PlacePrediction) => {
    const requestId = ++searchIdRef.current;
    setIsSearching(true);
    try {
      const place = prediction.toPlace();
      await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location'] });
      if (searchIdRef.current !== requestId || !place.location) return;
      const address = place.formattedAddress || place.displayName?.toString() || prediction.text.toString();
      selectedAddressRef.current = address;
      isEditingRef.current = false;
      sessionTokenRef.current = null;
      setQuery(address);
      setResults([]);
      setIsOpen(false);
      setError(null);
      onSelect({ lat: place.location.lat(), lng: place.location.lng(), address });
    } catch {
      setError('Impossible de récupérer ce lieu. Réessayez.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleClear = () => {
    searchIdRef.current += 1;
    sessionTokenRef.current = null;
    selectedAddressRef.current = '';
    setQuery('');
    setResults([]);
    setIsOpen(false);
    setError(null);
    setIsSearching(false);
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="flex items-center gap-1.5 p-1.5 bg-zinc-900/90 border border-zinc-700 focus-within:border-white rounded-lg transition-colors">
        <Search className="w-3.5 h-3.5 text-zinc-400 shrink-0 ml-1" />
        <input
          value={query}
          onChange={(event) => {
            isEditingRef.current = true;
            setQuery(event.target.value);
            setError(null);
            if (results.length > 0) setIsOpen(true);
          }}
          onFocus={() => { if (results.length > 0) setIsOpen(true); }}
          placeholder={placeholder ?? 'Nom de lieu, maison ou adresse...'}
          className="flex-1 min-w-0 bg-transparent outline-none text-white font-sans text-xs placeholder:text-zinc-500"
        />
        {query.length > 0 && (
          <button type="button" onClick={handleClear} title="Effacer la recherche" className="w-5 h-5 rounded flex items-center justify-center text-zinc-500 hover:text-white">
            <X className="w-3 h-3" />
          </button>
        )}
        <button type="submit" disabled={isSearching} title="Rechercher ce lieu" className="w-6 h-6 rounded bg-white text-black hover:bg-zinc-200 disabled:bg-zinc-700 disabled:text-zinc-400 flex items-center justify-center transition-colors shrink-0">
          {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
        </button>
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-zinc-950 border border-zinc-700 rounded-lg shadow-2xl shadow-black overflow-hidden max-h-64 overflow-y-auto">
          {results.map((prediction, index) => (
            <button key={`${prediction.placeId}-${index}`} type="button" onClick={() => void handleSelect(prediction)} className="w-full flex items-start gap-2 px-2.5 py-2 text-left hover:bg-zinc-800 transition-colors border-b border-zinc-800/60 last:border-b-0">
              <MapPin className="w-3.5 h-3.5 text-white shrink-0 mt-0.5" />
              <span className="flex-1 min-w-0 block text-[11px] text-white font-sans">{prediction.text.toString()}</span>
            </button>
          ))}
        </div>
      )}
      {error && <p className="mt-1 text-[10px] text-amber-400 font-sans">{error}</p>}
    </form>
  );
}
