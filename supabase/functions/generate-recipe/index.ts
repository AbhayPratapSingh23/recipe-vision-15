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
    const { image } = await req.json();

    if (!image) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Calling Lovable AI to analyze food image...");

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
          messages: [
            {
              role: "system",
              content:
                "You are a professional chef and recipe expert. Analyze food images and generate detailed recipes with accurate ingredients and clear instructions. Always respond with valid JSON in this exact format: {\"title\": \"Recipe Name\", \"ingredients\": [\"ingredient 1\", \"ingredient 2\"], \"instructions\": [\"step 1\", \"step 2\"]}",
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Please analyze this food image and generate a complete recipe with a title, list of ingredients with measurements, and step-by-step cooking instructions. Return only valid JSON.",
                },
                {
                  type: "image_url",
                  image_url: {
                    url: image,
                  },
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service credits depleted. Please add credits to continue." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      throw new Error(`AI service error: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI response received");

    const aiResponse = data.choices?.[0]?.message?.content;
    if (!aiResponse) {
      throw new Error("No content in AI response");
    }

    // Parse the JSON response
    let recipe;
    try {
      // Try to extract JSON from the response if it's wrapped in markdown
      const jsonMatch = aiResponse.match(/```json\n([\s\S]*?)\n```/) || 
                       aiResponse.match(/```\n([\s\S]*?)\n```/);
      const jsonString = jsonMatch ? jsonMatch[1] : aiResponse;
      recipe = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      // Fallback: try to parse the raw response
      recipe = JSON.parse(aiResponse);
    }

    // Validate the recipe structure
    if (!recipe.title || !Array.isArray(recipe.ingredients) || !Array.isArray(recipe.instructions)) {
      throw new Error("Invalid recipe format from AI");
    }

    console.log("Recipe generated successfully:", recipe.title);

    return new Response(
      JSON.stringify({ recipe }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in generate-recipe function:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to generate recipe",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
