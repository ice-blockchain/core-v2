mod scatter_gather;
mod merge;

pub use scatter_gather::{FederatedQuery, FederatedCoordinator, FederationError};
pub use merge::{MergeStrategy, merge_counts, merge_timeseries, merge_ranked, merge_vectors};
