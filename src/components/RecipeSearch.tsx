import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface RecipeSearchProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
}

const RecipeSearch = ({ onSearch, isLoading }: RecipeSearchProps) => {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) onSearch(query.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search for any recipe... (e.g., Pasta Carbonara)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10"
        />
      </div>
      <Button type="submit" disabled={!query.trim() || isLoading}>
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
      </Button>
    </form>
  );
};

export default RecipeSearch;
