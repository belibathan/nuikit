// The game, faked for browser development. Press ` for the devtools.
import { NuiDevtools, defineMocks } from "nuikit-core/devtools";

const mocks = defineMocks({ events: {} });

export default function Dev() {
  return <NuiDevtools events={mocks.events} scene="dusk" />;
}
