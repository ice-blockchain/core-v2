import React from 'react';

type SvgProps = React.SVGProps<SVGSVGElement> & { children?: React.ReactNode };

function Svg({ width, height, viewBox, children, ...rest }: SvgProps) {
  return <svg width={width} height={height} viewBox={viewBox} {...rest}>{children}</svg>;
}

function Path(props: React.SVGProps<SVGPathElement>) { return <path {...props} />; }
function Rect(props: React.SVGProps<SVGRectElement>) { return <rect {...props} />; }
function Circle(props: React.SVGProps<SVGCircleElement>) { return <circle {...props} />; }
function G(props: React.SVGProps<SVGGElement> & { children?: React.ReactNode }) { return <g {...props} />; }

export default Svg;
export { Svg, Path, Rect, Circle, G };
