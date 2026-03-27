use pulse_types::{resolve_api_target, ApiTarget, PulseError, SignedEvent};

/// Route a verified event to the appropriate storage API
/// based on its kind field and the tenant's schema engine mappings.
pub fn route_event(event: &SignedEvent) -> Result<ApiTarget, PulseError> {
    resolve_api_target(event.kind).ok_or(PulseError::UnknownKind(event.kind))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn routes_graph_event() {
        let event = SignedEvent {
            id: [0u8; 32],
            pubkey: [0u8; 32],
            created_at: 0,
            kind: 1,
            tags: vec![],
            content: vec![],
            sig: [0u8; 64],
        };
        assert_eq!(route_event(&event).unwrap(), ApiTarget::Graph);
    }

    #[test]
    fn rejects_unknown_kind() {
        let event = SignedEvent {
            id: [0u8; 32],
            pubkey: [0u8; 32],
            created_at: 0,
            kind: 99999,
            tags: vec![],
            content: vec![],
            sig: [0u8; 64],
        };
        assert!(route_event(&event).is_err());
    }
}
