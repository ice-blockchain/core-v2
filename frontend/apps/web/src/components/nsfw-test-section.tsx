import React, { useState, useRef } from 'react';
import {
  checkMediaSafety,
  checkVideoSafety,
  type SafetyResult,
  type VideoFrameDetail,
  type VideoSafetyResult,
} from '@ion/nsfw-detection';

type Result = (SafetyResult | VideoSafetyResult) & { type: string };

export function NsfwTestSection() {
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    await analyzeFile(file, { setResult, setError, setIsLoading, setPreviewUrl });
  }

  return (
    <section style={styles.section}>
      <h2 style={styles.heading}>NSFW Detection Test</h2>
      <SectionSubtitle />
      <FileInput ref={fileInputRef} onFileSelect={handleFileSelect} />
      <PickButton isLoading={isLoading} onClick={() => fileInputRef.current?.click()} />
      {isLoading && <ProgressIndicator />}
      {previewUrl && !isLoading && <MediaPreview url={previewUrl} />}
      {error && <p style={styles.error}>Error: {error}</p>}
      {result && <ResultDisplay result={result} />}
    </section>
  );
}

interface AnalyzeHandlers {
  setResult: (r: Result | null) => void;
  setError: (e: string | null) => void;
  setIsLoading: (l: boolean) => void;
  setPreviewUrl: (u: string | null) => void;
}

async function analyzeFile(file: File, handlers: AnalyzeHandlers) {
  const { setResult, setError, setIsLoading, setPreviewUrl } = handlers;
  setError(null);
  setResult(null);
  setIsLoading(true);
  const objectUrl = URL.createObjectURL(file);
  setPreviewUrl(objectUrl);
  try {
    const isVideo = file.type.startsWith('video/');
    const safetyResult = isVideo
      ? await checkVideoSafety(objectUrl)
      : await checkMediaSafety(objectUrl);
    setResult({ ...safetyResult, type: isVideo ? 'video' : 'image' });
  } catch (err) {
    setError(err instanceof Error ? err.message : String(err));
  } finally {
    setIsLoading(false);
  }
}

function SectionSubtitle() {
  return (
    <p style={styles.subtitle}>
      Pick an image or video to run on-device safety detection.
      Platform stubs return mock scores — real inference in future PRs.
    </p>
  );
}

const FileInput = React.forwardRef<HTMLInputElement, { onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void }>(
  function FileInput({ onFileSelect }, ref) {
    return <input ref={ref} type="file" accept="image/*,video/*" onChange={onFileSelect} style={styles.hidden} />;
  },
);

function PickButton({ isLoading, onClick }: { isLoading: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={isLoading} style={styles.pickButton}>
      {isLoading ? 'Analyzing...' : 'Pick Media'}
    </button>
  );
}

