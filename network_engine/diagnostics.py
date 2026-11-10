import platform
import subprocess
import re
import statistics
import socket
import time
import json
import argparse
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path


# ============================================================
# NETSENSE AI - NETWORK DIAGNOSTICS ENGINE V2
# Network Behaviour Fingerprinting and Anomaly Detection
# ============================================================


def run_command(command, timeout=10):
    """Run a system command and return its output."""
    try:
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=timeout,
            errors="replace"
        )
        return result.stdout.strip()
    except (subprocess.TimeoutExpired, FileNotFoundError, OSError):
        return ""


# ============================================================
# DATABASE CONFIGURATION
# ============================================================

def get_database_path():
    """Return the shared NetSense AI SQLite database path."""
    custom_path = os.environ.get("NETSENSE_DB_PATH")

    if custom_path:
        return Path(custom_path)

    project_root = Path(__file__).resolve().parent.parent
    return project_root / "database" / "netsense.db"


def safe_number(value):
    """Convert a value to a finite float or return None."""
    try:
        if value is None:
            return None

        number = float(value)

        if number != number or number in (float("inf"), float("-inf")):
            return None

        return number

    except (TypeError, ValueError):
        return None


def initialize_fingerprint_tables(connection):
    """Create fingerprint tables without modifying diagnostic history."""

    connection.execute("""
        CREATE TABLE IF NOT EXISTS network_fingerprint_samples (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            network_key TEXT NOT NULL,
            operating_system TEXT,
            gateway TEXT,
            latency_ms REAL,
            jitter_ms REAL,
            packet_loss_percent REAL,
            download_mbps REAL,
            upload_mbps REAL
        )
    """)

    connection.execute("""
        CREATE INDEX IF NOT EXISTS
        idx_fingerprint_network_timestamp
        ON network_fingerprint_samples(network_key, id DESC)
    """)

    connection.execute("""
        CREATE TABLE IF NOT EXISTS network_anomalies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            network_key TEXT NOT NULL,
            metric TEXT NOT NULL,
            observed_value REAL,
            baseline_value REAL,
            deviation_percent REAL,
            severity TEXT,
            explanation TEXT
        )
    """)

    connection.execute("""
        CREATE INDEX IF NOT EXISTS
        idx_network_anomalies_timestamp
        ON network_anomalies(timestamp)
    """)

    connection.commit()


# ============================================================
# NETWORK INFORMATION
# ============================================================

def get_default_gateway():
    """Find the default gateway on Windows, Linux or macOS."""

    system = platform.system().lower()

    if system == "windows":
        output = run_command(["ipconfig"])

        matches = re.findall(
            r"Default Gateway[ .]*:\s*([^\s]+)",
            output,
            re.IGNORECASE
        )

        for gateway in matches:
            if gateway and gateway != "0.0.0.0":
                return gateway

        return None

    if system == "linux":
        output = run_command(
            ["ip", "route", "show", "default"]
        )

        match = re.search(
            r"default via ([^\s]+)",
            output
        )

        return match.group(1) if match else None

    if system == "darwin":
        output = run_command(
            ["route", "-n", "get", "default"]
        )

        match = re.search(
            r"gateway:\s*([^\s]+)",
            output
        )

        return match.group(1) if match else None

    return None


# ============================================================
# PING AND NETWORK QUALITY
# ============================================================

