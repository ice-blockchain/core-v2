package greenfield

// FeeAllowance submits MsgGrantAllowance on-chain.
// Phase 6: called by the fee guarantee middleware when a URL pattern
// matches. Wrapped in exponential backoff with 10s max elapsed time.
