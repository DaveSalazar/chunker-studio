import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Dialog, DialogBody, DialogFooter, DialogHeader } from "./Dialog";
import { Button } from "./Button";

const meta: Meta<typeof Dialog> = {
  title: "UI/Dialog",
  component: Dialog,
};
export default meta;

type Story = StoryObj<typeof Dialog>;

export const Default: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open dialog</Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogHeader
            title="Confirm action"
            description="This will close every loaded document."
            onClose={() => setOpen(false)}
          />
          <DialogBody>
            <p className="text-sm">Are you sure you want to continue?</p>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setOpen(false)}>Confirm</Button>
          </DialogFooter>
        </Dialog>
      </>
    );
  },
};
