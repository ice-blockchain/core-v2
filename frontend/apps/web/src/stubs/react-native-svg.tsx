import React from 'react';

type SvgProps = React.SVGProps<SVGSVGElement> & { children?: React.ReactNode };

function Svg({ width, height, viewBox, children, ...rest }: SvgProps) {
  return <svg width={width} height={height} viewBox={viewBox} {...rest}>{children}</svg>;
}

function Path(props: React.SVGProps<SVGPathElement>) { return <path {...props} />; }
function Rect(props: React.SVGProps<SVGRectElement>) { return <rect {...props} />; }
function Circle(props: React.SVGProps<SVGCircleElement>) { return <circle {...props} />; }
function G(props: React.SVGProps<SVGGElement> & { children?: React.ReactNode }) { return <g {...props} />; }
function Defs(props: React.SVGProps<SVGDefsElement> & { children?: React.ReactNode }) { return <defs {...props} />; }
function ClipPath(props: React.SVGProps<SVGClipPathElement> & { children?: React.ReactNode }) { return <clipPath {...props} />; }
function Mask(props: React.SVGProps<SVGMaskElement> & { children?: React.ReactNode }) { return <mask {...props} />; }
function Stop(props: React.SVGProps<SVGStopElement>) { return <stop {...props} />; }
function LinearGradient(props: React.SVGProps<SVGLinearGradientElement> & { children?: React.ReactNode }) { return <linearGradient {...props} />; }

export default Svg;
export { Svg, Path, Rect, Circle, G, Defs, ClipPath, Mask, Stop, LinearGradient };
