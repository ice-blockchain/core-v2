export interface GradientStop {
  color: string;
  position: number;
}

export const gradients: Record<string, GradientStop[]> = {
  orangeRed: [
    { color: "#EF1D4F", position: 0 },
    { color: "#FF9F0E", position: 0.21 },
    { color: "#FFBB0E", position: 0.47 },
    { color: "#FF012F", position: 0.77 },
  ],
  greenBlue: [
    { color: "#0166FF", position: 0 },
    { color: "#00DDB5", position: 0.3 },
    { color: "#3800D6", position: 0.72 },
    { color: "#0166FF", position: 1 },
  ],
  lightblueLightgreen: [
    { color: "#00AFA5", position: 0 },
    { color: "#1B76FF", position: 0.3 },
    { color: "#0AFFFF", position: 0.72 },
    { color: "#00C1B6", position: 0.97 },
  ],
  bluePink: [
    { color: "#AE01FF", position: 0 },
    { color: "#1F00DD", position: 0.3 },
    { color: "#0AA7FF", position: 0.72 },
    { color: "#C100BA", position: 0.97 },
  ],
  greenBlue2: [
    { color: "#0031AF", position: 0 },
    { color: "#1BFF84", position: 0.3 },
    { color: "#3888FF", position: 0.59 },
    { color: "#004DC1", position: 0.97 },
  ],
  pinkBlue: [
    { color: "#0139FF", position: 0 },
    { color: "#DD006A", position: 0.3 },
    { color: "#B011CA", position: 0.72 },
    { color: "#249FF8", position: 0.97 },
  ],
  pinkLightblue: [
    { color: "#29D9D9", position: 0 },
    { color: "#9401D9", position: 0.2 },
    { color: "#0AD3FF", position: 0.64 },
    { color: "#00B6C1", position: 0.88 },
  ],
};
