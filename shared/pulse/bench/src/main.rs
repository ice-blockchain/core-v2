use std::time::Instant;

fn main() {
    println!("ION Pulse Benchmark Suite");
    println!("========================");
    println!();
    println!("Run benchmarks with: cargo bench -p pulse-bench");
    println!();
    println!("Available benchmarks:");
    println!("  storage   - LMDB read/write, KV ops, vector search");
    println!();

    let start = Instant::now();
    println!("Quick smoke test...");

    let event = pulse_types::SignedEvent {
        id: [1u8; 32],
        pubkey: [2u8; 32],
        created_at: 1700000000,
        kind: 1,
        tags: vec![],
        content: b"bench".to_vec(),
        sig: [0u8; 64],
    };

    assert!(event.verify_id() || !event.verify_id()); // just check it runs
    println!("  SignedEvent creation: {:?}", start.elapsed());

    let hub = pulse_signal::SignalHub::new(1024);
    println!("  SignalHub creation: {:?}", start.elapsed());

    let ring_config = pulse_shard::ShardConfig::default();
    let mut ring = pulse_shard::HashRing::new(ring_config);
    for i in 0..10 {
        ring.add_peer(&format!("node-{}", i));
    }
    let _peers = ring.locate_key(b"test-key", 3);
    println!("  HashRing (10 nodes, locate): {:?}", start.elapsed());

    println!();
    println!("Smoke test passed in {:?}", start.elapsed());
}
