/// A batch of query results streamed back to the client.
/// In production, this would contain Arrow RecordBatches
/// serialized as Arrow IPC for zero-copy transport.
#[derive(Debug, Clone)]
pub struct ResultBatch {
    pub columns: Vec<String>,
    pub row_count: usize,
    pub data: Vec<u8>,
}

impl ResultBatch {
    pub fn empty(columns: Vec<String>) -> Self {
        Self {
            columns,
            row_count: 0,
            data: Vec::new(),
        }
    }

    pub fn is_empty(&self) -> bool {
        self.row_count == 0
    }
}
