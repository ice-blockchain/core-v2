use std::path::Path;
use std::sync::Arc;

use crossbeam_channel::{bounded, Sender};
use heed::types::Bytes;
use heed::{Database, Env, EnvOpenOptions};
use thiserror::Error;
use tracing::{debug, error};

use pulse_types::SignedEvent;

use crate::adjacency::EdgeKey;

#[derive(Debug, Error)]
pub enum GraphStoreError {
    #[error("heed error: {0}")]
    Heed(#[from] heed::Error),
    #[error("event not found: {0}")]
    NotFound(String),
    #[error("serialization error: {0}")]
    Serialization(String),
    #[error("write channel closed")]
    ChannelClosed,
}

/// LMDB-backed graph store with six named databases:
/// events, nodes, edges_out, edges_in, timeline, by_kind.
pub struct GraphStore {
    env: Arc<Env>,
    events_db: Database<Bytes, Bytes>,
    nodes_db: Database<Bytes, Bytes>,
    edges_out_db: Database<Bytes, Bytes>,
    edges_in_db: Database<Bytes, Bytes>,
    timeline_db: Database<Bytes, Bytes>,
    by_kind_db: Database<Bytes, Bytes>,
    write_tx: Sender<WriteOp>,
}

enum WriteOp {
    PutEvent(SignedEvent),
}

impl GraphStore {
    pub fn open(path: &Path, map_size: usize) -> Result<Self, GraphStoreError> {
        std::fs::create_dir_all(path).map_err(|e| {
            GraphStoreError::Heed(heed::Error::Io(e))
        })?;

        let env = unsafe {
            EnvOpenOptions::new()
                .map_size(map_size)
                .max_dbs(6)
                .open(path)?
        };
        let env = Arc::new(env);

        let mut wtxn = env.write_txn()?;
        let events_db = env.create_database(&mut wtxn, Some("events"))?;
        let nodes_db = env.create_database(&mut wtxn, Some("nodes"))?;
        let edges_out_db = env.create_database(&mut wtxn, Some("edges_out"))?;
        let edges_in_db = env.create_database(&mut wtxn, Some("edges_in"))?;
        let timeline_db = env.create_database(&mut wtxn, Some("timeline"))?;
        let by_kind_db = env.create_database(&mut wtxn, Some("by_kind"))?;
        wtxn.commit()?;

        let (write_tx, write_rx) = bounded::<WriteOp>(1024);

        let writer_env = Arc::clone(&env);
        std::thread::spawn(move || {
            Self::write_loop(
                writer_env,
                write_rx,
                events_db,
                nodes_db,
                edges_out_db,
                edges_in_db,
                timeline_db,
                by_kind_db,
            );
        });

        Ok(Self {
            env,
            events_db,
            nodes_db,
            edges_out_db,
            edges_in_db,
            timeline_db,
            by_kind_db,
            write_tx,
        })
    }

    fn write_loop(
        env: Arc<Env>,
        rx: crossbeam_channel::Receiver<WriteOp>,
        events_db: Database<Bytes, Bytes>,
        nodes_db: Database<Bytes, Bytes>,
        edges_out_db: Database<Bytes, Bytes>,
        edges_in_db: Database<Bytes, Bytes>,
        timeline_db: Database<Bytes, Bytes>,
        by_kind_db: Database<Bytes, Bytes>,
    ) {
        let flush_interval = std::time::Duration::from_millis(250);
        let mut batch: Vec<SignedEvent> = Vec::with_capacity(1000);
        loop {
            batch.clear();
            match rx.recv_timeout(flush_interval) {
                Ok(WriteOp::PutEvent(event)) => batch.push(event),
                Err(crossbeam_channel::RecvTimeoutError::Disconnected) => return,
                Err(crossbeam_channel::RecvTimeoutError::Timeout) => continue,
            }
            while let Ok(WriteOp::PutEvent(event)) = rx.try_recv() {
                batch.push(event);
                if batch.len() >= 1000 {
                    break;
                }
            }

            if let Err(e) = Self::flush_batch(
                &env,
                &batch,
                events_db,
                nodes_db,
                edges_out_db,
                edges_in_db,
                timeline_db,
                by_kind_db,
            ) {
                error!("batch flush failed: {}", e);
            } else {
                debug!(count = batch.len(), "flushed event batch");
            }
        }
    }

    fn flush_batch(
        env: &Env,
        events: &[SignedEvent],
        events_db: Database<Bytes, Bytes>,
        nodes_db: Database<Bytes, Bytes>,
        edges_out_db: Database<Bytes, Bytes>,
        edges_in_db: Database<Bytes, Bytes>,
        timeline_db: Database<Bytes, Bytes>,
        by_kind_db: Database<Bytes, Bytes>,
    ) -> Result<(), GraphStoreError> {
        let mut wtxn = env.write_txn()?;

        for event in events {
            let value =
                serde_json::to_vec(event).map_err(|e| GraphStoreError::Serialization(e.to_string()))?;

            events_db.put(&mut wtxn, &event.id, &value)?;

            let node_key = Self::build_node_key(&event.pubkey, event.kind, &event.tags);
            nodes_db.put(&mut wtxn, &node_key, &event.id)?;

            Self::index_edges(&mut wtxn, event, edges_out_db, edges_in_db)?;

            let timeline_key = Self::build_timeline_key(event.created_at, &event.id);
            timeline_db.put(&mut wtxn, &timeline_key, &[])?;

            let kind_key = Self::build_kind_key(event.kind, event.created_at, &event.id);
            by_kind_db.put(&mut wtxn, &kind_key, &[])?;
        }

        wtxn.commit()?;
        Ok(())
    }

