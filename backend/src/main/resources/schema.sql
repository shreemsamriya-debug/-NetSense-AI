CREATE TABLE IF NOT EXISTS diagnostic_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    operating_system TEXT,
    gateway TEXT,
    gateway_status TEXT,
    gateway_latency_ms REAL,
    latency_ms REAL,
    jitter_ms REAL,
    packet_loss_percent REAL,
    dns_status TEXT,
    dns_resolution_time_ms REAL,
    download_mbps REAL,
    upload_mbps REAL,
    diagnosis TEXT,
    possible_causes TEXT,
    recommendations TEXT,
    full_report TEXT
);

CREATE INDEX IF NOT EXISTS idx_diagnostic_timestamp
ON diagnostic_history(timestamp);