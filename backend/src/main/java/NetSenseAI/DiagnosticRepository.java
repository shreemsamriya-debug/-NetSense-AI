
package NetSenseAI;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Map;

@Repository
public class DiagnosticRepository {

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public DiagnosticRepository(
            JdbcTemplate jdbcTemplate,
            ObjectMapper objectMapper) {

        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    public void saveDiagnostic(Map<String, Object> report) {

        Map<String, Object> local =
                getMap(report.get("local_network"));

        Map<String, Object> network =
                getMap(report.get("network_quality"));

        Map<String, Object> dns =
                getMap(report.get("dns_test"));

        Map<String, Object> speed =
                getMap(report.get("internet_speed"));

        String sql = """
            INSERT INTO diagnostic_history (
                timestamp,
                operating_system,
                gateway,
                gateway_status,
                gateway_latency_ms,
                latency_ms,
                jitter_ms,
                packet_loss_percent,
                dns_status,
                dns_resolution_time_ms,
                download_mbps,
                upload_mbps,
                diagnosis,
                possible_causes,
                recommendations,
                full_report
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """;

        jdbcTemplate.update(
            sql,
            value(report.get("timestamp")),
            value(report.get("operating_system")),
            value(local.get("gateway")),
            value(local.get("status")),
            number(local.get("average_latency_ms")),
            number(network.get("average_latency_ms")),
            number(network.get("jitter_ms")),
            number(network.get("packet_loss_percent")),
            value(dns.get("status")),
            number(dns.get("resolution_time_ms")),
            number(speed.get("download_mbps")),
            number(speed.get("upload_mbps")),
            json(report.get("diagnosis")),
            json(report.get("possible_causes")),
            json(report.get("recommendations")),
            json(report)
        );
    }

    public List<Map<String, Object>> getAllDiagnostics() {

        return jdbcTemplate.queryForList(
            "SELECT * FROM diagnostic_history ORDER BY id DESC LIMIT 100"
        );
    }

    private Map<String, Object> getMap(Object value) {

        if (value instanceof Map<?, ?> map) {
            return (Map<String, Object>) map;
        }

        return Map.of();
    }

    private String value(Object value) {

        return value == null ? null : value.toString();
    }

    private Double number(Object value) {

        if (value instanceof Number number) {
            return number.doubleValue();
        }

        return null;
    }

    private String json(Object value) {

        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception error) {
            throw new IllegalStateException(
                "Unable to convert diagnostic data into JSON.",
                error
            );
        }
    }
}