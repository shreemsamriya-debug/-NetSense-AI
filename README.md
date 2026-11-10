# NetSense AI

### An Explainable Intelligent System for Home and Last-Mile Internet Connectivity Diagnosis

**Hackathon:** AIORI-3 Hackathon 2026  
**Problem Statement:** PS-015  
**Project Category:** Artificial Intelligence / Intelligent Network Diagnostics

---

## 1. Project Overview

NetSense AI is an intelligent network diagnosis system designed to assess home and last-mile internet connectivity. It collects network performance measurements, identifies deviations from learned historical behaviour, and provides understandable diagnostic explanations and recommendations.

Unlike a basic internet speed testing application, NetSense AI combines network measurements, historical performance fingerprinting, anomaly detection, and explainable recommendations to help users understand possible connectivity problems.

## 2. Problem Statement

Internet users frequently experience slow speeds, unstable connections, latency, jitter, packet loss, and DNS resolution problems. Conventional speed tests generally provide performance measurements but do not sufficiently explain why connectivity problems may be occurring.

NetSense AI aims to bridge this gap by combining multiple diagnostic checks with historical network behaviour analysis and actionable explanations.

## 3. Project Objectives

- Measure internet download and upload performance.
- Assess network latency, jitter, and packet loss.
- Check local gateway connectivity.
- Evaluate DNS resolution performance.
- Maintain historical network performance records.
- Establish a baseline of normal network behaviour.
- Identify unusual deviations using statistical anomaly detection.
- Generate explainable diagnostic findings and recommendations.

## 4. Key Features

### Network Diagnostics
- Local gateway connectivity testing.
- External connectivity and latency measurements.
- DNS resolution testing.
- Internet download and upload speed testing.

### Network Behaviour Fingerprinting
- Stores historical performance measurements.
- Establishes a baseline using historical observations.
- Uses median and median absolute deviation (MAD) for comparison.

### Anomaly Detection
- Identifies significant deviations from historical network behaviour.
- Tracks changes in network performance.
- Provides metric-specific explanations.

### Explainable Recommendations
- Presents observed network evidence.
- Identifies possible causes.
- Generates recommendations based on diagnostic findings.

### Historical Monitoring
- Stores diagnostic records in SQLite.
- Supports historical performance review.
- Tracks changes across diagnostic sessions.

## 5. Technology Stack

| Component | Technology |
|---|---|
| Frontend | React.js, Vite, JavaScript, CSS |
| Backend | Java, Spring Boot |
| Diagnostic Engine | Python |
| Database | SQLite |
| Internet Speed Testing | Ookla Speedtest CLI |
| Statistical Analysis | Median, MAD and baseline comparison |
| Development Environment | Visual Studio Code |

## 6. System Architecture

The application follows a three-layer architecture:

1. **Frontend Layer:** React dashboard for displaying network measurements, diagnostic findings, recommendations, and historical records.
2. **Backend Layer:** Spring Boot REST API for coordinating diagnostic requests and storing results.
3. **Diagnostic Layer:** Python engine for collecting network measurements, evaluating historical behaviour, detecting anomalies, and generating explanations.

### Diagnostic Workflow

User → React Dashboard → Spring Boot API → Python Diagnostic Engine → Network Tests → Statistical Analysis → Explainable Diagnosis → SQLite Storage → Dashboard

## 7. Project Structure

```text
NetSense-AI/
│
├── backend/
│   ├── src/
│   ├── pom.xml
│   └── mvnw
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
├── network_engine/
│   └── diagnostics.py
│
├── database/
│   └── Local SQLite database (not committed)
│
├── .gitignore
└── README.md
```

## 8. System Requirements

- Windows, Linux, or macOS.
- Java Development Kit (JDK 21).
- Python installed and available through the command line.
- Node.js and npm.
- Git.
- Ookla Speedtest CLI for internet speed measurements.

## 9. Installation and Execution

### Step 1: Clone the repository

```bash
git clone https://github.com/shreemsamriya-debug/-NetSense-AI.git
cd NetSense-AI
```

### Step 2: Start the Backend

Open a terminal:

```bash
cd backend
./mvnw spring-boot:run
```

On Windows PowerShell:

```powershell
.\mvnw.cmd spring-boot:run
```

Backend health endpoint:

```text
http://localhost:8080/api/health
```

### Step 3: Start the Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the dashboard:

```text
http://localhost:5173/
```

### Step 4: Configure the Python Diagnostic Engine

Ensure Python is installed and the required Python dependencies are available.

From the project root, the diagnostic engine can be tested using:

```powershell
cd network_engine
py -m py_compile diagnostics.py
py diagnostics.py --json
```

The backend invokes the Python diagnostic engine during a diagnosis request.

**Note:** The Ookla Speedtest CLI must be installed and configured according to its official distribution instructions for speed testing to work.

## 10. API Endpoints

| Endpoint | Purpose |
|---|---|
| `GET /api/health` | Check backend availability |
| `GET /api/diagnostics/run` | Execute network diagnostics |
| `GET /api/diagnostics/history` | Retrieve saved diagnostic history |

## 11. Expected Outputs

NetSense AI produces diagnostic information including:

- Download and upload speeds.
- Network latency and jitter.
- Packet loss measurements.
- Gateway connectivity status.
- DNS resolution status and timing.
- Historical baseline comparisons.
- Detected anomalies.
- Possible causes and recommendations.
- Diagnostic confidence and evidence coverage.

Confidence and evidence coverage indicate the availability of diagnostic information; they should not be interpreted as a guaranteed probability that a diagnosis is correct.

## 12. Security and Data Handling

- Local database files are excluded from the public repository.
- Environment files and credentials are excluded through `.gitignore`.
- Downloaded executable tools are not committed.
- Diagnostic history is stored locally.

## 13. Current Development Status

The current implementation includes:

- React dashboard.
- Spring Boot backend.
- Python-based network diagnostics.
- Ookla speed testing integration.
- SQLite diagnostic history.
- Historical network fingerprinting.
- Statistical anomaly detection.
- Explainable recommendations.

## 14. Future Scope

Potential future improvements include:

- Router-level diagnostic integration.
- More detailed Wi-Fi signal analysis.
- Network congestion identification.
- ISP-side fault correlation.
- Enhanced predictive monitoring.
- Additional diagnostic visualizations.
- Broader testing across different routers and internet service providers.

## 15. Team Information

**Project:** NetSense AI  
**Hackathon:** AIORI-3 Hackathon 2026  
**Problem Statement:** PS-015

**Repository:**  
https://github.com/shreemsamriya-debug/-NetSense-AI

---

*NetSense AI — Making home and last-mile internet connectivity diagnosis more understandable, explainable, and intelligent.*