def ping_host(host, count=4, timeout=10):
    """Ping a host and extract latency and packet loss."""

    system = platform.system().lower()

    if system == "windows":
        command = [
            "ping",
            "-n",
            str(count),
            "-w",
            str(timeout * 1000),
            host
        ]
    else:
        command = [
            "ping",
            "-c",
            str(count),
            "-W",
            str(timeout),
            host
        ]

    output = run_command(
        command,
        timeout=count * timeout + 5
    )

    if not output:
        return {
            "status": "unavailable",
            "average_latency_ms": None,
            "minimum_latency_ms": None,
            "maximum_latency_ms": None,
            "jitter_ms": None,
            "packet_loss_percent": None,
            "successful_pings": 0,
            "total_pings": count
        }

    latencies = []

    for match in re.findall(
        r"time[=<]\s*(\d+(?:\.\d+)?)\s*ms",
        output,
        re.IGNORECASE
    ):
        value = safe_number(match)

        if value is not None:
            latencies.append(value)

    loss_match = re.search(
        r"(\d+(?:\.\d+)?)%\s*(?:packet\s+)?loss",
        output,
        re.IGNORECASE
    )

    if loss_match:
        packet_loss = safe_number(loss_match.group(1))
    else:
        packet_loss = (
            ((count - len(latencies)) / count) * 100
            if count > 0 else None
        )

    if latencies:
        average_latency = statistics.mean(latencies)
        minimum_latency = min(latencies)
        maximum_latency = max(latencies)

        jitter = (
            statistics.pstdev(latencies)
            if len(latencies) > 1 else 0.0
        )

        status = "success"

    else:
        average_latency = None
        minimum_latency = None
        maximum_latency = None
        jitter = None
        status = "failed"

    return {
        "status": status,
        "average_latency_ms": average_latency,
        "minimum_latency_ms": minimum_latency,
        "maximum_latency_ms": maximum_latency,
        "jitter_ms": jitter,
        "packet_loss_percent": packet_loss,
        "successful_pings": len(latencies),
        "total_pings": count
    }


def test_network():
    """Test external network quality."""
    return ping_host(
        "1.1.1.1",
        count=10,
        timeout=3
    )


# ============================================================
# LOCAL NETWORK TEST
# ============================================================

def test_local_network():
    """Test connectivity to the default gateway."""

    gateway = get_default_gateway()

    if not gateway:
        return {
            "gateway": None,
            "status": "unavailable",
            "average_latency_ms": None,
            "minimum_latency_ms": None,
            "maximum_latency_ms": None,
            "jitter_ms": None,
            "packet_loss_percent": None,
            "successful_pings": 0,
            "total_pings": 4
        }

    result = ping_host(
        gateway,
        count=4,
        timeout=3
    )

    return {
        "gateway": gateway,
        **result
    }


# ============================================================
# DNS TEST
# ============================================================

def test_dns():
    """Measure DNS resolution time."""

    hostname = "example.com"
    start_time = time.perf_counter()

    try:
        addresses = socket.getaddrinfo(
            hostname,
            443,
            type=socket.SOCK_STREAM
        )

        resolution_time = (
            time.perf_counter() - start_time
        ) * 1000

        resolved_addresses = sorted(
            list(set(
                item[4][0]
                for item in addresses
            ))
        )

        return {
            "status": "success",
            "hostname": hostname,
            "resolution_time_ms": round(
                resolution_time,
                2
            ),
            "addresses": resolved_addresses
        }

    except socket.gaierror as error:
        return {
            "status": "failed",
            "hostname": hostname,
            "resolution_time_ms": None,
            "addresses": [],
            "error": str(error)
        }

    except Exception as error:
        return {
            "status": "error",
            "hostname": hostname,
            "resolution_time_ms": None,
            "addresses": [],
            "error": str(error)
        }


# ============================================================
# INTERNET SPEED TEST - OFFICIAL OOKLA CLI
# ============================================================

