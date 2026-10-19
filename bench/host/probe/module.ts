import { defineModule } from "nuikit-core/module";
import { expose } from "./probe";

export default defineModule({ mount: () => expose() });
