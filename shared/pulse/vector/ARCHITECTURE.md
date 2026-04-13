# pulse-vector

ANN (approximate nearest neighbor) vector search on Lance. Stores vectors with metadata in Apache Arrow columnar format.

## Crate

`pulse-vector` -- `shared/pulse/vector/`

## Dependencies

- `lance` 0.20 + `arrow` 53 (vector DB engine)
- `pulse-types` (SignedEvent)

## API

```rust
pub struct VectorStore { .. }
impl VectorStore {
    pub fn open(path: &Path, dimensions: usize) -> Result<Self, VectorStoreError>;
    pub async fn index(&self, record: VectorRecord) -> Result<(), VectorStoreError>;
    pub async fn batch_index(&self, records: Vec<VectorRecord>) -> Result<usize, VectorStoreError>;
    pub async fn search(&self, request: &SearchRequest) -> Result<Vec<SearchResult>, VectorStoreError>;
    pub async fn delete(&self, id: &str) -> Result<bool, VectorStoreError>;
    pub async fn count(&self) -> usize;
}

pub struct SearchRequest { pub vector: Vec<f32>, pub top_k: usize }
pub struct SearchResult { pub id: String, pub distance: f32, pub metadata: Value }
```

## Performance Targets

| Operation | Target |
|-----------|--------|
| Single vector index | < 1ms |
| Batch index (1000) | < 50ms |
| ANN search (top-10 from 1M vectors) | < 5ms |

## Files

| File | Purpose |
|------|---------|
| `src/vector_store.rs` | VectorStore, index, search, cosine distance |
| `src/vector_search.rs` | SearchRequest, SearchResult types |
