# NetSense AI – System Architecture

## 1. Architecture Overview

NetSense AI follows a layered architecture consisting of
a React frontend, Spring Boot backend, Python diagnostic
engine, and SQLite database.

## 2. System Architecture Diagram

```mermaid
flowchart TD
    A[User] --> B[React Frontend Dashboard]

    B -->|REST API Request| C[Spring Boot Backend]

    C -->|Execute Diagnostics| D[Python Diagnostic Engine]

    D --> E[Network Diagnostic Tests]

    E --> E1[Gateway Connectivity]
    E --> E2[External Latency and Jitter]
    E --> E3[Packet Loss]
    E --> E4[DNS Resolution]
    E --> E5[Download and Upload Speed]

    E1 --> F[Diagnostic Analysis]
    E2 --> F
    E3 --> F
    E4 --> F
    E5 --> F

    F --> G[Historical Behaviour Fingerprinting]
    G --> H[Statistical Analysis: Median and MAD]
    H --> I[Explainable Findings and Recommendations]

    I -->|Diagnostic Results| C
    C -->|Store and Retrieve Records| J[(SQLite Database)]

    C -->|API Response| B
    B --> K[Dashboard and Reports]