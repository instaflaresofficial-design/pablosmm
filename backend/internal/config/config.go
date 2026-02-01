package config

import (
	"os"
	"strconv"
)

type Config struct {
	Port        string
	DatabaseURL string
	JWTSecret   string
	SMMAPIKey   string
	SMMAPIURL   string
	SmmCurrency string
	UsdToInr    float64
}

func Load() *Config {
	return &Config{
		Port:        getEnv("PORT", "8080"),
		DatabaseURL: os.Getenv("DATABASE_URL"),
		JWTSecret:   getEnv("JWT_SECRET", "change-me"),
		SMMAPIKey:   os.Getenv("TOPSMM_API_KEY"),
		SMMAPIURL:   getEnv("TOPSMM_API_URL", "https://topsmm.in/api/v2"),
		SmmCurrency: getEnv("SMM_CURRENCY", "USD"),
		UsdToInr:    getEnvFloat("USD_TO_INR", 83.0),
	}
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}

func getEnvFloat(key string, fallback float64) float64 {
	if value, exists := os.LookupEnv(key); exists {
		if f, err := strconv.ParseFloat(value, 64); err == nil {
			return f
		}
	}
	return fallback
}
