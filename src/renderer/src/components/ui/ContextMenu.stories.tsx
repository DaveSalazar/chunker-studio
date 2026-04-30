import { useState, type MouseEvent } from "react";
import { Copy, Edit, Trash2 } from "lucide-react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  ContextMenu,
  ContextMenuItem,
  type ContextMenuPosition,
} from "./ContextMenu";

const meta: Meta<typeof ContextMenu> = {
  title: "UI/ContextMenu",
  component: ContextMenu,
};
export default meta;

type Story = StoryObj<typeof ContextMenu>;

export const RightClickArea: Story = {
  render: () => {
    const [pos, setPos] = useState<ContextMenuPosition | null>(null);
    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      setPos({ x: e.clientX, y: e.clientY });
    };
    return (
      <div className="flex flex-col gap-3">
        <p className="text-xs text-muted-foreground">
          Right-click anywhere in the area below to open the context menu.
          Click outside, press <kbd className="rounded bg-secondary px-1">Esc</kbd>,
          or right-click again to close.
        </p>
        <div
          data-context-trigger="true"
          onContextMenu={onContextMenu}
          className="flex h-64 w-[480px] items-center justify-center rounded-md border border-dashed border-border bg-card/40 text-xs text-muted-foreground"
        >
          right-click me
        </div>
        <ContextMenu open={pos !== null} position={pos} onClose={() => setPos(null)}>
          <ContextMenuItem
            icon={<Copy className="h-3.5 w-3.5" />}
            shortcut="⌘C"
            onSelect={() => setPos(null)}
          >
            Copy
          </ContextMenuItem>
          <ContextMenuItem
            icon={<Edit className="h-3.5 w-3.5" />}
            shortcut="⌘E"
            onSelect={() => setPos(null)}
          >
            Edit
          </ContextMenuItem>
          <ContextMenuItem
            icon={<Trash2 className="h-3.5 w-3.5" />}
            disabled
            onSelect={() => setPos(null)}
          >
            Delete (disabled)
          </ContextMenuItem>
        </ContextMenu>
      </div>
    );
  },
};
