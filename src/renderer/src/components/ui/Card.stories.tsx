import type { Meta, StoryObj } from "@storybook/react-vite";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./Card";
import { Button } from "./Button";

const meta: Meta<typeof Card> = {
  title: "UI/Card",
  component: Card,
};
export default meta;

type Story = StoryObj<typeof Card>;

export const Default: Story = {
  render: () => (
    <Card className="w-[420px]">
      <CardHeader>
        <CardTitle>Embedding model</CardTitle>
        <CardDescription>
          text-embedding-3-small · 1536 dims · matches the backend.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          The dimension at ingest time must match the dimension at query time, otherwise
          cosine similarity returns noise.
        </p>
      </CardContent>
      <CardFooter>
        <Button variant="outline" size="sm">Read ADR</Button>
        <Button size="sm">Apply</Button>
      </CardFooter>
    </Card>
  ),
};
