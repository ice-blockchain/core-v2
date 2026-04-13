#[derive(Debug, Clone)]
pub struct AnalyticsQuery {
    pub filter_kind: Option<u32>,
    pub since: Option<u64>,
    pub until: Option<u64>,
    pub kind: QueryKind,
}

#[derive(Debug, Clone)]
pub enum QueryKind {
    Count { group_by: Option<String> },
    TimeSeries { bucket_seconds: u64 },
    Rank { limit: usize },
}

#[derive(Debug, Clone)]
pub enum AnalyticsResult {
    Count(Vec<(String, u64)>),
    TimeSeries(Vec<(u64, u64)>),
    Rank(Vec<(String, u64)>),
}
