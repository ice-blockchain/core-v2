/// Event kind ranges determine which storage API handles the event.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum KindRange {
    Graph,
    Kv,
    Vector,
    Analytics,
    Sql,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ApiTarget {
    Graph,
    Kv,
    Vector,
    Analytics,
    Sql,
}

pub fn resolve_api_target(kind: u32) -> Option<ApiTarget> {
    match kind {
        0..=999 => Some(ApiTarget::Graph),
        1000..=1999 => Some(ApiTarget::Kv),
        2000..=2999 => Some(ApiTarget::Vector),
        3000..=3999 => Some(ApiTarget::Analytics),
        4000..=4999 => Some(ApiTarget::Sql),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn kind_routing() {
        assert_eq!(resolve_api_target(0), Some(ApiTarget::Graph));
        assert_eq!(resolve_api_target(999), Some(ApiTarget::Graph));
        assert_eq!(resolve_api_target(1000), Some(ApiTarget::Kv));
        assert_eq!(resolve_api_target(2000), Some(ApiTarget::Vector));
        assert_eq!(resolve_api_target(3000), Some(ApiTarget::Analytics));
        assert_eq!(resolve_api_target(4000), Some(ApiTarget::Sql));
        assert_eq!(resolve_api_target(5000), None);
    }
}
