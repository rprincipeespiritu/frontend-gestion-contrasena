import type { SVGProps } from "react";

const paths = {
  vault: "M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z M3 8h2m-2 8h2m7-8v2m0 4v2m-4-4h2m4 0h2 M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z",
  shared: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87 M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm8 .13a4 4 0 0 1 0 7.75",
  trash: "M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6m4-6v6",
  folder: "M3 7V5h6l2 2h10v12H3V7Z",
  plus: "M12 5v14M5 12h14",
  generator: "m4 20 12-12 4 4-12 12M14 10l4 4M5 3v4M3 5h4m12-4v4m-2-2h4M5 12v2m-1-1h2",
  import: "M12 3v12m-4-4 4 4 4-4M4 15v5h16v-5",
  mail: "M3 5h18v14H3V5Zm0 1 9 7 9-7",
  shield: "m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Zm-4 9 3 3 5-5",
  alert: "m12 3 10 18H2L12 3Zm0 6v5m0 3v.01",
  lock: "M5 10h14v11H5V10Zm3 0V7a4 4 0 0 1 8 0v3m-4 5v2",
  search: "M10.5 3a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15ZM16 16l5 5",
  grid: "M3 3h7v7H3V3Zm11 0h7v7h-7V3ZM3 14h7v7H3v-7Zm11 0h7v7h-7v-7Z",
  key: "M8 3a5 5 0 1 0 0 10A5 5 0 0 0 8 3Zm4 9 9 9m-3-3 3-3m-6 0 3-3M7 7h.01",
  passkey: "M8 17v-6a4 4 0 0 1 8 0v5m-4-4v8m-8-6v-3a8 8 0 0 1 16 0v3m-16 4v2m16-2v2",
  note: "M5 3h14v18H5V3Zm4 5h6m-6 4h6m-6 4h4",
  card: "M3 5h18v14H3V5Zm0 5h18M7 15h3",
  contact: "M4 3h16v18H4V3Zm8 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm-5 12a5 5 0 0 1 10 0",
  document: "M5 3h9l5 5v13H5V3Zm9 0v6h5M9 13h6m-6 4h6",
  arrow: "M5 12h14m-5-5 5 5-5 5",
  chevron: "m9 5 7 7-7 7",
  down: "m6 9 6 6 6-6",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4v5l3 2",
  close: "m6 6 12 12M6 18 18 6",
  star: "m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z",
} as const;

export type IconName = keyof typeof paths;

export function UiIcon({ name, size = 20, ...props }: SVGProps<SVGSVGElement> & { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d={paths[name]} />
    </svg>
  );
}
