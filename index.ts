import "react-native-get-random-values";
import { Buffer } from "buffer";
import { registerRootComponent } from "expo";

import App from "./App";

// web3.js and MWA expect Buffer to exist globally; Hermes does not provide it.
(globalThis as { Buffer?: typeof Buffer }).Buffer ??= Buffer;

registerRootComponent(App);
