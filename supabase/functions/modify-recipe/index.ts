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
    const { recipe, modification, language = "en" } = await req.json();

    if (!recipe || !modification) {
      return new Response(
        JSON.stringify({ error: "Recipe and modification type required" }),
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

    console.log("Modifying recipe:", recipe.title, "with:", modification);

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
              content: `You are a professional chef and nutritionist. Modify the given recipe based on the user's preference. Keep the same JSON format. Use USDA/IFCT reference values. Generate in ${langName}. Return valid JSON: {"title": "...", "servingSize": N, "healthRating": N, "healthRatingReason": "...", "ingredients": [...], "instructions": [...], "substitutes": {...}, "nutritionalValues": {"calories": "...", "protein": "...", "carbs": "...", "fat": "...", "fiber": "..."}}`,
            },
            {
              role: "user",
              content: `Modify this recipe to "${modification}": ${JSON.stringify(recipe)}. Return only valid JSON.`,
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

    let result;
    try {
      let clean = aiResponse.trim();
      const jsonMatch = clean.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (jsonMatch) clean = jsonMatch[1].trim();
      const s = clean.indexOf('{');
      const e = clean.lastIndexOf('}');
      if (s !== -1 && e !== -1) clean = clean.substring(s, e + 1);
      result = JSON.parse(clean);
    } catch {
      console.error("Parse failed:", aiResponse);
      throw new Error("Failed to parse modified recipe");
    }

    if (!result.title || !Array.isArray(result.ingredients)) {
      throw new Error("Invalid recipe format");
    }

    result.nutritionalValues = result.nutritionalValues || { calories: "N/A", protein: "N/A", carbs: "N/A", fat: "N/A", fiber: "N/A" };
    result.servingSize = result.servingSize || 1;

    return new Response(JSON.stringify({ recipe: result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to modify recipe" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