function ProgressIndicator() {
  return (
    <div style={styles.progressContainer}>
      <div style={styles.spinnerOuter}>
        <div style={styles.spinnerInner} />
      </div>
      <p style={styles.progressText}>Running safety analysis...</p>
      <style>{`
        @keyframes nsfw-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

function MediaPreview({ url }: { url: string }) {
  return (
    <div style={styles.previewContainer}>
      <img
        src={url}
        alt="Selected media"
        style={styles.previewImage}
        onError={(e) => {
          const target = e.currentTarget;
          target.style.display = 'none';
        }}
      />
    </div>
  );
}

function ResultDisplay({ result }: { result: Result }) {
  const videoResult = 'framesAnalyzed' in result
    ? (result as VideoSafetyResult)
    : null;

  return (
    <div style={styles.resultContainer}>
      <VerdictBadge isSafe={result.isSafe} type={result.type} />
      {videoResult && <VideoResultSection videoResult={videoResult} />}
      <CategoriesTable categories={result.categories} />
    </div>
  );
}

function VerdictBadge({ isSafe, type }: { isSafe: boolean; type: string }) {
  return (
    <div style={{
      ...styles.verdict,
      backgroundColor: isSafe ? '#e8f5e9' : '#ffebee',
      color: isSafe ? '#2e7d32' : '#c62828',
    }}>
      {isSafe ? 'SAFE' : 'UNSAFE'} ({type})
    </div>
  );
}

function VideoResultSection({ videoResult }: { videoResult: VideoSafetyResult }) {
  return (
    <>
      <p style={styles.frameInfo}>
        Frames analyzed: {videoResult.framesAnalyzed}/{videoResult.totalFramesRequested}
        {videoResult.flaggedFrameIndices.length > 0 &&
          ` | Flagged: [${videoResult.flaggedFrameIndices.join(', ')}]`}
      </p>
      <FrameGrid frames={videoResult.frames} />
    </>
  );
}

function CategoriesTable({ categories }: { categories: SafetyResult['categories'] }) {
  return (
    <table style={styles.table}>
      <thead>
        <tr>
          <th style={styles.th}>Category</th>
          <th style={styles.th}>Confidence</th>
          <th style={styles.th}>Flagged</th>
        </tr>
      </thead>
      <tbody>
        {categories.map((cat) => (
          <tr key={cat.label}>
            <td style={styles.td}>{cat.label}</td>
            <td style={styles.td}>{(cat.confidence * 100).toFixed(1)}%</td>
            <td style={{
              ...styles.td,
              color: cat.isAboveThreshold ? '#c62828' : '#2e7d32',
            }}>
              {cat.isAboveThreshold ? 'YES' : 'no'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function FrameGrid({ frames }: { frames: VideoFrameDetail[] }) {
  return (
    <div style={styles.frameGrid}>
      {frames.map((frame) => {
        const isFlagged = frame.categories.some((c) => c.isAboveThreshold);
        return (
          <div key={frame.index} style={styles.frameCard}>
            <img src={frame.uri} alt={`Frame ${frame.index}`} style={{
              ...styles.frameImage,
              border: isFlagged ? '2px solid #c62828' : '2px solid #333',
            }} />
            <p style={styles.frameLabel}>
              #{frame.index} {isFlagged ? '(flagged)' : ''}
            </p>
            <p style={styles.frameScore}>
              exp: {(frame.scores.explicit * 100).toFixed(1)}%
              {' | '}sug: {(frame.scores.suggestive * 100).toFixed(1)}%
            </p>
          </div>
        );
      })}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: { padding: '32px 24px', maxWidth: 600, margin: '40px auto', border: '1px solid #333', borderRadius: 12, backgroundColor: '#1a1a1a' },
  heading: { fontSize: 20, fontWeight: 600, color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 13, color: '#999', marginBottom: 20 },
  hidden: { display: 'none' },
  pickButton: { padding: '10px 24px', fontSize: 14, fontWeight: 600, color: '#fff', backgroundColor: '#6200ee', border: 'none', borderRadius: 8, cursor: 'pointer' },
  progressContainer: { marginTop: 20, display: 'flex', alignItems: 'center', gap: 12 },
  spinnerOuter: { width: 28, height: 28, borderRadius: '50%', border: '3px solid #333', borderTopColor: '#6200ee', animation: 'nsfw-spin 0.8s linear infinite' },
  spinnerInner: {},
  progressText: { fontSize: 13, color: '#aaa', margin: 0 },
  previewContainer: { marginTop: 16 },
  previewImage: { maxWidth: '100%', maxHeight: 200, borderRadius: 8, objectFit: 'contain' as const },
  error: { color: '#ef5350', marginTop: 12, fontSize: 13 },
  resultContainer: { marginTop: 16 },
  verdict: { display: 'inline-block', padding: '6px 16px', borderRadius: 6, fontWeight: 700, fontSize: 14, marginBottom: 12 },
  frameInfo: { fontSize: 13, color: '#aaa', marginBottom: 8 },
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 },
  th: { textAlign: 'left' as const, padding: '8px 12px', borderBottom: '1px solid #444', color: '#aaa', fontWeight: 500 },
  td: { padding: '8px 12px', borderBottom: '1px solid #333', color: '#ddd' },
  frameGrid: { display: 'flex', gap: 12, overflowX: 'auto', padding: '8px 0', marginBottom: 16 },
  frameCard: { flexShrink: 0, width: 140, textAlign: 'center' as const },
  frameImage: { width: 140, height: 100, objectFit: 'cover' as const, borderRadius: 6 },
  frameLabel: { fontSize: 12, color: '#ccc', margin: '4px 0 0' },
  frameScore: { fontSize: 11, color: '#999', margin: '2px 0 0' },
};
