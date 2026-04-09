import { useCallback, useMemo, useState } from "react";
import { Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { createWalletView } from "@ion/wallet";
import { WalletViewSheetHeader } from "./WalletViewSheetHeader";
import { WalletViewSwitcherView } from "./WalletViewSwitcherView";
import { ManageWalletViewsView } from "./ManageWalletViewsView";
import { WalletViewNameForm } from "./WalletViewNameForm";
import { EditWalletViewView } from "./EditWalletViewView";
import { DeleteWalletViewConfirmation } from "./DeleteWalletViewConfirmation";

type WalletViewSheetView =
  | { type: "switcher" }
  | { type: "manage" }
  | { type: "create" }
  | { type: "edit"; walletId: string }
  | { type: "delete-confirm"; walletId: string };

interface WalletViewsSheetContentProps {
  onClose: () => void;
}

export function WalletViewsSheetContent({ onClose }: WalletViewsSheetContentProps) {
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const insets = useSafeAreaInsets();
  const [view, setView] = useState<WalletViewSheetView>({ type: "switcher" });
  const bgStyle = useMemo(
    () => ({
      backgroundColor: theme.colors.secondaryBackground,
      paddingBottom: Platform.OS === "web" ? scale(70) : insets.bottom,
    }),
    [theme.colors, insets.bottom, scale],
  );
  const headerProps = useMemo(() => getHeaderConfig(view, setView), [view]);
  const optionalHeaderProps = useMemo(() => {
    const p: { title?: string; onBack?: () => void } = {};
    if (headerProps.title) p.title = headerProps.title;
    if (headerProps.onBack) p.onBack = headerProps.onBack;
    return p;
  }, [headerProps]);

  return (
    <View style={bgStyle}>
      {view.type !== "delete-confirm" && (
        <WalletViewSheetHeader {...optionalHeaderProps} onClose={onClose} />
      )}
      <SheetViewContent view={view} setView={setView} />
    </View>
  );
}

function SheetViewContent({ view, setView }: { view: WalletViewSheetView; setView: (v: WalletViewSheetView) => void }) {
  if (view.type === "switcher") return <WalletViewSwitcherView onNavigateToManage={() => setView({ type: "manage" })} />;
  if (view.type === "manage") return <ManageWalletViewsView onNavigateToCreate={() => setView({ type: "create" })} onNavigateToEdit={(id) => setView({ type: "edit", walletId: id })} />;
  if (view.type === "create") return <CreateWalletViewContent setView={setView} />;
  if (view.type === "edit") return <EditWalletViewView walletId={view.walletId} onNavigateToDelete={(id) => setView({ type: "delete-confirm", walletId: id })} onBack={() => setView({ type: "manage" })} />;
  if (view.type === "delete-confirm") return <DeleteWalletViewConfirmation walletId={view.walletId} onCancel={() => setView({ type: "manage" })} onDeleted={() => setView({ type: "manage" })} />;
  return null;
}

function CreateWalletViewContent({ setView }: { setView: (v: WalletViewSheetView) => void }) {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scale = useTheme().scale.scaleSize;
  const containerStyle = useMemo(() => ({ padding: scale(16) }), [scale]);

  const handleSubmit = useCallback(() => {
    try {
      createWalletView(name);
      setView({ type: "manage" });
    } catch {
      setIsSubmitting(false);
    }
  }, [name, setView]);

  return (
    <View style={containerStyle}>
      <WalletViewNameForm value={name} onChangeText={setName} onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </View>
  );
}

function getHeaderConfig(view: WalletViewSheetView, setView: (v: WalletViewSheetView) => void) {
  switch (view.type) {
    case "switcher": return { title: translate("walletUi:walletsTitle"), onBack: undefined };
    case "manage": return { title: translate("walletUi:manageWalletsTitle"), onBack: () => setView({ type: "switcher" }) };
    case "create": return { title: translate("walletUi:createWalletTitle"), onBack: () => setView({ type: "manage" }) };
    case "edit": return { title: translate("walletUi:editWalletTitle"), onBack: () => setView({ type: "manage" }) };
    case "delete-confirm": return { title: undefined, onBack: undefined };
  }
}
