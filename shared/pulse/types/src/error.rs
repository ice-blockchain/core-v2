use thiserror::Error;

#[derive(Debug, Error)]
pub enum PulseError {
    #[error("invalid signature")]
    InvalidSignature,

    #[error("invalid event id: hash mismatch")]
    InvalidEventId,

    #[error("unknown event kind: {0}")]
    UnknownKind(u32),

    #[error("schema validation failed: {0}")]
    SchemaValidation(String),

    #[error("tenant not found: {0}")]
    TenantNotFound(String),

    #[error("tenant suspended: {0}")]
    TenantSuspended(String),

    #[error("quota exceeded: {0}")]
    QuotaExceeded(String),

    #[error("rate limited")]
    RateLimited,

    #[error("storage error: {0}")]
    Storage(String),

    #[error("transport error: {0}")]
    Transport(String),

    #[error("shard error: {0}")]
    Shard(String),

    #[error("federation error: {0}")]
    Federation(String),

    #[error("internal error: {0}")]
    Internal(String),
}
