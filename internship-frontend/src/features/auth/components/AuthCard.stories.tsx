import type { Meta, StoryObj } from "@storybook/react";

import AuthCard from "./AuthCard";

const meta: Meta<typeof AuthCard> = {
  title: "Features/Auth/AuthCard",
  component: AuthCard,
  args: {
    title: "Welcome Back",
    error: null,
    success: null,
    children: (
      <div className="space-y-3">
        <input
          className="w-full rounded-lg border border-slate-300 px-4 py-3"
          placeholder="Email"
          readOnly
          value="alex@example.com"
        />
        <input
          className="w-full rounded-lg border border-slate-300 px-4 py-3"
          placeholder="Password"
          readOnly
          type="password"
          value="123456"
        />
      </div>
    ),
    footer: <p className="mt-6 text-center text-sm text-slate-600">Footer slot</p>,
  },
};

export default meta;

type Story = StoryObj<typeof AuthCard>;

export const Default: Story = {};

export const WithError: Story = {
  args: {
    error: "Invalid credentials. Please try again.",
  },
};

export const WithSuccess: Story = {
  args: {
    success: "Verification email sent.",
  },
};
