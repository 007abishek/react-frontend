import type { Meta, StoryObj } from "@storybook/react";

import AuthShell from "./AuthShell";

const meta: Meta<typeof AuthShell> = {
  title: "Features/Auth/AuthShell",
  component: AuthShell,
};

export default meta;

type Story = StoryObj<typeof AuthShell>;

export const Default: Story = {
  args: {
    children: (
      <div className="relative z-10 rounded-xl border border-white/20 bg-white/90 p-6 text-slate-900 shadow-lg">
        Auth shell preview
      </div>
    ),
  },
};