def test_internet_speed():
    """Measure internet speed using the official Ookla CLI."""

    default_exe = (
        Path(__file__).resolve().parent
        / "tools"
        / "ookla_fresh"
        / "speedtest.exe"
    )

    executable = Path(
        os.environ.get(
            "NETSENSE_SPEEDTEST_EXE",
            str(default_exe)
        )
    )

    if not executable.is_file():
        return {
            "status": "unavailable",
            "provider": "Ookla Speedtest CLI",
            "download_mbps": None,
            "upload_mbps": None,
            "latency_ms": None,
            "jitter_ms": None,
            "packet_loss_percent": None,
            "error": f"Ookla executable not found: {executable}"
        }

    command = [
        str(executable),
        "--accept-license",
        "--accept-gdpr",
        "-f",
        "json"
    ]

    try:
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            errors="replace",
            timeout=150,
            check=False
        )

        output_lines = [
            line.strip()
            for line in result.stdout.splitlines()
            if line.strip()
        ]

        json_line = next(
            (
                line
                for line in reversed(output_lines)
                if line.startswith("{")
            ),
            None
        )

        if result.returncode != 0 or json_line is None:
            error_text = (
                result.stderr
                or result.stdout
                or "No JSON result returned"
            ).strip()

            return {
                "status": "failed",
                "provider": "Ookla Speedtest CLI",
                "download_mbps": None,
                "upload_mbps": None,
                "latency_ms": None,
                "jitter_ms": None,
                "packet_loss_percent": None,
                "error": error_text[-1000:],
                "return_code": result.returncode
            }

        payload = json.loads(json_line)

        if payload.get("type") != "result":
            raise ValueError(
                "Ookla did not return a completed speed-test result"
            )

        download_bandwidth = safe_number(
            (payload.get("download") or {}).get("bandwidth")
        )

        upload_bandwidth = safe_number(
            (payload.get("upload") or {}).get("bandwidth")
        )

        ping = payload.get("ping") or {}
        server = payload.get("server") or {}
        result_info = payload.get("result") or {}
        interface = payload.get("interface") or {}

        download_mbps = (
            round(download_bandwidth * 8 / 1000000, 2)
            if download_bandwidth is not None
            and download_bandwidth > 0
            else None
        )

        upload_mbps = (
            round(upload_bandwidth * 8 / 1000000, 2)
            if upload_bandwidth is not None
            and upload_bandwidth > 0
            else None
        )

        return {
            "status": (
                "success"
                if download_mbps is not None
                or upload_mbps is not None
                else "partial"
            ),
            "provider": "Ookla Speedtest CLI",
            "cli_version": "1.2.0.84",
            "timestamp": payload.get("timestamp"),
            "download_mbps": download_mbps,
            "upload_mbps": upload_mbps,
            "latency_ms": safe_number(
                ping.get("latency")
            ),
            "jitter_ms": safe_number(
                ping.get("jitter")
            ),
            "packet_loss_percent": safe_number(
                payload.get("packetLoss")
            ),
            "download_latency": (
                payload.get("download") or {}
            ).get("latency"),
            "upload_latency": (
                payload.get("upload") or {}
            ).get("latency"),
            "isp": payload.get("isp"),
            "server": {
                "id": server.get("id"),
                "name": server.get("name"),
                "location": server.get("location"),
                "country": server.get("country"),
                "host": server.get("host")
            },
            "interface": {
                "name": interface.get("name"),
                "is_vpn": interface.get("isVpn")
            },
            "result_url": result_info.get("url")
        }

    except subprocess.TimeoutExpired:
        return {
            "status": "timeout",
            "provider": "Ookla Speedtest CLI",
            "download_mbps": None,
            "upload_mbps": None,
            "latency_ms": None,
            "jitter_ms": None,
            "packet_loss_percent": None,
            "error": "Ookla speed test exceeded the 150-second timeout."
        }

    except (
        OSError,
        json.JSONDecodeError,
        ValueError,
        TypeError
    ) as error:
        return {
            "status": "unavailable",
            "provider": "Ookla Speedtest CLI",
            "download_mbps": None,
            "upload_mbps": None,
            "latency_ms": None,
            "jitter_ms": None,
            "packet_loss_percent": None,
            "error": str(error)
        }


# ============================================================
# DIAGNOSIS ENGINE
# ============================================================

