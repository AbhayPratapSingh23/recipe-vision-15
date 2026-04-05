import { useState, useRef, useEffect } from "react";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

interface RecipeSearchProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
}

const suggestions = [
  "Butter Chicken", "Paneer Tikka", "Biryani", "Pasta Carbonara",
  "Chole Bhature", "Dal Makhani", "Masala Dosa", "Pad Thai",
  "Palak Paneer", "Chicken Tikka Masala", "Aloo Gobi", "Rajma Chawal",
  "Sushi", "Tacos", "Pizza Margherita", "Ramen", "Pav Bhaji",
  "Samosa", "Naan", "Gulab Jamun", "Rasgulla", "Kheer",
];

const RecipeSearch = ({ onSearch, isLoading }: RecipeSearchProps) => {
  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filtered, setFiltered] = useState<string[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length > 0) {
      const q = query.toLowerCase();
      setFiltered(suggestions.filter(s => s.toLowerCase().includes(q)).slice(0, 6));
    } else {
      setFiltered(suggestions.slice(0, 6));
    }
  }, [query]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setShowSuggestions(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSubmit = (value?: string) => {
    const v = (value || query).trim();
    if (v) { onSearch(v); setShowSuggestions(false); }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search any recipe… (e.g., Butter Chicken)"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setShowSuggestions(true); }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
          className="pl-10 pr-10 h-12 text-base rounded-xl border-2 border-primary/20 focus:border-primary"
          disabled={isLoading}
        />
        {isLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />}
      </div>
      {showSuggestions && filtered.length > 0 && !isLoading && (
        <div className="absolute z-20 w-full mt-1 bg-popover border border-border rounded-xl shadow-lg overflow-hidden">
          {filtered.map((s) => (
            <button key={s} onClick={() => { setQuery(s); handleSubmit(s); }}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-accent/10 transition-colors flex items-center gap-2">
              <Search className="w-3 h-3 text-muted-foreground" />
              <span>{s}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecipeSearch;
