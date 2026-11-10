import { useEffect, useState } from "react";
import "./App.css";

const NAVIGATION = [
  { id: "overview", label: "Overview", icon: "▦" },
  { id: "diagnostics", label: "Live Diagnostics", icon: "⌁" },
  { id: "connection", label: "Connection Analysis", icon: "◎" },
  { id: "diagnosis", label: "Explainable Diagnosis", icon: "✧" },
  { id: "recommendations", label: "Recommendations", icon: "↗" },
  { id: "reports", label: "Reports & History", icon: "▤" },
];

const METRICS = [
  { id: "latency", label: "Latency", unit: "ms", description: "Round-trip response time", icon: "◷" },
  { id: "jitter", label: "Jitter", unit: "ms", description: "Variation in latency", icon: "⌁" },
  { id: "download", label: "Download speed", unit: "Mbps", description: "Inbound throughput", icon: "↓" },
  { id: "packetLoss", label: "Packet loss", unit: "%", description: "Unsuccessful packets", icon: "◉" },
];

const WORKFLOW = [
  { number: "01", title: "Measure", description: "Collect network performance metrics." },
  { number: "02", title: "Analyse", description: "Validate and examine measurements." },
  { number: "03", title: "Diagnose", description: "Identify potential fault locations." },
  { number: "04", title: "Recommend", description: "Generate evidence-based actions." },
];

function formatMetric(value, unit) {
  if (value === null || value === undefined || value === "") return `-- ${unit}`;
  const number = Number(value);
  return Number.isFinite(number) ? `${number.toFixed(2)} ${unit}` : `-- ${unit}`;
}

