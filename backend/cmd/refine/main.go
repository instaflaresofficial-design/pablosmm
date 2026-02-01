package main

import (
	"context"
	"fmt"
	"log"
	"sort"
	"strings"

	"pablosmm/backend/internal/config"
	"pablosmm/backend/internal/db"
	"pablosmm/backend/internal/service/fx"
	"pablosmm/backend/internal/service/smm"

	"github.com/joho/godotenv"
)

func main() {
	godotenv.Load(".env")

	cfg := config.Load()
	database, err := db.New(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	fxSvc := fx.New(cfg.UsdToInr)
	smmSvc := smm.New(database, cfg, fxSvc)

	services, err := smmSvc.FetchServices()
	if err != nil {
		log.Fatalf("Failed to fetch services: %v", err)
	}

	log.Printf("Analyzing %d services for refinement...", len(services))

	// Group by Provider Category
	groups := make(map[string][]smm.NormalizedSmmService)
	for _, s := range services {
		groups[s.RawProviderCategory] = append(groups[s.RawProviderCategory], s)
	}

	ctx := context.Background()

	for cat, group := range groups {
		if len(group) == 0 {
			continue
		}

		// 1. Tag CHEAPEST
		sort.Slice(group, func(i, j int) bool {
			return group[i].RatePer1000 < group[j].RatePer1000
		})

		cheapestID := group[0].SourceServiceID

		for i, s := range group {
			tags := []string{}

			// Auto Tag Cheap
			if s.SourceServiceID == cheapestID {
				tags = append(tags, "CHEAPEST")
			}

			// Auto Tag Premium
			lowName := strings.ToLower(s.ProviderName)
			if strings.Contains(lowName, "premium") || strings.Contains(lowName, "real") || strings.Contains(lowName, "high quality") {
				tags = append(tags, "PREMIUM")
			}

			// High Quality
			if strings.Contains(lowName, "hq") || strings.Contains(lowName, "best") {
				tags = append(tags, "BEST QUALITY")
			}

			// Revert to Original (Set empty so system falls back to provider data)
			newName := ""
			newDesc := ""

			// Randomized Unique ID (e.g. 3999 -> 1821)
			newDisplayID := generateStaticRandomID(s.SourceServiceID)

			// Auto-Assign App Category based on Service Type
			appCategory := ""
			lowerType := strings.ToLower(s.ServiceType)
			if strings.Contains(lowerType, "follower") {
				appCategory = "Followers"
			} else if strings.Contains(lowerType, "like") {
				appCategory = "Likes"
			} else if strings.Contains(lowerType, "view") {
				appCategory = "Views"
			} else if strings.Contains(lowerType, "comment") {
				appCategory = "Comments"
			} else if strings.Contains(lowerType, "subscriber") {
				appCategory = "Subscribers"
			} else if strings.Contains(lowerType, "member") {
				appCategory = "Members"
			} else {
				appCategory = "Other"
			}

			// Upsert Override - FORCE RESET names/descs to empty, update ID and Category
			query := `
				INSERT INTO service_overrides (
					source_service_id, display_name, display_description, 
					tags, display_id, category, updated_at
				)
				VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
				ON CONFLICT (source_service_id) 
				DO UPDATE SET 
					display_name = '', -- Explicitly clear to use original
					display_description = '', -- Explicitly clear to use original
					tags = EXCLUDED.tags,
					display_id = CASE WHEN service_overrides.display_id = '' OR service_overrides.display_id IS NULL THEN EXCLUDED.display_id ELSE service_overrides.display_id END,
					category = EXCLUDED.category,
					updated_at = CURRENT_TIMESTAMP
			`

			_, err := database.Pool.Exec(ctx, query,
				s.SourceServiceID,
				newName,
				newDesc,
				tags,
				newDisplayID,
				appCategory,
			)

			if err != nil {
				log.Printf("Failed to refine service %s: %v", s.SourceServiceID, err)
			}

			if i == 0 {
				log.Printf("[%s] Refined: '%s' -> '%s' (ID: %s, Cat: %s)", cat, s.ProviderName, newName, newDisplayID, appCategory)
			}
		}
	}

	log.Println("Service refinement completed successfully!")
}

func generateStaticRandomID(sourceID string) string {
	// Simple deterministic "randomization"
	var hash uint32 = 0
	for i := 0; i < len(sourceID); i++ {
		hash = hash*31 + uint32(sourceID[i])
	}
	// Map to 4-5 digit space, offset and scramble
	id := 1000 + (hash % 8999)
	return fmt.Sprintf("%d", id)
}
