package handler

// SPURLIntercept handles getSPUrlByBucket requests locally.
// Phase 5: returns the service's own ADNL address instead of the
// real SP URL, keeping the client entirely within the overlay.
