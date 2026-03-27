use std::sync::Arc;
use tracing::{debug, warn};

use pulse_auth::{verify_event, RateLimiter};
use pulse_schema::{SchemaRegistry, SchemaValidator};
use pulse_signal::SignalHub;
use pulse_tenant::{TenantResolver, TenantStoreError};
use pulse_types::{resolve_api_target, ApiTarget, PulseError, SignedEvent};

/// The full event processing pipeline:
///   verify signature -> resolve tenant -> check quota/rate ->
///   validate schema -> route by kind -> store -> notify subscribers
pub struct EventPipeline {
    tenant_resolver: Arc<TenantResolver>,
    schema_registry: Arc<SchemaRegistry>,
    signal_hub: Arc<SignalHub>,
    rate_limiters: Arc<tokio::sync::RwLock<std::collections::HashMap<String, RateLimiter>>>,
}

impl EventPipeline {
    pub fn new(
        tenant_resolver: Arc<TenantResolver>,
        schema_registry: Arc<SchemaRegistry>,
        signal_hub: Arc<SignalHub>,
    ) -> Self {
        Self {
            tenant_resolver,
            schema_registry,
            signal_hub,
            rate_limiters: Arc::new(tokio::sync::RwLock::new(std::collections::HashMap::new())),
        }
    }

    pub async fn process_event(
        &self,
        tenant_id: &str,
        event: &SignedEvent,
    ) -> Result<ApiTarget, PulseError> {
        verify_event(event)?;

        let tenant_meta = self
            .tenant_resolver
            .resolve(tenant_id)
            .await
            .map_err(|e| match e {
                TenantStoreError::NotFound(id) => PulseError::TenantNotFound(id),
                TenantStoreError::Suspended(id) => PulseError::TenantSuspended(id),
                _ => PulseError::Internal(e.to_string()),
            })?;

        if !tenant_meta.is_writable() {
            return Err(PulseError::TenantSuspended(tenant_id.to_string()));
        }

        self.check_rate_limit(tenant_id, &tenant_meta.quota).await?;

        if let Ok(schema) = self.schema_registry.get_latest(tenant_id, event.kind) {
            SchemaValidator::validate(&schema, &event.content)
                .map_err(|e| PulseError::SchemaValidation(e.to_string()))?;
        }

        let target = resolve_api_target(event.kind)
            .ok_or(PulseError::UnknownKind(event.kind))?;

        debug!(
            kind = event.kind,
            target = ?target,
            tenant = tenant_id,
            "event routed"
        );

        // After storage, notify subscribers
        let path = format!(
            "events/{}/{}",
            hex::encode(event.pubkey),
            event.kind
        );
        self.signal_hub
            .emit(&path, event.id.to_vec())
            .await;

        Ok(target)
    }

    async fn check_rate_limit(
        &self,
        tenant_id: &str,
        quota: &pulse_tenant::TenantQuota,
    ) -> Result<(), PulseError> {
        let limiters = self.rate_limiters.read().await;
        if let Some(limiter) = limiters.get(tenant_id) {
            if !limiter.check_write() {
                return Err(PulseError::RateLimited);
            }
            return Ok(());
        }
        drop(limiters);

        let limiter = RateLimiter::new(
            quota.max_events_per_second,
            quota.max_queries_per_second,
        );
        let allowed = limiter.check_write();
        self.rate_limiters
            .write()
            .await
            .insert(tenant_id.to_string(), limiter);

        if allowed {
            Ok(())
        } else {
            Err(PulseError::RateLimited)
        }
    }
}
