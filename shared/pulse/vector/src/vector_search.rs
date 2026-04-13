#[derive(Debug, Clone)]
pub struct SearchRequest {
    pub vector: Vec<f32>,
    pub top_k: usize,
}

#[derive(Debug, Clone)]
pub struct SearchResult {
    pub id: String,
    pub distance: f32,
    pub metadata: serde_json::Value,
}
