package handlers

import (
	"fmt"
	"strconv"
)

func anyString(v interface{}) string {
	if v == nil {
		return ""
	}
	if s, ok := v.(string); ok {
		return s
	}
	return fmt.Sprintf("%v", v)
}

func anyInt(v interface{}) int {
	if v == nil {
		return 0
	}
	switch val := v.(type) {
	case int32:
		return int(val)
	case int64:
		return int(val)
	case int:
		return val
	case float64:
		return int(val)
	}
	return 0
}

func itoa(i int) string {
	return strconv.Itoa(i)
}
