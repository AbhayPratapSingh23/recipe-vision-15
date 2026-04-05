import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, language = "en" } = await req.json();

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Search query required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const langName = language === "hi" ? "Hindi" : language === "ta" ? "Tamil" : language === "te" ? "Telugu" : language === "bn" ? "Bengali" : language === "mr" ? "Marathi" : "English";

    console.log("Searching recipe for:", query);

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          temperature: 0,
          messages: [
            {
              role: "system",
              content: `You are a professional chef and nutritionist. Generate a detailed recipe for the requested dish. Use USDA/IFCT reference values for nutrition. Generate in ${langName}. Return valid JSON: {"title": "...", "description": "Short 5-8 word tagline", "servingSize": N, "healthRating": N, "healthRatingReason": "...", "cookingTime": "X mins", "estimatedCost": "₹X - ₹Y", "ingredients": ["..."], "instructions": ["..."], "substitutes": {"ingredient": ["sub1"]}, "nutritionalValues": {"calories": "X kcal", "protein": "X g", "carbs": "X g", "fat": "X g", "fiber": "X g"}}`,
            },
            {
              role: "user",
              content: `Generate a complete recipe for: "${query}". Return only valid JSON.`,
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI error:", response.status, errorText);
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "AI credits depleted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;
    if (!aiResponse) throw new Error("No content");

    let recipe;
    try {
      let clean = aiResponse.trim();
      const jsonMatch = clean.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (jsonMatch) clean = jsonMatch[1].trim();
      const s = clean.indexOf('{');
      const e = clean.lastIndexOf('}');
      if (s !== -1 && e !== -1) clean = clean.substring(s, e + 1);
      recipe = JSON.parse(clean);
    } catch {
      console.error("Parse failed:", aiResponse);
      throw new Error("Failed to parse recipe");
    }

    if (!recipe.title || !Array.isArray(recipe.ingredients)) {
      throw new Error("Invalid recipe format");
    }

    recipe.nutritionalValues = recipe.nutritionalValues || { calories: "N/A", protein: "N/A", carbs: "N/A", fat: "N/A", fiber: "N/A" };
    recipe.servingSize = recipe.servingSize || 1;
    recipe.cookingTime = recipe.cookingTime || null;
    recipe.estimatedCost = recipe.estimatedCost || null;

    return new Response(JSON.stringify({ recipe }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to search recipe" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
