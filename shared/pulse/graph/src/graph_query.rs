use heed::types::Bytes;
use heed::{Database, Env};
use pulse_types::SignedEvent;
use std::sync::Arc;

use crate::graph_store::GraphStoreError;

#[derive(Debug, Clone)]
pub struct GraphQuery {
    pub kinds: Option<Vec<u32>>,
    pub authors: Option<Vec<[u8; 32]>>,
    pub since: Option<u64>,
    pub until: Option<u64>,
    pub limit: usize,
}

impl Default for GraphQuery {
    fn default() -> Self {
        Self {
            kinds: None,
            authors: None,
            since: None,
            until: None,
            limit: 100,
        }
    }
}

#[derive(Debug)]
pub struct GraphQueryResult {
    pub events: Vec<SignedEvent>,
    pub total_scanned: usize,
}

impl GraphQueryResult {
    pub fn execute(
        env: &Env,
        timeline_db: Database<Bytes, Bytes>,
        events_db: Database<Bytes, Bytes>,
        query: &GraphQuery,
    ) -> Result<Self, GraphStoreError> {
        let rtxn = env.read_txn()?;
        let mut results = Vec::new();
        let mut scanned = 0usize;

        let iter = timeline_db.iter(&rtxn)?;

        for result in iter {
            let (key, _) = result?;
            if key.len() < 40 {
                continue;
            }
            scanned += 1;

            let ts = u64::from_be_bytes([
                key[0], key[1], key[2], key[3], key[4], key[5], key[6], key[7],
            ]);

            if let Some(since) = query.since {
                if ts < since {
                    continue;
                }
            }
            if let Some(until) = query.until {
                if ts > until {
                    continue;
                }
            }

            let mut event_id = [0u8; 32];
            event_id.copy_from_slice(&key[8..40]);

            if let Some(bytes) = events_db.get(&rtxn, &event_id)? {
                let event: SignedEvent = serde_json::from_slice(bytes)
                    .map_err(|e| GraphStoreError::Serialization(e.to_string()))?;

                if let Some(ref kinds) = query.kinds {
                    if !kinds.contains(&event.kind) {
                        continue;
                    }
                }
                if let Some(ref authors) = query.authors {
                    if !authors.contains(&event.pubkey) {
                        continue;
                    }
                }

                results.push(event);
                if results.len() >= query.limit {
                    break;
                }
            }
        }

        Ok(Self {
            events: results,
            total_scanned: scanned,
        })
    }
}