    fn build_node_key(pubkey: &[u8; 32], kind: u32, tags: &[Vec<String>]) -> Vec<u8> {
        let d_tag = tags
            .iter()
            .find(|t| t.first().map(|s| s.as_str()) == Some("d"))
            .and_then(|t| t.get(1))
            .map(|s| s.as_bytes())
            .unwrap_or(b"");

        let mut key = Vec::with_capacity(32 + 4 + d_tag.len());
        key.extend_from_slice(pubkey);
        key.extend_from_slice(&kind.to_be_bytes());
        key.extend_from_slice(d_tag);
        key
    }

    fn build_timeline_key(created_at: u64, event_id: &[u8; 32]) -> Vec<u8> {
        let mut key = Vec::with_capacity(40);
        key.extend_from_slice(&created_at.to_be_bytes());
        key.extend_from_slice(event_id);
        key
    }

    fn build_kind_key(kind: u32, created_at: u64, event_id: &[u8; 32]) -> Vec<u8> {
        let mut key = Vec::with_capacity(44);
        key.extend_from_slice(&kind.to_be_bytes());
        key.extend_from_slice(&created_at.to_be_bytes());
        key.extend_from_slice(event_id);
        key
    }

    fn index_edges(
        wtxn: &mut heed::RwTxn,
        event: &SignedEvent,
        edges_out_db: Database<Bytes, Bytes>,
        edges_in_db: Database<Bytes, Bytes>,
    ) -> Result<(), GraphStoreError> {
        for tag in &event.tags {
            if tag.len() >= 2 && tag[0] == "p" {
                if let Ok(target_bytes) = hex::decode(&tag[1]) {
                    if target_bytes.len() == 32 {
                        let mut to = [0u8; 32];
                        to.copy_from_slice(&target_bytes);

                        let out_key = EdgeKey {
                            from: event.pubkey,
                            edge_kind: event.kind,
                            to,
                        };
                        edges_out_db.put(wtxn, &out_key.to_bytes(), &event.id)?;

                        let in_key = EdgeKey {
                            from: to,
                            edge_kind: event.kind,
                            to: event.pubkey,
                        };
                        edges_in_db.put(wtxn, &in_key.to_bytes(), &event.id)?;
                    }
                }
            }
        }
        Ok(())
    }

    pub fn put_event(&self, event: SignedEvent) -> Result<(), GraphStoreError> {
        self.write_tx
            .send(WriteOp::PutEvent(event))
            .map_err(|_| GraphStoreError::ChannelClosed)
    }

    pub fn get_event(&self, event_id: &[u8; 32]) -> Result<Option<SignedEvent>, GraphStoreError> {
        let rtxn = self.env.read_txn()?;
        match self.events_db.get(&rtxn, event_id)? {
            Some(bytes) => {
                let event: SignedEvent = serde_json::from_slice(bytes)
                    .map_err(|e| GraphStoreError::Serialization(e.to_string()))?;
                Ok(Some(event))
            }
            None => Ok(None),
        }
    }

    pub fn get_latest_node(
        &self,
        pubkey: &[u8; 32],
        kind: u32,
    ) -> Result<Option<SignedEvent>, GraphStoreError> {
        let node_key = Self::build_node_key(pubkey, kind, &[]);
        let rtxn = self.env.read_txn()?;
        match self.nodes_db.get(&rtxn, &node_key)? {
            Some(event_id_bytes) if event_id_bytes.len() == 32 => {
                let mut eid = [0u8; 32];
                eid.copy_from_slice(event_id_bytes);
                self.get_event(&eid)
            }
            _ => Ok(None),
        }
    }

    pub fn env(&self) -> &Env {
        &self.env
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn open_and_put_event() {
        let dir = tempfile::tempdir().unwrap();
        let store = GraphStore::open(dir.path(), 10 * 1024 * 1024).unwrap();

        let event = SignedEvent {
            id: [1u8; 32],
            pubkey: [2u8; 32],
            created_at: 1700000000,
            kind: 1,
            tags: vec![],
            content: b"test".to_vec(),
            sig: [0u8; 64],
        };
        store.put_event(event).unwrap();

        std::thread::sleep(std::time::Duration::from_millis(100));

        let retrieved = store.get_event(&[1u8; 32]).unwrap();
        assert!(retrieved.is_some());
        assert_eq!(retrieved.unwrap().content, b"test");
    }
}
