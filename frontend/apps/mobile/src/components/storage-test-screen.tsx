import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { ScrollView, View, StyleSheet, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Text, Icon, useTheme } from "@ion/ui";
import { useAppNavigation } from "@ion/navigation";
import { createStorageManager } from "@ion/ton-storage";
import { createFileOperations } from "@ion/file-storage";
import type { StorageManager, StorageStatus } from "@ion/ton-storage";
import type { FileOperations } from "@ion/file-storage";

const API_PORT = 9090;
const DB_PATH = "ton-storage";
const TEST_CDN_URL = "https://www.w3.org/WAI/WCAG21/Techniques/pdf/img/table-word.jpg";
const TEST_CACHE_DIR = "file-storage-test";

export function StorageTestScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useAppNavigation();
  const [status, setStatus] = useState<StorageStatus>("idle");
  const [logs, setLogs] = useState<string[]>([]);
  const managerRef = useRef<StorageManager | null>(null);
  const fileOpsRef = useRef<FileOperations | null>(null);

  const addLog = useCallback((message: string) => {
    const ts = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${ts}] ${message}`, ...prev].slice(0, 80));
  }, []);

  useEffect(() => {
    const manager = createStorageManager({ apiPort: API_PORT, dbPath: DB_PATH });
    managerRef.current = manager;
    fileOpsRef.current = createFileOperations();
    const unsub = manager.onStatusChange((s) => { setStatus(s); addLog(`Daemon: ${s}`); });
    return () => { unsub(); manager.dispose(); managerRef.current = null; };
  }, [addLog]);

  const handleStartDaemon = useCallback(async () => {
    addLog("Starting TON Storage daemon...");
    try { await managerRef.current?.start(); addLog("Daemon started"); }
    catch (e) { addLog(`Start failed: ${(e as Error).message}`); }
  }, [addLog]);

  const handleStopDaemon = useCallback(async () => {
    addLog("Stopping daemon...");
    try { await managerRef.current?.stop(); addLog("Daemon stopped"); }
    catch (e) { addLog(`Stop failed: ${(e as Error).message}`); }
  }, [addLog]);

  const handleListBags = useCallback(async () => {
    try {
      const bags = await managerRef.current?.createClient().listBags();
      addLog(`Bags: ${bags?.length ?? 0}`);
      bags?.forEach((b) => addLog(`  ${b.bagId.slice(0, 16)}... ${b.isComplete ? "done" : "dl"}`));
    } catch (e) { addLog(`List failed: ${(e as Error).message}`); }
  }, [addLog]);

  const handleTestCdnDownload = useCallback(async () => {
    const ops = fileOpsRef.current;
    if (!ops) { addLog("FileOperations not ready"); return; }
    const dest = `${TEST_CACHE_DIR}/test-cdn-file.jpg`;
    addLog(`CDN download: ${TEST_CDN_URL}`);
    addLog(`Dest: ${dest}`);
    try {
      await ops.downloadToFile({ url: TEST_CDN_URL, destinationPath: dest });
      const exists = await ops.exists(dest);
      const size = exists ? await ops.getFileSize(dest) : 0;
      addLog(`Download OK: ${exists ? `${size} bytes` : "file missing!"}`);
    } catch (e) { addLog(`CDN download failed: ${(e as Error).message}`); }
  }, [addLog]);

  const handleTestFileOps = useCallback(async () => {
    const ops = fileOpsRef.current;
    if (!ops) { addLog("FileOperations not ready"); return; }
    const src = `${TEST_CACHE_DIR}/test-cdn-file.jpg`;
    const dst = `${TEST_CACHE_DIR}/moved-file.jpg`;
    try {
      const srcExists = await ops.exists(src);
      addLog(`exists(${src}): ${srcExists}`);
      if (srcExists) {
        const size = await ops.getFileSize(src);
        addLog(`getFileSize: ${size} bytes`);
        await ops.moveFile({ sourcePath: src, destinationPath: dst });
        addLog(`moveFile: OK`);
        const dstExists = await ops.exists(dst);
        addLog(`exists(moved): ${dstExists}`);
        await ops.deleteFile(dst);
        addLog("deleteFile: OK");
        addLog("All FileOperations passed");
      } else { addLog("Run CDN download first"); }
    } catch (e) { addLog(`FileOps failed: ${(e as Error).message}`); }
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
      <Text variant="headline2" style={{ color: theme.colors.primaryText }}>Storage Full Test</Text>
      <View style={[styles.statusRow, { marginTop: theme.spacing.lg }]}>
        <View style={[styles.dot, { backgroundColor: statusColor }]} />
        <Text variant="subtitle" style={{ color: theme.colors.primaryText }}>{status}</Text>
      </View>

      <Text variant="subtitle" style={{ color: theme.colors.primaryText, marginTop: theme.spacing.lg }}>TON Daemon</Text>
      <View style={[styles.buttonRow, { gap: theme.spacing.sm, marginTop: theme.spacing.sm }]}>
        <Button label="Start" onPress={handleStartDaemon} isDisabled={!isIdle} color="primary" height={44} style={styles.flex} />
        <Button label="Stop" onPress={handleStopDaemon} isDisabled={isIdle} color="secondary" height={44} style={styles.flex} />
      </View>
      <Button label="List Bags" onPress={handleListBags} isDisabled={!isConnected} color="primary" height={36} style={{ marginTop: theme.spacing.sm }} />

      <Text variant="subtitle" style={{ color: theme.colors.primaryText, marginTop: theme.spacing.lg }}>File Operations</Text>
      <View style={[styles.buttonRow, { gap: theme.spacing.sm, marginTop: theme.spacing.sm }]}>
        <Button label="CDN Download" onPress={handleTestCdnDownload} color="primary" height={36} style={styles.flex} />
        <Button label="File Ops" onPress={handleTestFileOps} color="secondary" height={36} style={styles.flex} />
      </View>

      <Text variant="subtitle" style={{ color: theme.colors.primaryText, marginTop: theme.spacing.xl }}>Logs</Text>
      <View style={[styles.logBox, { marginTop: theme.spacing.sm, borderColor: theme.colors.strokeElements }]}>
        {logs.length === 0 && <Text variant="body2" style={{ color: theme.colors.secondaryText }}>No logs yet</Text>}
        {logs.map((log, i) => (
          <Text key={`${log}-${i}`} variant="caption2" style={{ color: theme.colors.secondaryText }}>{log}</Text>
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
