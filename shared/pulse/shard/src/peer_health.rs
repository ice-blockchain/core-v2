use std::collections::HashMap;
use std::time::Instant;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PeerStatus {
    Healthy,
    Suspect,
    Down,
}

#[derive(Debug)]
struct PeerState {
    status: PeerStatus,
    last_seen: Instant,
    consecutive_failures: u32,
}

/// Tracks peer health via heartbeat monitoring.
/// Peers transition: Healthy -> Suspect -> Down
/// based on missed heartbeats.
pub struct PeerHealth {
    peers: HashMap<String, PeerState>,
    suspect_threshold_ms: u64,
    down_threshold_ms: u64,
}

impl PeerHealth {
    pub fn new(suspect_threshold_ms: u64, down_threshold_ms: u64) -> Self {
        Self {
            peers: HashMap::new(),
            suspect_threshold_ms,
            down_threshold_ms,
        }
    }

    pub fn record_heartbeat(&mut self, peer_id: &str) {
        let state = self
            .peers
            .entry(peer_id.to_string())
            .or_insert(PeerState {
                status: PeerStatus::Healthy,
                last_seen: Instant::now(),
                consecutive_failures: 0,
            });
        state.last_seen = Instant::now();
        state.status = PeerStatus::Healthy;
        state.consecutive_failures = 0;
    }

    pub fn record_failure(&mut self, peer_id: &str) {
        if let Some(state) = self.peers.get_mut(peer_id) {
            state.consecutive_failures += 1;
            if state.consecutive_failures >= 3 {
                state.status = PeerStatus::Down;
            } else {
                state.status = PeerStatus::Suspect;
            }
        }
    }

    pub fn check_all(&mut self) {
        let now = Instant::now();
        for state in self.peers.values_mut() {
            let elapsed = now.duration_since(state.last_seen).as_millis() as u64;
            if elapsed > self.down_threshold_ms {
                state.status = PeerStatus::Down;
            } else if elapsed > self.suspect_threshold_ms {
                state.status = PeerStatus::Suspect;
            }
        }
    }

    pub fn status(&self, peer_id: &str) -> Option<&PeerStatus> {
        self.peers.get(peer_id).map(|s| &s.status)
    }

    pub fn healthy_peers(&self) -> Vec<String> {
        self.peers
            .iter()
            .filter(|(_, s)| s.status == PeerStatus::Healthy)
            .map(|(id, _)| id.clone())
            .collect()
    }

    pub fn down_peers(&self) -> Vec<String> {
        self.peers
            .iter()
            .filter(|(_, s)| s.status == PeerStatus::Down)
            .map(|(id, _)| id.clone())
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn heartbeat_keeps_peer_healthy() {
        let mut health = PeerHealth::new(5000, 15000);
        health.record_heartbeat("node-1");
        assert_eq!(health.status("node-1"), Some(&PeerStatus::Healthy));
    }

    #[test]
    fn failures_transition_to_down() {
        let mut health = PeerHealth::new(5000, 15000);
        health.record_heartbeat("node-1");
        health.record_failure("node-1");
        assert_eq!(health.status("node-1"), Some(&PeerStatus::Suspect));
        health.record_failure("node-1");
        health.record_failure("node-1");
        assert_eq!(health.status("node-1"), Some(&PeerStatus::Down));
    }
}
