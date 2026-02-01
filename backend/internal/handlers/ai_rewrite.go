package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"regexp"
	"strings"
)

// AIRewriteRequest represents the request for AI rewriting
type AIRewriteRequest struct {
	ProviderName string `json:"providerName"`
	Description  string `json:"description"`
	Category     string `json:"category"`
	Platform     string `json:"platform"`
}

// AIRewriteResponse represents the AI-generated content
type AIRewriteResponse struct {
	DisplayName        string            `json:"displayName"`
	DisplayDescription string            `json:"displayDescription"`
	Metadata           map[string]string `json:"metadata"`
}

// GeminiRequest represents the request to Gemini API
type GeminiRequest struct {
	Contents []GeminiContent `json:"contents"`
}

type GeminiContent struct {
	Parts []GeminiPart `json:"parts"`
}

type GeminiPart struct {
	Text string `json:"text"`
}

// GeminiResponse represents the response from Gemini API
type GeminiResponse struct {
	Candidates []struct {
		Content struct {
			Parts []struct {
				Text string `json:"text"`
			} `json:"parts"`
		} `json:"content"`
	} `json:"candidates"`
}

// AIRewriteService handles AI-powered service rewriting using Gemini
func (h *Handler) AIRewriteService(w http.ResponseWriter, r *http.Request) {
	var req AIRewriteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	log.Printf("AI Rewrite request: Platform=%s Category=%s", req.Platform, req.Category)

	// Get Gemini API key
	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" || apiKey == "YOUR_GEMINI_API_KEY_HERE" {
		log.Println("GEMINI_API_KEY not configured, using fallback")
		// Fallback to simple rewrite
		response := fallbackRewrite(req)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		return
	}

	// Call Gemini API
	displayName, displayDescription, err := callGeminiAPI(apiKey, req)
	if err != nil {
		log.Printf("Gemini API error: %v, using fallback", err)
		response := fallbackRewrite(req)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		return
	}

	// Extract metadata
	metadata := extractMetadata(req.Description, req.ProviderName)

	response := AIRewriteResponse{
		DisplayName:        displayName,
		DisplayDescription: displayDescription,
		Metadata:           metadata,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// callGeminiAPI calls Google's Gemini API for AI rewriting
func callGeminiAPI(apiKey string, req AIRewriteRequest) (string, string, error) {
	prompt := fmt.Sprintf(`You are a professional SMM service copywriter. Rewrite the following service details to make them more appealing, professional, and eye-catching while keeping the same meaning.

Platform: %s
Category: %s
Original Name: %s
Original Description: %s

Requirements:
1. Create a SHORT, catchy display name (max 6-8 words) with a relevant emoji.
2. Write a compelling but CONCISE description. Use emojis and a skimmable layout.
3. Use **bold text** for section headers or key terms. 
4. DO NOT put bullet points (•, -, *) on header lines. Only use bullets for actual list items.
5. Use professional, marketing-friendly language that feels premium.
6. Keep technical details (refill, speed, etc.) accurate.

Respond ONLY in this exact JSON format (no markdown, no extra text):
{
  "displayName": "your rewritten name here 🚀",
  "displayDescription": "**Section Header**\n• Feature 1 ✅\n• Feature 2 ⚡"
}`, req.Platform, req.Category, req.ProviderName, req.Description)

	geminiReq := GeminiRequest{
		Contents: []GeminiContent{
			{
				Parts: []GeminiPart{
					{Text: prompt},
				},
			},
		},
	}

	jsonData, err := json.Marshal(geminiReq)
	if err != nil {
		return "", "", fmt.Errorf("failed to marshal request: %w", err)
	}

	// Models to try in order of preference
	models := []string{
		"gemini-2.0-flash",
		"gemini-1.5-flash",
		"gemini-2.0-flash-lite",
		"gemini-flash-latest",
	}

	var lastErr error
	for _, model := range models {
		url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", model, apiKey)

		log.Printf("Attempting AI rewrite with model: %s", model)
		resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonData))
		if err != nil {
			lastErr = fmt.Errorf("failed to call model %s: %w", model, err)
			continue
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			lastErr = fmt.Errorf("model %s returned status %d: %s", model, resp.StatusCode, string(body))
			// If it's a 404, the model doesn't exist, try next one
			// If it's a 429, we are out of quota, try next one
			continue
		}

		var geminiResp GeminiResponse
		if err := json.NewDecoder(resp.Body).Decode(&geminiResp); err != nil {
			lastErr = fmt.Errorf("failed to decode response from %s: %w", model, err)
			continue
		}

		if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
			lastErr = fmt.Errorf("empty response from %s", model)
			continue
		}

		responseText := geminiResp.Candidates[0].Content.Parts[0].Text
		return parseGeminiResponse(responseText)
	}

	return "", "", fmt.Errorf("all models failed. Last error: %v", lastErr)
}

