import { IntroScreen as IntroScreenCore } from "@ion/splash-ui";
import { IntroVideo } from "./intro-video";

export function IntroScreen() {
  return (
    <IntroVideo>
      <IntroScreenCore />
    </IntroVideo>
  );
}
