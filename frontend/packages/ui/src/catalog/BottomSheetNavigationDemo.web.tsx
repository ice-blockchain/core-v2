import { useCallback, useState } from "react";
import { View } from "react-native";
import { BottomSheet } from "../components/BottomSheet";
import { useSheetStyles } from "./bottom-sheet-demo-styles";
import { DemoProfileView } from "./demo-profile-view";
import { DemoSendCoinsView } from "./demo-send-coins-view";
import { DemoChooseNetworkView } from "./demo-choose-network-view";
import { DemoSheetHeader } from "./demo-sheet-header";
import { getRandomNetworks } from "./demo-mock-data";
import type { MockNetwork } from "./demo-mock-data";
import type { BottomSheetDemoProps } from "./bottom-sheet-demo-types";

type Screen = "profile" | "sendCoins" | "chooseNetwork";

function useNavigationState(onClose: () => void) {
  const [screen, setScreen] = useState<Screen>("profile");
  const [networks, setNetworks] = useState<MockNetwork[]>([]);

  const goToSendCoins = useCallback(() => setScreen("sendCoins"), []);
  const goToChooseNetwork = useCallback(() => {
    setNetworks(getRandomNetworks());
    setScreen("chooseNetwork");
  }, []);
  const goBack = useCallback(() => {
    setScreen((prev) => (prev === "chooseNetwork" ? "sendCoins" : "profile"));
  }, []);
  const handleClose = useCallback(() => { setScreen("profile"); onClose(); }, [onClose]);

  return { screen, networks, goToSendCoins, goToChooseNetwork, goBack, handleClose };
}

export function BottomSheetNavigationDemo({ isVisible, onClose }: BottomSheetDemoProps) {
  const { safeBottomStyle } = useSheetStyles();
  const nav = useNavigationState(onClose);

  return (
    <BottomSheet isVisible={isVisible} onClose={nav.handleClose}>
      <View style={safeBottomStyle}>
        {nav.screen === "profile" && (
          <DemoProfileView onSend={nav.goToSendCoins} onReceive={nav.goToSendCoins} />
        )}
        {nav.screen === "sendCoins" && (
          <>
            <DemoSheetHeader title="Send coins" onBack={nav.goBack} onClose={nav.handleClose} />
            <DemoSendCoinsView onSelectCoin={nav.goToChooseNetwork} />
          </>
        )}
        {nav.screen === "chooseNetwork" && (
          <>
            <DemoSheetHeader title="Choose network" onBack={nav.goBack} onClose={nav.handleClose} />
            <DemoChooseNetworkView networks={nav.networks} />
          </>
        )}
      </View>
    </BottomSheet>
  );
}
