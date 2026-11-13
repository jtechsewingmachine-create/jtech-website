package main

import (
	"regexp"
	"strings"
	"unicode"
	"unicode/utf8"
)

// Mirrors web/lib/enquiry.ts (validation) and web/lib/products.ts (model slugs).
// TestKnownModelsMatchWebCatalogue (main_test.go) fails if the slug list drifts from the web catalogue.

const (
	nameMin    = 2
	nameMax    = 80
	messageMax = 1000
)

var intents = map[string]bool{"general": true, "product": true, "support": true, "trade": true}

// knownModels are the catalogue slugs the form may send.
var knownModels = map[string]bool{"stylish-stitcher": true, "demo-model-2": true, "demo-model-3": true}

var (
	phonePattern = regexp.MustCompile(`^(?:\+?91|0)?([2-9]\d{9})$`)
)

// EnquiryRequest is the JSON body the form posts. Website is a honeypot: humans never fill it.
type EnquiryRequest struct {
	Name    string `json:"name"`
	Phone   string `json:"phone"`
	Intent  string `json:"intent"`
	Model   string `json:"model"`
	Message string `json:"message"`
	Website string `json:"website"`
}

// Enquiry is what gets stored: trimmed, normalised, validated.
type Enquiry struct {
	Name    string  `json:"name"`
	Phone   string  `json:"phone"`
	Intent  string  `json:"intent"`
	Model   *string `json:"model"`
	Message string  `json:"message"`
}

func normalisePhone(raw string) (string, bool) {
	// Same separators as the web form's /[\s\-().]/ (JS \s is Unicode whitespace, e.g. NBSP).
	stripped := strings.Map(func(r rune) rune {
		if unicode.IsSpace(r) || r == '-' || r == '(' || r == ')' || r == '.' {
			return -1
		}
		return r
	}, raw)
	m := phonePattern.FindStringSubmatch(stripped)
	if m == nil {
		return "", false
	}
	return m[1], true
}

// hasControl reports control characters; newlines/tabs are allowed only where allowNewlines is set.
func hasControl(s string, allowNewlines bool) bool {
	for _, r := range s {
		if allowNewlines && (r == '\n' || r == '\r' || r == '\t') {
			continue
		}
		if unicode.IsControl(r) {
			return true
		}
	}
	return false
}

// validate returns field errors (same keys and wording as the web form) or a clean Enquiry.
func validate(req EnquiryRequest) (Enquiry, map[string]string) {
	errs := map[string]string{}
	name := strings.TrimSpace(req.Name)
	switch n := utf8.RuneCountInString(name); {
	case !utf8.ValidString(name) || hasControl(name, false):
		errs["name"] = "Enter your name."
	case n < nameMin:
		errs["name"] = "Enter your name."
	case n > nameMax:
		errs["name"] = "Name must be 80 characters or fewer."
	}

	phone, ok := normalisePhone(req.Phone)
	if strings.TrimSpace(req.Phone) == "" {
		errs["phone"] = "Enter a contact number."
	} else if !ok {
		errs["phone"] = "Enter a 10-digit phone number, for example 98765 43210."
	}

	if !intents[req.Intent] {
		errs["intent"] = "Choose what you would like help with."
	}

	var model *string
	if req.Model != "" {
		if !knownModels[req.Model] {
			errs["model"] = "Choose a machine from the list, or no specific machine."
		} else {
			m := req.Model
			model = &m
		}
	}

	message := strings.TrimRight(req.Message, " \t\r\n")
	if !utf8.ValidString(message) || hasControl(message, true) {
		errs["message"] = "Your question contains characters that can't be sent."
	} else if utf8.RuneCountInString(message) > messageMax {
		errs["message"] = "Your question must be 1000 characters or fewer."
	}

	if len(errs) > 0 {
		return Enquiry{}, errs
	}
	return Enquiry{Name: name, Phone: phone, Intent: req.Intent, Model: model, Message: message}, nil
}
