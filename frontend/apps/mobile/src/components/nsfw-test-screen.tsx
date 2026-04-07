import { useState } from "react";
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, View } from "react-native";
import { MediaImage } from "@ion/media-viewer";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { launchImageLibrary } from "react-native-image-picker";
import {
  checkMediaSafety,
  checkVideoSafety,
  type SafetyResult,
  type VideoFrameDetail,
  type VideoSafetyResult,
} from "@ion/nsfw-detection";
import { Box, Button, Text, useTheme } from "@ion/ui";

type Result = (SafetyResult | VideoSafetyResult) & { type: string };

interface PickedMedia {
  uri: string;
  isVideo: boolean;
  durationMs?: number;
}

function pickMediaFile(): Promise<PickedMedia | null> {
  return new Promise((resolve) => {
    launchImageLibrary({ mediaType: "mixed", selectionLimit: 1 }, (response) => {
      if (response.didCancel || !response.assets?.length) {
        resolve(null);
        return;
      }
      const asset = response.assets[0];
      if (!asset.uri) {
        resolve(null);
        return;
      }
      const isVideo = asset.type?.startsWith("video/") ?? false;
      const durationMs = asset.duration ? asset.duration * 1000 : undefined;
      resolve({ uri: asset.uri, isVideo, durationMs });
    });
  });
}

function VerdictBadge({ isSafe, type }: { isSafe: boolean; type: string }) {
  const backgroundColor = isSafe ? "#2e7d32" : "#c62828";
  return (
    <View style={[styles.badge, { backgroundColor }]}>
      <Text variant="body" style={styles.badgeText}>
        {isSafe ? "SAFE" : "UNSAFE"} ({type})
      </Text>
    </View>
  );
}

function CategoryRow({ label, confidence, isAboveThreshold }: {
  label: string;
  confidence: number;
  isAboveThreshold: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text variant="body2" style={styles.cellLabel}>{label}</Text>
      <Text variant="body2" style={styles.cellValue}>
        {(confidence * 100).toFixed(1)}%
      </Text>
      <Text
        variant="body2"
        style={[styles.cellFlag, isAboveThreshold ? styles.flaggedColor : styles.unflaggedColor]}
      >
        {isAboveThreshold ? "YES" : "no"}
      </Text>
    </View>
  );
}

function FrameCard({ frame }: { frame: VideoFrameDetail }) {
  const isFlagged = frame.categories.some((c) => c.isAboveThreshold);
  const borderColor = isFlagged ? "#c62828" : "#333";
  return (
    <View style={styles.frameCard}>
      <MediaImage source={{ uri: frame.uri, mimeType: "image/jpeg" }} style={[styles.frameImage, { borderColor }]} />
      <Text variant="body2" style={styles.frameLabel}>
        #{frame.index}{isFlagged ? " (flagged)" : ""}
      </Text>
      <Text variant="body2" style={styles.frameScore}>
        exp: {(frame.scores.explicit * 100).toFixed(1)}% | sug: {(frame.scores.suggestive * 100).toFixed(1)}%
      </Text>
    </View>
  );
}

function ResultDisplay({ result }: { result: Result }) {
  const videoResult = "framesAnalyzed" in result ? (result as VideoSafetyResult) : null;

  return (
    <Box style={styles.resultBox}>
      <VerdictBadge isSafe={result.isSafe} type={result.type} />
      {videoResult && (
        <>
          <Text variant="body2" style={styles.frameInfo}>
            Frames: {videoResult.framesAnalyzed}/{videoResult.totalFramesRequested}
            {videoResult.flaggedFrameIndices.length > 0 &&
              ` | Flagged: [${videoResult.flaggedFrameIndices.join(", ")}]`}
          </Text>
          <FlatList
            horizontal
            data={videoResult.frames}
            keyExtractor={(item) => String(item.index)}
            renderItem={({ item }) => <FrameCard frame={item} />}
            style={styles.frameList}
          />
        </>
      )}
      <View style={styles.tableHeader}>
        <Text variant="body2" style={styles.headerLabel}>Category</Text>
        <Text variant="body2" style={styles.headerValue}>Confidence</Text>
        <Text variant="body2" style={styles.headerFlag}>Flagged</Text>
      </View>
      {result.categories.map((cat) => (
        <CategoryRow key={cat.label} {...cat} />
      ))}
    </Box>
  );
}