def generate_diagnosis(network, speed, local, dns):

    findings = []
    possible_causes = []
    recommendations = []

    latency = safe_number(
        network.get("average_latency_ms")
    )

    jitter = safe_number(
        network.get("jitter_ms")
    )

    packet_loss = safe_number(
        network.get("packet_loss_percent")
    )

    download = safe_number(
        speed.get("download_mbps")
    )

    upload = safe_number(
        speed.get("upload_mbps")
    )

    gateway_status = local.get("status")

    if latency is not None:

        if latency <= 50:
            findings.append(
                "External network latency is within a good range."
            )

        elif latency <= 100:
            findings.append(
                "External network latency is moderate."
            )

            possible_causes.append(
                "Network congestion or longer routing paths."
            )

        else:
            findings.append(
                "High external network latency was detected."
            )

            possible_causes.append(
                "Possible network congestion or upstream delay."
            )

            recommendations.append(
                "Repeat the latency test at different times "
                "to identify whether the delay is persistent."
            )

    else:
        findings.append(
            "External latency could not be measured."
        )

    if jitter is not None:

        if jitter <= 10:
            findings.append(
                "Network jitter is low."
            )

        else:
            findings.append(
                "Elevated network jitter was detected."
            )

            possible_causes.append(
                "Variable network delay or congestion."
            )

            recommendations.append(
                "Check whether multiple devices or applications "
                "are using the network simultaneously."
            )

    if packet_loss is not None:

        if packet_loss == 0:
            findings.append(
                "No packet loss was detected in the external ping test."
            )

        elif packet_loss <= 2:
            findings.append(
                "Small packet loss was detected."
            )

            possible_causes.append(
                "Intermittent network congestion or packet filtering."
            )

        else:
            findings.append(
                "Significant packet loss was detected."
            )

            possible_causes.append(
                "Possible instability in the local network "
                "or upstream connection."
            )

            recommendations.append(
                "Compare gateway and external packet loss "
                "to narrow down the affected network segment."
            )

    if gateway_status == "success":

        findings.append(
            "The default gateway responded to ping requests."
        )

    elif gateway_status == "failed":

        findings.append(
            "The default gateway did not respond to ping requests."
        )

        possible_causes.append(
            "The gateway may be unreachable or may block ICMP requests."
        )

        recommendations.append(
            "Check router connectivity and verify whether "
            "the router allows ping requests."
        )

    else:
        findings.append(
            "Gateway connectivity could not be confirmed."
        )

    if dns.get("status") == "success":

        dns_time = safe_number(
            dns.get("resolution_time_ms")
        )

        findings.append(
            "DNS resolution completed successfully."
        )

        if dns_time is not None and dns_time > 200:

            possible_causes.append(
                "DNS resolution took longer than expected."
            )

            recommendations.append(
                "Consider comparing DNS response times "
                "with another trusted DNS resolver."
            )

    else:

        findings.append(
            "DNS resolution was unsuccessful."
        )

        possible_causes.append(
            "Possible DNS resolver or name-resolution problem."
        )

        recommendations.append(
            "Check DNS configuration and retry name resolution."
        )

    if download is not None:
        findings.append(
            f"Measured download speed: {download:.2f} Mbps."
        )
    else:
        findings.append(
            "Download speed could not be measured."
        )

    if upload is not None:
        findings.append(
            f"Measured upload speed: {upload:.2f} Mbps."
        )
    else:
        findings.append(
            "Upload speed could not be measured."
        )

    if not possible_causes:
        possible_causes.append(
            "No specific network fault was established "
            "from the available measurements."
        )

    if not recommendations:
        recommendations.append(
            "Continue monitoring the network to establish "
            "a reliable performance baseline."
        )

    return findings, possible_causes, recommendations


# ============================================================
# NETWORK BEHAVIOUR FINGERPRINTING
# ============================================================

def metric_baseline(values):
    """Calculate a robust baseline using median and MAD."""

    valid_values = [
        safe_number(value)
        for value in values
        if safe_number(value) is not None
    ]

    if not valid_values:
        return {
            "count": 0,
            "median": None,
            "mad": None
        }

    median_value = statistics.median(valid_values)

    deviations = [
        abs(value - median_value)
        for value in valid_values
    ]

    mad_value = statistics.median(deviations)

    return {
        "count": len(valid_values),
        "median": round(median_value, 4),
        "mad": round(mad_value, 4)
    }


