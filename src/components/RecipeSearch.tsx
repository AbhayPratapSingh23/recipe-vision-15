import { useState, useRef, useEffect } from "react";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface RecipeSearchProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
}

const suggestions = [
  "Butter Chicken", "Biryani", "Paneer Tikka", "Chole Bhature",
  "Masala Dosa", "Pav Bhaji", "Dal Makhani", "Palak Paneer",
  "Samosa", "Aloo Gobi", "Tandoori Chicken", "Gulab Jamun",
  "Rajma Chawal", "Idli Sambhar", "Vada Pav", "Hyderabadi Biryani",
  "Chicken Tikka Masala", "Naan", "Rogan Josh", "Malai Kofta",
  "Pasta Carbonara", "Margherita Pizza", "Caesar Salad", "Fried Rice",
  "Pad Thai", "Sushi", "Tacos", "Pancakes", "Omelette", "Grilled Chicken",
  "Fish Curry", "Egg Bhurji", "Poha", "Upma", "Kheer", "Jalebi",
];

const RecipeSearch = ({ onSearch, isLoading }: RecipeSearchProps) => {
  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filtered = query.trim().length > 0
    ? suggestions.filter(s => s.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
    : [];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (s: string) => {
    setQuery(s);
    setShowSuggestions(false);
    onSearch(s);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || filtered.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveSuggestion(prev => (prev + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveSuggestion(prev => (prev <= 0 ? filtered.length - 1 : prev - 1));
    } else if (e.key === "Enter" && activeSuggestion >= 0) {
      e.preventDefault();
      selectSuggestion(filtered[activeSuggestion]);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="relative flex-1" ref={wrapperRef}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
        <Input
          placeholder="Search for any recipe... (e.g., Butter Chicken)"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowSuggestions(true);
            setActiveSuggestion(-1);
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          className="pl-10"
          autoComplete="off"
        />
        {showSuggestions && filtered.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden">
            {filtered.map((s, i) => (
              <button
                key={s}
                type="button"
                onClick={() => selectSuggestion(s)}
                className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors ${
                  i === activeSuggestion
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted text-foreground"
                }`}
              >
                <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
      <Button type="submit" disabled={!query.trim() || isLoading}>
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
      </Button>
    </form>
  );
};

export default RecipeSearch;