export function NsfwTestScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  async function handleTestUrl(imageUrl: string) {
    setError(null);
    setResult(null);
    setIsLoading(true);
    setPreviewUri(imageUrl);
    try {
      const safetyResult = await checkMediaSafety(imageUrl);
      setResult({ ...safetyResult, type: "image" });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePickMedia() {
    const picked = await pickMediaFile();
    if (!picked) return;

    setError(null);
    setResult(null);
    setIsLoading(true);
    setPreviewUri(picked.uri);

    try {
      const safetyResult = picked.isVideo
        ? await checkVideoSafety(picked.uri, { durationMs: picked.durationMs })
        : await checkMediaSafety(picked.uri);
      setResult({ ...safetyResult, type: picked.isVideo ? "video" : "image" });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.primaryBackground }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 24 }]}
    >
      <Text variant="headline2" style={{ color: theme.colors.primaryText }}>
        NSFW Detection Test
      </Text>
      <Text variant="body2" style={[styles.subtitle, { color: theme.colors.secondaryText }]}>
        Pick an image or video to run safety detection. Stubs return mock scores.
      </Text>

      <Button
        label={isLoading ? "Analyzing..." : "Pick Media"}
        onPress={handlePickMedia}
        isDisabled={isLoading}
        color="primary"
        height={44}
        style={styles.button}
      />
      <Button
        label="Test Safe Image (URL)"
        onPress={() => handleTestUrl("https://picsum.photos/id/10/400/400.jpg")}
        isDisabled={isLoading}
        color="secondary"
        height={44}
        style={styles.button}
      />
      <Button
        label="Test Unsafe Image (URL)"
        onPress={() => handleTestUrl("https://picsum.photos/id/1025/400/400.jpg")}
        isDisabled={isLoading}
        color="secondary"
        height={44}
        style={styles.button}
      />

      {isLoading && <ActivityIndicator size="large" color={theme.colors.primaryAccent} style={styles.spinner} />}
      {previewUri && !isLoading && (
        <MediaImage source={{ uri: previewUri, mimeType: "image/jpeg" }} style={styles.preview} resizeMode="contain" />
      )}
      {error && <Text variant="body2" style={styles.errorText}>Error: {error}</Text>}
      {result && <ResultDisplay result={result} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingBottom: 60 },
  button: { marginTop: 20, alignSelf: "flex-start" },
  spinner: { marginTop: 20 },
  preview: { width: "100%", height: 200, borderRadius: 8, marginTop: 16 },
  errorText: { color: "#ef5350", marginTop: 12 },
  resultBox: { marginTop: 16 },
  badge: { alignSelf: "flex-start", paddingHorizontal: 16, paddingVertical: 6, borderRadius: 6, marginBottom: 8 },
  badgeText: { color: "#fff", fontWeight: "700" },
  frameInfo: { color: "#aaa", marginBottom: 8 },
  tableHeader: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#444", paddingBottom: 8, marginBottom: 4 },
  headerLabel: { flex: 2, color: "#aaa" },
  headerValue: { flex: 1, color: "#aaa", textAlign: "center" },
  headerFlag: { flex: 1, color: "#aaa", textAlign: "right" },
  row: { flexDirection: "row", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#333" },
  cellLabel: { flex: 2, color: "#ddd" },
  cellValue: { flex: 1, color: "#ddd", textAlign: "center" },
  cellFlag: { flex: 1, textAlign: "right" },
  flaggedColor: { color: "#ef5350" },
  unflaggedColor: { color: "#66bb6a" },
  subtitle: { marginTop: 4 },
  frameList: { marginBottom: 12 },
  frameCard: { width: 140, marginRight: 12, alignItems: "center" },
  frameImage: { width: 140, height: 100, borderRadius: 6, borderWidth: 2 },
  frameLabel: { fontSize: 11, color: "#ccc", marginTop: 4 },
  frameScore: { fontSize: 10, color: "#999", marginTop: 2 },
});
