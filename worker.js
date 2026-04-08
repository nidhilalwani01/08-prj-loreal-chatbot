/**
 * L'Oréal Beauty Chatbot Cloudflare Worker
 *
 * This worker accepts chat messages, forwards them to OpenAI's Chat Completions API,
 * and returns the assistant's response.
 *
 * Setup:
 * 1. Create a Cloudflare Worker
 * 2. Set the environment variable: OPENAI_API_KEY (your OpenAI API key)
 * 3. Copy this entire code into the worker script
 * 4. Deploy and use the URL in script.js
 */

export default {
  async fetch(request, env) {
    // CORS headers for cross-origin requests
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json",
    };

    // Handle CORS preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Only accept POST requests
    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({
          error: "Method not allowed. Use POST.",
        }),
        {
          status: 405,
          headers: corsHeaders,
        },
      );
    }

    try {
      // Validate API key is configured
      const apiKey = env.OPENAI_API_KEY;
      if (!apiKey) {
        console.error("OPENAI_API_KEY environment variable is not set");
        return new Response(
          JSON.stringify({
            error: "Server configuration error: API key not found.",
          }),
          {
            status: 500,
            headers: corsHeaders,
          },
        );
      }

      // Parse the request body
      let requestBody;
      try {
        requestBody = await request.json();
      } catch (err) {
        return new Response(
          JSON.stringify({
            error: 'Invalid request body. Expected JSON with "messages" array.',
          }),
          {
            status: 400,
            headers: corsHeaders,
          },
        );
      }

      // Validate messages array exists
      if (!requestBody.messages || !Array.isArray(requestBody.messages)) {
        return new Response(
          JSON.stringify({
            error: 'Missing or invalid "messages" array in request body.',
          }),
          {
            status: 400,
            headers: corsHeaders,
          },
        );
      }

      // Build the request to OpenAI API
      const openaiRequestBody = {
        model: "gpt-4o",
        messages: requestBody.messages,
        max_completion_tokens: 300,
      };

      // Call OpenAI Chat Completions API
      const openaiResponse = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(openaiRequestBody),
        },
      );

      // Parse OpenAI response
      const data = await openaiResponse.json();

      // Handle OpenAI API errors
      if (!openaiResponse.ok) {
        console.error("OpenAI API error:", data);
        return new Response(
          JSON.stringify({
            error: data.error?.message || "Error from OpenAI API",
          }),
          {
            status: openaiResponse.status,
            headers: corsHeaders,
          },
        );
      }

      // Extract assistant message using exact path
      const assistantMessage = data.choices[0].message.content;

      if (!assistantMessage) {
        console.error("Unexpected OpenAI response structure:", data);
        return new Response(
          JSON.stringify({
            error: "Unexpected response format from OpenAI API.",
          }),
          {
            status: 500,
            headers: corsHeaders,
          },
        );
      }

      // Return the full response for consistency with frontend expectations
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: corsHeaders,
      });
    } catch (error) {
      console.error("Worker error:", error);
      return new Response(
        JSON.stringify({
          error: "Internal server error. Please try again.",
        }),
        {
          status: 500,
          headers: corsHeaders,
        },
      );
    }
  },
};
