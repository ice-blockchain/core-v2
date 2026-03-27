use criterion::{black_box, criterion_group, criterion_main, Criterion, BenchmarkId};
use pulse_types::SignedEvent;

fn bench_event_id_computation(c: &mut Criterion) {
    let pubkey = [42u8; 32];
    let tags: Vec<Vec<String>> = vec![
        vec!["p".to_string(), "deadbeef".repeat(4)],
    ];
    let content = b"hello world, this is a benchmark event";

    c.bench_function("SignedEvent::compute_id", |b| {
        b.iter(|| {
            SignedEvent::compute_id(
                black_box(&pubkey),
                black_box(1700000000),
                black_box(1),
                black_box(&tags),
                black_box(content),
            )
        })
    });
}

fn bench_hash_ring_locate(c: &mut Criterion) {
    let mut group = c.benchmark_group("HashRing::locate_key");

    for node_count in [3, 10, 50, 100] {
        let config = pulse_shard::ShardConfig::default();
        let mut ring = pulse_shard::HashRing::new(config);
        for i in 0..node_count {
            ring.add_peer(&format!("node-{}", i));
        }

        group.bench_with_input(
            BenchmarkId::from_parameter(format!("{}_nodes", node_count)),
            &ring,
            |b, ring| {
                b.iter(|| {
                    ring.locate_key(black_box(b"user:alice:pubkey"), black_box(3))
                })
            },
        );
    }

    group.finish();
}

fn bench_signal_hub(c: &mut Criterion) {
    let rt = tokio::runtime::Runtime::new().unwrap();

    c.bench_function("SignalHub::emit (10 subscribers)", |b| {
        let hub = pulse_signal::SignalHub::new(1024);

        rt.block_on(async {
            for i in 0..10 {
                hub.subscribe(&format!("events/{}", i)).await;
            }
        });

        b.iter(|| {
            rt.block_on(async {
                hub.emit(
                    black_box("events/5"),
                    black_box(b"payload".to_vec()),
                ).await
            })
        })
    });
}

fn bench_kv_operations(c: &mut Criterion) {
    let dir = tempfile::tempdir().unwrap();
    let store = pulse_kv::KvStore::open(dir.path(), 100 * 1024 * 1024).unwrap();
    let pubkey = [1u8; 32];
    let sig = [0u8; 64];

    store.put(&pubkey, "bench_key", b"bench_value", &sig, 1000).unwrap();

    c.bench_function("KvStore::get", |b| {
        b.iter(|| {
            store.get(black_box(&pubkey), black_box("bench_key")).unwrap()
        })
    });

    c.bench_function("KvStore::put", |b| {
        let mut counter = 0u64;
        b.iter(|| {
            counter += 1;
            store.put(
                black_box(&pubkey),
                black_box("bench_put"),
                black_box(b"value"),
                black_box(&sig),
                black_box(counter),
            ).unwrap()
        })
    });
}

fn bench_graph_read(c: &mut Criterion) {
    let dir = tempfile::tempdir().unwrap();
    let store = pulse_graph::GraphStore::open(dir.path(), 100 * 1024 * 1024).unwrap();

    let event = SignedEvent {
        id: [1u8; 32],
        pubkey: [2u8; 32],
        created_at: 1700000000,
        kind: 1,
        tags: vec![],
        content: b"benchmark".to_vec(),
        sig: [0u8; 64],
    };
    store.put_event(event).unwrap();
    std::thread::sleep(std::time::Duration::from_millis(200));

    c.bench_function("GraphStore::get_event", |b| {
        b.iter(|| {
            store.get_event(black_box(&[1u8; 32])).unwrap()
        })
    });
}

criterion_group!(
    benches,
    bench_event_id_computation,
    bench_hash_ring_locate,
    bench_signal_hub,
    bench_kv_operations,
    bench_graph_read,
);
criterion_main!(benches);