function parseJson(value, fallback = []) {
  if (typeof value !== "string") return value ?? fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function Brand() {
  return (
    <div className="brand">
      <div className="brand-mark" aria-hidden="true">N</div>
      <div>
        <h2>NetSense<span> AI</span></h2>
        <p>CONNECTIVITY INTELLIGENCE</p>
      </div>
    </div>
  );
}

function Sidebar({ activePage, onNavigate, isRunning, agentConnected }) {
  return (
    <aside className="sidebar">
      <Brand />
      <div className="workspace-label">WORKSPACE</div>

      <nav className="nav-list" aria-label="Main navigation">
        {NAVIGATION.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`nav-item ${activePage === item.id ? "active" : ""}`}
            aria-current={activePage === item.id ? "page" : undefined}
            onClick={() => onNavigate(item.id)}
          >
            <span className="nav-icon" aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
            {item.id === "diagnostics" && <span className="nav-dot" />}
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="connection-mini">
          <span className="status-dot" />
          <div>
            <strong>Local workspace</strong>
            <small>
              {isRunning
                ? "Testing connection..."
                : agentConnected
                  ? "Local agent connected"
                  : "Agent not connected"}
            </small>
          </div>
        </div>
        <div className="sidebar-footer">NetSense AI · Prototype v0.3</div>
      </div>
    </aside>
  );
}

function Topbar({ activePage }) {
  const currentPage =
    NAVIGATION.find((item) => item.id === activePage)?.label || "Overview";

  return (
    <header className="topbar">
      <div className="breadcrumb">Workspace <span>/</span> {currentPage}</div>
      <div className="topbar-right">
        <span className="environment-tag">DEVELOPMENT</span>
        <div className="avatar" aria-label="NetSense workspace">NS</div>
      </div>
    </header>
  );
}

function WelcomeSection({ title, description, onRunDiagnosis, isRunning }) {
  return (
    <section className="welcome-section">
      <div>
        <div className="eyebrow">NETWORK INTELLIGENCE PLATFORM</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <button
        type="button"
        className="primary-button"
        onClick={onRunDiagnosis}
        disabled={isRunning}
      >
        <span aria-hidden="true">▶</span>
        {isRunning ? "Running diagnosis..." : "Run network diagnosis"}
      </button>
    </section>
  );
}

function StatusBanner({ diagnostics, isRunning }) {
  let heading = "Ready for network assessment";
  let message = "Run a network assessment to collect actual measurements.";

  if (isRunning) {
    heading = "Network assessment in progress";
    message = "Collecting latency, jitter, packet loss and internet speed measurements.";
  } else if (diagnostics) {
    heading = "Network assessment completed";
    message = `Last measurement: ${new Date(diagnostics.timestamp).toLocaleString()}`;
  }

  return (
    <section className="status-banner">
      <div className="status-symbol" aria-hidden="true">⌁</div>
      <div className="status-copy">
        <span className="banner-label">SYSTEM STATUS</span>
        <h3>{heading}</h3>
        <p>{message}</p>
      </div>
      <span className="prototype-pill">
        {isRunning ? "TESTING" : diagnostics ? "LIVE DATA" : "READY"}
      </span>
    </section>
  );
}

function getMetricValue(id, diagnostics) {
  if (!diagnostics) return "--";

  const network = diagnostics.network_quality || {};
  const speed = diagnostics.internet_speed || {};

  const values = {
    latency: network.average_latency_ms,
    jitter: network.jitter_ms,
    download: speed.download_mbps,
    packetLoss: network.packet_loss_percent,
  };

  const value = values[id];
  return value === undefined || value === null ? "--" : Number(value).toFixed(2);
}

function MetricCards({ diagnostics, isRunning }) {
  return (
    <>
      <section className="section-heading">
        <div>
          <h2>Performance indicators</h2>
          <p>
            {diagnostics
              ? "Actual measurements collected from your network."
              : "Live values will appear after a successful network assessment."}
          </p>
        </div>
        <span className="demo-tag">
          {isRunning ? "TESTING" : diagnostics ? "LIVE MEASUREMENTS" : "AWAITING DATA"}
        </span>
      </section>

      <section className="metric-grid" aria-label="Network metrics">
        {METRICS.map((metric) => (
          <article className="metric-card" key={metric.id}>
            <div className="metric-top">
              <span>{metric.label}</span>
              <span className="metric-icon" aria-hidden="true">{metric.icon}</span>
            </div>
            <div className="metric-value">
              {getMetricValue(metric.id, diagnostics)}
              <small>{metric.unit}</small>
            </div>
            <div className="metric-note">{metric.description}</div>
          </article>
        ))}
      </section>
    </>
  );
}

function PerformancePanel({ diagnostics }) {
  const speed = diagnostics?.internet_speed || {};

  return (
    <article className="panel performance-panel">
      <div className="panel-heading">
        <div>
          <h2>Connection performance</h2>
          <p>Latest measured internet throughput.</p>
        </div>
        <span className="chart-period">{diagnostics ? "LATEST TEST" : "NO DATA YET"}</span>
      </div>

      <div className="empty-insight">
        <div className="empty-icon" aria-hidden="true">↗</div>
        <h3>{diagnostics ? "Internet speed measurement" : "Performance history unavailable"}</h3>
        {diagnostics ? (
          <>
            <p>Download: {speed.download_mbps ?? "--"} Mbps</p>
            <p>Upload: {speed.upload_mbps ?? "--"} Mbps</p>
            <span className="waiting-label">MEASURED DATA</span>
          </>
        ) : (
          <>
            <p>Run a network assessment to begin recording connection performance.</p>
            <span className="waiting-label">AWAITING MEASUREMENTS</span>
          </>
        )}
      </div>
    </article>
  );
}

function DiagnosisPanel({ diagnostics }) {
  return (
    <article className="panel diagnosis-panel">
      <div className="panel-heading">
        <div>
          <h2>Diagnostic insights</h2>
          <p>Evidence-based interpretation</p>
        </div>
        <span className="insight-icon" aria-hidden="true">✧</span>
      </div>

      <div className="empty-insight">
        <div className="empty-icon" aria-hidden="true">⌕</div>
        <h3>{diagnostics ? "Assessment observations" : "No diagnosis available"}</h3>
        {diagnostics ? (
          <ul className="diagnosis-list">
            {(diagnostics.diagnosis || []).map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        ) : (
          <p>Network measurements are required before the system can identify possible connectivity problems.</p>
        )}
        <span className="waiting-label">
          {diagnostics ? "BASED ON MEASUREMENTS" : "AWAITING EVIDENCE"}
        </span>
      </div>
    </article>
  );
}

function WorkflowPanel() {
  return (
    <section className="panel quick-panel">
      <div className="panel-heading">
        <div>
          <h2>Diagnostic workflow</h2>
          <p>The four stages used to assess your internet connection.</p>
        </div>
      </div>
      <div className="workflow">
        {WORKFLOW.map((step) => (
          <div className="workflow-step" key={step.number}>
            <span className="workflow-number">{step.number}</span>
            <div>
              <strong>{step.title}</strong>
              <small>{step.description}</small>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function OverviewPage({ diagnostics, isRunning, onRunDiagnosis }) {
  return (
    <>
      <WelcomeSection
        title="Network overview"
        description="Understand your connection. Identify potential issues. Make informed decisions."
        onRunDiagnosis={onRunDiagnosis}
        isRunning={isRunning}
      />
      <StatusBanner diagnostics={diagnostics} isRunning={isRunning} />
      <MetricCards diagnostics={diagnostics} isRunning={isRunning} />
      <section className="content-grid">
        <PerformancePanel diagnostics={diagnostics} />
        <DiagnosisPanel diagnostics={diagnostics} />
      </section>
      <WorkflowPanel />
    </>
  );
}

function DataList({ title, items, emptyText }) {
  return (
    <article className="panel" style={{ padding: 22, minWidth: 0 }}>
      <div className="panel-heading">
        <div><h2>{title}</h2></div>
      </div>
      {items?.length > 0 ? (
        <ul className="diagnosis-list">
          {items.map((item, index) => <li key={`${title}-${index}`}>{item}</li>)}
        </ul>
      ) : (
        <p>{emptyText}</p>
      )}
    </article>
  );
}

function DetailCard({ label, value, note }) {
  return (
    <article className="metric-card">
      <div className="metric-top"><span>{label}</span></div>
      <div className="metric-value" style={{ fontSize: 25 }}>{value}</div>
      {note && <div className="metric-note">{note}</div>}
    </article>
  );
}
function DiagnosticsPage({ diagnostics, onRunDiagnosis, isRunning }) {
  const network = diagnostics?.network_quality || {};
  const local = diagnostics?.local_network || {};
  const dns = diagnostics?.dns_test || {};
  const speed = diagnostics?.internet_speed || {};

  return (
    <>
      <WelcomeSection
        title="Live Diagnostics"
        description="Run real measurements from this computer and review the latest results."
        onRunDiagnosis={onRunDiagnosis}
        isRunning={isRunning}
      />

      <section className="metric-grid">
        <DetailCard label="External latency" value={formatMetric(network.average_latency_ms, "ms")} note="Round-trip time to 1.1.1.1" />
        <DetailCard label="Jitter" value={formatMetric(network.jitter_ms, "ms")} note="Variation between ping samples" />
        <DetailCard label="Packet loss" value={formatMetric(network.packet_loss_percent, "%")} note={`${network.successful_pings ?? 0}/${network.total_pings ?? 0} successful pings`} />
        <DetailCard label="Download" value={formatMetric(speed.download_mbps, "Mbps")} note="Measured download throughput" />
        <DetailCard label="Upload" value={formatMetric(speed.upload_mbps, "Mbps")} note="Measured upload throughput" />
        <DetailCard label="DNS response" value={formatMetric(dns.resolution_time_ms, "ms")} note={`Domain: ${dns.domain || "example.com"}`} />
      </section>

      <section className="content-grid" style={{ marginTop: 20 }}>
        <DataList
          title="Local gateway test"
          items={[
            `Gateway: ${local.gateway || "Not detected"}`,
            `Status: ${local.status || "Not tested"}`,
            `Average response: ${formatMetric(local.average_latency_ms, "ms")}`,
            `Packet loss: ${formatMetric(local.packet_loss_percent, "%")}`,
          ]}
          emptyText="Run a diagnosis to collect gateway measurements."
        />

        <DataList
          title="DNS test"
          items={[
            `Status: ${dns.status || "Not tested"}`,
            `Resolution time: ${formatMetric(dns.resolution_time_ms, "ms")}`,
            ...(dns.resolved_addresses || []).map((address) => `Resolved address: ${address}`),
            ...(dns.error ? [`Error: ${dns.error}`] : []),
          ]}
          emptyText="DNS results will appear after a diagnosis."
        />
      </section>

      {speed.status && speed.status !== "success" && (
        <p className="notice" role="status">
          Speed test status: {speed.status}. Other network measurements can still be valid.
          {speed.speed_test_error ? ` Details: ${speed.speed_test_error}` : ""}
        </p>
      )}
    </>
  );
}

function ConnectionPage({ diagnostics, onRunDiagnosis, isRunning }) {
  const local = diagnostics?.local_network || {};
  const network = diagnostics?.network_quality || {};
  const dns = diagnostics?.dns_test || {};

  return (
    <>
      <WelcomeSection
        title="Connection Analysis"
        description="Compare local gateway, DNS and external connectivity measurements."
        onRunDiagnosis={onRunDiagnosis}
        isRunning={isRunning}
      />

      <section className="content-grid">
        <DataList title="Device to router" items={[
          `Default gateway: ${local.gateway || "Not detected"}`,
          `Gateway response: ${local.status || "No result"}`,
          `Gateway latency: ${formatMetric(local.average_latency_ms, "ms")}`,
          `Gateway packet loss: ${formatMetric(local.packet_loss_percent, "%")}`,
        ]} emptyText="Run a diagnosis to inspect the local connection." />

        <DataList title="Device to external network" items={[
          `Test destination: ${network.host || "1.1.1.1"}`,
          `External test: ${network.status || "No result"}`,
          `Latency: ${formatMetric(network.average_latency_ms, "ms")}`,
          `Jitter: ${formatMetric(network.jitter_ms, "ms")}`,
          `Packet loss: ${formatMetric(network.packet_loss_percent, "%")}`,
        ]} emptyText="Run a diagnosis to inspect external connectivity." />
      </section>

      <section style={{ marginTop: 20 }}>
        <DataList title="Name resolution" items={[
          `DNS domain: ${dns.domain || "example.com"}`,
          `DNS status: ${dns.status || "No result"}`,
          `Resolution time: ${formatMetric(dns.resolution_time_ms, "ms")}`,
        ]} emptyText="DNS results will appear after a diagnosis." />
      </section>

      <p className="metric-note" style={{ marginTop: 14 }}>
        Note: A failed ping alone does not prove a router or ISP fault; some networks filter ICMP traffic.
      </p>
    </>
  );
}

function FingerprintPanel({ diagnostics }) {
  const fingerprint = diagnostics?.network_fingerprint;
  const confidence = diagnostics?.confidence_assessment;

  if (!fingerprint) {
    return (
      <section className="panel" style={{ padding: 22, marginTop: 20 }}>
        <div className="panel-heading">
          <div>
            <h2>Network Behaviour Fingerprinting</h2>
            <p>Compare current performance with the network's learned historical behaviour.</p>
          </div>
          <span className="chart-period">AWAITING DATA</span>
        </div>
        <p className="metric-note">
          Fingerprinting data is not available in this report yet. Run a network diagnosis to collect measurements and update the learned baseline.
        </p>
      </section>
    );
  }

  const metrics = [
    { key: "latency_ms", label: "Latency", unit: "ms" },
    { key: "jitter_ms", label: "Jitter", unit: "ms" },
    { key: "packet_loss_percent", label: "Packet loss", unit: "%" },
    { key: "download_mbps", label: "Download speed", unit: "Mbps" },
    { key: "upload_mbps", label: "Upload speed", unit: "Mbps" },
  ];

  const anomalies = Array.isArray(fingerprint.anomalies) ? fingerprint.anomalies : [];
  const sampleCount = Number(fingerprint.baseline_samples) || 0;
  const requiredSamples = Number(fingerprint.minimum_samples_required) || 5;
  const baselineReady = fingerprint.baseline_ready === true;
  const progress = requiredSamples > 0
    ? Math.min(100, Math.max(0, (sampleCount / requiredSamples) * 100))
    : 0;

  function anomalyUnit(metric) {
    if (metric?.includes("mbps")) return "Mbps";
    if (metric?.includes("percent")) return "%";
    return "ms";
  }

  const coverage = Number(confidence?.coverage_percent);
  const coverageWidth = Number.isFinite(coverage)
    ? Math.min(100, Math.max(0, coverage))
    : 0;

  return (
    <section className="panel" style={{ padding: 22, marginTop: 20 }}>
      <div className="panel-heading">
        <div>
          <h2>Network Behaviour Fingerprinting</h2>
          <p>Current measurements compared with the learned behaviour of this network.</p>
        </div>
        <span className="chart-period">
          {baselineReady ? "BASELINE READY" : "LEARNING BASELINE"}
        </span>
      </div>

      <div className="metric-grid" style={{ marginTop: 18 }}>
        <DetailCard
          label="Historical samples"
          value={`${sampleCount} / ${requiredSamples}`}
          note={baselineReady ? "Minimum baseline requirement reached" : "More samples are needed"}
        />
        <DetailCard
          label="Detected deviations"
          value={fingerprint.anomaly_count ?? anomalies.length}
          note="Compared with the learned baseline"
        />
        <DetailCard
          label="Fingerprint status"
          value={fingerprint.status === "anomaly_detected"
            ? "Deviation detected"
            : fingerprint.status === "within_baseline"
              ? "Within baseline"
              : fingerprint.status || "Unavailable"}
          note="Status reported by the diagnostic engine"
        />
        <DetailCard
          label="Evidence coverage"
          value={confidence ? `${confidence.score ?? "--"}%` : "--"}
          note={confidence
            ? `${confidence.completed_checks ?? 0} of ${confidence.total_checks ?? 0} checks completed`
            : "No confidence assessment in this report"}
        />
      </div>

      <div style={{ marginTop: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <h3 style={{ margin: 0 }}>Baseline learning progress</h3>
          <strong>{sampleCount} of {requiredSamples} samples</strong>
        </div>

        <div
          role="progressbar"
          aria-label="Baseline learning progress"
          aria-valuemin={0}
          aria-valuemax={requiredSamples}
          aria-valuenow={Math.min(sampleCount, requiredSamples)}
          style={{ height: 9, background: "var(--border-color, #e2e8f0)", borderRadius: 20, overflow: "hidden", marginTop: 10 }}
        >
          <div style={{ width: `${progress}%`, height: "100%", background: "#26966f", borderRadius: 20, transition: "width 200ms ease" }} />
        </div>

        <p className="metric-note" style={{ marginTop: 8 }}>
          {baselineReady
            ? `The baseline is ready. ${fingerprint.historical_samples_used ?? sampleCount} historical samples were used for this comparison.`
            : `The baseline is still learning. ${Math.max(0, requiredSamples - sampleCount)} more sample(s) are needed to reach the minimum.`}
        </p>
      </div>

      <div style={{ marginTop: 24 }}>
        <h3>Current performance vs learned baseline</h3>

        <div style={{ overflowX: "auto", marginTop: 10 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr>
                <th style={{ padding: "11px 9px", borderBottom: "1px solid var(--border-color, #e2e8f0)" }}>Metric</th>
                <th style={{ padding: "11px 9px", borderBottom: "1px solid var(--border-color, #e2e8f0)" }}>Current</th>
                <th style={{ padding: "11px 9px", borderBottom: "1px solid var(--border-color, #e2e8f0)" }}>Baseline median</th>
                <th style={{ padding: "11px 9px", borderBottom: "1px solid var(--border-color, #e2e8f0)" }}>MAD</th>
              </tr>
            </thead>

            <tbody>
              {metrics.map((metric) => {
                const current = fingerprint.metrics?.[metric.key];
                const baseline = fingerprint.baselines?.[metric.key];

                return (
                  <tr key={metric.key}>
                    <td style={{ padding: "11px 9px", borderBottom: "1px solid var(--border-color, #e2e8f0)" }}>{metric.label}</td>
                    <td style={{ padding: "11px 9px", borderBottom: "1px solid var(--border-color, #e2e8f0)" }}>{formatMetric(current, metric.unit)}</td>
                    <td style={{ padding: "11px 9px", borderBottom: "1px solid var(--border-color, #e2e8f0)" }}>{formatMetric(baseline?.median, metric.unit)}</td>
                    <td style={{ padding: "11px 9px", borderBottom: "1px solid var(--border-color, #e2e8f0)" }}>{formatMetric(baseline?.mad, metric.unit)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <h3>Anomaly detection</h3>

        {anomalies.length > 0 ? (
          <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
            {anomalies.map((anomaly, index) => (
              <article
                key={`${anomaly.metric || "anomaly"}-${index}`}
                style={{ padding: 15, border: "1px solid var(--border-color, #e2e8f0)", borderRadius: 10 }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <strong>{anomaly.label || anomaly.metric || `Anomaly ${index + 1}`}</strong>
                  <span className="environment-tag">{String(anomaly.severity || "unclassified").toUpperCase()} SEVERITY</span>
                </div>

                <p style={{ margin: "10px 0 4px" }}>
                  Current: {formatMetric(anomaly.observed_value, anomalyUnit(anomaly.metric))}
                  {" · "}
                  Baseline: {formatMetric(anomaly.baseline_value, anomalyUnit(anomaly.metric))}
                </p>
                <p className="metric-note">Deviation: {anomaly.deviation_percent ?? "--"}%</p>
                <p className="metric-note">{anomaly.explanation || "This measurement differs from the learned baseline."}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="metric-note" style={{ marginTop: 12 }}>
            No deviations from the learned baseline were detected in this report.
          </p>
        )}
      </div>

      {confidence && (
        <div style={{ marginTop: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <h3 style={{ margin: 0 }}>Diagnostic evidence coverage</h3>
            <strong>{confidence.level?.toUpperCase() || "UNAVAILABLE"} · {confidence.score ?? "--"}%</strong>
          </div>

          <div
            role="progressbar"
            aria-label="Diagnostic evidence coverage"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={coverageWidth}
            style={{ height: 9, background: "var(--border-color, #e2e8f0)", borderRadius: 20, overflow: "hidden", marginTop: 10 }}
          >
            <div style={{ width: `${coverageWidth}%`, height: "100%", background: "#5684d8", borderRadius: 20 }} />
          </div>

          <p className="metric-note" style={{ marginTop: 8 }}>
            {confidence.completed_checks ?? 0} of {confidence.total_checks ?? 0} diagnostic checks completed.
          </p>
          <p className="metric-note">{confidence.explanation}</p>
        </div>
      )}

      <p className="metric-note" style={{ marginTop: 20 }}>
        Network key: {fingerprint.network_key || "Unavailable"}
      </p>
      <p className="metric-note">
        Evidence coverage measures the completeness of available checks. It is not a probability that a particular root cause is correct.
      </p>
    </section>
  );
}

function DiagnosisPage({ diagnostics, onRunDiagnosis, isRunning }) {
  return (
    <>
      <WelcomeSection
        title="Explainable Diagnosis"
        description="Review what the tests observed, what they may indicate, and the limits of the evidence."
        onRunDiagnosis={onRunDiagnosis}
        isRunning={isRunning}
      />

      <section className="content-grid">
        <DataList
          title="Observed evidence"
          items={diagnostics?.diagnosis || []}
          emptyText="No observations yet. Run a network diagnosis first."
        />
        <DataList
          title="Possible causes"
          items={diagnostics?.possible_causes || []}
          emptyText="Possible causes will appear after measurements are collected."
        />
      </section>

      <FingerprintPanel diagnostics={diagnostics} />

      <p className="metric-note" style={{ marginTop: 16 }}>
        These are evidence-based indications, not guaranteed root-cause conclusions. The current tests do not directly measure Wi-Fi signal strength or inspect every hop on the network path.
      </p>
    </>
  );
}

function RecommendationsPage({ diagnostics, onRunDiagnosis, isRunning }) {
  return (
    <>
      <WelcomeSection
        title="Recommendations"
        description="Troubleshooting actions generated from the latest diagnostic evidence."
        onRunDiagnosis={onRunDiagnosis}
        isRunning={isRunning}
      />

      <DataList
        title="Recommended actions"
        items={diagnostics?.recommendations || []}
        emptyText="Run a diagnosis to receive recommendations based on your network measurements."
      />
    </>
  );
}
function AgentConnectionPanel({
  token,
  setToken,
  connected,
  onConnect,
  connecting,
}) {
  return (
    <section className="panel" style={{ padding: 22, marginBottom: 20 }}>
      <div className="panel-heading">
        <div>
          <h2>Local Diagnostic Agent</h2>
          <p>Connect this website to the diagnostic agent running on your computer.</p>
        </div>
        <span className="chart-period">
          {connected ? "CONNECTED" : "NOT CONNECTED"}
        </span>
      </div>

      <label htmlFor="agent-token" style={{ display: "block", fontWeight: 600, marginBottom: 8 }}>
        Private connection token
      </label>

      <input
        id="agent-token"
        type="password"
        value={token}
        onChange={(event) => setToken(event.target.value)}
        placeholder="Paste your local agent token here"
        autoComplete="off"
        spellCheck="false"
        style={{
          width: "100%",
          padding: 12,
          border: "1px solid var(--border-color, #d1d5db)",
          borderRadius: 8,
          marginBottom: 12,
          boxSizing: "border-box",
        }}
      />

      <button
        type="button"
        className="primary-button"
        onClick={onConnect}
        disabled={connecting || !token.trim()}
      >
        {connecting
          ? "Connecting..."
          : connected
            ? "Check connection again"
            : "Connect local agent"}
      </button>

      <p className="metric-note" style={{ marginTop: 12 }}>
        Your token is kept in this browser session only. Do not share it with anyone.
        Keep the Python agent running while using diagnostics.
      </p>

      <p style={{
        marginTop: 10,
        fontWeight: 600,
        color: connected ? "#16a34a" : "#b7791f",
      }}>
        {connected
          ? "Local diagnostic agent is connected."
          : "Connect your local agent to start testing this computer's network."}
      </p>
    </section>
  );
}

function ReportsPage({
  diagnostics,
  history,
  onRunDiagnosis,
  isRunning,
  onDownload,
  onDownloadHistoryItem,
}) {
  return (
    <>
      <WelcomeSection
        title="Reports & History"
        description="Review previous network assessments and track performance over time."
        onRunDiagnosis={onRunDiagnosis}
        isRunning={isRunning}
      />

      <HistoryInsights history={history} />
      <TrendPanel history={history} />

      <section className="panel" style={{ padding: 22, marginBottom: 20 }}>
        <div className="panel-heading">
          <div>
            <h2>Latest diagnostic report</h2>
            <p>
              {diagnostics?.timestamp
                ? new Date(diagnostics.timestamp).toLocaleString()
                : "No report generated yet."}
            </p>
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={onDownload}
            disabled={!diagnostics}
          >
            Download JSON report
          </button>
        </div>

        {!diagnostics && <p>Run a network diagnosis to create your first report.</p>}
      </section>

      <section className="panel" style={{ padding: 22 }}>
        <div className="panel-heading">
          <div>
            <h2>Saved diagnostic history</h2>
            <p>Records stored locally in this browser.</p>
          </div>
          <span className="chart-period">{history.length} RECORDS</span>
        </div>

        {history.length ? (
          <div style={{ display: "grid", gap: 12 }}>
            {history.map((item, index) => (
              <div
                className="module-feature"
                key={item.id ?? `${item.timestamp}-${index}`}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>

                <div style={{ minWidth: 0, flex: 1 }}>
                  <strong>
                    {item.timestamp
                      ? new Date(item.timestamp).toLocaleString()
                      : "Date unavailable"}
                  </strong>

                  <small>
                    Latency: {formatMetric(item.network_quality?.average_latency_ms, "ms")} ·
                    Download: {formatMetric(item.internet_speed?.download_mbps, "Mbps")} ·
                    Packet loss: {formatMetric(item.network_quality?.packet_loss_percent, "%")}
                  </small>
                </div>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => onDownloadHistoryItem(item)}
                >
                  Download
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p>No saved diagnostic reports found. Run a network diagnosis first.</p>
        )}
      </section>
    </>
  );
}

function ModulePage({
  page,
  diagnostics,
  history,
  onNavigate,
  onRunDiagnosis,
  isRunning,
  onDownload,
  onDownloadHistoryItem,
}) {
  const sharedProps = { diagnostics, onRunDiagnosis, isRunning };

  if (page === "diagnostics") return <DiagnosticsPage {...sharedProps} />;
  if (page === "connection") return <ConnectionPage {...sharedProps} />;
  if (page === "diagnosis") return <DiagnosisPage {...sharedProps} />;
  if (page === "recommendations") return <RecommendationsPage {...sharedProps} />;

  if (page === "reports") {
    return (
      <ReportsPage
        {...sharedProps}
        history={history}
        onDownload={onDownload}
        onDownloadHistoryItem={onDownloadHistoryItem}
      />
    );
  }

  return (
    <section className="panel placeholder-panel">
      <h2>Page not found</h2>
      <button
        type="button"
        className="secondary-button"
        onClick={() => onNavigate("overview")}
      >
        Return to overview
      </button>
    </section>
  );
}

function App() {
  const [activePage, setActivePage] = useState("overview");
  const [notice, setNotice] = useState("");
  const [diagnostics, setDiagnostics] = useState(null);
  const [history, setHistory] = useState([]);
  const [isRunning, setIsRunning] = useState(false);

  const [agentToken, setAgentToken] = useState("");
  const [agentConnected, setAgentConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const AGENT_URL = "http://127.0.0.1:8765";
  const HISTORY_KEY = "netsense_local_diagnostic_history";

  useEffect(() => {
    try {
      const savedHistory = JSON.parse(
        localStorage.getItem(HISTORY_KEY) || "[]"
      );

      if (Array.isArray(savedHistory)) {
        setHistory(savedHistory);

        if (savedHistory.length > 0) {
          setDiagnostics(savedHistory[0]);
        }
      }
    } catch (error) {
      console.error("Unable to load local history:", error);
    }
  }, []);

  function saveHistory(report) {
    const record = {
      ...report,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: report.timestamp || new Date().toISOString(),
    };

    setHistory((previous) => {
      const updated = [record, ...previous].slice(0, 50);

      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error("Unable to save diagnostic history:", error);
        setNotice("Report completed, but browser storage is full or unavailable.");
      }

      return updated;
    });

    return record;
  }

  function handleNavigation(page) {
    setActivePage(page);
    setNotice("");
  }

  async function handleConnect() {
    if (!agentToken.trim()) {
      setNotice("Please enter your local agent token.");
      return;
    }

    setIsConnecting(true);
    setAgentConnected(false);
    setNotice("Checking connection to your local diagnostic agent...");

    try {
      const response = await fetch(`${AGENT_URL}/health`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${agentToken.trim()}`,
        },
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || data.status !== "ready") {
        throw new Error(data.message || `Connection failed (${response.status}).`);
      }

      setAgentConnected(true);
      setNotice("Successfully connected to your local diagnostic agent.");
    } catch (error) {
      console.error("Agent connection error:", error);
      setAgentConnected(false);

      setNotice(
        `Unable to connect: ${error.message}. Check that the Python agent is running, the token is correct, and your browser permits local network access.`
      );
    } finally {
      setIsConnecting(false);
    }
  }

  async function handleRunDiagnosis() {
    if (isRunning) return;

    if (!agentConnected || !agentToken.trim()) {
      setNotice("Please connect your local diagnostic agent before running a diagnosis.");
      setActivePage("overview");
      return;
    }

    setIsRunning(true);
    setNotice("Running diagnostics on your computer. Please wait...");

    try {
      const response = await fetch(`${AGENT_URL}/diagnose`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${agentToken.trim()}`,
        },
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || data.status !== "success") {
        throw new Error(data.message || `Diagnostic failed (${response.status}).`);
      }

      const report = data.report;

      if (
        !report ||
        typeof report !== "object" ||
        !report.network_quality ||
        !report.internet_speed
      ) {
        throw new Error("The diagnostic engine returned incomplete measurements.");
      }

      const savedReport = saveHistory(report);

      setDiagnostics(savedReport);
      setNotice("Network diagnosis completed successfully. Your report has been saved in this browser.");
      setActivePage("overview");
    } catch (error) {
      console.error("Network diagnosis error:", error);

      setNotice(
        `Unable to complete diagnosis: ${error.message}. Check your local agent and network connection.`
      );

      if (
        error.message.toLowerCase().includes("failed to fetch") ||
        error.message.toLowerCase().includes("network")
      ) {
        setAgentConnected(false);
      }
    } finally {
      setIsRunning(false);
    }
  }

  function handleDownloadReport() {
    if (!diagnostics) return;

    downloadJson(
      diagnostics,
      `netsense-diagnostic-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
    );
  }

  function handleDownloadHistoryItem(item) {
    downloadJson(
      item,
      `netsense-report-${item.id ?? "history"}.json`
    );
  }

  return (
    <div className="app-shell">
      <Sidebar
        activePage={activePage}
        onNavigate={handleNavigation}
        isRunning={isRunning}
        agentConnected={agentConnected}
      />

      <main className="main-content">
        <Topbar activePage={activePage} />

        <div className="page-content">
          {notice && (
            <div className="notice" role="status">
              <span aria-hidden="true">ⓘ</span>
              <span>{notice}</span>

              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={() => setNotice("")}
              >
                ×
              </button>
            </div>
          )}

          <AgentConnectionPanel
            token={agentToken}
            setToken={setAgentToken}
            connected={agentConnected}
            onConnect={handleConnect}
            connecting={isConnecting}
          />

          {activePage === "overview" ? (
            <OverviewPage
              onRunDiagnosis={handleRunDiagnosis}
              diagnostics={diagnostics}
              isRunning={isRunning}
            />
          ) : (
            <ModulePage
              page={activePage}
              diagnostics={diagnostics}
              history={history}
              onNavigate={handleNavigation}
              onRunDiagnosis={handleRunDiagnosis}
              isRunning={isRunning}
              onDownload={handleDownloadReport}
              onDownloadHistoryItem={handleDownloadHistoryItem}
            />
          )}

          <footer className="page-footer">
            <span>NetSense AI · Explainable Home & Last-Mile Connectivity Diagnosis</span>
            <span>Prototype build 0.4 · Local Agent</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

export default App;