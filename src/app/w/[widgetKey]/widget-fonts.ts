import { DM_Sans, Instrument_Sans, Manrope, Outfit, Plus_Jakarta_Sans, Sora } from "next/font/google";

const instrument = Instrument_Sans({ subsets: ["latin"], variable: "--font-instrument" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
const sora = Sora({ subsets: ["latin"], variable: "--font-sora" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });

export const widgetFontClassName = [
  instrument.variable,
  manrope.variable,
  jakarta.variable,
  outfit.variable,
  sora.variable,
  dmSans.variable,
].join(" ");
