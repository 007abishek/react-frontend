import type { Meta, StoryObj } from "@storybook/react";
import Navbar from "./Navbar";

const meta: Meta<typeof Navbar> = {
  title: "Layout/Navbar",
  component: Navbar,
};

export default meta;

export const LoggedIn: StoryObj<typeof Navbar> = {};
