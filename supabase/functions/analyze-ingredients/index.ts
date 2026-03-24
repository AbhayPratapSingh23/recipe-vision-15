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

    console.log("Analyzing ingredient regions in food image...");

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
                'You are a food ingredient detection expert. Analyze food images and identify ONLY edible food items and ingredients — do NOT label plates, bowls, utensils, napkins, garnish leaves used as decoration, or any non-food objects. Return valid JSON only in this format: {"labels": [{"name": "ingredient name", "x": 50, "y": 30}, ...]}. The x and y values are percentages (0-100) representing the position in the image where that ingredient is most visible. x=0 is left edge, x=100 is right edge, y=0 is top, y=100 is bottom. Identify 4-6 distinct visible food ingredients or components. Be specific (e.g. "basmati rice", "marinated chicken", "dal tadka"). IMPORTANT: Space labels apart — ensure every pair of labels has at least 15 units distance in both x and y coordinates. Do not cluster labels together. Distribute them evenly across the dish.',
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Identify the visible ingredients and food components in this dish image. For each one, provide the ingredient name and its approximate x,y position as a percentage of the image dimensions. Return only valid JSON.",
                },
                {
                  type: "image_url",
                  image_url: { url: image },
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service credits depleted." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI service error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;
    if (!aiResponse) throw new Error("No content in AI response");

    let result;
    try {
      let clean = aiResponse.trim();
      const jsonMatch = clean.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (jsonMatch) clean = jsonMatch[1].trim();
      if (clean.includes("```")) {
        const s = clean.indexOf("{");
        const e = clean.lastIndexOf("}");
        if (s !== -1 && e !== -1) clean = clean.substring(s, e + 1);
      }
      result = JSON.parse(clean);
    } catch {
      console.error("Failed to parse:", aiResponse);
      throw new Error("Failed to parse ingredient analysis");
    }

    if (!result.labels || !Array.isArray(result.labels)) {
      throw new Error("Invalid response format");
    }

    // Clamp values to 0-100
    result.labels = result.labels.map((l: any) => ({
      name: l.name,
      x: Math.max(5, Math.min(95, Number(l.x) || 50)),
      y: Math.max(5, Math.min(95, Number(l.y) || 50)),
    }));

    console.log("Detected ingredients:", result.labels.length);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Analysis failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
