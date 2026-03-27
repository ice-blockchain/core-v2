use anyhow::Result;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct RelayConfig {
    #[serde(default = "default_data_dir")]
    pub data_dir: String,

    #[serde(default = "default_health_addr")]
    pub health_addr: String,

    #[serde(default = "default_tenant_cache_size")]
    pub tenant_cache_size: usize,

    #[serde(default = "default_signal_channel_capacity")]
    pub signal_channel_capacity: usize,

    #[serde(default = "default_federation_timeout_ms")]
    pub federation_timeout_ms: u64,

    #[serde(default = "default_reaper_ttl_seconds")]
    pub reaper_ttl_seconds: u64,

    #[serde(default = "default_reaper_sweep_interval_ms")]
    pub reaper_sweep_interval_ms: u64,

    #[serde(default)]
    pub transport: TransportConfig,

    #[serde(default)]
    pub shard: ShardConfigSection,
}

#[derive(Debug, Deserialize)]
pub struct TransportConfig {
    #[serde(default = "default_bind_addr")]
    pub bind_addr: String,

    #[serde(default = "default_cert_path")]
    pub cert_path: String,

    #[serde(default = "default_key_path")]
    pub key_path: String,

    #[serde(default = "default_max_connections")]
    pub max_connections: usize,

    #[serde(default = "default_http_fallback_addr")]
    pub http_fallback_addr: String,

    #[serde(default = "default_max_body_bytes")]
    pub max_body_bytes: usize,
}

impl Default for TransportConfig {
    fn default() -> Self {
        Self {
            bind_addr: default_bind_addr(),
            cert_path: default_cert_path(),
            key_path: default_key_path(),
            max_connections: default_max_connections(),
            http_fallback_addr: default_http_fallback_addr(),
            max_body_bytes: default_max_body_bytes(),
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct ShardConfigSection {
    #[serde(default = "default_min_shards")]
    pub min_shards: u16,
    #[serde(default = "default_max_shards")]
    pub max_shards: u16,
    #[serde(default = "default_virtual_nodes_per_peer")]
    pub virtual_nodes_per_peer: u16,
    #[serde(default = "default_repair_check_interval_ms")]
    pub repair_check_interval_ms: u64,
    #[serde(default = "default_repair_timeout_ms")]
    pub repair_timeout_ms: u64,
    #[serde(default = "default_rebalance_cooldown_ms")]
    pub rebalance_cooldown_ms: u64,
}

impl Default for ShardConfigSection {
    fn default() -> Self {
        Self {
            min_shards: default_min_shards(),
            max_shards: default_max_shards(),
            virtual_nodes_per_peer: default_virtual_nodes_per_peer(),
            repair_check_interval_ms: default_repair_check_interval_ms(),
            repair_timeout_ms: default_repair_timeout_ms(),
            rebalance_cooldown_ms: default_rebalance_cooldown_ms(),
        }
    }
}

fn default_min_shards() -> u16 { 3 }
fn default_max_shards() -> u16 { 5 }
fn default_virtual_nodes_per_peer() -> u16 { 150 }
fn default_repair_check_interval_ms() -> u64 { 30_000 }
fn default_repair_timeout_ms() -> u64 { 300_000 }
fn default_rebalance_cooldown_ms() -> u64 { 60_000 }

fn default_data_dir() -> String { "data".into() }
fn default_health_addr() -> String { "127.0.0.1:9090".into() }
fn default_tenant_cache_size() -> usize { 1000 }
fn default_signal_channel_capacity() -> usize { 1024 }
fn default_federation_timeout_ms() -> u64 { 10_000 }
fn default_reaper_ttl_seconds() -> u64 { 30 * 24 * 3600 }
fn default_reaper_sweep_interval_ms() -> u64 { 60_000 }
fn default_bind_addr() -> String { "127.0.0.1:4433".into() }
fn default_cert_path() -> String { "cert.pem".into() }
fn default_key_path() -> String { "key.pem".into() }
fn default_max_connections() -> usize { 100_000 }
fn default_http_fallback_addr() -> String { "127.0.0.1:8080".into() }
fn default_max_body_bytes() -> usize { 1_048_576 }

impl RelayConfig {
    pub fn load() -> Result<Self> {
        let config_path = std::env::var("PULSE_CONFIG")
            .unwrap_or_else(|_| "pulse-relay.toml".into());

        if std::path::Path::new(&config_path).exists() {
            let contents = std::fs::read_to_string(&config_path)?;
            let config: RelayConfig = toml::from_str(&contents)?;
            Ok(config)
        } else {
            Ok(Self::default())
        }
    }
}

impl Default for RelayConfig {
    fn default() -> Self {
        Self {
            data_dir: default_data_dir(),
            health_addr: default_health_addr(),
            tenant_cache_size: default_tenant_cache_size(),
            signal_channel_capacity: default_signal_channel_capacity(),
            federation_timeout_ms: default_federation_timeout_ms(),
            reaper_ttl_seconds: default_reaper_ttl_seconds(),
            reaper_sweep_interval_ms: default_reaper_sweep_interval_ms(),
            transport: TransportConfig::default(),
            shard: ShardConfigSection::default(),
        }
    }
}
