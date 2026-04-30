// Re-export the panel primitives from one place so component code can
// import from `@/components/ui/...` consistently.
export {
  Panel as ResizablePanel,
  PanelGroup as ResizablePanelGroup,
} from "react-resizable-panels";
export type { ImperativePanelHandle } from "react-resizable-panels";
export { ResizeHandle } from "./ResizeHandle";
