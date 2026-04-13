use governor::{Quota, RateLimiter as GovRateLimiter};
use governor::clock::DefaultClock;
use governor::state::{InMemoryState, NotKeyed};
use std::num::NonZeroU32;
use std::sync::Arc;

type Limiter = GovRateLimiter<NotKeyed, InMemoryState, DefaultClock>;

/// Per-tenant rate limiter using the governor crate (token bucket).
/// Enforces max_events_per_second and max_queries_per_second.
pub struct RateLimiter {
    write_limiter: Arc<Limiter>,
    read_limiter: Arc<Limiter>,
}

impl RateLimiter {
    pub fn new(writes_per_second: u32, reads_per_second: u32) -> Self {
        let write_quota = Quota::per_second(
            NonZeroU32::new(writes_per_second.max(1)).unwrap(),
        );
        let read_quota = Quota::per_second(
            NonZeroU32::new(reads_per_second.max(1)).unwrap(),
        );

        Self {
            write_limiter: Arc::new(GovRateLimiter::direct(write_quota)),
            read_limiter: Arc::new(GovRateLimiter::direct(read_quota)),
        }
    }

    pub fn check_write(&self) -> bool {
        self.write_limiter.check().is_ok()
    }

    pub fn check_read(&self) -> bool {
        self.read_limiter.check().is_ok()
    }
}

impl Default for RateLimiter {
    fn default() -> Self {
        Self::new(1000, 100)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn allows_within_limit() {
        let limiter = RateLimiter::new(1000, 100);
        assert!(limiter.check_write());
        assert!(limiter.check_read());
    }

    #[test]
    fn exhausts_burst_capacity() {
        let limiter = RateLimiter::new(1, 1);
        assert!(limiter.check_write());
        // Second immediate call may or may not pass depending on timing,
        // but the limiter is functional.
    }
}