def load_previous_fingerprint_samples(
    connection,
    network_key,
    limit=30
):
    """Load historical measurements for the current network."""

    cursor = connection.execute("""
        SELECT
            latency_ms,
            jitter_ms,
            packet_loss_percent,
            download_mbps,
            upload_mbps
        FROM network_fingerprint_samples
        WHERE network_key = ?
        ORDER BY id DESC
        LIMIT ?
    """, (network_key, limit))

    rows = cursor.fetchall()
    rows.reverse()

    return rows


def detect_fingerprint_anomalies(
    current_metrics,
    baselines
):
    """Compare current measurements with historical baselines."""

    anomalies = []

    metric_rules = {

        "latency_ms": {
            "label": "Latency",
            "minimum_increase": 20,
            "multiplier": 1.5,
            "direction": "higher"
        },

        "jitter_ms": {
            "label": "Jitter",
            "minimum_increase": 5,
            "multiplier": 2.0,
            "direction": "higher"
        },

        "packet_loss_percent": {
            "label": "Packet loss",
            "minimum_increase": 1,
            "multiplier": None,
            "direction": "higher"
        },

        "download_mbps": {
            "label": "Download speed",
            "minimum_increase": None,
            "multiplier": 0.70,
            "direction": "lower"
        },

        "upload_mbps": {
            "label": "Upload speed",
            "minimum_increase": None,
            "multiplier": 0.70,
            "direction": "lower"
        }

    }

    for metric_name, rule in metric_rules.items():

        current_value = safe_number(
            current_metrics.get(metric_name)
        )

        baseline = baselines.get(metric_name, {})

        baseline_value = safe_number(
            baseline.get("median")
        )

        mad_value = safe_number(
            baseline.get("mad")
        )

        sample_count = baseline.get("count", 0)

        if current_value is None or baseline_value is None:
            continue

        if sample_count < 5:
            continue

        if mad_value is None:
            mad_value = 0.0

        is_anomaly = False
        deviation_percent = 0.0

        if rule["direction"] == "higher":

            if metric_name == "packet_loss_percent":

                threshold = max(
                    rule["minimum_increase"],
                    baseline_value + rule["minimum_increase"]
                )

                is_anomaly = current_value >= threshold

            else:

                statistical_threshold = (
                    baseline_value + 3 * 1.4826 * mad_value
                )

                practical_threshold = max(
                    baseline_value * rule["multiplier"],
                    baseline_value + rule["minimum_increase"]
                )

                threshold = max(
                    statistical_threshold,
                    practical_threshold
                )

                is_anomaly = current_value > threshold

            if baseline_value > 0:
                deviation_percent = (
                    (current_value - baseline_value)
                    / baseline_value
                ) * 100

            elif current_value > 0:
                deviation_percent = 100.0

        else:

            threshold = (
                baseline_value * rule["multiplier"]
            )

            is_anomaly = current_value < threshold

            if baseline_value > 0:
                deviation_percent = (
                    (baseline_value - current_value)
                    / baseline_value
                ) * 100

        if not is_anomaly:
            continue

        if deviation_percent >= 100:
            severity = "high"

        elif deviation_percent >= 50:
            severity = "medium"

        else:
            severity = "low"

        if rule["direction"] == "higher":

            explanation = (
                f"{rule['label']} is higher than the learned "
                f"network baseline. Current value: "
                f"{current_value:.2f}; baseline: "
                f"{baseline_value:.2f}."
            )

        else:

            explanation = (
                f"{rule['label']} is lower than the learned "
                f"network baseline. Current value: "
                f"{current_value:.2f}; baseline: "
                f"{baseline_value:.2f}."
            )

        anomalies.append({
            "metric": metric_name,
            "label": rule["label"],
            "observed_value": round(current_value, 4),
            "baseline_value": round(baseline_value, 4),
            "deviation_percent": round(deviation_percent, 2),
            "severity": severity,
            "explanation": explanation
        })

    return anomalies


# ============================================================
# UPDATE NETWORK FINGERPRINT
# ============================================================

