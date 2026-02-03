import type { Meta, StoryObj } from "@storybook/react";
import FeatureCard from "./FeatureCard";

const meta: Meta<typeof FeatureCard> = {
  title: "Components/FeatureCard",
  component: FeatureCard,
};

export default meta;

type Story = StoryObj<typeof FeatureCard>;

export const Todos: Story = {
  args: {
    title: "Todos",
    description: "Manage your daily tasks efficiently",
    route: "/todos",
  },
};

export const GitHub: Story = {
  args: {
    title: "GitHub Explorer",
    description: "Search GitHub users and repositories",
    route: "/github",
  },
};

export const Products: Story = {
  args: {
    title: "Products",
    description: "Browse products and manage your cart",
    route: "/products",
  },
};
