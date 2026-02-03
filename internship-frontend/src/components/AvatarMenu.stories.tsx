import type { Meta, StoryObj } from "@storybook/react";
import AvatarMenu from "./AvatarMenu";

const meta: Meta<typeof AvatarMenu> = {
  title: "UI/AvatarMenu",
  component: AvatarMenu,
};

export default meta;

export const Default: StoryObj<typeof AvatarMenu> = {
  args: {
    email: "abishek@gmail.com",
  },
};

export const NaveenAvatar: StoryObj<typeof AvatarMenu> = {
  args: {
    email: "naveen@gmail.com"
  }
};

export const AbishekAvatar: StoryObj<typeof AvatarMenu> = {
  args: {
    email: "abishek@gmail.com"
  }
};