def update_network_fingerprint(
    local,
    network,
    speed,
    operating_system
):
    """Learn network behaviour and detect deviations."""

    database_path = get_database_path()

    database_path.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    gateway = local.get("gateway") or "unknown"

    network_key = f"{operating_system}|{gateway}"

    timestamp = datetime.now(
        timezone.utc
    ).isoformat()

    current_metrics = {

        "latency_ms": safe_number(
            network.get("average_latency_ms")
        ),

        "jitter_ms": safe_number(
            network.get("jitter_ms")
        ),

        "packet_loss_percent": safe_number(
            network.get("packet_loss_percent")
        ),

        "download_mbps": safe_number(
            speed.get("download_mbps")
        ),

        "upload_mbps": safe_number(
            speed.get("upload_mbps")
        )

    }

    connection = sqlite3.connect(
        str(database_path),
        timeout=20
    )

    try:

        initialize_fingerprint_tables(connection)

        previous_rows = load_previous_fingerprint_samples(
            connection,
            network_key,
            limit=30
        )

        metric_names = list(current_metrics.keys())

        historical_values = {
            name: [
                row[index]
                for row in previous_rows
                if row[index] is not None
            ]
            for index, name in enumerate(metric_names)
        }

        baselines = {
            name: metric_baseline(values)
            for name, values in historical_values.items()
        }

        available_counts = [
            baseline["count"]
            for baseline in baselines.values()
            if baseline["count"] > 0
        ]

        baseline_samples = (
            min(available_counts)
            if available_counts
            else 0
        )

        baseline_ready = any(
            baseline["count"] >= 5
            for baseline in baselines.values()
        )

        anomalies = detect_fingerprint_anomalies(
            current_metrics,
            baselines
        )

        # Save the current sample after comparing it
        # against previous historical samples.

        connection.execute("""
            INSERT INTO network_fingerprint_samples (
                timestamp,
                network_key,
                operating_system,
                gateway,
                latency_ms,
                jitter_ms,
                packet_loss_percent,
                download_mbps,
                upload_mbps
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            timestamp,
            network_key,
            operating_system,
            gateway,
            current_metrics["latency_ms"],
            current_metrics["jitter_ms"],
            current_metrics["packet_loss_percent"],
            current_metrics["download_mbps"],
            current_metrics["upload_mbps"]
        ))

        # Store individual anomaly evidence.

        for anomaly in anomalies:

            connection.execute("""
                INSERT INTO network_anomalies (
                    timestamp,
                    network_key,
                    metric,
                    observed_value,
                    baseline_value,
                    deviation_percent,
                    severity,
                    explanation
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                timestamp,
                network_key,
                anomaly["metric"],
                anomaly["observed_value"],
                anomaly["baseline_value"],
                anomaly["deviation_percent"],
                anomaly["severity"],
                anomaly["explanation"]
            ))

        connection.commit()

        if anomalies:
            fingerprint_status = "anomaly_detected"

        elif baseline_ready:
            fingerprint_status = "within_baseline"

        else:
            fingerprint_status = "learning"

        return {

            "status": fingerprint_status,

            "network_key": network_key,

            "gateway": gateway,

            "storage": "SQLite",

            "database_path": str(database_path),

            "baseline_ready": baseline_ready,

            "baseline_samples": baseline_samples,

            "historical_samples_used": len(previous_rows),

            "minimum_samples_required": 5,

            "metrics": current_metrics,

            "baselines": baselines,

            "anomalies": anomalies,

            "anomaly_count": len(anomalies),

            "message": (
                "Network behaviour differs from the learned baseline."
                if anomalies
                else (
                    "Historical network behaviour is being learned."
                    if not baseline_ready
                    else "Current measurements are within the learned baseline."
                )
            )

        }

    finally:
        connection.close()


# ============================================================
# CONFIDENCE ASSESSMENT
# ============================================================

