type Channels = { red: number; green: number; blue: number };

const expand = (hex: string): string =>
  hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex;

const channelsOf = (colour: string): Channels => {
  const hex = expand(colour.trim());

  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) {
    throw new Error(`not a hex colour: ${colour}`);
  }

  return {
    red: parseInt(hex.slice(1, 3), 16) / 255,
    green: parseInt(hex.slice(3, 5), 16) / 255,
    blue: parseInt(hex.slice(5, 7), 16) / 255,
  };
};

const linear = (value: number): number =>
  value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;

const luminanceOf = ({ red, green, blue }: Channels): number =>
  0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue);

export const ratioOf = ({
  foreground,
  background,
}: {
  foreground: string;
  background: string;
}): number => {
  const [lighter, darker] = [
    luminanceOf(channelsOf(foreground)),
    luminanceOf(channelsOf(background)),
  ].sort((a, b) => b - a);

  return ((lighter as number) + 0.05) / ((darker as number) + 0.05);
};
