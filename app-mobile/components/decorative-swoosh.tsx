import React from "react";
import Svg, { Path } from "react-native-svg";

// Decorative swoosh SVG banner
const DecorativeSwoosh = ({
    color = "#E0E0E0",
    width = 100,
    height = 50,
}: {
    color?: string;
    width?: number;
    height?: number;
}) => (
    <Svg width={width} height={height} viewBox="0 0 202 100" fill="none">
        <Path
            d="M0 0H202V81.5726C202 83.2987 201.118 84.895 199.611 85.7355C188.536 91.9102 141.524 115.257 113 84.3478C86.3502 55.4698 27.4256 73.9514 7.07561 81.5407C3.69718 82.8006 0 80.3086 0 76.7029V0Z"
            fill={color}
        />
    </Svg>
);

export default DecorativeSwoosh;