def build_confidence_assessment(
    local,
    network,
    dns,
    speed,
    fingerprint
):
    """Estimate evidence coverage, not probability of correctness."""

    checks = {

        "gateway_test": (
            local.get("status") in ["success", "failed"]
        ),

        "latency_test": (
            safe_number(
                network.get("average_latency_ms")
            ) is not None
        ),

        "jitter_test": (
            safe_number(
                network.get("jitter_ms")
            ) is not None
        ),

        "packet_loss_test": (
            safe_number(
                network.get("packet_loss_percent")
            ) is not None
        ),

        "dns_test": (
            dns.get("status") in ["success", "failed"]
        ),

        "download_test": (
            safe_number(
                speed.get("download_mbps")
            ) is not None
        ),

        "upload_test": (
            safe_number(
                speed.get("upload_mbps")
            ) is not None
        )

    }

    completed = sum(checks.values())
    total = len(checks)

    coverage_percent = (
        completed / total
    ) * 100

    score = coverage_percent * 0.5

    if fingerprint.get("baseline_ready"):
        score += 50

    score = min(
        100,
        round(score, 1)
    )

    if score >= 80:
        level = "high"

    elif score >= 50:
        level = "medium"

    else:
        level = "low"

    return {

        "score": score,

        "level": level,

        "completed_checks": completed,

        "total_checks": total,

        "coverage_percent": round(
            coverage_percent,
            1
        ),

        "baseline_ready": fingerprint.get(
            "baseline_ready",
            False
        ),

        "explanation": (
            "This score describes the coverage of available "
            "diagnostic evidence and historical baseline data. "
            "It is not a probability that the identified root cause "
            "is correct."
        ),

        "checks": checks

    }


# ============================================================
# EXPLAINABLE FINGERPRINT FINDINGS
# ============================================================

def add_fingerprint_explanations(
    findings,
    possible_causes,
    recommendations,
    fingerprint
):
    """Generate evidence-based, actionable recommendations."""

    status = fingerprint.get("status")
    anomalies = fingerprint.get("anomalies", [])

    generic_recommendation = (
        "Continue monitoring the network to establish "
        "a reliable performance baseline."
    )

    if status == "learning":

        findings.append(
            "Network Behaviour Fingerprinting is learning "
            "the normal behaviour of this network."
        )

        recommendations.append(
            "Run diagnostics periodically under comparable "
            "network conditions to build a reliable baseline."
        )

    elif status == "within_baseline":

        findings.append(
            "Current network measurements are within the "
            "learned historical behaviour range."
        )

        if generic_recommendation in recommendations:
            recommendations.remove(generic_recommendation)

        if not recommendations:

            recommendations.append(
                "No immediate corrective action is indicated. "
                "Current network measurements are within the "
                "learned historical baseline. Continue periodic "
                "monitoring to identify future changes."
            )

    elif status == "anomaly_detected":

        findings.append(
            f"Network Behaviour Fingerprinting detected "
            f"{fingerprint.get('anomaly_count', len(anomalies))} "
            "measurement deviation(s) from the historical baseline."
        )

        recommendation_map = {

            "latency_ms": [
                "Check whether other devices are using the connection heavily.",
                "Repeat the latency test at different times to check whether the delay persists."
            ],

            "jitter_ms": [
                "Check whether multiple devices or applications are using the network simultaneously.",
                "Test using an Ethernet connection instead of Wi-Fi to compare connection stability.",
                "Check router placement and Wi-Fi signal strength.",
                "Repeat the jitter test under similar conditions."
            ],

            "packet_loss_percent": [
                "Compare packet loss to the default gateway with packet loss to the external test destination.",
                "Check router connectivity, Wi-Fi signal strength and network cable connections.",
                "Repeat the test to determine whether packet loss is persistent."
            ],

            "download_mbps": [
                "Pause large downloads and streaming on other devices.",
                "Repeat the speed test using a wired connection to compare throughput.",
                "Compare download performance at different times to identify possible congestion."
            ],

            "upload_mbps": [
                "Check whether cloud backups, file uploads or video calls are consuming upload bandwidth.",
                "Repeat the upload test using a wired connection.",
                "Compare upload performance at different times."
            ]

        }

        for anomaly in anomalies:

            metric = anomaly.get("metric", "")
            label = anomaly.get("label", "Network metric")
            severity = anomaly.get("severity", "unknown")
            explanation = anomaly.get("explanation")

            if explanation and explanation not in possible_causes:
                possible_causes.append(explanation)

            findings.append(
                f"{label} differs from its historical baseline. "
                f"Deviation: {anomaly.get('deviation_percent', 0):.2f}%. "
                f"Severity: {severity}."
            )

            targeted_actions = recommendation_map.get(
                metric,
                [
                    f"Repeat the {label.lower()} measurement "
                    "under comparable network conditions."
                ]
            )

            for action in targeted_actions:

                if action not in recommendations:
                    recommendations.append(action)

    findings.append(
        "Fingerprinting compares current measurements with "
        "previous measurements from the same identified "
        "operating-system and gateway combination."
    )

    findings.append(
        "An anomaly indicates a deviation from historical "
        "behaviour; it does not independently establish "
        "the exact root cause."
    )

    return (
        findings,
        possible_causes,
        recommendations
    )


