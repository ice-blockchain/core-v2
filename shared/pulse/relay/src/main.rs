mod config;
mod router;
mod health;
mod event_pipeline;

use std::sync::Arc;

use anyhow::Result;
use tracing::info;
use tracing_subscriber::EnvFilter;

use config::RelayConfig;
use event_pipeline::EventPipeline;
use health::HealthServer;

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")),
        )
        .init();

    let config = RelayConfig::load()?;
    info!(
        bind = %config.transport.bind_addr,
        data_dir = %config.data_dir,
        "starting pulse-relay"
    );

    let conn_manager = Arc::new(pulse_transport::ConnectionManager::new());
    let tenant_store = Arc::new(
        pulse_tenant::TenantStore::new(std::path::Path::new(&config.data_dir))
            .expect("failed to initialize tenant store"),
    );
    let tenant_resolver = Arc::new(pulse_tenant::TenantResolver::new(
        Arc::clone(&tenant_store),
        config.tenant_cache_size,
    ));
    let schema_registry = Arc::new(pulse_schema::SchemaRegistry::new());
    let signal_hub = Arc::new(pulse_signal::SignalHub::new(config.signal_channel_capacity));

    let shard_config = pulse_shard::ShardConfig {
        min_shards: config.shard.min_shards,
        max_shards: config.shard.max_shards,
        virtual_nodes_per_peer: config.shard.virtual_nodes_per_peer,
        repair_check_interval_ms: config.shard.repair_check_interval_ms,
        repair_timeout_ms: config.shard.repair_timeout_ms,
        rebalance_cooldown_ms: config.shard.rebalance_cooldown_ms,
    };
    let hash_ring = Arc::new(tokio::sync::RwLock::new(
        pulse_shard::HashRing::new(shard_config.clone()),
    ));
    let peer_health = Arc::new(tokio::sync::RwLock::new(
        pulse_shard::PeerHealth::new(10_000, 30_000),
    ));
    let shard_repair = Arc::new(pulse_shard::ShardRepairScheduler::new(
        Arc::clone(&hash_ring),
        Arc::clone(&peer_health),
        shard_config,
    ));

    let federation = Arc::new(pulse_federation::FederatedCoordinator::new(
        config.federation_timeout_ms,
    ));
    let reaper = Arc::new(pulse_reaper::Reaper::new(
        config.reaper_ttl_seconds,
        config.reaper_sweep_interval_ms,
    ));

    let _event_pipeline = Arc::new(EventPipeline::new(
        Arc::clone(&tenant_resolver),
        Arc::clone(&schema_registry),
        Arc::clone(&signal_hub),
    ));

    let wt_config = pulse_transport::WebTransportConfig {
        bind_addr: config.transport.bind_addr.parse()?,
        cert_path: config.transport.cert_path.clone(),
        key_path: config.transport.key_path.clone(),
        max_connections: config.transport.max_connections,
    };
    let wt_server = Arc::new(pulse_transport::WebTransportServer::new(
        wt_config,
        Arc::clone(&conn_manager),
    ));

    let http_config = pulse_transport::HttpFallbackConfig {
        bind_addr: config.transport.http_fallback_addr.parse()?,
        max_body_bytes: config.transport.max_body_bytes,
    };
    let http_server = Arc::new(pulse_transport::HttpFallbackServer::new(
        http_config,
        Arc::clone(&conn_manager),
    ));

    let health = HealthServer::new(
        config.health_addr.parse()?,
        Arc::clone(&conn_manager),
        Arc::clone(&tenant_store),
    );

    info!("all subsystems initialized");

    tokio::select! {
        _ = wt_server.serve() => {},
        _ = http_server.serve() => {},
        _ = health.serve() => {},
        _ = reaper.run() => {},
        _ = shard_repair.run() => {},
        _ = tokio::signal::ctrl_c() => {
            info!("received shutdown signal");
        }
    }

    info!("pulse-relay stopped");
    Ok(())
}
