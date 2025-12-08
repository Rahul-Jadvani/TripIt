import React, { useState } from 'react';
import { MapPin, Plus, X, Check } from 'lucide-react';

interface Props {
  detectedCities: string[];
  onConfirm: (cities: string[]) => void;
}

const CityConfirmation: React.FC<Props> = ({ detectedCities, onConfirm }) => {
  const [cities, setCities] = useState<string[]>(detectedCities);
  const [newCity, setNewCity] = useState('');

  const handleAddCity = () => {
    if (newCity.trim() && cities.length < 5) {
      setCities([...cities, newCity.trim()]);
      setNewCity('');
    }
  };

  const handleRemoveCity = (index: number) => {
    if (cities.length > 1) {
      setCities(cities.filter((_, i) => i !== index));
    }
  };

  const handleMoveUp = (index: number) => {
    if (index > 0) {
      const newCities = [...cities];
      [newCities[index - 1], newCities[index]] = [newCities[index], newCities[index - 1]];
      setCities(newCities);
    }
  };

  const handleMoveDown = (index: number) => {
    if (index < cities.length - 1) {
      const newCities = [...cities];
      [newCities[index], newCities[index + 1]] = [newCities[index + 1], newCities[index]];
      setCities(newCities);
    }
  };

  const handleConfirm = () => {
    onConfirm(cities);
  };

  return (
    <div className="card-elevated p-6 space-y-4">
      <div className="text-center mb-4">
        <h3 className="text-2xl font-bold text-foreground mb-2">
          Confirm Your Route
        </h3>
        <p className="text-muted-foreground text-sm">
          Review and adjust the order of cities you'll visit
        </p>
      </div>

      {/* City List */}
      <div className="space-y-3">
        {cities.map((city, index) => (
          <div
            key={index}
            className="bg-secondary border-2 border-black rounded-[15px] p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center font-bold border-2 border-black">
                {index + 1}
              </div>
              <MapPin className="w-5 h-5 text-primary" />
              <span className="font-bold text-foreground">{city}</span>
            </div>

            <div className="flex items-center gap-2">
              {/* Move Up */}
              <button
                onClick={() => handleMoveUp(index)}
                disabled={index === 0}
                className="p-2 hover:bg-background rounded-lg disabled:opacity-30 transition-all"
                title="Move up"
              >
                ↑
              </button>

              {/* Move Down */}
              <button
                onClick={() => handleMoveDown(index)}
                disabled={index === cities.length - 1}
                className="p-2 hover:bg-background rounded-lg disabled:opacity-30 transition-all"
                title="Move down"
              >
                ↓
              </button>

              {/* Remove */}
              <button
                onClick={() => handleRemoveCity(index)}
                disabled={cities.length === 1}
                className="p-2 hover:bg-destructive/20 rounded-lg disabled:opacity-30 transition-all"
                title="Remove city"
              >
                <X className="w-4 h-4 text-destructive" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add City */}
      {cities.length < 5 && (
        <div className="flex gap-2">
          <input
            type="text"
            value={newCity}
            onChange={(e) => setNewCity(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddCity()}
            placeholder="Add another city..."
            className="flex-1 px-4 py-2 border-2 border-black rounded-[15px] bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
          />
          <button
            onClick={handleAddCity}
            disabled={!newCity.trim()}
            className="btn-secondary flex items-center gap-2 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
      )}

      {/* Route Preview */}
      <div className="bg-background border-2 border-black rounded-[15px] p-4">
        <div className="text-sm text-muted-foreground mb-2">Final Route:</div>
        <div className="flex items-center gap-2 flex-wrap">
          {cities.map((city, index) => (
            <React.Fragment key={index}>
              <span className="font-bold text-primary">{city}</span>
              {index < cities.length - 1 && (
                <span className="text-muted-foreground">→</span>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Confirm Button */}
      <button
        onClick={handleConfirm}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        <Check className="w-5 h-5" />
        Confirm Route & Continue
      </button>
    </div>
  );
};

export default CityConfirmation;
