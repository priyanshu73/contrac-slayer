"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AddressData, MapboxFeature, mapboxFeatureToAddressData } from '@/lib/types/address';

interface MapboxAddressInputProps {
  label?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
  onAddressSelect: (addressData: AddressData | null) => void;
  error?: string;
  id?: string;
  className?: string;
}

/**
 * Mapbox Address Autocomplete Input Component
 * 
 * Uses Mapbox Geocoding API for address autocomplete.
 * Extracts structured address data and passes it to parent component.
 * 
 * Note: Requires NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN in environment variables.
 */
export function MapboxAddressInput({
  label = 'Address',
  placeholder = 'Start typing an address...',
  required = false,
  defaultValue = '',
  onAddressSelect,
  error,
  id = 'address-input',
  className = '',
}: MapboxAddressInputProps) {
  const [inputValue, setInputValue] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<MapboxFeature[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  // Close suggestions when clicking outside or on scroll
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    
    function handleScroll() {
      setShowSuggestions(false);
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, []);

  // Fetch suggestions from Mapbox
  const fetchSuggestions = async (query: string) => {
    if (!accessToken) {
      console.error('Mapbox access token not found. Set NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN in .env');
      return;
    }

    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          query
        )}.json?access_token=${accessToken}&autocomplete=true&types=address&country=us&limit=5`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch addresses');
      }

      const data = await response.json();
      setSuggestions(data.features || []);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Error fetching address suggestions:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle input change with debouncing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setSelectedIndex(-1);

    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set new timer
    debounceTimer.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 300);

    // If input is cleared, notify parent
    if (!value) {
      onAddressSelect(null);
    }
  };

  // Handle suggestion selection
  const handleSelectSuggestion = (feature: MapboxFeature) => {
    const addressData = mapboxFeatureToAddressData(feature);
    
    if (addressData) {
      setInputValue(addressData.formatted_address || '');
      onAddressSelect(addressData);
      setSuggestions([]);
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelectSuggestion(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Warn if no access token
  if (!accessToken) {
    return (
      <div className={className}>
        {label && (
          <Label htmlFor={id}>
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </Label>
        )}
        <div className="text-sm text-red-500 mt-2">
          Mapbox access token not configured. Please set NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN.
        </div>
      </div>
    );
  }

  return (
    <div className={className} ref={wrapperRef}>
      {label && (
        <Label htmlFor={id}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      <div className="relative">
        <Input
          id={id}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          autoComplete="off"
          className={error ? 'border-red-500' : ''}
        />
        
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
          </div>
        )}

        {showSuggestions && suggestions.length > 0 && (
          <div 
            className="absolute left-0 top-full mt-1 z-[9999] w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto"
          >
            {suggestions.map((suggestion, index) => (
              <div
                key={suggestion.id}
                onClick={() => handleSelectSuggestion(suggestion)}
                className={`px-4 py-2 cursor-pointer hover:bg-gray-100 ${
                  index === selectedIndex ? 'bg-gray-100' : ''
                }`}
              >
                <div className="text-sm font-medium">
                  {suggestion.text || suggestion.properties?.name || 'Address'}
                </div>
                <div className="text-xs text-gray-500">
                  {suggestion.place_name || suggestion.properties?.place_formatted || ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {error && (
        <p className="text-sm text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
}