// parseGeminiResponse extracts the JSON from Gemini's response
func parseGeminiResponse(responseText string) (string, string, error) {
	// Extract JSON from response (handle markdown code blocks)
	responseText = strings.TrimSpace(responseText)
	responseText = strings.TrimPrefix(responseText, "```json")
	responseText = strings.TrimPrefix(responseText, "```")
	responseText = strings.TrimSuffix(responseText, "```")
	responseText = strings.TrimSpace(responseText)

	var result struct {
		DisplayName        string `json:"displayName"`
		DisplayDescription string `json:"displayDescription"`
	}

	if err := json.Unmarshal([]byte(responseText), &result); err != nil {
		return "", "", fmt.Errorf("failed to parse AI response: %w", err)
	}

	return result.DisplayName, result.DisplayDescription, nil
}

// fallbackRewrite provides a simple fallback when AI is not available
func fallbackRewrite(req AIRewriteRequest) AIRewriteResponse {
	// Simple cleanup and formatting
	displayName := fmt.Sprintf("✨ %s %s", strings.Title(req.Platform), strings.Title(req.Category))

	// Add quality indicator if present
	desc := strings.ToLower(req.Description)
	if regexp.MustCompile(`(?i)\b(premium|hq|high\s*quality)\b`).MatchString(desc) {
		displayName = "💎 Premium " + strings.Title(req.Platform) + " " + strings.Title(req.Category)
	} else if regexp.MustCompile(`(?i)\b(real|organic|genuine)\b`).MatchString(desc) {
		displayName = "✅ Authentic " + strings.Title(req.Platform) + " " + strings.Title(req.Category)
	}

	// Simple description
	displayDescription := fmt.Sprintf("**Service Features:**\n• Professional %s %s service. 🔥\n• High speed & premium quality. ⚡\n• %s ✅", req.Platform, req.Category, strings.TrimSpace(req.Description))
	if len(displayDescription) > 300 {
		displayDescription = displayDescription[:297] + "..."
	}

	metadata := extractMetadata(req.Description, req.ProviderName)

	return AIRewriteResponse{
		DisplayName:        displayName,
		DisplayDescription: displayDescription,
		Metadata:           metadata,
	}
}

// extractMetadata extracts structured metadata from description
func extractMetadata(description, providerName string) map[string]string {
	metadata := make(map[string]string)
	desc := strings.ToLower(description + " " + providerName)

	// Extract targeting/location
	if regexp.MustCompile(`(?i)\b(usa|united\s+states|america|🇺🇸)\b`).MatchString(desc) {
		metadata["targeting"] = "USA"
	} else if regexp.MustCompile(`(?i)\b(india|indian|🇮🇳)\b`).MatchString(desc) {
		metadata["targeting"] = "India"
	} else if regexp.MustCompile(`(?i)\b(global|worldwide|international)\b`).MatchString(desc) {
		metadata["targeting"] = "Global"
	} else if regexp.MustCompile(`(?i)\b(russia|russian|🇷🇺)\b`).MatchString(desc) {
		metadata["targeting"] = "Russia"
	} else if regexp.MustCompile(`(?i)\b(brazil|brazilian|🇧🇷)\b`).MatchString(desc) {
		metadata["targeting"] = "Brazil"
	} else {
		metadata["targeting"] = "Global"
	}

	// Extract quality
	if regexp.MustCompile(`(?i)\b(100%\s*real|real\s+accounts|organic|active\s+users|genuine)\b`).MatchString(desc) {
		metadata["quality"] = "Real"
	} else if regexp.MustCompile(`(?i)\b(vip|elite|premium|pro|super)\b`).MatchString(desc) {
		metadata["quality"] = "Premium"
	} else if regexp.MustCompile(`(?i)\b(hq|high\s*quality|\bhigh\b)\b`).MatchString(desc) {
		metadata["quality"] = "High"
	} else if regexp.MustCompile(`(?i)\b(mix|mixed|normal|standard|medium)\b`).MatchString(desc) {
		metadata["quality"] = "Standard"
	} else if regexp.MustCompile(`(?i)\b(bot|fake|low)\b`).MatchString(desc) {
		metadata["quality"] = "Low"
	} else {
		metadata["quality"] = "Standard"
	}

	// Extract stability
	if regexp.MustCompile(`(?i)\b(non[-\s]?drop|no\s*drop|drop\s*protection|zero\s*drop)\b`).MatchString(desc) {
		metadata["stability"] = "Non-Drop"
	} else if regexp.MustCompile(`(?i)\b(may\s*drop|may\s*lose|possible\s*drop|will\s*drop|high\s*drop)\b`).MatchString(desc) {
		metadata["stability"] = "May Drop"
	} else if regexp.MustCompile(`(?i)\b(low\s*drop|low-drop)\b`).MatchString(desc) {
		metadata["stability"] = "Low Drop"
	} else if regexp.MustCompile(`(?i)\b(refill|auto-refill|guarantee)\b`).MatchString(desc) {
		metadata["stability"] = "Refill Available"
	} else {
		metadata["stability"] = "Standard"
	}

	return metadata
}