# ============================================================
# MAIN EXECUTION
# ============================================================

def main():

    parser = argparse.ArgumentParser(
        description="NetSense AI Network Diagnostics"
    )

    parser.add_argument(
        "--json",
        action="store_true",
        help="Print the diagnostic report as JSON"
    )

    args = parser.parse_args()

    timestamp = datetime.now(
        timezone.utc
    ).isoformat()

    operating_system = platform.system()

    local = test_local_network()

    network = test_network()

    dns = test_dns()

    speed = test_internet_speed()

    findings, possible_causes, recommendations = generate_diagnosis(
        network,
        speed,
        local,
        dns
    )

    fingerprint = update_network_fingerprint(
        local,
        network,
        speed,
        operating_system
    )

    findings, possible_causes, recommendations = add_fingerprint_explanations(
        findings,
        possible_causes,
        recommendations,
        fingerprint
    )

    confidence = build_confidence_assessment(
        local,
        network,
        dns,
        speed,
        fingerprint
    )

    report = {

        "timestamp": timestamp,

        "operating_system": operating_system,

        "local_network": local,

        "network_quality": network,

        "dns_test": dns,

        "internet_speed": speed,

        "diagnosis": findings,

        "possible_causes": possible_causes,

        "recommendations": recommendations,

        "network_fingerprint": fingerprint,

        "confidence_assessment": confidence

    }

    report_path = (
        Path(__file__).resolve().parent
        / "diagnostic_report.json"
    )

    with open(
        report_path,
        "w",
        encoding="utf-8"
    ) as report_file:

        json.dump(
            report,
            report_file,
            indent=4,
            ensure_ascii=False
        )

    if args.json:

        print(
            json.dumps(
                report,
                indent=4,
                ensure_ascii=False
            )
        )

    else:

        print("\n" + "=" * 65)

        print("                 NETSENSE AI")

        print("       NETWORK DIAGNOSTIC REPORT V2")

        print("=" * 65)

        print("\nTimestamp:", timestamp)

        print("Operating System:", operating_system)

        print("\n--- LOCAL NETWORK ---")

        print(json.dumps(local, indent=4))

        print("\n--- NETWORK QUALITY ---")

        print(json.dumps(network, indent=4))

        print("\n--- DNS TEST ---")

        print(json.dumps(dns, indent=4))

        print("\n--- INTERNET SPEED ---")

        print(json.dumps(speed, indent=4))

        print("\n--- NETWORK FINGERPRINT ---")

        print(json.dumps(fingerprint, indent=4))

        print("\n--- CONFIDENCE ASSESSMENT ---")

        print(json.dumps(confidence, indent=4))

        print("\n--- DIAGNOSIS ---")

        for item in findings:
            print("-", item)

        print("\n--- POSSIBLE CAUSES ---")

        for item in possible_causes:
            print("-", item)

        print("\n--- RECOMMENDATIONS ---")

        for item in recommendations:
            print("-", item)

        print("\nReport saved to:", report_path)

        print("\n" + "=" * 65)


if __name__ == "__main__":
    main()