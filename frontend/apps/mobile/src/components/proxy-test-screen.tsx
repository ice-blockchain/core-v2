import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { ScrollView, View, StyleSheet, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Text, Icon, useTheme } from "@ion/ui";
import { useAppNavigation } from "@ion/navigation";
import { createProxyManager } from "@ion/ion-connect-proxy";
import type { ProxyManager, ProxyStatus } from "@ion/ion-connect-proxy";

const TEST_URL = "http://foundation.ton";

export function ProxyTestScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useAppNavigation();
  const [status, setStatus] = useState<ProxyStatus>("idle");
  const [logs, setLogs] = useState<string[]>([]);
  const [requestResult, setRequestResult] = useState<string | null>(null);
  const managerRef = useRef<ProxyManager | null>(null);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${timestamp}] ${message}`, ...prev].slice(0, 50));
  }, []);

  useEffect(() => {
    const manager = createProxyManager();
    managerRef.current = manager;
    const unsubscribe = manager.onStatusChange((newStatus) => {
      setStatus(newStatus);
      addLog(`Status: ${newStatus}`);
    });
    return () => {
      unsubscribe();
      manager.dispose();
      managerRef.current = null;
    };
  }, [addLog]);

  const handleStart = useCallback(async () => {
    const manager = managerRef.current;
    if (!manager) return;
    addLog("Starting proxy...");
    try {
      await manager.start();
      addLog("Proxy started");
    } catch (error) {
      addLog(`Start failed: ${(error as Error).message}`);
    }
  }, [addLog]);

  const handleStop = useCallback(async () => {
    const manager = managerRef.current;
    if (!manager) return;
    addLog("Stopping proxy...");
    try {
      await manager.stop();
      addLog("Proxy stopped");
    } catch (error) {
      addLog(`Stop failed: ${(error as Error).message}`);
    }
  }, [addLog]);

  const handleTestRequest = useCallback(async () => {
    const manager = managerRef.current;
    if (!manager) return;
    addLog(`GET ${TEST_URL}`);
    setRequestResult(null);
    try {
      const client = manager.createClient({ baseUrl: TEST_URL });
      const response = await client.get("/");
      setRequestResult(`${response.status} OK`);
      addLog(`Response: ${response.status}`);
    } catch (error) {
      const message = (error as Error).message;
      setRequestResult(`Error: ${message}`);
      addLog(`Request failed: ${message}`);
    }
  }, [addLog]);

  const statusColor = useMemo(() => {
    if (status === "connected") return "#4caf50";
    if (status === "connecting" || status === "reconnecting") return "#ff9800";
    if (status === "disconnected") return "#f44336";
    return theme.colors.secondaryText;
  }, [status, theme]);

  const contentStyle = useMemo(
    () => ({ padding: theme.spacing.lg, paddingTop: insets.top + theme.spacing.lg, paddingBottom: 60 }),
    [theme, insets],
  );

  const isConnected = status === "connected";
  const isIdle = status === "idle" || status === "disconnected";

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.primaryBackground }]} contentContainerStyle={contentStyle}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} accessibilityLabel="Go back" accessibilityRole="button">
        <Icon name="back-arrow" size={theme.scale.scaleSize(24)} color={theme.colors.primaryText} />
      </TouchableOpacity>
      <Text variant="headline2" style={{ color: theme.colors.primaryText }}>Proxy Test</Text>

      <View style={[styles.statusRow, { marginTop: theme.spacing.lg }]}>
        <View style={[styles.dot, { backgroundColor: statusColor }]} />
        <Text variant="subtitle" style={{ color: theme.colors.primaryText }}>{status}</Text>
      </View>

      <View style={[styles.buttonRow, { gap: theme.spacing.sm, marginTop: theme.spacing.lg }]}>
        <Button label="Start" onPress={handleStart} isDisabled={!isIdle} color="primary" height={44} style={styles.flex} />
        <Button label="Stop" onPress={handleStop} isDisabled={isIdle} color="secondary" height={44} style={styles.flex} />
      </View>

      <Button
        label="Test Request"
        onPress={handleTestRequest}
        isDisabled={!isConnected}
        color="primary"
        height={44}
        style={{ marginTop: theme.spacing.sm }}
      />

      {requestResult && (
        <Text variant="body2" style={{ color: theme.colors.primaryText, marginTop: theme.spacing.md }}>
          Result: {requestResult}
        </Text>
      )}

      <Text variant="subtitle" style={{ color: theme.colors.primaryText, marginTop: theme.spacing.xl }}>Logs</Text>
      <View style={[styles.logBox, { marginTop: theme.spacing.sm, borderColor: theme.colors.strokeElements }]}>
        {logs.length === 0 && (
          <Text variant="body2" style={{ color: theme.colors.secondaryText }}>No logs yet</Text>
        )}
        {logs.map((log, index) => (
          <Text key={`${log}-${index}`} variant="caption2" style={{ color: theme.colors.secondaryText }}>
            {log}
          </Text>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  statusRow: { flexDirection: "row", alignItems: "center" },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  buttonRow: { flexDirection: "row" },
  flex: { flex: 1 },
  backButton: { marginBottom: 12 },
  logBox: { borderWidth: 1, borderRadius: 8, padding: 12, minHeight: 100 },
});
